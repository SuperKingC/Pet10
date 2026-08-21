import { describe, expect, it, vi } from 'vitest'
import { ensureRuntimeMigrations } from './migrations.js'

describe('runtime migrations', () => {
  it('creates persistent runtime tables and constraints idempotently', async () => {
    let executedSql = ''
    const query = vi.fn(async (sql: string) => {
      executedSql = sql
      return { rows: [] }
    })

    await ensureRuntimeMigrations({ query })

    expect(query).toHaveBeenCalledTimes(1)
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS personal_fortunes')
    expect(executedSql).toContain('UNIQUE (user_id, day)')
    expect(executedSql).toContain('CREATE INDEX IF NOT EXISTS personal_fortunes_user_day_idx')
    expect(executedSql).toContain('ADD COLUMN IF NOT EXISTS category')
    expect(executedSql).toContain('ADD COLUMN IF NOT EXISTS importance')
    expect(executedSql).toContain('ADD COLUMN IF NOT EXISTS source')
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS pet_tasks')
    expect(executedSql).toContain('CREATE INDEX IF NOT EXISTS pet_tasks_due_idx')
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS wechat_identities')
    expect(executedSql).toContain('ADD COLUMN IF NOT EXISTS gender')
    expect(executedSql).toContain("DEFAULT 'private'")
    expect(executedSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS relationships_pair_unique')
    expect(executedSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS rooms_relationship_unique')
    expect(executedSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS pets_relationship_unique')
    expect(executedSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS pets_room_unique')
    expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS invitations')
    expect(executedSql).toContain('CREATE INDEX IF NOT EXISTS invitations_inviter_idx')
    expect(executedSql).toContain('CREATE INDEX IF NOT EXISTS invitations_pending_expiry_idx')
  })
})
