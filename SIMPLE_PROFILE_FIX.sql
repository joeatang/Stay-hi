-- ===============================================
-- PROFILE FIX - SIMPLE & EFFECTIVE
-- ===============================================
-- Only fixes: Profile changes appear immediately in community feed
-- No complexity, no dependencies, no breaking changes
-- Date: December 10, 2025

-- Create view that shows LIVE profile data in feeds
CREATE OR REPLACE VIEW public_shares_with_live_profiles AS
SELECT 
  ps.id,
  ps.user_id,
  ps.content,
  ps.visibility,
  ps.share_type,
  ps.location_data,
  ps.total_his,
  ps.created_at,
  ps.updated_at,
  -- LIVE profile data from profiles table
  COALESCE(p.username, 'Anonymous') as username,
  COALESCE(p.display_name, p.username, 'Anonymous') as display_name,
  COALESCE(p.avatar_url, '') as avatar_url
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
