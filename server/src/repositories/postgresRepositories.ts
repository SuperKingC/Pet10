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
      findByUid: (uid) => one('SELECT * FROM users WHERE uid=$1', [uid.replace(/^0+/, '').padStart(8, '0')]),
      listRecent: (limit) => many('SELECT * FROM users ORDER BY created_at DESC, uid DESC LIMIT $1', [limit]),
      create: async (input) => {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            return await one(
              'INSERT INTO users(email,username,display_name,public_code,uid) VALUES($1,$2,$3,$4,lpad(nextval(\'users_uid_seq\')::text, 8, \'0\')) RETURNING *',
              [input.email.toLowerCase(), input.username, input.displayName, makePublicCode()]
            )
          } catch (error) {
            const constraint = (error as { constraint?: string }).constraint
            if ((constraint !== 'users_public_code_key' && constraint !== 'users_uid_key') || attempt === 4) throw error
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
          avatar_config = CASE WHEN $10 THEN $11 ELSE avatar_config END,
          gender = CASE WHEN $12 THEN $13 ELSE gender END
        WHERE id=$1 RETURNING *`,
        [
          id,
          patch.avatarUrl !== undefined, patch.avatarUrl,
          patch.birthday !== undefined, patch.birthday,
          patch.mbti !== undefined, patch.mbti,
          patch.displayName !== undefined, patch.displayName,
          patch.avatarConfig !== undefined, patch.avatarConfig,
          patch.gender !== undefined, patch.gender
        ]
      ),
      deleteById: async (id) => { await database.query('DELETE FROM users WHERE id=$1', [id]) }
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
    wechatIdentities: {
      findByOpenId: (openId) => one('SELECT * FROM wechat_identities WHERE open_id=$1', [openId]),
      findByUserId: (userId) => one('SELECT * FROM wechat_identities WHERE user_id=$1', [userId]),
      create: (input) => one(
        `INSERT INTO wechat_identities(user_id,open_id,union_id)
         VALUES($1,$2,$3) RETURNING *`,
        [input.userId, input.openId, input.unionId ?? null]
      )
    },
    invitations: {
      create: (input) => one(
        `INSERT INTO invitations(token,inviter_id,expires_at)
         VALUES($1,$2,$3) RETURNING *`,
        [input.token, input.inviterId, input.expiresAt]
      ),
      findByToken: (token) => one('SELECT * FROM invitations WHERE token=$1', [token]),
      accept: (token, accepterId) => one(
        `UPDATE invitations SET status='accepted', accepted_by=$2, accepted_at=now()
         WHERE token=$1 AND status='pending' RETURNING *`,
        [token, accepterId]
      ),
      acceptPair: async (token, accepterId, options?: { createPet?: boolean }) => {
        const client = 'connect' in database ? await (database as Pool).connect() : undefined
        const db = client ?? database
        try {
          if (client) await client.query('BEGIN')
          const invitationResult = await db.query(
            `UPDATE invitations
             SET status='accepted', accepted_by=$2, accepted_at=now()
             WHERE token=$1 AND status='pending' AND expires_at > now()
             RETURNING *`,
            [token, accepterId]
          )
          if (!invitationResult.rows[0]) throw new Error('invitation_unavailable')
          const invitation = camel(invitationResult.rows[0])
          const relationshipResult = await db.query(
            `INSERT INTO relationships(requester_id, addressee_id, status)
             VALUES($1,$2,'accepted')
             ON CONFLICT DO NOTHING
             RETURNING *`,
            [invitation.inviterId, accepterId]
          )
          if (!relationshipResult.rows[0]) throw new Error('relationship_already_exists')
          const relationship = camel(relationshipResult.rows[0])
          const roomResult = await db.query(
            `INSERT INTO rooms(relationship_id) VALUES($1)
             ON CONFLICT(relationship_id) DO UPDATE SET relationship_id=EXCLUDED.relationship_id
             RETURNING *`,
            [relationship.id]
          )
          const room = camel(roomResult.rows[0])
          await db.query(
            `INSERT INTO room_members(room_id,user_id) VALUES($1,$2),($1,$3)
             ON CONFLICT DO NOTHING`,
            [room.id, relationship.requesterId, relationship.addresseeId]
          )
          const petResult = options?.createPet === false
            ? null
            : await db.query(
                `INSERT INTO pets(relationship_id,room_id) VALUES($1,$2)
                 ON CONFLICT(relationship_id) DO UPDATE SET relationship_id=EXCLUDED.relationship_id
                 RETURNING *`,
                [relationship.id, room.id]
              )
          if (client) await client.query('COMMIT')
          return { invitation, relationship, room, pet: petResult ? camel(petResult.rows[0]) : null }
        } catch (error) {
          if (client) await client.query('ROLLBACK')
          throw error
        } finally {
          client?.release()
        }
      },
      decline: (token, userId) => one(
        `UPDATE invitations SET status='declined'
         WHERE token=$1 AND inviter_id<>$2 AND status='pending' RETURNING *`,
        [token, userId]
      )
    },
    relationships: {
      findActiveForUser: (userId) => one(
        `SELECT * FROM relationships WHERE status IN ('pending','accepted')
         AND (requester_id=$1 OR addressee_id=$1) ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ),
      listAcceptedForUser: (userId) => many(
        `SELECT * FROM relationships WHERE status='accepted'
         AND (requester_id=$1 OR addressee_id=$1) ORDER BY created_at DESC`,
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
      // 删除关系会按外键级联清理房间、宠物与会话数据（见 sql/001_initial.sql）
      removeById: async (id) => { await database.query('DELETE FROM relationships WHERE id=$1', [id]) },
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
        `INSERT INTO pet_memories(room_id,text,source_message_id,can_mention,category,importance,source)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          input.roomId,
          input.text,
          input.sourceMessageId ?? null,
          input.canMention ?? true,
          input.category ?? 'other',
          input.importance ?? 1,
          input.source ?? 'inferred'
        ]
      ),
      async deleteById(roomId, memoryId) {
        await database.query('DELETE FROM pet_memories WHERE room_id=$1 AND id=$2', [roomId, memoryId])
      }
    },
    tasks: {
      create: (input) => one(
        `INSERT INTO pet_tasks(room_id,user_id,content,schedule_type,next_run_at)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [input.roomId, input.userId, input.content, input.scheduleType, input.nextRunAt]
      ),
      async claimDue(now, limit) {
        return many(
          `UPDATE pet_tasks SET status='processing', updated_at=now()
           WHERE id IN (
             SELECT id FROM pet_tasks
             WHERE status='pending' AND next_run_at <= $1
             ORDER BY next_run_at
             FOR UPDATE SKIP LOCKED
             LIMIT $2
           )
           RETURNING *`,
          [now, limit]
        )
      },
      async complete(id) {
        await database.query("UPDATE pet_tasks SET status='completed', updated_at=now() WHERE id=$1", [id])
      },
      async reschedule(id, nextRunAt) {
        await database.query("UPDATE pet_tasks SET status='pending', next_run_at=$2, updated_at=now() WHERE id=$1", [id, nextRunAt])
      },
      async fail(id) {
        await database.query("UPDATE pet_tasks SET status='failed', updated_at=now() WHERE id=$1", [id])
      }
    },
    nestTaskProgress: {
      listByRoom: (roomId) => many('SELECT * FROM nest_task_progress WHERE room_id=$1', [roomId]),
      findByKey: (roomId, taskKey) => one('SELECT * FROM nest_task_progress WHERE room_id=$1 AND task_key=$2', [roomId, taskKey]),
      addProgress: (roomId, taskKey, delta) => one(
        `INSERT INTO nest_task_progress(room_id,task_key,period_key,progress) VALUES($1,$2,'',$3)
         ON CONFLICT(room_id,task_key) DO UPDATE SET progress = nest_task_progress.progress + $3, updated_at=now()
         RETURNING *`,
        [roomId, taskKey, delta]
      ),
      setDailyProgress: (roomId, taskKey, periodKey, progress) => one(
        `INSERT INTO nest_task_progress(room_id,task_key,period_key,progress) VALUES($1,$2,$3,$4)
         ON CONFLICT(room_id,task_key) DO UPDATE SET
           period_key = EXCLUDED.period_key,
           progress = CASE WHEN nest_task_progress.period_key = EXCLUDED.period_key
             THEN GREATEST(nest_task_progress.progress, EXCLUDED.progress) ELSE EXCLUDED.progress END,
           claimed = CASE WHEN nest_task_progress.period_key = EXCLUDED.period_key
             THEN nest_task_progress.claimed ELSE false END,
           claimed_by = CASE WHEN nest_task_progress.period_key = EXCLUDED.period_key
             THEN nest_task_progress.claimed_by ELSE NULL END,
           updated_at = now()
         RETURNING *`,
        [roomId, taskKey, periodKey, progress]
      ),
      markClaimed: (roomId, taskKey, userId) => one(
        `UPDATE nest_task_progress SET claimed=true, claimed_by=$3, updated_at=now()
         WHERE room_id=$1 AND task_key=$2 RETURNING *`,
        [roomId, taskKey, userId]
      )
    },
    inventory: {
      listByRoom: (roomId) => many('SELECT * FROM room_inventory WHERE room_id=$1', [roomId]),
      consume: async (roomId, itemId) => {
        const result = await database.query(
          'UPDATE room_inventory SET count=count-1, updated_at=now() WHERE room_id=$1 AND item_id=$2 AND count>0',
          [roomId, itemId]
        )
        return result.rowCount === 1
      },
      add: async (roomId, itemId, count) => {
        await database.query(
          `INSERT INTO room_inventory(room_id,item_id,count) VALUES($1,$2,$3)
           ON CONFLICT(room_id,item_id) DO UPDATE SET count = room_inventory.count + $3, updated_at=now()`,
          [roomId, itemId, count]
        )
      },
      async addBatch(roomId, items) {
        for (const item of items) await database.query(
          `INSERT INTO room_inventory(room_id,item_id,count) VALUES($1,$2,$3)
           ON CONFLICT(room_id,item_id) DO UPDATE SET count = room_inventory.count + $3, updated_at=now()`,
          [roomId, item.itemId, item.count]
        )
      },
      grantStarterPouchOnce: async (roomId, items) => {
        const inserted = await database.query(
          'INSERT INTO room_pouches(room_id) VALUES($1) ON CONFLICT (room_id) DO NOTHING',
          [roomId]
        )
        if (inserted.rowCount !== 1) return false
        for (const item of items) await database.query(
          `INSERT INTO room_inventory(room_id,item_id,count) VALUES($1,$2,$3)
           ON CONFLICT(room_id,item_id) DO UPDATE SET count = room_inventory.count + $3, updated_at=now()`,
          [roomId, item.itemId, item.count]
        )
        return true
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
    anniversaries: {
      create: (input) => one(
        `INSERT INTO anniversaries(room_id,user_id,name,icon,note,day,repeat_rule)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [input.roomId, input.userId, input.name, input.icon, input.note, input.day, input.repeatRule]
      ),
      update: (id, patch) => one(
        `UPDATE anniversaries SET
           name = CASE WHEN $2 THEN $3 ELSE name END,
           icon = CASE WHEN $4 THEN $5 ELSE icon END,
           note = CASE WHEN $6 THEN $7 ELSE note END,
           repeat_rule = CASE WHEN $8 THEN $9 ELSE repeat_rule END,
           updated_at = now()
         WHERE id=$1 RETURNING *`,
        [id, patch.name !== undefined, patch.name, patch.icon !== undefined, patch.icon, patch.note !== undefined, patch.note, patch.repeatRule !== undefined, patch.repeatRule]
      ),
      async deleteById(roomId, id) {
        await database.query('DELETE FROM anniversaries WHERE room_id=$1 AND id=$2', [roomId, id])
      },
      listByRoom: (roomId) => many('SELECT * FROM anniversaries WHERE room_id=$1 ORDER BY created_at', [roomId])
    },
    diaries: {
      create: (input) => one(
        `INSERT INTO diaries(user_id,day,title,body,location,photos)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [input.userId, input.day, input.title, input.body, input.location, JSON.stringify(input.photos)]
      ),
      update: (id, patch) => one(
        `UPDATE diaries SET
           title = CASE WHEN $2 THEN $3 ELSE title END,
           body = CASE WHEN $4 THEN $5 ELSE body END,
           location = CASE WHEN $6 THEN $7 ELSE location END,
           photos = CASE WHEN $8 THEN $9 ELSE photos END,
           updated_at = now()
         WHERE id=$1 RETURNING *`,
        [
          id,
          patch.title !== undefined, patch.title,
          patch.body !== undefined, patch.body,
          patch.location !== undefined, patch.location,
          patch.photos !== undefined, patch.photos === undefined ? null : JSON.stringify(patch.photos)
        ]
      ),
      setLiked: (id, liked) => one('UPDATE diaries SET liked=$2, updated_at=now() WHERE id=$1 RETURNING *', [id, liked]),
      async deleteById(userId, id) {
        await database.query('DELETE FROM diaries WHERE user_id=$1 AND id=$2', [userId, id])
      },
      findById: (id) => one('SELECT * FROM diaries WHERE id=$1', [id]),
      listForUser: (userId, fromDay, toDay) => many(
        'SELECT * FROM diaries WHERE user_id=$1 AND day BETWEEN $2 AND $3 ORDER BY day DESC, created_at DESC',
        [userId, fromDay, toDay]
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
      findByUserAndDay: (userId, day) => one('SELECT * FROM personal_fortunes WHERE user_id=$1 AND day=$2', [userId, day]),
      createForUser: (userId, day, content) => one(
        'INSERT INTO personal_fortunes(user_id,day,content) VALUES($1,$2,$3) ON CONFLICT(user_id,day) DO UPDATE SET content=EXCLUDED.content RETURNING *',
        [userId, day, JSON.stringify(content)]
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
    },
    photoWall: {
      listByRoom: (roomId, limit = 60) => many(
        `SELECT id, room_id, user_id, origin, photo, caption, ref_key,
           to_char(taken_day,'YYYY-MM-DD') AS taken_day, created_at
         FROM photo_wall WHERE room_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [roomId, limit]
      ),
      findById: (roomId, photoId) => one(
        `SELECT id, room_id, user_id, origin, photo, caption, ref_key,
           to_char(taken_day,'YYYY-MM-DD') AS taken_day, created_at
         FROM photo_wall WHERE room_id=$1 AND id=$2`,
        [roomId, photoId]
      ),
      create: (input) => one(
        `INSERT INTO photo_wall(room_id,user_id,origin,photo,caption,ref_key,taken_day)
         VALUES($1,$2,$3,$4,$5,$6,CAST($7 AS date))
         RETURNING id, room_id, user_id, origin, photo, caption, ref_key,
           to_char(taken_day,'YYYY-MM-DD') AS taken_day, created_at`,
        [input.roomId, input.userId, input.origin, input.photo, input.caption, input.refKey, input.takenDay]
      ),
      updateCaption: (roomId, photoId, caption) => one(
        `UPDATE photo_wall SET caption=$3 WHERE room_id=$1 AND id=$2
         RETURNING id, room_id, user_id, origin, photo, caption, ref_key,
           to_char(taken_day,'YYYY-MM-DD') AS taken_day, created_at`,
        [roomId, photoId, caption]
      ),
      async deleteById(roomId, photoId) {
        await database.query('DELETE FROM photo_wall WHERE room_id=$1 AND id=$2', [roomId, photoId])
      },
      async deleteOldestManual(roomId) {
        const result = await database.query(
          `DELETE FROM photo_wall WHERE id = (
             SELECT id FROM photo_wall WHERE room_id=$1 AND origin='manual' ORDER BY created_at LIMIT 1
           )`,
          [roomId]
        )
        return (result.rowCount ?? 0) > 0
      },
      countByRoom: async (roomId) => {
        const row = await one('SELECT count(*)::int AS count FROM photo_wall WHERE room_id=$1', [roomId])
        return row?.count ?? 0
      }
    },
    wardrobe: {
      getState: (roomId) => one(
        'SELECT room_id, equipped, updated_at FROM pet_wardrobe WHERE room_id=$1',
        [roomId]
      ),
      setEquipped: (roomId, equipped) => one(
        `INSERT INTO pet_wardrobe(room_id,equipped) VALUES($1,$2)
         ON CONFLICT(room_id) DO UPDATE SET equipped=EXCLUDED.equipped, updated_at=now()
         RETURNING room_id, equipped, updated_at`,
        [roomId, equipped]
      )
    },
    outfitMatch: {
      setPick: (roomId, day, userId, itemId) => one(
        `INSERT INTO outfit_match_daily(room_id,day,user_id,item_id) VALUES($1,CAST($2 AS date),$3,$4)
         ON CONFLICT(room_id,day,user_id) DO UPDATE SET item_id=EXCLUDED.item_id
         RETURNING id, room_id, to_char(day,'YYYY-MM-DD') AS day, user_id, item_id, created_at`,
        [roomId, day, userId, itemId]
      ),
      listPicks: (roomId, day) => many(
        `SELECT id, room_id, to_char(day,'YYYY-MM-DD') AS day, user_id, item_id, created_at
         FROM outfit_match_daily WHERE room_id=$1 AND day=CAST($2 AS date) ORDER BY created_at`,
        [roomId, day]
      ),
      getStreak: (roomId) => one(
        `SELECT room_id, streak, best_streak, to_char(last_match_day,'YYYY-MM-DD') AS last_match_day
         FROM outfit_match_streak WHERE room_id=$1`,
        [roomId]
      ),
      markSettled: (roomId, day, streak, bestStreak) => one(
        `INSERT INTO outfit_match_streak(room_id,streak,best_streak,last_match_day) VALUES($1,$2,$3,CAST($4 AS date))
         ON CONFLICT(room_id) DO UPDATE SET
           streak=EXCLUDED.streak, best_streak=EXCLUDED.best_streak, last_match_day=EXCLUDED.last_match_day
         WHERE outfit_match_streak.last_match_day IS DISTINCT FROM CAST($4 AS date)
         RETURNING room_id, streak, best_streak, to_char(last_match_day,'YYYY-MM-DD') AS last_match_day`,
        [roomId, streak, bestStreak, day]
      ).then((row) => Boolean(row))
    }
  } as RepositoryBundle
}
