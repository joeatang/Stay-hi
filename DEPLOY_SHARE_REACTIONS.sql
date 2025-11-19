-- DEPLOY_SHARE_REACTIONS.sql
-- Purpose: Persist per-share reactions (e.g., "wave") with idempotency and strong RLS
-- Compatible with Supabase Postgres (auth.users) and existing `public_shares` (uuid id)

-- Optional: required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Table
CREATE TABLE IF NOT EXISTS share_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES public_shares(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('wave','like','favorite')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Idempotency constraint to support Supabase upsert on (user_id, share_id, type)
CREATE UNIQUE INDEX IF NOT EXISTS ux_share_reactions_user_share_type
  ON share_reactions(user_id, share_id, type);

-- 3) RLS: Enable and policies
ALTER TABLE share_reactions ENABLE ROW LEVEL SECURITY;

-- Read own reactions
DROP POLICY IF EXISTS "reactions_select_own" ON share_reactions;
CREATE POLICY "reactions_select_own" ON share_reactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert own reactions
DROP POLICY IF EXISTS "reactions_insert_own" ON share_reactions;
CREATE POLICY "reactions_insert_own" ON share_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete own reactions (optional)
DROP POLICY IF EXISTS "reactions_delete_own" ON share_reactions;
CREATE POLICY "reactions_delete_own" ON share_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Grants (RLS still applies)
GRANT SELECT, INSERT, DELETE ON share_reactions TO authenticated;
-- No anon access; reactions are per-user

-- 5) Sanity checks (safe if tables exist)
-- SELECT * FROM share_reactions LIMIT 1;
-- EXPLAIN SELECT 1 FROM share_reactions WHERE user_id = '00000000-0000-0000-0000-000000000000' AND share_id = '00000000-0000-0000-0000-000000000000' AND type = 'wave';
