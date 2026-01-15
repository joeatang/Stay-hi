-- ============================================================================
-- FIX: admin_roles 500 Internal Server Error
-- ============================================================================
-- 
-- ISSUE: Direct SELECT on admin_roles table returns 500 error
-- This happens when RLS policies reference themselves or have circular deps
--
-- Run this in Supabase SQL Editor to diagnose and fix
-- ============================================================================

-- STEP 1: Check if admin_roles table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_roles'
ORDER BY ordinal_position;

-- STEP 2: Check current RLS policies
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'admin_roles';

-- STEP 3: Check if RLS is enabled
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'admin_roles';

-- STEP 4: EMERGENCY FIX - Create simple non-circular RLS policies
-- Drop existing policies if they cause 500 errors
-- DROP POLICY IF EXISTS "Admin roles visible to admins" ON admin_roles;
-- DROP POLICY IF EXISTS "Users can view own admin role" ON admin_roles;

-- STEP 5: Create safe policies (uncomment to run)
/*
-- Allow users to read their own admin role (no circular reference)
CREATE POLICY "Users can read own admin role"
  ON admin_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Service role full access"
  ON admin_roles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
*/

-- STEP 6: Verify the fix works
SELECT 'Testing admin_roles query...' as status;
SELECT user_id, role_type, is_active 
FROM admin_roles 
WHERE user_id = auth.uid()
LIMIT 1;

SELECT '✅ If you see this, admin_roles query succeeded!' as status;
