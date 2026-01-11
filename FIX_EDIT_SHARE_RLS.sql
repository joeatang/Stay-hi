-- =============================================================================
-- FIX EDIT/DELETE SHARE RLS POLICIES
-- Run this in Supabase SQL Editor if users can't save edits
-- =============================================================================

-- Check current policies on public_shares
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'public_shares';

-- Check current policies on hi_archives
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'hi_archives';

-- =============================================================================
-- FIX PUBLIC_SHARES UPDATE/DELETE POLICIES
-- =============================================================================

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Users can update own shares" ON public_shares;
DROP POLICY IF EXISTS "Users can delete own shares" ON public_shares;
DROP POLICY IF EXISTS "Tesla_community_update_own_shares" ON public_shares;
DROP POLICY IF EXISTS "Tesla_community_delete_own_shares" ON public_shares;

-- Create UPDATE policy for public_shares
CREATE POLICY "Users can update own public shares" ON public_shares
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy for public_shares
CREATE POLICY "Users can delete own public shares" ON public_shares
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================================================
-- FIX HI_ARCHIVES UPDATE/DELETE POLICIES
-- =============================================================================

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Users can update own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can delete own archives" ON hi_archives;
DROP POLICY IF EXISTS "update_own_archives" ON hi_archives;
DROP POLICY IF EXISTS "delete_own_archives" ON hi_archives;

-- Create UPDATE policy for hi_archives
CREATE POLICY "Users can update own archives" ON hi_archives
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy for hi_archives
CREATE POLICY "Users can delete own archives" ON hi_archives
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Ensure authenticated users have proper grants
GRANT UPDATE, DELETE ON public_shares TO authenticated;
GRANT UPDATE, DELETE ON hi_archives TO authenticated;

-- =============================================================================
-- VERIFY POLICIES WERE CREATED
-- =============================================================================

SELECT '✅ PUBLIC_SHARES POLICIES:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'public_shares' ORDER BY cmd;

SELECT '✅ HI_ARCHIVES POLICIES:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'hi_archives' ORDER BY cmd;
