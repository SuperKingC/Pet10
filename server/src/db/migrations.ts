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

    CREATE TABLE IF NOT EXISTS anniversaries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      icon text NOT NULL,
      note text NOT NULL DEFAULT '',
      day date NOT NULL,
      repeat_rule text NOT NULL DEFAULT 'yearly' CHECK (repeat_rule IN ('yearly', 'none')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (room_id, name, day)
    );

    CREATE INDEX IF NOT EXISTS anniversaries_room_idx
      ON anniversaries (room_id, created_at);

    CREATE TABLE IF NOT EXISTS diaries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day date NOT NULL,
      title text NOT NULL DEFAULT '',
      body text NOT NULL DEFAULT '',
      location text NOT NULL DEFAULT '',
      photos jsonb NOT NULL DEFAULT '[]',
      liked boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS diaries_user_day_idx
      ON diaries (user_id, day DESC);

    CREATE TABLE IF NOT EXISTS nest_task_progress (
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      task_key text NOT NULL,
      period_key text NOT NULL DEFAULT '',       -- 每日任务存日期（如 2026-08-30），成就型留空串
      progress int NOT NULL DEFAULT 0,
      claimed boolean NOT NULL DEFAULT false,
      claimed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (room_id, task_key)
    );

    CREATE TABLE IF NOT EXISTS room_inventory (
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      item_id text NOT NULL,
      count int NOT NULL DEFAULT 0 CHECK (count >= 0),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (room_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS room_pouches (
      room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
      granted_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS photo_wall (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      origin text NOT NULL DEFAULT 'manual'
        CHECK (origin IN ('manual', 'match_outfit', 'levelup', 'anniversary', 'codeword_streak')),
      photo text NOT NULL DEFAULT '',
      caption text NOT NULL DEFAULT '',
      ref_key text,
      taken_day date,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS photo_wall_room_idx
      ON photo_wall (room_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS pet_wardrobe (
      room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
      equipped text NOT NULL DEFAULT 'default',
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- GM 全解锁开关（测试用）：true 时衣柜忽略解锁条件
    ALTER TABLE pet_wardrobe ADD COLUMN IF NOT EXISTS gm_unlock_all boolean NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS outfit_match_daily (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      day date NOT NULL,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (room_id, day, user_id)
    );

    CREATE TABLE IF NOT EXISTS outfit_match_streak (
      room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
      streak int NOT NULL DEFAULT 0,
      best_streak int NOT NULL DEFAULT 0,
      last_match_day date
    );

    -- v1 的用户自建任务表已废弃：旧环境直接删掉（新环境不会创建），
    -- 数据无保留价值（任务定义全部来自代码模板）
    DROP TABLE IF EXISTS nest_tasks;

    -- 八位数字 UID：从 00000001 起递增，存量用户按创建时间顺序回填
    CREATE SEQUENCE IF NOT EXISTS users_uid_seq START 1;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS uid text;
    -- PG 的 UPDATE 不支持 ORDER BY，用 CTE 按序取号（lpad 补零，format 的 %08s 是空格填充）
    WITH ordered AS (
      SELECT id, row_number() OVER (ORDER BY created_at, id) AS seq
      FROM users WHERE uid IS NULL
    )
    UPDATE users SET uid = lpad(nextval('users_uid_seq')::text, 8, '0')
      FROM ordered WHERE users.id = ordered.id;
    -- 回填完再补唯一约束与 NOT NULL，幂等（重复执行时无 NULL 行可更新）
    CREATE UNIQUE INDEX IF NOT EXISTS users_uid_key ON users (uid);
    ALTER TABLE users ALTER COLUMN uid SET NOT NULL;
    ALTER SEQUENCE users_uid_seq OWNED BY users.uid;
  `)
}
