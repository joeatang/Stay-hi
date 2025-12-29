-- ================================================================
-- 🔧 FIX HI ISLAND STUCK LOADING + ARCHIVES 400 ERROR
-- Issue: hi_archives table queries returning 400 (table missing OR RLS blocking)
-- Solution: Ensure table exists + graceful error handling
-- ================================================================

-- STEP 1: Ensure hi_archives table exists in production
-- ================================================================
CREATE TABLE IF NOT EXISTS hi_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  share_type TEXT DEFAULT 'hi5' CHECK (share_type IN ('hi5', 'moment', 'reflection', 'private')),
  visibility TEXT NOT NULL DEFAULT 'private',
  original_share_id UUID, -- Reference to public_shares if applicable
  location_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 2: Create index for performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_hi_archives_user_created 
  ON hi_archives(user_id, created_at DESC);

-- STEP 3: Enable Row Level Security
-- ================================================================
ALTER TABLE hi_archives ENABLE ROW LEVEL SECURITY;

-- STEP 4: Fix RLS Policies (Handle authenticated users only)
-- ================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can insert their own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can update their own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can delete their own archives" ON hi_archives;

-- SELECT: Only authenticated users can see their own archives
CREATE POLICY "Users can view their own archives" ON hi_archives
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- INSERT: Only authenticated users can create archives
CREATE POLICY "Users can insert their own archives" ON hi_archives
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- UPDATE: Only authenticated users can update their archives
CREATE POLICY "Users can update their own archives" ON hi_archives
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- DELETE: Only authenticated users can delete their archives
CREATE POLICY "Users can delete their own archives" ON hi_archives
  FOR DELETE 
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- ================================================================
-- VERIFICATION QUERIES (Run these to confirm fix)
-- ================================================================

-- 1. Check table exists
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'hi_archives'
) AS hi_archives_exists;

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'hi_archives';

-- 3. Check policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'hi_archives';

-- 4. Test authenticated user access (replace with real user_id)
-- SELECT * FROM hi_archives WHERE user_id = auth.uid() LIMIT 1;

-- ================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ================================================================
-- 
-- This SQL is SAFE to run multiple times (idempotent)
-- - CREATE TABLE IF NOT EXISTS won't error if table exists
-- - DROP POLICY IF EXISTS won't error if policy doesn't exist
-- - CREATE INDEX IF NOT EXISTS won't error if index exists
--
-- After running this:
-- 1. Refresh Hi Island page
-- 2. Sign in as authenticated user
-- 3. My Archives tab should now load (or show auth prompt if not signed in)
-- 4. General Shares should continue working normally
-- ================================================================
