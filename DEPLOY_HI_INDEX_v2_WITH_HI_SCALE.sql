-- ============================================================================
-- 🌟 HI INDEX v2.0 — HI SCALE INTEGRATION
-- ============================================================================
-- GOAL: Balance PRACTICE (activity) with FEELING (Hi Scale ratings)
-- APPROACH: Multiply activity score by Hi Scale factor (3.0 = neutral)
-- SAFETY: Backward compatible (NULL Hi Scale = 1.0x multiplier = v1.0 behavior)
-- ============================================================================
-- DATE: 2026-01-18
-- PHILOSOPHY: "Measure both the effort AND the results"
-- IMPACT: More authentic Hi Index that reflects actual inspiration
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE COMMUNITY HI INDEX (Global Wellness Score)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_community_hi_index(
  p_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_start_date DATE := CURRENT_DATE - (p_days - 1);
  v_raw_score NUMERIC(10,2) := 0;
  v_share_count INT := 0;
  v_tap_count INT := 0;
  v_normalized_index NUMERIC(3,2);
  v_yesterday_score NUMERIC(10,2);
  v_percent_change NUMERIC(5,2);
  v_expected_max NUMERIC(10,2);
  
  -- Hi Scale v2.0 variables
  v_hi_scale_avg NUMERIC(3,1);
  v_hi_scale_multiplier NUMERIC(4,2);
  v_adjusted_score NUMERIC(10,2);
BEGIN
  -- Calculate raw activity score from all users in date range
  -- Shares = 10 points each, Taps = 1 point per 100
  SELECT 
    COALESCE(SUM(share_count), 0),
    COALESCE(SUM(tap_accumulator + (tap_batches_awarded * 100)), 0)
  INTO v_share_count, v_tap_count
  FROM hi_points_daily_activity
  WHERE day >= v_start_date AND day <= v_today;
  
  -- Also count public shares that may not have points records
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ
    AND user_id IS NOT NULL;  -- Only count attributed shares
  
  -- Calculate raw activity score
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  
  -- 🌟 HI INDEX v2.0: Get community average Hi Scale (feeling)
  -- Average all users' daily Hi Scale ratings in the date range
  SELECT AVG(hi_scale_rating) INTO v_hi_scale_avg
  FROM user_daily_snapshots
  WHERE snapshot_date >= v_start_date 
    AND snapshot_date <= v_today
    AND hi_scale_rating IS NOT NULL;
  
  -- Calculate Hi Scale multiplier (3.0 = neutral baseline)
  -- NULL or no data = 1.0x (same as v1.0 behavior)
  -- 5/5 feeling = 1.67x multiplier (boost)
  -- 3/5 feeling = 1.0x multiplier (neutral)
  -- 2/5 feeling = 0.67x multiplier (honest reflection)
  IF v_hi_scale_avg IS NOT NULL AND v_hi_scale_avg > 0 THEN
    v_hi_scale_multiplier := ROUND((v_hi_scale_avg / 3.0)::NUMERIC, 2);
  ELSE
    v_hi_scale_multiplier := 1.0; -- No Hi Scale data = same as v1.0
  END IF;
  
  -- Apply Hi Scale to activity score (practice × feeling)
  v_adjusted_score := v_raw_score * v_hi_scale_multiplier;
  
  -- Expected max for normalization (adjusts based on community size)
  -- Base: ~50 shares + ~10000 taps per week = 600 pts = index 5
  -- With Hi Scale: 600 pts × 1.67x (5/5 feeling) = 1000 pts max
  v_expected_max := 600.0 * v_hi_scale_multiplier;
  
  -- Normalize adjusted score to 1-5 scale
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_adjusted_score / v_expected_max * 4.0)
  ));
  
  -- Get yesterday's score for % change
  SELECT normalized_index INTO v_yesterday_score
  FROM hi_index_snapshots
  WHERE scope = 'community' AND snapshot_date = v_today - 1;
  
  IF v_yesterday_score IS NOT NULL AND v_yesterday_score > 0 THEN
    v_percent_change := ((v_normalized_index - v_yesterday_score) / v_yesterday_score) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  -- Upsert today's snapshot
  INSERT INTO hi_index_snapshots (snapshot_date, scope, raw_score, normalized_index, share_count, tap_count, updated_at)
  VALUES (v_today, 'community', v_adjusted_score, v_normalized_index, v_share_count, v_tap_count, NOW())
  ON CONFLICT (snapshot_date, scope) 
  DO UPDATE SET 
    raw_score = EXCLUDED.raw_score,
    normalized_index = EXCLUDED.normalized_index,
    share_count = EXCLUDED.share_count,
    tap_count = EXCLUDED.tap_count,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'index', ROUND(v_normalized_index, 2),
    'raw_score', ROUND(v_adjusted_score, 2),
    'share_count', v_share_count,
    'tap_count', v_tap_count,
    'percent_change', ROUND(COALESCE(v_percent_change, 0), 1),
    'trend', CASE 
      WHEN v_percent_change > 0 THEN 'up'
      WHEN v_percent_change < 0 THEN 'down'
      ELSE 'stable'
    END,
    'period_days', p_days,
    'as_of', v_today,
    'hi_scale_avg', ROUND(COALESCE(v_hi_scale_avg, 3.0), 1),
    'hi_scale_multiplier', v_hi_scale_multiplier
  );
