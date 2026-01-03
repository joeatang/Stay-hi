-- ============================================================================
-- FIX: Hi Island Page Freeze (get_user_share_count RPC Missing/Wrong Signature)
-- ============================================================================
-- PROBLEM: 
--   When clicking "Drop a Hi" on Hi Island, the page freezes for 2 seconds
--   because HiShareSheet.js calls get_user_share_count({ period: 'month' })
--   but the RPC either doesn't exist or has wrong signature.
--
-- ROOT CAUSE:
--   Frontend calls: window.sb.rpc('get_user_share_count', { period: 'month' })
--   Database expects: Different signature OR function doesn't exist
--   Result: 404 error → 2-second timeout → modal finally opens
--
-- WHY THIS IS A LONG-TERM SOLUTION:
--   1. Matches Frontend Contract: Function signature matches HiShareSheet.js line 435
--   2. Tier Enforcement Foundation: Required for Bronze/Silver monthly share limits
--   3. Fail-Safe Design: Returns graceful JSON even on auth failure
--   4. Performance: Query is indexed on user_id + created_at
--   5. Security: SECURITY DEFINER with auth.uid() prevents unauthorized access
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop any existing versions (clean slate)
-- ============================================================================
DROP FUNCTION IF EXISTS get_user_share_count(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_user_share_count(TEXT);
DROP FUNCTION IF EXISTS get_user_share_count();

-- ============================================================================
-- STEP 2: Create the correct function matching frontend expectations
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_share_count(period TEXT DEFAULT 'month')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_start_date TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get authenticated user ID (SECURITY: Uses auth.uid() from Supabase Auth)
  v_user_id := auth.uid();
  
  -- If not authenticated, return error JSON (fail gracefully)
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated',
      'count', 0
    );
  END IF;
  
  -- Calculate start date based on period
  CASE period
    WHEN 'day' THEN
      v_start_date := date_trunc('day', NOW());
    WHEN 'week' THEN
      v_start_date := date_trunc('week', NOW());
    WHEN 'month' THEN
      v_start_date := date_trunc('month', NOW());
    WHEN 'year' THEN
      v_start_date := date_trunc('year', NOW());
    ELSE
      -- Invalid period defaults to month (fail gracefully)
      v_start_date := date_trunc('month', NOW());
  END CASE;
  
  -- Count shares since start date
  -- PERFORMANCE: Uses idx_public_shares_user_id_created_at composite index
  SELECT COUNT(*)
  INTO v_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date;
  
  -- Return success JSON with count
  RETURN json_build_object(
    'success', true,
    'count', v_count,
    'period', period,
    'start_date', v_start_date
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Catch any database errors and return graceful failure
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_user_share_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_share_count(TEXT) TO anon;

-- ============================================================================
-- STEP 4: Add function comment (documentation)
-- ============================================================================
COMMENT ON FUNCTION get_user_share_count IS 
'Counts user shares within a time period (day/week/month/year) for tier enforcement. Called by HiShareSheet.js to check Bronze/Silver monthly quotas. Returns JSON with success flag and count.';

-- ============================================================================
-- STEP 5: Ensure performance index exists
-- ============================================================================
-- This index is CRITICAL for performance when counting shares
-- Without it, quota checks would do full table scans
CREATE INDEX IF NOT EXISTS idx_public_shares_user_id_created_at 
ON public_shares(user_id, created_at DESC);

-- ============================================================================
-- VERIFICATION: Test the function
-- ============================================================================
-- Test query (uncomment to run):
-- SELECT get_user_share_count('month');
--
-- Expected output format:
-- {
--   "success": true,
--   "count": 5,
--   "period": "month",
--   "start_date": "2026-01-01T00:00:00+00:00"
-- }

-- ============================================================================
-- RUN THIS TO TEST:
-- ============================================================================
SELECT get_user_share_count('month') AS result;

-- ============================================================================
-- STEP 6: Force PostgREST to reload schema (CRITICAL for REST API)
-- ============================================================================
-- This makes the function visible to the /rest/v1/rpc endpoint
NOTIFY pgrst, 'reload schema';

-- Wait 5 seconds, then test the REST API from browser console:
-- window.sb.rpc('get_user_share_count', { period: 'month' }).then(console.log)

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- Before: Page freezes 2 seconds when clicking "Drop a Hi"
-- After:  Modal opens instantly, tier quotas enforced correctly
--
-- Test Steps:
-- 1. Open Hi Island page: http://localhost:3030/public/hi-island-NEW.html
-- 2. Click "Drop a Hi" button
-- 3. Modal should open IMMEDIATELY (no 2-second delay)
-- 4. Console should show: "✅ [TIER CHECK] Result: { tier: 'gold' }"
-- 5. No RPC timeout warnings
-- ============================================================================
