-- ===============================================
-- 🚨 EMERGENCY FIX: Hi Island Lockup + Origin Tagging
-- ===============================================
-- ISSUES:
-- 1. Hi Island locks up after public share (missing get_user_share_count RPC causes infinite hang)
-- 2. Shares tagged "hi5" instead of correct origin ("hi-island", "higym")
-- 
-- ROOT CAUSE:
-- - HiShareSheet.js line 434 calls get_user_share_count which returns 404
-- - No timeout wrapper causes page to hang forever waiting for response
-- - create_public_share RPC may not have latest version with origin/hi_intensity
--
-- SOLUTION:
-- - Deploy get_user_share_count RPC (prevents 404)
-- - Update create_public_share RPC with hi_intensity + ensure origin works
-- - Frontend already has 2s timeout fix (just deployed)
-- ===============================================

-- ===============================================
-- STEP 1: Deploy get_user_share_count RPC
-- ===============================================
-- This RPC counts how many shares a user made in a given period
-- Used for tier enforcement (monthly share limits)

CREATE OR REPLACE FUNCTION get_user_share_count(period TEXT DEFAULT 'month')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_start_date TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated',
      'count', 0
    );
  END IF;
  
  -- Calculate start date based on period
  IF period = 'day' THEN
    v_start_date := date_trunc('day', NOW());
  ELSIF period = 'week' THEN
    v_start_date := date_trunc('week', NOW());
  ELSIF period = 'month' THEN
    v_start_date := date_trunc('month', NOW());
  ELSIF period = 'year' THEN
    v_start_date := date_trunc('year', NOW());
  ELSE
    -- Default to month if invalid period
    v_start_date := date_trunc('month', NOW());
  END IF;
  
  -- Count shares since start date (include all types)
  SELECT COUNT(*)
  INTO v_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date;
  
  RETURN json_build_object(
    'success', true,
    'count', v_count,
    'period', period,
    'start_date', v_start_date
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_share_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_share_count(TEXT) TO anon;

COMMENT ON FUNCTION get_user_share_count IS 'Counts user shares within a time period for tier enforcement';

-- ===============================================
-- STEP 2: Update create_public_share with hi_intensity + origin fix
-- ===============================================
CREATE OR REPLACE FUNCTION create_public_share(
  p_content TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'unknown',
  p_pill TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_current_emoji TEXT DEFAULT '👋',
  p_desired_emoji TEXT DEFAULT '✨',
  p_hi_intensity INTEGER DEFAULT NULL  -- 🎯 Hi Scale: Optional intensity (1-5)
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
  
  -- Validate hi_intensity if provided (must be 1-5 or NULL)
  IF p_hi_intensity IS NOT NULL AND (p_hi_intensity < 1 OR p_hi_intensity > 5) THEN
    RAISE EXCEPTION 'hi_intensity must be between 1 and 5 or NULL';
  END IF;
  
  -- 🔬 DEBUG: Log what origin we're receiving
  RAISE NOTICE 'create_public_share called with origin: %, pill: %, hi_intensity: %', p_origin, p_pill, p_hi_intensity;
  
  -- Insert share (bypasses PostgREST cache)
  INSERT INTO public_shares (
    user_id,
    text,  -- Use 'text' column (NOT NULL)
    content,  -- Also set content for compatibility
    visibility,
    origin,  -- ⚠️ CRITICAL: This must store the origin passed in
    pill,
    location,
    current_emoji,
    desired_emoji,
    hi_intensity  -- 🎯 Hi Scale field
  )
  VALUES (
    v_user_id,
    p_content,  -- Maps to 'text' column
    p_content,  -- Also set content
    p_visibility,
    p_origin,  -- ⚠️ CRITICAL: Store origin exactly as passed
    p_pill,
    p_location,
    p_current_emoji,
    p_desired_emoji,
    p_hi_intensity  -- 🎯 Hi Scale value
  )
  RETURNING id INTO v_share_id;
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'id', v_share_id,
    'user_id', v_user_id,
    'origin', p_origin,  -- Echo back what we stored
    'hi_intensity', p_hi_intensity
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_public_share TO authenticated;
GRANT EXECUTE ON FUNCTION create_public_share TO anon;

COMMENT ON FUNCTION create_public_share IS 'Creates public share with origin tracking and Hi Scale intensity (1-5)';

-- ===============================================
-- STEP 3: Verify functions deployed
-- ===============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_share_count') THEN
    RAISE NOTICE '✅ get_user_share_count() deployed (fixes lockup)';
  ELSE
    RAISE WARNING '❌ get_user_share_count() NOT found';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_public_share') THEN
    RAISE NOTICE '✅ create_public_share() updated (fixes origin tagging)';
  ELSE
    RAISE WARNING '❌ create_public_share() NOT found';
  END IF;
END $$;

-- ===============================================
-- STEP 4: Check if public_shares has required columns
-- ===============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'public_shares'
  AND table_schema = 'public'
  AND column_name IN ('origin', 'hi_intensity', 'content', 'text')
ORDER BY column_name;

-- ===============================================
-- STEP 5: Test query - Check recent shares' origin values
-- ===============================================
-- Run this AFTER sharing to verify origin is storing correctly
/*
SELECT 
  id,
  created_at,
  origin,
  pill,
  text,
  hi_intensity,
  visibility
FROM public_shares
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
*/

-- ===============================================
-- WHAT TO EXPECT
-- ===============================================
/*
BEFORE DEPLOYMENT:
- Hi Island locks up after public share (404 on get_user_share_count)
- All shares tagged "hi5" regardless of page

AFTER DEPLOYMENT:
✅ get_user_share_count RPC returns proper count (no 404)
✅ Frontend has 2s timeout (already deployed) so no more lockups
✅ Shares from hi-island tagged with origin='hi-island'
✅ Shares from dashboard tagged with origin='hi5'
✅ Shares from hi-muscle tagged with origin='higym'
✅ Hi Scale intensity (1-5) stored correctly

TESTING:
1. Share from dashboard → Check origin = 'hi5'
2. Share from hi-island → Check origin = 'hi-island'
3. Share from hi-muscle → Check origin = 'higym'
4. Page should NOT lock up anymore

If origin still shows wrong value, check:
- Is there a database trigger overriding origin on INSERT?
- Is there a DEFAULT constraint forcing 'hi5'?
- Run: SELECT * FROM pg_trigger WHERE tgname LIKE '%public_shares%';
*/
