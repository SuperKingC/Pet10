-- 002_social.sql：社交化改版（多好友 / 个人资料 / 心情 / 动态 / 通知 / 运势 / 暗号 / 宠物私聊房）
-- 注意：docker-entrypoint-initdb.d 只对全新数据卷生效；已部署环境需手工执行本文件（全部语句幂等）。

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mbti text;

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'pair';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS proactive_enabled boolean NOT NULL DEFAULT true;
-- 宠物私聊房（pet_dm）不挂接关系，relationship_id 允许为空
ALTER TABLE rooms ALTER COLUMN relationship_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 4),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id, day)
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'user' CHECK (author_type IN ('user', 'pet')),
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  text text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_room_created_idx ON posts (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fortunes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day date NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, day)
);

CREATE TABLE IF NOT EXISTS codeword_answers (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day date NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, day, user_id)
);

CREATE INDEX IF NOT EXISTS pet_events_room_idx ON pet_events (pet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, endpoint)
);
