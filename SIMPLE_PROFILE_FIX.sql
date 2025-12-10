-- ===============================================
-- PROFILE FIX - SIMPLE & EFFECTIVE
-- ===============================================
-- Only fixes: Profile changes appear immediately in community feed
-- No complexity, no dependencies, no breaking changes
-- Date: December 10, 2025

-- Create view that shows LIVE profile data in feeds
CREATE OR REPLACE VIEW public_shares_with_live_profiles AS
SELECT 
  ps.*,
  COALESCE(p.username, ps.metadata->>'username', 'Anonymous') as username,
  COALESCE(p.display_name, ps.metadata->>'display_name', p.username) as display_name,
  COALESCE(p.avatar_url, ps.metadata->>'avatar_url') as avatar_url
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id;

-- Grant permissions
GRANT SELECT ON public_shares_with_live_profiles TO authenticated, anon;

-- Verify
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'public_shares_with_live_profiles') THEN
    RAISE NOTICE '✅ View created - profile updates will appear immediately in feed';
  END IF;
END $$;
