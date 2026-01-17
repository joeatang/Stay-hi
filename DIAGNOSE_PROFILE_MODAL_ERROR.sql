-- =====================================================================
-- DIAGNOSE: Profile Modal "Failed to load profile" Error
-- Run in Supabase SQL Editor
-- =====================================================================

-- Step 1: Check if get_community_profile function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_community_profile';

-- Step 2: Get user ID for degenmentality@gmail.com
SELECT id, email, created_at
FROM auth.users
WHERE email = 'degenmentality@gmail.com';

-- Step 3: Check if profile exists for this user
SELECT id, username, display_name, bio, avatar_url, created_at, updated_at
FROM profiles
WHERE id IN (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com');

-- Step 4: Test the RPC function directly (replace UUID after running step 2)
-- Uncomment and use the actual user ID from step 2:
-- SELECT * FROM get_community_profile('USER_ID_FROM_STEP_2');

-- Step 5: Check for any RLS policies blocking access
SELECT 
  tablename, 
  policyname, 
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 6: Check function permissions
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'get_community_profile';
