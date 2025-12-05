-- ===============================================
-- 🎯 FIX: Avatar Snapshot for Public Shares
-- ===============================================
-- Problem: Old shares show updated avatars because of profile JOIN
-- Solution: Snapshot avatar_url and display_name at share time
-- Tesla-grade: Immutable share history

-- Add columns to snapshot user profile at share time
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_public_shares_display 
ON public_shares(display_name, avatar_url);

-- Backfill existing shares with current profile data (one-time migration)
-- This will set existing shares to show current avatars
-- Future shares will snapshot avatar at share time
UPDATE public_shares ps
SET 
  avatar_url = p.avatar_url,
  display_name = COALESCE(p.display_name, p.username)
FROM profiles p
WHERE ps.user_id = p.id
AND ps.user_id IS NOT NULL
AND ps.avatar_url IS NULL; -- Only update if not already set

-- Comment explaining the change
COMMENT ON COLUMN public_shares.avatar_url IS 'Snapshot of user avatar at share time - immutable share history';
COMMENT ON COLUMN public_shares.display_name IS 'Snapshot of user display name at share time - immutable share history';
