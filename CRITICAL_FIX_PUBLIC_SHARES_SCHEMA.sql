-- ===============================================
-- 🚨 CRITICAL FIX: Public Shares Schema Mismatch
-- ===============================================
-- Problem: Code expects emoji columns + text field, but database only has content + metadata
-- Solution: Add missing columns to match application code expectations
-- Tesla-grade: Backward compatible schema evolution

-- Add missing columns for emoji journey storage
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS text TEXT,
ADD COLUMN IF NOT EXISTS current_emoji VARCHAR(10),
ADD COLUMN IF NOT EXISTS current_name TEXT,
ADD COLUMN IF NOT EXISTS desired_emoji VARCHAR(10),
ADD COLUMN IF NOT EXISTS desired_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Add visibility column if it doesn't exist (for future anonymous/public distinction)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'public_shares' AND column_name = 'visibility') THEN
    ALTER TABLE public_shares ADD COLUMN visibility TEXT DEFAULT 'public';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_shares_user_id ON public_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_at ON public_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_shares_visibility ON public_shares(visibility);
CREATE INDEX IF NOT EXISTS idx_public_shares_display ON public_shares(display_name, avatar_url);

-- Migrate existing data from content to text field
-- Only for rows where text is null but content exists
UPDATE public_shares 
SET text = content 
WHERE text IS NULL AND content IS NOT NULL;

-- Set default emojis for existing rows without them
UPDATE public_shares 
SET 
  current_emoji = '🙌',
  desired_emoji = '✨',
  current_name = 'Hi Island',
  desired_name = 'Hi Island'
WHERE current_emoji IS NULL;

-- Backfill avatar_url and display_name from profiles for existing shares
UPDATE public_shares ps
SET 
  avatar_url = p.avatar_url,
  display_name = COALESCE(p.display_name, p.username, 'Hi Friend')
FROM profiles p
WHERE ps.user_id = p.id
  AND ps.user_id IS NOT NULL
  AND ps.avatar_url IS NULL
  AND ps.is_anonymous = FALSE;

-- Add helpful comments
COMMENT ON COLUMN public_shares.text IS 'Full share text with emoji journey and user message';
COMMENT ON COLUMN public_shares.current_emoji IS 'Starting emotion emoji';
COMMENT ON COLUMN public_shares.current_name IS 'Starting emotion name';
COMMENT ON COLUMN public_shares.desired_emoji IS 'Desired emotion emoji';
COMMENT ON COLUMN public_shares.desired_name IS 'Desired emotion name';
COMMENT ON COLUMN public_shares.avatar_url IS 'Snapshot of user avatar at share time (immutable)';
COMMENT ON COLUMN public_shares.display_name IS 'Snapshot of user display name at share time (immutable)';
COMMENT ON COLUMN public_shares.location IS 'Share location (city, state)';
COMMENT ON COLUMN public_shares.visibility IS 'Share visibility: public, anonymous, or private';

-- Verify schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_shares'
ORDER BY ordinal_position;
