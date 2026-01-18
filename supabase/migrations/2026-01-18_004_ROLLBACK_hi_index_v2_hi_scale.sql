-- ============================================================================
-- 🔙 ROLLBACK: Hi Index v2.0 (Hi Scale Integration)
-- ============================================================================
-- Migration: 004 ROLLBACK
-- Date: 2026-01-18
-- Purpose: Restore Hi Index v1.0 (activity-only formula)
-- ============================================================================

-- Restore Community Hi Index v1.0 (activity only, no Hi Scale)
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

-- Restore Personal Hi Index v1.0 (activity only, no Hi Scale)
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
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
  
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_raw_score / 110.0 * 4.0)
  ));
  
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM hi_points_daily_activity
  WHERE day >= v_start_date;
  
  IF v_total_users > 1 THEN
    WITH user_scores AS (
      SELECT 
        user_id,
        (COALESCE(SUM(share_count), 0) * 10.0 + 
         COALESCE(SUM(tap_accumulator + tap_batches_awarded * 100), 0) / 100.0) as score
      FROM hi_points_daily_activity
      WHERE day >= v_start_date AND day <= v_today
      GROUP BY user_id
    )
    SELECT COUNT(*) INTO v_users_below
    FROM user_scores
    WHERE score < v_raw_score;
    
    v_percentile := (v_users_below::NUMERIC / v_total_users::NUMERIC) * 100;
  ELSE
    v_percentile := 100;
  END IF;
  
  SELECT normalized_index INTO v_yesterday_score
  FROM hi_index_snapshots
  WHERE scope = v_user_id::text AND snapshot_date = v_today - 1;
  
  IF v_yesterday_score IS NOT NULL AND v_yesterday_score > 0 THEN
    v_percent_change := ((v_normalized_index - v_yesterday_score) / v_yesterday_score) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  INSERT INTO hi_index_snapshots (snapshot_date, scope, raw_score, normalized_index, share_count, tap_count, percentile, updated_at)
  VALUES (v_today, v_user_id::text, v_raw_score, v_normalized_index, v_share_count, v_tap_count, v_percentile, NOW())
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
    'raw_score', ROUND(v_raw_score, 2),
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
    'as_of', v_today
  );
END;
$$;

SELECT '✅ Rollback 004: Hi Index v1.0 (activity-only) restored successfully' as status;

-- ============================================================================
