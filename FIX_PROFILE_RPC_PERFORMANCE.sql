-- =====================================================================
-- 🚀 PERFORMANCE FIX: Profile RPC Functions
-- =====================================================================
-- Issue: get_community_profile is slow due to multiple subqueries
-- Fix: Simplify active_today check, ensure indexes exist
-- Bio: PUBLIC (users want to show their bios - it's a flex!)
-- =====================================================================

-- =====================================================================
-- 1. OPTIMIZED get_community_profile (removes expensive subqueries)
-- =====================================================================

DROP FUNCTION IF EXISTS get_community_profile(UUID);

CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,                    -- 🔓 PUBLIC: Bio is part of the flex!
  active_today BOOLEAN,
  total_waves INT,
  member_since TIMESTAMPTZ,
  journey_level TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE  -- Marked STABLE for query optimizer (doesn't modify data)
AS $$
BEGIN
  -- 🌟 WARM COMMUNITY: Return public profile data with key stats
  -- Bio is PUBLIC - users want to express themselves!
  -- 🚀 PERFORMANCE: Single efficient query with index-friendly joins
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,                     -- 🔓 PUBLIC: Bio is the flex
    -- Active today: Simple check using profile or stats update
    -- This is fast because it uses existing timestamp columns
    (
      p.updated_at > NOW() - INTERVAL '24 hours' OR
      COALESCE(us.updated_at, p.created_at) > NOW() - INTERVAL '24 hours'
    ) as active_today,
    -- Total waves: Use existing user_stats value (the flex stat!)
    COALESCE(us.total_waves, 0)::INT as total_waves,
    -- Member since: public achievement
    p.created_at as member_since,
    -- Journey level: progression badge
    COALESCE(um.tier, 'free') as journey_level
  FROM profiles p
  LEFT JOIN user_stats us ON us.user_id = p.id
  LEFT JOIN user_memberships um ON um.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;

COMMENT ON FUNCTION get_community_profile IS 'Community profile fetch - returns public data including bio (users flex!). Location is PRIVATE.';

-- =====================================================================
-- 2. ENSURE INDEXES EXIST for fast lookups
-- =====================================================================

-- Profile lookup by ID (should already exist as PK)
-- CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- User stats lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- User memberships lookup by user_id  
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);

-- =====================================================================
-- 3. GRANT EXECUTE to authenticated and anon users
-- =====================================================================

GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO anon;

-- =====================================================================
-- 4. TEST the function
-- =====================================================================

-- Quick test (replace with a real user_id from your database):
-- SELECT * FROM get_community_profile('68d6ac30-742a-47b4-b1d7-0631bf7a2ec6');

-- =====================================================================
-- 5. ANALYZE tables for query optimizer
-- =====================================================================

ANALYZE profiles;
ANALYZE user_stats;
ANALYZE user_memberships;

-- =====================================================================
-- ✅ VERIFICATION QUERY (run after deployment)
-- =====================================================================
-- 
-- EXPLAIN ANALYZE SELECT * FROM get_community_profile('YOUR-USER-ID-HERE');
-- 
-- Expected: Single Index Scan on profiles, no sequential scans
-- Target time: < 10ms
-- =====================================================================
