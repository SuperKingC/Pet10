CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invite_codes (
  code text PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  max_uses integer NOT NULL DEFAULT 10 CHECK (max_uses > 0),
  use_count integer NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE relationship_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE IF NOT EXISTS relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status relationship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS relationships_pair_unique
ON relationships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
WHERE status IN ('pending', 'accepted');

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL UNIQUE REFERENCES relationships(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL UNIQUE REFERENCES relationships(id) ON DELETE CASCADE,
  room_id uuid NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '小多利',
  level integer NOT NULL DEFAULT 1,
  experience integer NOT NULL DEFAULT 0,
  experience_to_next_level integer NOT NULL DEFAULT 100,
  hunger integer NOT NULL DEFAULT 80 CHECK (hunger BETWEEN 0 AND 100),
  mood integer NOT NULL DEFAULT 80 CHECK (mood BETWEEN 0 AND 100),
  energy integer NOT NULL DEFAULT 80 CHECK (energy BETWEEN 0 AND 100),
  health integer NOT NULL DEFAULT 100 CHECK (health BETWEEN 0 AND 100),
  intimacy integer NOT NULL DEFAULT 10 CHECK (intimacy BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE message_sender_type AS ENUM ('user', 'pet');
CREATE TYPE message_kind AS ENUM ('text', 'image', 'pet');

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_type message_sender_type NOT NULL,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind message_kind NOT NULL,
  text text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_room_created_idx ON messages(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS room_summaries (
  room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  through_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  text text NOT NULL,
  source_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  can_mention boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_memories_room_idx ON pet_memories(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO invite_codes(code, max_uses)
VALUES ('PET10-DEMO', 10)
ON CONFLICT (code) DO NOTHING;
