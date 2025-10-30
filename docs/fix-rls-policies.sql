-- ============================================
-- FIX RLS POLICIES FOR STAY-HI
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow anyone to read profiles (for feed display)
CREATE POLICY "Users can read all profiles"
ON profiles FOR SELECT
USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ============================================
-- 2. PUBLIC_SHARES TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read public shares" ON public_shares;
DROP POLICY IF EXISTS "Authenticated users can insert shares" ON public_shares;
DROP POLICY IF EXISTS "Users can update own shares" ON public_shares;
DROP POLICY IF EXISTS "Users can delete own shares" ON public_shares;

-- Allow anyone to read public shares (for Hi Island feed)
CREATE POLICY "Anyone can read public shares"
ON public_shares FOR SELECT
USING (is_public = true);

-- Allow authenticated users to insert their own shares
CREATE POLICY "Authenticated users can insert shares"
ON public_shares FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own shares
CREATE POLICY "Users can update own shares"
ON public_shares FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own shares
CREATE POLICY "Users can delete own shares"
ON public_shares FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- 3. HI_ARCHIVES TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can insert own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can update own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can delete own archives" ON hi_archives;

-- Allow users to read only their own archives
CREATE POLICY "Users can read own archives"
ON hi_archives FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own archives
CREATE POLICY "Users can insert own archives"
ON hi_archives FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own archives
CREATE POLICY "Users can update own archives"
ON hi_archives FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete only their own archives
CREATE POLICY "Users can delete own archives"
ON hi_archives FOR DELETE
USING (auth.uid() = user_id);


-- ============================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_archives ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 5. STORAGE BUCKET POLICIES (for avatars)
-- ============================================

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view avatars
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Check that policies are created
SELECT 
  tablename, 
  policyname, 
  cmd as operation,
  permissive,
  CASE 
    WHEN roles = '{public}' THEN 'Public'
    WHEN roles = '{authenticated}' THEN 'Authenticated'
    ELSE roles::text
  END as who_can_access
FROM pg_policies
WHERE tablename IN ('profiles', 'public_shares', 'hi_archives')
ORDER BY tablename, cmd;

-- Check RLS is enabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE tablename IN ('profiles', 'public_shares', 'hi_archives')
ORDER BY tablename;
