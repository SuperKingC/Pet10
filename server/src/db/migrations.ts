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
  `)
}
