-- 005_wechat_multi_room.sql：微信身份映射与多关系小窝约束。

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
