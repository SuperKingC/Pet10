-- 003: 公开 ID / 捏脸头像 / 足迹地图
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_code text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config text;

-- 存量用户回填 8 位公开码（字母表排除 0/O/1/I）
-- 注意：必须逐行生成，批量 UPDATE 的标量子查询只计算一次会导致全员同码
DO $$
DECLARE
  target record;
  code text;
BEGIN
  FOR target IN SELECT id FROM users WHERE public_code IS NULL LOOP
    WHILE TRUE LOOP
      BEGIN
        code := (
          SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
          FROM generate_series(1, 8)
        );
        UPDATE users SET public_code = code WHERE id = target.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- 撞码则重新生成
      END;
    END LOOP;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS map_lights (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  spot_id int NOT NULL,
  lit_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, spot_id)
);
