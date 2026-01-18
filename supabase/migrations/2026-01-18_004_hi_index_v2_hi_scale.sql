-- ============================================================================
-- 🌟 HI INDEX v2.0 - HI SCALE INTEGRATION
-- ============================================================================
-- Migration: 004
-- Date: 2026-01-18
-- Description: Update Hi Index formula (activity × feeling)
-- Dependencies: 003 (user_daily_snapshots table for Hi Scale data)
-- Rollback: See 2026-01-18_004_ROLLBACK_hi_index_v2_hi_scale.sql
-- ============================================================================

-- This is the production-ready migration file.
-- Full implementation details in: /DEPLOY_HI_INDEX_v2_WITH_HI_SCALE.sql

-- ============================================================================
-- PART 1: UPDATE COMMUNITY HI INDEX (Activity × Feeling)
-- ============================================================================

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
  v_hi_scale_avg NUMERIC(3,1);
  v_hi_scale_multiplier NUMERIC(4,2);
  v_adjusted_score NUMERIC(10,2);
BEGIN
  -- Calculate raw activity score
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
  
  -- Get community average Hi Scale (feeling)
  SELECT AVG(hi_scale_rating) INTO v_hi_scale_avg
  FROM user_daily_snapshots
  WHERE snapshot_date >= v_start_date 
    AND snapshot_date <= v_today
    AND hi_scale_rating IS NOT NULL;
  
  -- Calculate Hi Scale multiplier (3.0 = neutral)
  IF v_hi_scale_avg IS NOT NULL AND v_hi_scale_avg > 0 THEN
    v_hi_scale_multiplier := ROUND((v_hi_scale_avg / 3.0)::NUMERIC, 2);
  ELSE
    v_hi_scale_multiplier := 1.0;
  END IF;
  
  -- Apply Hi Scale (practice × feeling)
  v_adjusted_score := v_raw_score * v_hi_scale_multiplier;
  v_expected_max := 600.0 * v_hi_scale_multiplier;
  
  -- Normalize to 1-5 scale
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

-- ============================================================================
-- PART 2: UPDATE PERSONAL HI INDEX (Activity × Feeling)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_personal_hi_index(p_days INT DEFAULT 7)
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
  v_hi_scale_avg NUMERIC(3,1);
  v_hi_scale_multiplier NUMERIC(4,2);
  v_adjusted_score NUMERIC(10,2);
  v_expected_max NUMERIC(10,2);
BEGIN
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
  
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ;
  
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  
  -- Get user's average Hi Scale (feeling)
  SELECT AVG(hi_scale_rating) INTO v_hi_scale_avg
  FROM user_daily_snapshots
  WHERE user_id = v_user_id
    AND snapshot_date >= v_start_date 
    AND snapshot_date <= v_today
    AND hi_scale_rating IS NOT NULL;
  
  -- Calculate Hi Scale multiplier (3.0 = neutral)
  IF v_hi_scale_avg IS NOT NULL AND v_hi_scale_avg > 0 THEN
    v_hi_scale_multiplier := ROUND((v_hi_scale_avg / 3.0)::NUMERIC, 2);
  ELSE
    v_hi_scale_multiplier := 1.0;
  END IF;
  
  -- Apply Hi Scale (practice × feeling)
  v_adjusted_score := v_raw_score * v_hi_scale_multiplier;
  v_expected_max := 110.0 * v_hi_scale_multiplier;
  
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_adjusted_score / v_expected_max * 4.0)
  ));
  
  -- Calculate percentile
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM hi_points_daily_activity
  WHERE day >= v_start_date;
  
  IF v_total_users > 1 THEN
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
    v_percentile := 100;
  END IF;
  
  -- Get yesterday's score
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

-- ============================================================================
-- PART 3: VERIFICATION
-- ============================================================================

-- Check functions updated
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('get_community_hi_index', 'get_personal_hi_index')
ORDER BY routine_name;

-- Test backward compatibility (should return 1.0x multiplier with no Hi Scale data)
DO $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := get_community_hi_index(7);
  IF (v_result->>'hi_scale_multiplier')::NUMERIC = 1.0 THEN
    RAISE NOTICE '✅ Backward compatible: NULL Hi Scale returns 1.0x multiplier';
  ELSE
    RAISE EXCEPTION '❌ Backward compatibility FAILED';
  END IF;
END $$;

SELECT '✅ Migration 004: Hi Index v2.0 (with Hi Scale) deployed successfully!' as status;

-- ============================================================================
