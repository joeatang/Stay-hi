-- =====================================================================
-- FIX: get_own_profile RPC - Robust Version (No Social Links)
-- Run in Supabase SQL Editor
-- 
-- This is the SAFE version that works without requiring schema changes.
-- Social links are a future feature - don't block profile loading for them.
-- 
-- Fixes applied:
-- 1. us.hi_moments → us.total_hi_moments
-- 2. points_balance INT → BIGINT (matches hi_points.balance type)
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
  points_balance BIGINT
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
    -- FIX: Column is total_hi_moments, not hi_moments
    COALESCE(us.total_hi_moments, 0) as hi_moments,
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
'Returns full profile data for authenticated user. Social links will be added when columns exist in profiles table.';

-- =====================================================================
-- VERIFY FIX
-- =====================================================================
SELECT '✅ get_own_profile function updated - working without social columns' as status;