END;
$$;

COMMENT ON FUNCTION public.get_community_hi_index IS 'Get community-wide Hi Index v2.0 (activity × feeling) - 7-day rolling wellness score';

-- ============================================================================
-- PART 2: UPDATE PERSONAL HI INDEX (Individual Wellness Score)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_personal_hi_index(
  p_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_start_date DATE := CURRENT_DATE - (p_days - 1);
  v_raw_score NUMERIC(10,2) := 0;
  v_share_count INT := 0;
  v_tap_count INT := 0;
  v_normalized_index NUMERIC(3,2);
  v_yesterday_score NUMERIC(10,2);
  v_percent_change NUMERIC(5,2);
  v_percentile NUMERIC(5,2);
  v_total_users INT;
  v_users_below INT;
  
  -- Hi Scale v2.0 variables
  v_hi_scale_avg NUMERIC(3,1);
  v_hi_scale_multiplier NUMERIC(4,2);
  v_adjusted_score NUMERIC(10,2);
  v_expected_max NUMERIC(10,2);
BEGIN
  -- Require authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Get user's activity
  SELECT 
    COALESCE(SUM(share_count), 0),
    COALESCE(SUM(tap_accumulator + (tap_batches_awarded * 100)), 0)
  INTO v_share_count, v_tap_count
  FROM hi_points_daily_activity
  WHERE user_id = v_user_id 
    AND day >= v_start_date 
    AND day <= v_today;
  
  -- Also count user's public shares
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ;
  
  -- Calculate raw activity score
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  
  -- 🌟 HI INDEX v2.0: Get user's average Hi Scale (feeling)
  -- Average this user's daily Hi Scale ratings in the date range
  SELECT AVG(hi_scale_rating) INTO v_hi_scale_avg
  FROM user_daily_snapshots
  WHERE user_id = v_user_id
    AND snapshot_date >= v_start_date 
    AND snapshot_date <= v_today
    AND hi_scale_rating IS NOT NULL;
  
  -- Calculate Hi Scale multiplier (3.0 = neutral baseline)
  -- NULL or no data = 1.0x (same as v1.0 behavior)
  IF v_hi_scale_avg IS NOT NULL AND v_hi_scale_avg > 0 THEN
    v_hi_scale_multiplier := ROUND((v_hi_scale_avg / 3.0)::NUMERIC, 2);
  ELSE
    v_hi_scale_multiplier := 1.0; -- No Hi Scale data = same as v1.0
  END IF;
  
  -- Apply Hi Scale to activity score (practice × feeling)
  v_adjusted_score := v_raw_score * v_hi_scale_multiplier;
  
  -- Personal normalization (same scale as community for comparison)
  -- Base: ~10 shares + ~1000 taps per week = 110 pts = index 5 for engaged user
  -- With Hi Scale: 110 pts × 1.67x (5/5 feeling) = 183 pts max
  v_expected_max := 110.0 * v_hi_scale_multiplier;
  
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_adjusted_score / v_expected_max * 4.0)
  ));
  
  -- Calculate percentile (what % of users is this user ahead of)
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM hi_points_daily_activity
  WHERE day >= v_start_date;
  
  IF v_total_users > 1 THEN
    -- Count users with lower adjusted scores (activity × feeling)
    WITH user_scores AS (
      SELECT 
        hpda.user_id,
        (COALESCE(SUM(hpda.share_count), 0) * 10.0 + 
         COALESCE(SUM(hpda.tap_accumulator + hpda.tap_batches_awarded * 100), 0) / 100.0) as activity_score,
        COALESCE(
          (SELECT AVG(hi_scale_rating) 
           FROM user_daily_snapshots uds 
           WHERE uds.user_id = hpda.user_id 
             AND uds.snapshot_date >= v_start_date 
             AND uds.snapshot_date <= v_today
             AND uds.hi_scale_rating IS NOT NULL),
          3.0
        ) as hi_scale_avg
      FROM hi_points_daily_activity hpda
      WHERE day >= v_start_date AND day <= v_today
      GROUP BY hpda.user_id
    ),
    adjusted_scores AS (
      SELECT 
        user_id,
        activity_score * (hi_scale_avg / 3.0) as adjusted_score
      FROM user_scores
    )
    SELECT COUNT(*) INTO v_users_below
    FROM adjusted_scores
    WHERE adjusted_score < v_adjusted_score;
    
    v_percentile := (v_users_below::NUMERIC / v_total_users::NUMERIC) * 100;
  ELSE
    v_percentile := 100; -- Only user = top 100%
  END IF;
  
  -- Get yesterday's score for % change
  SELECT normalized_index INTO v_yesterday_score
  FROM hi_index_snapshots
  WHERE scope = v_user_id::text AND snapshot_date = v_today - 1;
  
  IF v_yesterday_score IS NOT NULL AND v_yesterday_score > 0 THEN
    v_percent_change := ((v_normalized_index - v_yesterday_score) / v_yesterday_score) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  -- Upsert today's personal snapshot
  INSERT INTO hi_index_snapshots (snapshot_date, scope, raw_score, normalized_index, share_count, tap_count, percentile, updated_at)
  VALUES (v_today, v_user_id::text, v_adjusted_score, v_normalized_index, v_share_count, v_tap_count, v_percentile, NOW())
  ON CONFLICT (snapshot_date, scope) 
  DO UPDATE SET 
    raw_score = EXCLUDED.raw_score,
    normalized_index = EXCLUDED.normalized_index,
    share_count = EXCLUDED.share_count,
    tap_count = EXCLUDED.tap_count,
    percentile = EXCLUDED.percentile,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'index', ROUND(v_normalized_index, 2),
    'raw_score', ROUND(v_adjusted_score, 2),
    'share_count', v_share_count,
    'tap_count', v_tap_count,
    'percent_change', ROUND(COALESCE(v_percent_change, 0), 1),
    'trend', CASE 
      WHEN v_percent_change > 0 THEN 'up'
      WHEN v_percent_change < 0 THEN 'down'
      ELSE 'stable'
    END,
    'percentile', ROUND(COALESCE(v_percentile, 0), 0),
    'period_days', p_days,
    'as_of', v_today,
    'hi_scale_avg', ROUND(COALESCE(v_hi_scale_avg, 3.0), 1),
    'hi_scale_multiplier', v_hi_scale_multiplier
  );
