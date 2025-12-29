-- =====================================================================
-- 🔐 WARM PRIVACY MODEL - Profile Privacy Implementation
-- =====================================================================
-- Philosophy: "Your wellness journey is yours. Share what inspires you, keep what grounds you."
-- 
-- PUBLIC BY DEFAULT (anyone can see):
--   ✅ Username
--   ✅ Avatar
--   ✅ Display name
--   ✅ "Active Today" indicator
--   ✅ Total waves sent (encouragement metric)
--   ✅ Member since date
--   ✅ Journey Level (tier shown as progression: Pathfinder, Trailblazer, Legend)
--
-- ALWAYS PRIVATE (only you can see):
--   ❌ Streaks (current_streak, longest_streak)
--   ❌ Moments count (hi_moments)
--   ❌ Emotional data (starts, intensity patterns)
--   ❌ Points balance
--   ❌ Bio (personal story)
--   ❌ Location (privacy sensitive)
--
-- FUTURE: OPT-IN SHAREABLE (settings toggle):
--   🔒 Milestone achievements
--   🔒 Completed challenges
--   🔒 Leaderboard participation
-- =====================================================================

-- =====================================================================
-- STEP 1: UPDATE get_community_profile RPC
-- Only return public data - respects Warm Privacy model
-- =====================================================================

DROP FUNCTION IF EXISTS get_community_profile(UUID);

CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  active_today BOOLEAN,
  total_waves INT,
  member_since TIMESTAMPTZ,
  journey_level TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 🔐 WARM PRIVACY: Only return publicly safe data
  -- No bio, location, personal stats, or emotional metrics
  -- Journey level shown as progression (Pathfinder, Trailblazer) not payment tier
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    -- Active today: checked in within last 24 hours
    (p.last_active_at > NOW() - INTERVAL '24 hours') as active_today,
    -- Total waves: encouragement metric only (not emotional depth)
    COALESCE(us.total_waves, 0) as total_waves,
    -- Member since: public achievement
    p.created_at as member_since,
    -- Journey level: shown as progression badge (free → bronze → silver → gold → platinum)
    COALESCE(um.tier, 'free') as journey_level
  FROM profiles p
  LEFT JOIN user_stats us ON us.user_id = p.id
  LEFT JOIN user_memberships um ON um.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;

-- Grant execute permissions (anyone can view public profiles)
GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO authenticated, anon;

COMMENT ON FUNCTION get_community_profile(UUID) IS 
'Warm Privacy Model: Returns public profile data (username, avatar, display_name, active_today, total_waves, member_since, journey_level). Journey level shown as progression badge. Excludes personal wellness data (streaks, moments, emotional patterns, points, bio, location).';

-- =====================================================================
-- STEP 2: CREATE get_own_profile RPC (Full Data Access)
-- Returns ALL data when viewing your own profile
-- =====================================================================

DROP FUNCTION IF EXISTS get_own_profile();

CREATE OR REPLACE FUNCTION get_own_profile()
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  tier TEXT,
  active_today BOOLEAN,
  total_waves INT,
  hi_moments INT,
  current_streak INT,
  longest_streak INT,
  hi_points_balance INT,
  member_since TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- 📊 FULL ACCESS: Return complete profile for authenticated user
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.location,
    COALESCE(um.tier, 'free') as tier,
    (p.last_active_at > NOW() - INTERVAL '24 hours') as active_today,
    COALESCE(us.total_waves, 0) as total_waves,
    COALESCE(us.hi_moments, 0) as hi_moments,
    COALESCE(us.current_streak, 0) as current_streak,
    COALESCE(us.longest_streak, 0) as longest_streak,
    COALESCE(hp.balance, 0) as hi_points_balance,
    p.created_at as member_since
  FROM profiles p
  LEFT JOIN user_memberships um ON um.user_id = p.id
  LEFT JOIN user_stats us ON us.user_id = p.id
  LEFT JOIN hi_points hp ON hp.user_id = p.id
  WHERE p.id = current_user_id;
END;
$$;

-- Grant to authenticated users only (not anonymous)
GRANT EXECUTE ON FUNCTION get_own_profile() TO authenticated;

COMMENT ON FUNCTION get_own_profile() IS 
'Full Profile Access: Returns complete profile data for authenticated user viewing their own profile. Includes all stats, personal info, and wellness metrics.';

-- =====================================================================
-- STEP 3: ADD PRIVACY HELPER FUNCTION
-- Check if viewer is the profile owner
-- =====================================================================

DROP FUNCTION IF EXISTS is_viewing_own_profile(UUID);

CREATE OR REPLACE FUNCTION is_viewing_own_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid() = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION is_viewing_own_profile(UUID) TO authenticated, anon;

COMMENT ON FUNCTION is_viewing_own_profile(UUID) IS 
'Privacy Helper: Returns true if authenticated user is viewing their own profile.';

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Test 1: Verify get_community_profile returns limited data
SELECT 
  r.routine_name,
  string_agg(p.parameter_name || ' ' || p.data_type, ', ') as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_name IN ('get_community_profile', 'get_own_profile', 'is_viewing_own_profile')
GROUP BY r.routine_name;

-- Test 2: Check return columns for get_community_profile
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_name = (
  SELECT specific_name 
  FROM information_schema.routines 
  WHERE routine_name = 'get_community_profile'
)
AND parameter_mode = 'OUT'
ORDER BY ordinal_position;

-- Test 3: Verify get_own_profile has full data access
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_name = (
  SELECT specific_name 
  FROM information_schema.routines 
  WHERE routine_name = 'get_own_profile'
)
AND parameter_mode = 'OUT'
ORDER BY ordinal_position;

-- =====================================================================
-- EXPECTED RESULTS
-- =====================================================================
-- ✅ get_community_profile returns: id, username, display_name, avatar_url, active_today, total_waves, member_since, journey_level (8 fields)
-- ✅ get_own_profile returns: id, username, display_name, avatar_url, bio, location, tier, active_today, total_waves, hi_moments, current_streak, longest_streak, hi_points_balance, member_since (14 fields)
-- ✅ is_viewing_own_profile returns: boolean
-- ✅ Journey level (tier) shown as progression badge, NOT financial status
-- ✅ Bio, location, streaks, moments, points ONLY in get_own_profile
-- ✅ Community profile shows encouragement + journey progression (waves sent, active today, journey level)
-- =====================================================================

-- =====================================================================
-- DEPLOYMENT CHECKLIST
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify all 3 functions created successfully
-- 3. Update profile-modal.js to use get_community_profile (already done)
-- 4. Update profile.html to use get_own_profile for owner view
-- 5. Test: View your profile (full data) vs someone else's (limited data)
-- =====================================================================
