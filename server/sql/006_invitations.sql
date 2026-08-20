-- 006_invitations.sql：微信好友邀请凭证。

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
