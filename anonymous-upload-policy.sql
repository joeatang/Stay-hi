-- =====================================================
-- ANONYMOUS UPLOAD POLICY FOR DEMO APP
-- Add to Supabase SQL Editor to allow anonymous uploads
-- =====================================================

-- Allow anonymous uploads to temp folder
CREATE POLICY "Allow anonymous uploads to temp folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND storage.foldername(name) = 'temp'
);

-- Allow anonymous uploads to public folder (alternative)
CREATE POLICY "Allow anonymous uploads to public folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND storage.foldername(name) = 'public'
);

-- Verify policies are created
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%anonymous%';

-- Test anonymous upload capability
-- You can test this by running an upload from the profile page