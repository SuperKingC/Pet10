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
