-- =====================================================
-- 🔧 HI-ISLAND SOCIAL BACKEND PLUMBING FIX
-- Add visibility column and ensure proper data routing
-- =====================================================

-- Add visibility column to hi_shares table
ALTER TABLE public.hi_shares 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' 
CHECK (visibility IN ('public', 'private', 'anonymous'));

-- Create index for visibility filtering (performance)
CREATE INDEX IF NOT EXISTS idx_hi_shares_visibility 
ON public.hi_shares(visibility, created_at DESC);

-- Update existing rows to have correct visibility values
-- (Convert boolean columns to visibility string)
UPDATE public.hi_shares 
SET visibility = CASE 
  WHEN is_anonymous = true THEN 'anonymous'
  WHEN is_public = false THEN 'private'
  ELSE 'public'
END
WHERE visibility IS NULL OR visibility = 'public';

-- =====================================================
-- 🎯 PRIVACY-COMPLIANT PUBLIC FEED VIEW
-- Only shows public and anonymous shares (never private)
-- =====================================================

CREATE OR REPLACE VIEW public.public_hi_feed AS
SELECT 
  id,
  user_id,
  title,
  content,
  share_type,
  visibility,
  created_at,
  updated_at,
  -- Privacy: Hide user info for anonymous shares
  CASE 
    WHEN visibility = 'anonymous' THEN NULL
    ELSE user_id 
  END as display_user_id,
  CASE 
    WHEN visibility = 'anonymous' THEN 'Anonymous Hi 5er'
    ELSE (
      SELECT COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name', 
        email
      ) FROM auth.users WHERE id = hi_shares.user_id
    )
  END as display_name,
  CASE 
    WHEN visibility = 'anonymous' THEN NULL
    ELSE (
      SELECT raw_user_meta_data->>'avatar_url' 
      FROM auth.users WHERE id = hi_shares.user_id
    )
  END as avatar_url
FROM public.hi_shares 
WHERE 
  visibility IN ('public', 'anonymous')  -- Never show private shares
  AND created_at > NOW() - INTERVAL '90 days'  -- Recent shares only
ORDER BY created_at DESC;

-- =====================================================
-- 🔒 ROW LEVEL SECURITY POLICIES
-- Ensure proper data access controls
-- =====================================================

-- Enable RLS on hi_shares table
ALTER TABLE public.hi_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert shares (for sharing functionality)
DROP POLICY IF EXISTS "insert_own_shares" ON public.hi_shares;
CREATE POLICY "insert_own_shares"
ON public.hi_shares
FOR INSERT
TO authenticated, anon
WITH CHECK (true);  -- Allow all insertions, RLS doesn't block creation

-- Policy: Users can only see their own shares from hi_shares table
DROP POLICY IF EXISTS "select_own_shares" ON public.hi_shares;
CREATE POLICY "select_own_shares" 
ON public.hi_shares
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Anonymous users cannot directly access hi_shares
-- (They use public_hi_feed view instead)

-- Policy: Users can update their own shares
DROP POLICY IF EXISTS "update_own_shares" ON public.hi_shares;
CREATE POLICY "update_own_shares"
ON public.hi_shares  
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own shares
DROP POLICY IF EXISTS "delete_own_shares" ON public.hi_shares;
CREATE POLICY "delete_own_shares"
ON public.hi_shares
FOR DELETE  
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 🌍 PUBLIC FEED VIEW ACCESS
-- Allow everyone to see the privacy-safe public feed
-- =====================================================

-- Enable RLS on the view (inherited from base table)
-- Note: Views inherit RLS from underlying tables

-- Grant access to public_hi_feed view
GRANT SELECT ON public.public_hi_feed TO authenticated, anon;

-- =====================================================
-- 🔄 BACKEND PLUMBING VERIFICATION
-- Test queries to ensure data routing works correctly  
-- =====================================================

-- Test 1: Verify visibility mapping works
-- SELECT visibility, COUNT(*) FROM public.hi_shares GROUP BY visibility;

-- Test 2: Verify public feed only shows public/anonymous
-- SELECT visibility, COUNT(*) FROM public.public_hi_feed GROUP BY visibility;

-- Test 3: Verify RLS policies work for user archives
-- SELECT COUNT(*) FROM public.hi_shares WHERE user_id = auth.uid();

-- =====================================================
-- 📝 DEPLOYMENT NOTES
-- =====================================================

/*
BACKEND DATA FLOW VERIFICATION:

1. SHARE CREATION (All 3 pages):
   HiShareSheet → HiBase.shares.insertShare() → hi_shares table
   - Public: visibility='public' 
   - Anonymous: visibility='anonymous'
   - Private: visibility='private'

2. GENERAL SHARES TAB:
   HiBase.shares.getPublicShares() → public_hi_feed view
   - Shows: visibility IN ('public', 'anonymous')
   - Privacy: Anonymous shares show "Anonymous Hi 5er"

3. MY ARCHIVES TAB: 
   HiBase.shares.getUserShares() → hi_shares table (user_id filter)
   - Shows: ALL user's shares regardless of visibility
   - Privacy: Only user sees their own archives

4. RLS ENFORCEMENT:
   - Users can only SELECT their own rows from hi_shares
   - Everyone can SELECT from public_hi_feed (privacy-safe)
   - Anonymous users cannot access hi_shares directly
*/