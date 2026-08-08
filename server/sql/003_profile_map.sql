-- 003: 公开 ID / 捏脸头像 / 足迹地图
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_code text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config text;

-- 存量用户回填 8 位公开码（字母表排除 0/O/1/I）
UPDATE users
SET public_code = (
  SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  FROM generate_series(1, 8)
)
WHERE public_code IS NULL;

CREATE TABLE IF NOT EXISTS map_lights (
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  spot_id int NOT NULL,
  lit_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, spot_id)
);
