-- =====================================================
-- PRODUCTION REGRESSION FIX
-- Issues: Check-in error + Avatar upload blocked
-- Deployment: Zero downtime, backwards compatible
-- =====================================================

-- =====================================================
-- PART 1: STORAGE POLICIES FIX (Avatar Regression)
-- =====================================================
-- ROOT CAUSE: RLS requires auth.uid() matching folder name
-- This blocks new users who aren't fully authenticated yet
-- ORIGINAL: temp/ folder fallback worked
-- FIX: Allow temp/ uploads + keep authenticated path secure

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;

-- =====================================================
-- GOLD STANDARD POLICIES: Authenticated + Anonymous
-- =====================================================

-- Policy 1: Authenticated users upload to their folder
CREATE POLICY "Authenticated users upload to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: New/anonymous users upload to temp/ folder
-- This is the CRITICAL FIX for regression
CREATE POLICY "Anonymous users upload to temp folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'temp'
);

-- Policy 3: Users upload to users/ folder (persistent anonymous)
-- Fallback for stable user IDs before full auth
CREATE POLICY "Persistent users upload to users folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'users'
);

-- Policy 4: Update own avatars (authenticated)
CREATE POLICY "Authenticated users update own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Update temp avatars (anyone can update temp)
CREATE POLICY "Anyone updates temp avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'temp'
);

-- Policy 6: Delete own avatars (authenticated)
CREATE POLICY "Authenticated users delete own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 7: Delete temp avatars (cleanup)
CREATE POLICY "Anyone deletes temp avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'temp'
);

-- Policy 8: Public viewing (all avatars)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
  policyname, 
  permissive, 
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Check bucket config
SELECT name, public, allowed_mime_types, file_size_limit 
FROM storage.buckets 
WHERE name = 'avatars';
