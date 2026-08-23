-- 007_anniversaries.sql：纪念日（房间共享，支持每年重复）
-- 注意：docker-entrypoint-initdb.d 只对全新数据卷生效；已部署环境由服务端运行时迁移自动执行。

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

CREATE INDEX IF NOT EXISTS anniversaries_room_idx ON anniversaries (room_id, created_at);
