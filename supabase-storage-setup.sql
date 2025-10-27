-- =====================================================
-- SUPABASE STORAGE BUCKET SETUP
-- Tesla-Grade Avatar Storage Configuration
-- =====================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  15728640, -- 15MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- =====================================================

-- Policy: Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to update their own avatars  
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public viewing of avatars (for profile display)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- =====================================================
-- TRIGGER TO CLEAN UP OLD AVATARS
-- =====================================================

-- Function to clean up old avatar files when new ones are uploaded
CREATE OR REPLACE FUNCTION cleanup_old_avatars()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old avatar files when avatar_url is updated
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url 
     AND OLD.avatar_url IS NOT NULL 
     AND OLD.avatar_url LIKE '%/storage/v1/object/public/avatars/%' THEN
    
    -- Extract file path from old URL and delete from storage
    PERFORM storage.delete_object(
      'avatars', 
      regexp_replace(OLD.avatar_url, '.*/avatars/', '')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles table to cleanup old avatars
DROP TRIGGER IF EXISTS cleanup_old_avatars_trigger ON profiles;
CREATE TRIGGER cleanup_old_avatars_trigger
  AFTER UPDATE OF avatar_url ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_avatars();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if bucket was created successfully
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check storage policies
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%avatar%';

-- Test storage permissions (run after creating bucket)
-- SELECT storage.extension('pgcrypto');

COMMENT ON TABLE storage.buckets IS 'Tesla-Grade avatar storage configuration with automatic cleanup and proper security policies';