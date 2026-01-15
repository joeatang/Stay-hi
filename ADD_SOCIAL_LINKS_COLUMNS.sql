-- =========================================
-- ADD SOCIAL LINKS TO PROFILES TABLE
-- Hi-OS v1.0 - January 2026
-- =========================================
-- Run this in Supabase SQL Editor

-- Add social link columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.instagram IS 'Instagram username (without @)';
COMMENT ON COLUMN profiles.twitter IS 'Twitter/X username (without @)';
COMMENT ON COLUMN profiles.tiktok IS 'TikTok username (without @)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN ('instagram', 'twitter', 'tiktok', 'bio', 'location', 'website')
ORDER BY column_name;

-- ✅ Expected output: 3 new columns (instagram, twitter, tiktok) added
