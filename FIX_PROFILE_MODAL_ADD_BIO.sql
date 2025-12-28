-- =====================================================================
-- FIX: Add Bio to Profile Modal RPC Function
-- Issue: Profile modal was not showing user bios
-- Cause: get_community_profile() RPC function didn't include bio field
-- Solution: Add bio to the function's return columns
-- =====================================================================

-- Drop existing function (if any)
DROP FUNCTION IF EXISTS get_community_profile(UUID);

-- Create updated function with bio field included
CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return basic display info including bio (community-safe public data)
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio
  FROM profiles p
  WHERE p.id = target_user_id;
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO authenticated, anon;

-- =====================================================================
-- VERIFICATION QUERIES - Run these to test
-- =====================================================================

-- Test 1: Verify function exists and has correct return type
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_community_profile';

-- Test 2: Check function parameters
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_name = 'get_community_profile';

-- Test 3: Test with your user ID (replace with actual ID)
SELECT * FROM get_community_profile('68d6ac30-742a-47b4-b1d7-0631bf7a2ec6');
-- Expected result: Should return id, username, display_name, avatar_url, AND bio

-- Test 4: Verify all users' bio data is accessible
SELECT 
  COUNT(*) as total_users,
  COUNT(bio) as users_with_bio,
  COUNT(*) - COUNT(bio) as users_without_bio
FROM profiles;

-- Test 5: Sample profiles with bios (to verify data exists)
SELECT 
  username,
  display_name,
  LEFT(bio, 50) as bio_preview,
  LENGTH(bio) as bio_length
FROM profiles
WHERE bio IS NOT NULL AND bio != ''
LIMIT 5;

-- =====================================================================
-- EXPECTED BEHAVIOR AFTER FIX
-- =====================================================================
-- 1. Profile modal will fetch bio data for all users
-- 2. Users WITH bios: Display their actual bio text
-- 3. Users WITHOUT bios: Show default fallback text
-- 4. Anonymous users: Show "shares anonymously" message
-- 5. Real-time: Every profile click queries latest bio data
-- 6. Universal: Works for all users regardless of tier

-- =====================================================================
-- TROUBLESHOOTING
-- =====================================================================
-- If bio still doesn't show after deploying:
-- 1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
-- 2. Check console for: "✅ Community profile fetched: {has_bio: true}"
-- 3. Run Test 3 above with your user ID to verify RPC returns bio
-- 4. Verify permissions: SELECT * FROM pg_proc WHERE proname = 'get_community_profile';
