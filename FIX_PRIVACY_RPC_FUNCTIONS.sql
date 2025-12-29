-- =====================================================================
-- 🔧 FIX: Privacy RPC Functions - Remove last_active_at References
-- =====================================================================
-- Issue: Functions reference p.last_active_at column which doesn't exist
-- Fix: Use p.updated_at as proxy for activity (updated when profile changes)
-- =====================================================================

-- =====================================================================
-- FIX 1: get_community_profile - Remove last_active_at
-- =====================================================================

DROP FUNCTION IF EXISTS get_community_profile(UUID);

CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
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
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    -- Active today: Check for medallion tap (check-in), shares, or reactions
    CASE 
      WHEN p.updated_at > NOW() - INTERVAL '24 hours' THEN true
      WHEN EXISTS (
        SELECT 1 FROM public_shares ps 
        WHERE ps.user_id = p.id 
        AND ps.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM wave_reactions wr 
        WHERE wr.user_id = p.id 
        AND wr.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM peace_reactions pr 
        WHERE pr.user_id = p.id 
        AND pr.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM hi_points_ledger hpl 
        WHERE hpl.user_id = p.id 
        AND hpl.ts > NOW() - INTERVAL '24 hours'
        AND hpl.reason LIKE '%daily%'
        LIMIT 1
      ) THEN true
      ELSE false
    END as active_today,
    -- Total waves: Use existing user_stats value (already includes all reactions)
    COALESCE(us.total_waves, 0) as total_waves,
    -- Member since: public achievement
    p.created_at as member_since,
    -- Journey level: progression badge (free, bronze, silver, gold, platinum)
    COALESCE(um.tier, 'free') as journey_level
  FROM profiles p
  LEFT JOIN user_stats us ON us.user_id = p.id
  LEFT JOIN user_memberships um ON um.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO authenticated, anon;

COMMENT ON FUNCTION get_community_profile(UUID) IS 
'Warm Privacy Model: Returns public profile data including bio. Active today checks profile updates, shares, reactions, and daily check-ins.';

-- =====================================================================
-- FIX 2: get_own_profile - Remove last_active_at
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
  member_since TIMESTAMPTZ,
  points_balance INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 🔓 FULL ACCESS: User viewing their own profile
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.location,
    COALESCE(um.tier, 'free') as tier,
    -- Active today: Check for medallion tap (check-in), shares, or reactions
    CASE 
      WHEN p.updated_at > NOW() - INTERVAL '24 hours' THEN true
      WHEN EXISTS (
        SELECT 1 FROM public_shares ps 
        WHERE ps.user_id = current_user_id 
        AND ps.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM wave_reactions wr 
        WHERE wr.user_id = current_user_id 
        AND wr.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM peace_reactions pr 
        WHERE pr.user_id = current_user_id 
        AND pr.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM hi_points_ledger hpl 
        WHERE hpl.user_id = current_user_id 
        AND hpl.ts > NOW() - INTERVAL '24 hours'
        AND hpl.reason LIKE '%daily%'
        LIMIT 1
      ) THEN true
      ELSE false
    END as active_today,
    -- Total waves: Use existing value from user_stats
    COALESCE(us.total_waves, 0) as total_waves,
    COALESCE(us.hi_moments, 0) as hi_moments,
    COALESCE(us.current_streak, 0) as current_streak,
    COALESCE(us.longest_streak, 0) as longest_streak,
    p.created_at as member_since,
    COALESCE(hp.balance, 0) as points_balance
  FROM profiles p
  LEFT JOIN user_stats us ON us.user_id = p.id
  LEFT JOIN user_memberships um ON um.user_id = p.id
  LEFT JOIN hi_points hp ON hp.user_id = p.id
  WHERE p.id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_own_profile() TO authenticated;

COMMENT ON FUNCTION get_own_profile() IS 
'Returns full profile data for authenticated user (includes private wellness metrics, bio, location, points).';

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================

-- Test get_community_profile (should work without errors)
-- SELECT * FROM get_community_profile('3610b287-54ef-4f4b-9ed0-ac70d5742667');

-- Test get_own_profile (must be authenticated)
-- SELECT * FROM get_own_profile();
