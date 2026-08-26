-- 008_diaries.sql：个人日记（单人记录，小程序小记页）
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
