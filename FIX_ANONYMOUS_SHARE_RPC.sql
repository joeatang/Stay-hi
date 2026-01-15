-- =============================================================
-- 🚨 CRITICAL FIX: Anonymous Share RPC Bug
-- =============================================================
-- Problem: create_public_share RPC uses COALESCE(p_user_id, auth.uid())
--          This means anonymous shares (p_user_id=NULL) get attributed
--          to the authenticated user instead of being truly anonymous.
-- 
-- Impact: Anonymous shares appear in user's "My Shares" instead of
--         being community shares with hidden identity.
--
-- Fix: Respect NULL user_id for anonymous visibility
-- =============================================================

-- Step 1: Drop existing function (handles multiple signatures)
DROP FUNCTION IF EXISTS create_public_share CASCADE;

-- Step 2: Create fixed function with proper anonymous handling
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
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_share_id UUID;
  v_result JSON;
BEGIN
  -- 🎯 FIX: Respect provided user_id (NULL for anonymous, real ID for public)
  -- OLD (BUG): v_user_id := COALESCE(p_user_id, auth.uid());
  -- NEW (FIX): Respect NULL for anonymous shares
  IF p_visibility = 'anonymous' THEN
    v_user_id := NULL;  -- Force NULL for anonymous regardless of p_user_id
  ELSE
    v_user_id := COALESCE(p_user_id, auth.uid());  -- Normal behavior for public/private
  END IF;
  
  -- Validate hi_intensity if provided (must be 1-5 or NULL)
  IF p_hi_intensity IS NOT NULL AND (p_hi_intensity < 1 OR p_hi_intensity > 5) THEN
    RAISE EXCEPTION 'hi_intensity must be between 1 and 5 or NULL';
  END IF;
  
  -- Insert share (bypasses RLS via SECURITY DEFINER)
  INSERT INTO public_shares (
    user_id,
    text,
    visibility,
    origin,
    pill,
    location,
    current_emoji,
    desired_emoji,
    hi_intensity
  )
  VALUES (
    v_user_id,  -- NULL for anonymous, real ID for public
    p_content,
    p_visibility,
    p_origin,
    p_pill,
    p_location,
    p_current_emoji,
    p_desired_emoji,
    p_hi_intensity
  )
  RETURNING id INTO v_share_id;
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'id', v_share_id,
    'user_id', v_user_id,
    'visibility', p_visibility,
    'is_anonymous', (p_visibility = 'anonymous'),
    'hi_intensity', p_hi_intensity
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_public_share IS 'Creates a public share with proper anonymous handling - NULL user_id for anonymous visibility';

-- Step 3: Verify function updated
SELECT 
  '✅ RPC updated: create_public_share' as status,
  proname as function_name,
  pg_get_function_arguments(oid) as parameters
FROM pg_proc 
WHERE proname = 'create_public_share';

-- Step 4: Test that anonymous truly gets NULL user_id
-- (Uncomment to test, then delete the test row)
/*
SELECT create_public_share(
  'TEST ANONYMOUS - SHOULD HAVE NULL USER_ID',
  'anonymous',
  'hi-island',
  'hiisland',
  'Test Location',
  '12345678-1234-1234-1234-123456789012',  -- Even if user_id provided
  '👋',
  '✨',
  3
) as test_result;

-- Verify NULL user_id
SELECT id, user_id, visibility, text 
FROM public_shares 
WHERE text = 'TEST ANONYMOUS - SHOULD HAVE NULL USER_ID'
ORDER BY created_at DESC LIMIT 1;

-- Clean up test
DELETE FROM public_shares 
WHERE text = 'TEST ANONYMOUS - SHOULD HAVE NULL USER_ID';
*/

-- =============================================================
-- DEPLOYMENT NOTES:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify the function was created successfully
-- 3. Test anonymous share from Hi Island
-- 4. Verify share appears in general feed (not My Shares)
-- =============================================================
