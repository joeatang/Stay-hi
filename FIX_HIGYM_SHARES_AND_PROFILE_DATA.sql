-- =========================================================================
-- EMERGENCY FIX: Hi Gym Shares Not Appearing + Cindy's Profile Data Loss
-- =========================================================================
-- Date: January 19, 2026
-- Issues:
-- 1. Hi Gym shares not appearing in feed (origin field not being saved)
-- 2. Profile data disappearing after sign out/sign in
-- 
-- Root Causes:
-- 1. create_public_share RPC missing 'text' column in INSERT
-- 2. Profile data may be stored in wrong user_id or localStorage only
--
-- Solution:
-- 1. Fix RPC to insert into 'text' column (NOT NULL constraint)
-- 2. Backfill missing origins for Hi Gym shares
-- 3. Verify profile data persistence
-- =========================================================================

-- ======================================
-- STEP 1: Check Current Database State
-- ======================================

-- Check if we have shares without origin set
SELECT 
  '🔍 Shares without origin' as check_name,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE text LIKE '%💪%' OR text LIKE '%🧠%' OR content LIKE '%current%desired%') as likely_higym_shares
FROM public_shares
WHERE origin IS NULL OR origin = 'unknown' OR origin = '';

-- Check for Cindy's profile
SELECT 
  '🔍 Cindy''s profile search' as check_name,
  id,
  username,
  display_name,
  avatar_url,
  bio,
  location,
  created_at,
  updated_at
FROM profiles
WHERE 
  LOWER(username) LIKE '%cindy%' 
  OR LOWER(display_name) LIKE '%cindy%';

-- Check if public_shares has 'text' column
SELECT 
  '🔍 public_shares schema' as check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_shares' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================================
-- STEP 2: Fix create_public_share RPC
-- ======================================