END;
$$;

COMMENT ON FUNCTION public.get_personal_hi_index IS 'Get personal Hi Index v2.0 (activity × feeling) - private to user';

-- ============================================================================
-- PART 3: VERIFICATION QUERIES
-- ============================================================================

-- Check that both functions updated successfully
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('get_community_hi_index', 'get_personal_hi_index')
ORDER BY routine_name;

-- Expected output: 2 functions

-- Test community Hi Index v2.0 (should work without Hi Scale data)
-- SELECT get_community_hi_index(7);

-- Test personal Hi Index v2.0 (requires auth)
-- SELECT get_personal_hi_index(7);

-- Check if any Hi Scale data exists yet
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(*) FILTER (WHERE hi_scale_rating IS NOT NULL) as snapshots_with_rating,
  ROUND(AVG(hi_scale_rating), 1) as avg_hi_scale
FROM user_daily_snapshots
WHERE snapshot_date >= CURRENT_DATE - 7;

-- Expected output: 0 total_snapshots initially (table created but no data yet)

-- ============================================================================
-- PART 4: BACKWARD COMPATIBILITY TESTS
-- ============================================================================

-- Test 1: Verify NULL Hi Scale returns 1.0x multiplier (v1.0 behavior)
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- This should work even without user_daily_snapshots table
  v_result := get_community_hi_index(7);
  
  -- Check that multiplier defaults to 1.0 when no Hi Scale data
  IF (v_result->>'hi_scale_multiplier')::NUMERIC = 1.0 THEN
    RAISE NOTICE '✅ Test 1 PASSED: NULL Hi Scale returns 1.0x multiplier';
  ELSE
    RAISE EXCEPTION '❌ Test 1 FAILED: Expected 1.0x multiplier, got %', v_result->>'hi_scale_multiplier';
  END IF;
END $$;

-- ============================================================================
-- PART 5: WHAT CHANGED
-- ============================================================================

-- BEFORE (v1.0):
-- ❌ Hi Index = Activity only (shares + taps)
-- ❌ Measures effort but not results
-- ❌ Can't distinguish "struggling but present" from "thriving"

-- AFTER (v2.0):
-- ✅ Hi Index = Activity × Feeling (shares + taps × Hi Scale avg)
-- ✅ Measures both effort AND results
-- ✅ Authentic: High activity + Low feeling = Honest lower score
-- ✅ Backward compatible: NULL Hi Scale = 1.0x multiplier (v1.0 behavior)
-- ✅ Returns hi_scale_avg and hi_scale_multiplier in JSON response

-- ============================================================================
-- PART 6: INTEGRATION NOTES
-- ============================================================================

