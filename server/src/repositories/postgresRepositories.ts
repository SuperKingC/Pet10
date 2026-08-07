import type { Pool, PoolClient, QueryResultRow } from 'pg'
import type { RepositoryBundle } from './contracts.js'

type Database = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>

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
      create: (input) => one(
        'INSERT INTO users(email,username,display_name) VALUES($1,$2,$3) RETURNING *',
        [input.email.toLowerCase(), input.username, input.displayName]
      ),
      updateUsername: (id, username) => one('UPDATE users SET username=$2 WHERE id=$1 RETURNING *', [id, username])
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
      findById: (id) => one('SELECT * FROM rooms WHERE id=$1', [id]),
      findByRelationshipId: (relationshipId) => one('SELECT * FROM rooms WHERE relationship_id=$1', [relationshipId]),
      async isMember(roomId, userId) {
        return Boolean(await one('SELECT 1 FROM room_members WHERE room_id=$1 AND user_id=$2', [roomId, userId]))
      }
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
      async deleteById(roomId, memoryId) {
        await database.query('DELETE FROM pet_memories WHERE room_id=$1 AND id=$2', [roomId, memoryId])
      }
    }
  } as RepositoryBundle
}
