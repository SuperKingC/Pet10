interface MigrationDatabase {
  query(sql: string): Promise<unknown>
}

export async function ensureRuntimeMigrations(database: MigrationDatabase): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS personal_fortunes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day date NOT NULL,
      content jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, day)
    );

    CREATE INDEX IF NOT EXISTS personal_fortunes_user_day_idx
      ON personal_fortunes (user_id, day DESC);

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'private';

    ALTER TABLE pet_memories
      ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
      ADD COLUMN IF NOT EXISTS importance smallint NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'inferred',
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

    CREATE TABLE IF NOT EXISTS pet_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      schedule_type text NOT NULL,
      next_run_at timestamptz NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS pet_tasks_due_idx
      ON pet_tasks (next_run_at)
      WHERE status = 'pending';

    CREATE TABLE IF NOT EXISTS wechat_identities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      open_id text NOT NULL UNIQUE,
      union_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS wechat_identities_union_id_idx
      ON wechat_identities (union_id)
      WHERE union_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS relationships_pair_unique
      ON relationships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
      WHERE status IN ('pending', 'accepted');

    CREATE UNIQUE INDEX IF NOT EXISTS rooms_relationship_unique
      ON rooms (relationship_id)
      WHERE relationship_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS pets_relationship_unique
      ON pets (relationship_id);

    CREATE UNIQUE INDEX IF NOT EXISTS pets_room_unique
      ON pets (room_id);

    CREATE TABLE IF NOT EXISTS invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      token text NOT NULL UNIQUE,
      inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
      expires_at timestamptz NOT NULL,
      accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      accepted_at timestamptz
    );

    CREATE INDEX IF NOT EXISTS invitations_inviter_idx
      ON invitations (inviter_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS invitations_pending_expiry_idx
      ON invitations (expires_at)
      WHERE status = 'pending';
  `)
}
