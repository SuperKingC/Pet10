import type { Pool, PoolClient, QueryResultRow } from 'pg'
import { randomInt } from 'node:crypto'
import type { RepositoryBundle } from './contracts.js'

type Database = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>

const PUBLIC_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export function makePublicCode(): string {
  let code = ''
  for (let index = 0; index < 8; index++) code += PUBLIC_CODE_ALPHABET[randomInt(PUBLIC_CODE_ALPHABET.length)]
  return code
}

function camel<T extends QueryResultRow>(row: T): any {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    result[key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())] = value
  }
  return result
}

export function createPostgresRepositories(database: Database): RepositoryBundle {
  const one = async (sql: string, values: unknown[] = []) => {
    const result = await database.query(sql, values)
    return result.rows[0] ? camel(result.rows[0]) : undefined
  }
  const many = async (sql: string, values: unknown[] = []) => {
    const result = await database.query(sql, values)
    return result.rows.map(camel)
  }

  return {
    users: {
      findById: (id) => one('SELECT * FROM users WHERE id=$1', [id]),
      findByEmail: (email) => one('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]),
      findByUsername: (username) => one('SELECT * FROM users WHERE username=$1', [username]),
      findByPublicCode: (code) => one('SELECT * FROM users WHERE public_code=$1', [code.toUpperCase()]),
      create: async (input) => {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            return await one(
              'INSERT INTO users(email,username,display_name,public_code) VALUES($1,$2,$3,$4) RETURNING *',
              [input.email.toLowerCase(), input.username, input.displayName, makePublicCode()]
            )
          } catch (error) {
            const constraint = (error as { constraint?: string }).constraint
            if (constraint !== 'users_public_code_key' || attempt === 4) throw error
          }
        }
        throw new Error('public_code_collision')
      },
      updateUsername: (id, username) => one('UPDATE users SET username=$2 WHERE id=$1 RETURNING *', [id, username]),
      updateProfile: (id, patch) => one(
        `UPDATE users SET
          avatar_url = CASE WHEN $2 THEN $3 ELSE avatar_url END,
          birthday = CASE WHEN $4 THEN $5 ELSE birthday END,
          mbti = CASE WHEN $6 THEN $7 ELSE mbti END,
          display_name = CASE WHEN $8 THEN $9 ELSE display_name END,
          avatar_config = CASE WHEN $10 THEN $11 ELSE avatar_config END
        WHERE id=$1 RETURNING *`,
        [
          id,
          patch.avatarUrl !== undefined, patch.avatarUrl,
          patch.birthday !== undefined, patch.birthday,
          patch.mbti !== undefined, patch.mbti,
          patch.displayName !== undefined, patch.displayName,
          patch.avatarConfig !== undefined, patch.avatarConfig
        ]
      )
    },
    invites: {
      findByCode: (code) => one('SELECT * FROM invite_codes WHERE code=$1', [code.toUpperCase()]),
      async consume(code) {
        const result = await database.query(
          'UPDATE invite_codes SET use_count=use_count+1 WHERE code=$1 AND active=true AND use_count<max_uses',
          [code.toUpperCase()]
        )
        if (!result.rowCount) throw new Error('invalid_invite_code')
      }
    },
    loginCodes: {
      async save(code) {
        await database.query(
          `INSERT INTO login_codes(email,code_hash,expires_at) VALUES($1,$2,$3)
           ON CONFLICT(email) DO UPDATE SET code_hash=EXCLUDED.code_hash, expires_at=EXCLUDED.expires_at, created_at=now()`,
          [code.email, code.codeHash, code.expiresAt]
        )
      },
      findByEmail: (email) => one('SELECT email,code_hash,expires_at FROM login_codes WHERE email=$1', [email.toLowerCase()]),
      async deleteByEmail(email) { await database.query('DELETE FROM login_codes WHERE email=$1', [email.toLowerCase()]) }
    },
    relationships: {
      findActiveForUser: (userId) => one(
        `SELECT * FROM relationships WHERE status IN ('pending','accepted')
         AND (requester_id=$1 OR addressee_id=$1) ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ),
      findBetweenUsers: (first, second) => one(
        `SELECT * FROM relationships WHERE status IN ('pending','accepted')
         AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)) LIMIT 1`,
        [first, second]
      ),
      findById: (id) => one('SELECT * FROM relationships WHERE id=$1', [id]),
      create: (requesterId, addresseeId) => one(
        'INSERT INTO relationships(requester_id,addressee_id) VALUES($1,$2) RETURNING *',
        [requesterId, addresseeId]
      ),
      accept: async (id) => {
        const client = 'connect' in database ? await (database as Pool).connect() : undefined
        const db = client ?? database
        try {
          if (client) await client.query('BEGIN')
          const relationship = await db.query(
            `UPDATE relationships SET status='accepted' WHERE id=$1 AND status='pending' RETURNING *`,
            [id]
          )
          if (!relationship.rows[0]) throw new Error('relationship_not_found')
          const row = relationship.rows[0]
          const room = await db.query(
            'INSERT INTO rooms(relationship_id) VALUES($1) ON CONFLICT(relationship_id) DO UPDATE SET relationship_id=EXCLUDED.relationship_id RETURNING *',
            [id]
          )
          await db.query(
            `INSERT INTO room_members(room_id,user_id) VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING`,
            [room.rows[0].id, row.requester_id, row.addressee_id]
          )
          await db.query(
            `INSERT INTO pets(relationship_id,room_id) VALUES($1,$2) ON CONFLICT(relationship_id) DO NOTHING`,
            [id, room.rows[0].id]
          )
          if (client) await client.query('COMMIT')
          return camel(row)
        } catch (error) {
          if (client) await client.query('ROLLBACK')
          throw error
        } finally {
          client?.release()
        }
      },
      listPendingForUser: (userId) => many(
        `SELECT * FROM relationships WHERE status='pending'
         AND (requester_id=$1 OR addressee_id=$1) ORDER BY created_at DESC`,
        [userId]
      )
    },
    rooms: {
      createForRelationship: async (relationshipId) => {
        const existing = await one('SELECT * FROM rooms WHERE relationship_id=$1', [relationshipId])
        if (existing) return existing
        return one('INSERT INTO rooms(relationship_id) VALUES($1) RETURNING *', [relationshipId])
      },
      createPetDm: async (userId) => {
        const existing = await one(
          `SELECT r.* FROM rooms r JOIN room_members m ON m.room_id=r.id
           WHERE r.type='pet_dm' AND m.user_id=$1`,
          [userId]
        )
        if (existing) return existing
        const room = await one(`INSERT INTO rooms(relationship_id,type) VALUES(NULL,'pet_dm') RETURNING *`)
        await database.query('INSERT INTO room_members(room_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [room.id, userId])
        return room
      },
      findById: (id) => one('SELECT * FROM rooms WHERE id=$1', [id]),
      findByRelationshipId: (relationshipId) => one('SELECT * FROM rooms WHERE relationship_id=$1', [relationshipId]),
      listForUser: (userId) => many(
        `SELECT r.* FROM rooms r JOIN room_members m ON m.room_id=r.id
         WHERE m.user_id=$1 ORDER BY r.created_at`,
        [userId]
      ),
      async isMember(roomId, userId) {
        return Boolean(await one('SELECT 1 FROM room_members WHERE room_id=$1 AND user_id=$2', [roomId, userId]))
      },
      setProactive: (roomId, enabled) => one('UPDATE rooms SET proactive_enabled=$2 WHERE id=$1 RETURNING *', [roomId, enabled])
    },
    pets: {
      createForRelationship: async (relationshipId, roomId) => {
        const existing = await one('SELECT * FROM pets WHERE relationship_id=$1', [relationshipId])
        if (existing) return existing
        return one('INSERT INTO pets(relationship_id,room_id) VALUES($1,$2) RETURNING *', [relationshipId, roomId])
      },
      findByRoomId: (roomId) => one('SELECT * FROM pets WHERE room_id=$1', [roomId]),
      update: (pet) => one(
        `UPDATE pets SET level=$2,experience=$3,experience_to_next_level=$4,hunger=$5,mood=$6,
         energy=$7,health=$8,intimacy=$9,updated_at=now() WHERE id=$1 RETURNING *`,
        [pet.id, pet.level, pet.experience, pet.experienceToNextLevel, pet.hunger, pet.mood, pet.energy, pet.health, pet.intimacy]
      )
    },
    messages: {
      listRecent: (roomId, limit) => many(
        'SELECT * FROM (SELECT * FROM messages WHERE room_id=$1 ORDER BY created_at DESC LIMIT $2) recent ORDER BY created_at',
        [roomId, limit]
      ),
      create: (input) => one(
        `INSERT INTO messages(room_id,sender_type,sender_id,kind,text,image_url)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [input.roomId, input.senderType, input.senderId ?? null, input.kind, input.text, input.imageUrl ?? null]
      )
    },
    memories: {
      listByRoom: (roomId) => many('SELECT * FROM pet_memories WHERE room_id=$1 ORDER BY created_at DESC', [roomId]),
      create: (input) => one(
        'INSERT INTO pet_memories(room_id,text,source_message_id,can_mention) VALUES($1,$2,$3,$4) RETURNING *',
        [input.roomId, input.text, input.sourceMessageId ?? null, input.canMention ?? true]
      ),
      async deleteById(roomId, memoryId) {
        await database.query('DELETE FROM pet_memories WHERE room_id=$1 AND id=$2', [roomId, memoryId])
      }
    },
    moods: {
      upsert: (roomId, userId, day, level) => one(
        `INSERT INTO moods(room_id,user_id,day,level) VALUES($1,$2,$3,$4)
         ON CONFLICT(room_id,user_id,day) DO UPDATE SET level=EXCLUDED.level, updated_at=now()
         RETURNING *`,
        [roomId, userId, day, level]
      ),
      listForRange: (roomId, fromDay, toDay) => many(
        'SELECT * FROM moods WHERE room_id=$1 AND day BETWEEN $2 AND $3 ORDER BY day',
        [roomId, fromDay, toDay]
      )
    },
    posts: {
      create: (input) => one(
        `INSERT INTO posts(room_id,author_type,author_id,text,image_url) VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [input.roomId, input.authorType, input.authorId ?? null, input.text, input.imageUrl ?? null]
      ),
      createAsPet: (roomId, text, imageUrl) => one(
        `INSERT INTO posts(room_id,author_type,author_id,text,image_url) VALUES($1,'pet',NULL,$2,$3) RETURNING *`,
        [roomId, text, imageUrl ?? null]
      ),
      listByRoom: (roomId, limit) => many('SELECT * FROM posts WHERE room_id=$1 ORDER BY created_at DESC LIMIT $2', [roomId, limit]),
      async like(postId, userId) {
        await database.query('INSERT INTO post_likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [postId, userId])
      },
      async unlike(postId, userId) {
        await database.query('DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2', [postId, userId])
      },
      async likeStats(postId, userId) {
        const countRow = await one('SELECT count(*)::int AS count FROM post_likes WHERE post_id=$1', [postId])
        const mine = await one('SELECT 1 FROM post_likes WHERE post_id=$1 AND user_id=$2', [postId, userId])
        return { count: countRow?.count ?? 0, likedByMe: Boolean(mine) }
      }
    },
    notifications: {
      create: (userId, type, payload) => one(
        'INSERT INTO notifications(user_id,type,payload) VALUES($1,$2,$3) RETURNING *',
        [userId, type, JSON.stringify(payload)]
      ),
      list: (userId, limit) => many('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limit]),
      unreadCount: async (userId) => {
        const row = await one('SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND read=false', [userId])
        return row?.count ?? 0
      },
      async markAllRead(userId) {
        await database.query('UPDATE notifications SET read=true WHERE user_id=$1 AND read=false', [userId])
      }
    },
    fortunes: {
      findByRoomAndDay: (roomId, day) => one('SELECT * FROM fortunes WHERE room_id=$1 AND day=$2', [roomId, day]),
      create: (roomId, day, content) => one(
        'INSERT INTO fortunes(room_id,day,content) VALUES($1,$2,$3) ON CONFLICT(room_id,day) DO UPDATE SET content=EXCLUDED.content RETURNING *',
        [roomId, day, JSON.stringify(content)]
      )
    },
    codewords: {
      getAnswer: (roomId, day, userId) => one('SELECT * FROM codeword_answers WHERE room_id=$1 AND day=$2 AND user_id=$3', [roomId, day, userId]),
      setAnswer: (roomId, day, userId, answer) => one(
        `INSERT INTO codeword_answers(room_id,day,user_id,answer) VALUES($1,$2,$3,$4)
         ON CONFLICT(room_id,day,user_id) DO UPDATE SET answer=EXCLUDED.answer RETURNING *`,
        [roomId, day, userId, answer]
      ),
      listForDay: (roomId, day) => many('SELECT * FROM codeword_answers WHERE room_id=$1 AND day=$2', [roomId, day])
    },
    petEvents: {
      async record(petId, userId, action, payload = {}) {
        await database.query('INSERT INTO pet_events(pet_id,actor_user_id,action,payload) VALUES($1,$2,$3,$4)', [petId, userId, action, JSON.stringify(payload)])
      },
      statsByRoom: (petId) => many(
        `SELECT actor_user_id AS user_id, action, count(*)::int AS count FROM pet_events WHERE pet_id=$1 GROUP BY actor_user_id, action`,
        [petId]
      )
    },
    pushSubscriptions: {
      async save(userId, endpoint, p256dh, auth) {
        await database.query(
          `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4)
           ON CONFLICT(user_id,endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`,
          [userId, endpoint, p256dh, auth]
        )
      },
      listForUser: (userId) => many('SELECT user_id,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=$1', [userId]),
      async deleteByEndpoint(userId, endpoint) {
        await database.query('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [userId, endpoint])
      }
    },
    map: {
      listByRoom: (roomId) => many('SELECT spot_id,lit_by,created_at FROM map_lights WHERE room_id=$1 ORDER BY created_at', [roomId]),
      light: (roomId, spotId, userId) => one(
        `INSERT INTO map_lights(room_id,spot_id,lit_by) VALUES($1,$2,$3)
         ON CONFLICT(room_id,spot_id) DO UPDATE SET lit_by=EXCLUDED.lit_by RETURNING *`,
        [roomId, spotId, userId]
      )
    }
  } as RepositoryBundle
}