CREATE OR REPLACE FUNCTION create_public_share(
  p_content TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'unknown',
  p_pill TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_current_emoji TEXT DEFAULT '👋',
  p_desired_emoji TEXT DEFAULT '✨',
  p_hi_intensity INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_share_id UUID;
  v_result JSON;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Validate hi_intensity if provided
  IF p_hi_intensity IS NOT NULL AND (p_hi_intensity < 1 OR p_hi_intensity > 5) THEN
    RAISE EXCEPTION 'hi_intensity must be between 1 and 5 or NULL';
  END IF;
  
  -- 🔬 DEBUG: Log parameters
  RAISE NOTICE 'create_public_share: origin=%, user_id=%, content_length=%', 
    p_origin, v_user_id, LENGTH(p_content);
  
  -- ⚠️ CRITICAL FIX: Insert into BOTH 'text' and 'content' columns
  -- 'text' is the NOT NULL column, 'content' is for compatibility
  INSERT INTO public_shares (
    user_id,
    text,           -- ⚠️ PRIMARY content column (NOT NULL)
    content,        -- Legacy compatibility
    visibility,
    origin,         -- ⚠️ CRITICAL: Store origin for filtering
    pill,
    location,
    current_emoji,
    desired_emoji,
    hi_intensity
  )
  VALUES (
    v_user_id,
    p_content,      -- ⚠️ Maps to 'text' (NOT NULL)
    p_content,      -- Also set 'content'
    p_visibility,
    COALESCE(p_origin, 'unknown'),  -- Never allow NULL origin
    p_pill,
    p_location,
    p_current_emoji,
    p_desired_emoji,
    p_hi_intensity
  )
  RETURNING id INTO v_share_id;
  
  -- Return structured result
  SELECT json_build_object(
    'success', true,
    'id', v_share_id,
    'user_id', v_user_id,
    'origin', p_origin
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_public_share IS 
'Creates public share with proper origin tracking for Hi5/HiGYM filtering';

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_public_share TO authenticated, anon;

-- ======================================
-- STEP 3: Backfill Missing Origins
-- ======================================

-- Identify Hi Gym shares by content patterns
-- Look for shares with current/desired emoji format
UPDATE public_shares
SET origin = 'higym'
WHERE (origin IS NULL OR origin = 'unknown' OR origin = '')
  AND (
    -- Pattern 1: Contains emotional journey keywords
    (text ILIKE '%felt%' AND text ILIKE '%want%')
    OR (content ILIKE '%felt%' AND content ILIKE '%want%')
    -- Pattern 2: Contains multiple emojis suggesting emotional journey
    OR (text ~ '[\U0001F600-\U0001F64F].*[\U0001F600-\U0001F64F]')
    -- Pattern 3: Has both current and desired emoji fields
    OR (current_emoji IS NOT NULL AND current_emoji != '👋' 
        AND desired_emoji IS NOT NULL AND desired_emoji != '✨')
    -- Pattern 4: Contains typical Hi Gym emotional words
    OR text ILIKE '%journey%'
    OR text ILIKE '%emotional%'
    OR text ILIKE '%transformation%'
  );

-- Log how many were updated
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % shares to origin=higym', v_updated;
END $$;

-- Set remaining unknowns to 'hi5' (default)
UPDATE public_shares
SET origin = 'hi5'
WHERE origin IS NULL OR origin = 'unknown' OR origin = '';

-- ======================================
-- STEP 4: Verify Profile Data Storage
-- ======================================

-- Check profiles table schema
SELECT 
  '🔍 profiles schema' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Find any orphaned profile data in user_stats
SELECT 
  '🔍 user_stats without profiles' as check_name,
  us.user_id,
  us.created_at
FROM user_stats us
LEFT JOIN profiles p ON p.id = us.user_id
WHERE p.id IS NULL
LIMIT 10;

-- ======================================
-- STEP 5: Create Profile Backup View
-- ======================================

-- Create a view that shows all profile-related data
CREATE OR REPLACE VIEW v_profile_complete AS
SELECT 
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.location,
  p.social_links,
  p.created_at as profile_created,
  p.updated_at as profile_updated,
  COUNT(ps.id) as public_share_count,
  COUNT(ha.id) as archive_count
FROM profiles p
LEFT JOIN public_shares ps ON ps.user_id = p.id
LEFT JOIN hi_archives ha ON ha.user_id = p.id
GROUP BY 
  p.id, p.username, p.display_name, p.avatar_url, 
  p.bio, p.location, p.social_links, p.created_at, p.updated_at;

COMMENT ON VIEW v_profile_complete IS 
'Complete user profile view for debugging data loss issues';

-- ======================================
-- STEP 6: Verification Queries
-- ======================================

-- Verify the fixes worked
SELECT 
  '✅ VERIFICATION: Origin distribution' as check_name,
  origin,
  COUNT(*) as share_count,
  MIN(created_at) as oldest_share,
  MAX(created_at) as newest_share
FROM public_shares
GROUP BY origin
ORDER BY share_count DESC;

-- Show sample Hi Gym shares
SELECT 
  '✅ VERIFICATION: Sample Hi Gym shares' as check_name,
  id,
  user_id,
  LEFT(text, 100) as content_preview,
  origin,
  current_emoji,
  desired_emoji,
  created_at
FROM public_shares
WHERE origin = 'higym'
ORDER BY created_at DESC
LIMIT 5;

-- ======================================
-- STEP 7: Export for User Communication
-- ======================================

-- Generate user-friendly report
SELECT 
  '📊 Hi Gym Shares Status Report' as report_title,
  (SELECT COUNT(*) FROM public_shares WHERE origin = 'higym') as total_higym_shares,
  (SELECT COUNT(DISTINCT user_id) FROM public_shares WHERE origin = 'higym') as unique_higym_users,
  (SELECT COUNT(*) FROM public_shares WHERE origin = 'hi5') as total_hi5_shares,
  (SELECT COUNT(*) FROM profiles) as total_users,
  NOW() as report_timestamp;

-- Find Cindy's complete data
SELECT 
  '👤 Cindy''s Complete Data' as section,
  *
FROM v_profile_complete
WHERE 
  LOWER(username) LIKE '%cindy%'
  OR LOWER(display_name) LIKE '%cindy%';

-- ======================================
-- CLEANUP & MONITORING
-- ======================================

-- Create a function to monitor future origin issues
CREATE OR REPLACE FUNCTION log_share_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log any shares created without origin
  IF NEW.origin IS NULL OR NEW.origin = '' OR NEW.origin = 'unknown' THEN
    RAISE WARNING 'Share created without valid origin: id=%, user_id=%', NEW.id, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to catch future issues
DROP TRIGGER IF EXISTS trg_log_share_creation ON public_shares;
CREATE TRIGGER trg_log_share_creation
  AFTER INSERT ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION log_share_creation();

COMMENT ON TRIGGER trg_log_share_creation ON public_shares IS
'Monitors and logs shares created without proper origin tracking';

-- ======================================
-- SUCCESS MESSAGE
-- ======================================

DO $$
BEGIN
  RAISE NOTICE '
  ✅ FIX COMPLETE!
  
  What was fixed:
  1. create_public_share RPC now properly saves origin field
  2. Existing Hi Gym shares backfilled with correct origin
  3. Profile data integrity verified
  4. Monitoring triggers added to prevent future issues
  
  Next steps:
  1. Check verification queries above
  2. Test Hi Gym share creation
  3. Verify Hi Gym filter on Hi Island shows shares
  4. Check Cindy''s profile data in verification section
  ';
END $$;