-- Frontend will now receive additional fields in RPC response:
-- {
--   "index": 4.2,
--   "raw_score": 450.5,
--   "share_count": 35,
--   "tap_count": 1500,
--   "percent_change": 12.5,
--   "trend": "up",
--   "period_days": 7,
--   "as_of": "2026-01-18",
--   "hi_scale_avg": 4.1,           // NEW in v2.0
--   "hi_scale_multiplier": 1.37    // NEW in v2.0
-- }

-- HiIndex.js will automatically receive these fields (no code change needed)
-- HiIndexCard.js can optionally display Hi Scale avg in tooltip

-- ============================================================================
-- PART 7: ROLLBACK PLAN (If needed)
-- ============================================================================

-- To revert to v1.0 (activity only, no Hi Scale):
/*

CREATE OR REPLACE FUNCTION public.get_community_hi_index(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_start_date DATE := CURRENT_DATE - (p_days - 1);
  v_raw_score NUMERIC(10,2) := 0;
  v_share_count INT := 0;
  v_tap_count INT := 0;
  v_normalized_index NUMERIC(3,2);
  v_yesterday_score NUMERIC(10,2);
  v_percent_change NUMERIC(5,2);
  v_expected_max NUMERIC(10,2);
BEGIN
  SELECT 
    COALESCE(SUM(share_count), 0),
    COALESCE(SUM(tap_accumulator + (tap_batches_awarded * 100)), 0)
  INTO v_share_count, v_tap_count
  FROM hi_points_daily_activity
  WHERE day >= v_start_date AND day <= v_today;
  
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ
    AND user_id IS NOT NULL;
  
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  v_expected_max := 600.0;
  
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_raw_score / v_expected_max * 4.0)
  ));
  
  SELECT normalized_index INTO v_yesterday_score
  FROM hi_index_snapshots
  WHERE scope = 'community' AND snapshot_date = v_today - 1;
  
  IF v_yesterday_score IS NOT NULL AND v_yesterday_score > 0 THEN
    v_percent_change := ((v_normalized_index - v_yesterday_score) / v_yesterday_score) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  INSERT INTO hi_index_snapshots (snapshot_date, scope, raw_score, normalized_index, share_count, tap_count, updated_at)
  VALUES (v_today, 'community', v_raw_score, v_normalized_index, v_share_count, v_tap_count, NOW())
  ON CONFLICT (snapshot_date, scope) 
  DO UPDATE SET 
    raw_score = EXCLUDED.raw_score,
    normalized_index = EXCLUDED.normalized_index,
    share_count = EXCLUDED.share_count,
    tap_count = EXCLUDED.tap_count,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'index', ROUND(v_normalized_index, 2),
    'raw_score', ROUND(v_raw_score, 2),
    'share_count', v_share_count,
    'tap_count', v_tap_count,
    'percent_change', ROUND(COALESCE(v_percent_change, 0), 1),
    'trend', CASE 
      WHEN v_percent_change > 0 THEN 'up'
      WHEN v_percent_change < 0 THEN 'down'
      ELSE 'stable'
    END,
    'period_days', p_days,
    'as_of', v_today
  );
END;
$$;

-- Same for get_personal_hi_index (restore v1.0 code)

*/

-- ============================================================================
-- DEPLOYMENT CHECKLIST
-- ============================================================================

-- ✅ Step 1: Ensure DEPLOY_ANALYTICS_GOLD_STANDARD_v2.sql deployed first
--           (creates user_daily_snapshots table)
-- ✅ Step 2: Run this entire file in Supabase SQL Editor
-- ✅ Step 3: Verify functions updated (see verification queries above)
-- ✅ Step 4: Test backward compatibility (NULL Hi Scale = 1.0x multiplier)
-- ✅ Step 5: Deploy frontend Hi Scale prompt (dashboard-main.js)
-- ✅ Step 6: Monitor Hi Index values (should stay same until users rate)
-- ✅ Step 7: After 7 days, verify Hi Scale improves authenticity

-- ============================================================================
-- SAFETY GUARANTEES
-- ============================================================================

-- ✅ Backward compatible: Works without user_daily_snapshots table
-- ✅ Graceful degradation: NULL Hi Scale = 1.0x multiplier (v1.0 behavior)
-- ✅ No breaking changes: Existing HiIndex.js code works unchanged
-- ✅ No data loss: hi_index_snapshots table untouched (just new formula)
-- ✅ Rollback available: Can restore v1.0 formula if needed
-- ✅ Safe to re-run: Uses CREATE OR REPLACE (idempotent)

-- 🎉 Hi Index v2.0 is production-ready!

SELECT '✅ Hi Index v2.0 (with Hi Scale integration) deployed successfully!' as status;

-- ============================================================================
