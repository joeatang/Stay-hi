-- =====================================================================
-- FIX: Add Tier to Profile Modal Display
-- Issue: Profile modals showing "Member" for everyone instead of branded tier
-- Root Cause: get_community_profile() RPC doesn't return tier field
-- Solution: Update RPC to JOIN user_memberships and return tier
-- =====================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_community_profile(UUID);

-- Create updated function with tier field from user_memberships
CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  tier TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return profile data WITH tier from user_memberships
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.location,
    COALESCE(um.tier, 'free') as tier  -- Default to 'free' if no membership record
  FROM profiles p
  LEFT JOIN user_memberships um ON um.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO authenticated, anon;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Test 1: Verify function exists with correct return columns
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_community_profile';

-- Test 2: Check what columns the function returns
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_name = 'get_community_profile'
ORDER BY ordinal_position;

-- Test 3: Test with Joeatang (should show bronze/premium tier)
SELECT * FROM get_community_profile('68d6ac30-742a-47b4-b1d7-0631bf7a2ec6');

-- Test 4: Test with faith user (check their tier)
SELECT * FROM get_community_profile('34330482-7370-4abd-a25d-69f8eaf19003');

-- Test 5: Verify all users have tier data
SELECT 
  p.id,
  p.username,
  p.display_name,
  um.tier,
  CASE 
    WHEN um.tier IS NULL THEN '⚠️ NO MEMBERSHIP RECORD'
    ELSE '✅ HAS TIER'
  END as status
FROM profiles p
LEFT JOIN user_memberships um ON um.user_id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

-- =====================================================================
-- EXPECTED RESULTS
-- =====================================================================
-- Joeatang should show: tier = 'bronze' or 'premium' (based on your current tier)
-- Faith should show: tier = 'free' or 'bronze' (based on their signup)
-- All users should show SOME tier (never null due to COALESCE)
-- =====================================================================
