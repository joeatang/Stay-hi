-- ============================================================================
-- HI INDEX STREAK MULTIPLIER — DEPLOYMENT SCRIPT
-- ============================================================================
--
-- Purpose: Add streak bonus multiplier to Hi Index calculations
-- 
-- STREAK MULTIPLIER TIERS:
--   0-6 days:   1.00× (no bonus)
--   7-13 days:  1.05× (+5%)
--   14-20 days: 1.10× (+10%)
--   21-29 days: 1.15× (+15%)
--   30+ days:   1.20× (+20% cap)
--
-- PHILOSOPHY:
--   - Rewards consistency without inflating scores artificially
--   - Shares still matter most (base score driver)
--   - Creates urgency to maintain streak (protect the multiplier!)
--
-- SAFE TO RE-RUN: Yes (uses CREATE OR REPLACE)
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Calculate Streak Multiplier
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_streak_multiplier(
  p_streak_days INT
)
RETURNS NUMERIC(4,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Streak multiplier tiers
  IF p_streak_days >= 30 THEN
    RETURN 1.20;  -- 30+ days = +20% (cap)
  ELSIF p_streak_days >= 21 THEN
    RETURN 1.15;  -- 21-29 days = +15%
  ELSIF p_streak_days >= 14 THEN
    RETURN 1.10;  -- 14-20 days = +10%
  ELSIF p_streak_days >= 7 THEN
    RETURN 1.05;  -- 7-13 days = +5%
  ELSE
    RETURN 1.00;  -- 0-6 days = no bonus
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_streak_multiplier IS 'Calculate streak bonus multiplier (1.0-1.2×) based on consecutive days';

-- ============================================================================
-- UPDATED: PERSONAL HI INDEX RPC (With Streak Multiplier)
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
  
  -- Activity counts
  v_share_count INT := 0;
  v_tap_count INT := 0;
  v_raw_score NUMERIC(10,2) := 0;
  
  -- Streak data
  v_current_streak INT := 0;
  v_streak_multiplier NUMERIC(4,2) := 1.00;
  v_streak_bonus_label TEXT := 'No bonus';
  
  -- Index calculation
  v_base_index NUMERIC(3,2);
  v_final_index NUMERIC(3,2);
  v_yesterday_index NUMERIC(3,2);
  v_percent_change NUMERIC(5,2);
  
  -- Percentile
  v_total_users INT;
  v_users_below INT;
  v_percentile NUMERIC(5,2);
BEGIN
  -- Require authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- ========================================
  -- STEP 1: Get user's activity (shares + taps)
  -- ========================================
  SELECT 
    COALESCE(SUM(share_count), 0),
    COALESCE(SUM(tap_accumulator + (tap_batches_awarded * 100)), 0)
  INTO v_share_count, v_tap_count
  FROM hi_points_daily_activity
  WHERE user_id = v_user_id 
    AND day >= v_start_date 
    AND day <= v_today;
  
  -- Also count user's public shares (may not have points records)
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ;
  
  -- ========================================
  -- STEP 2: Get current streak from user_stats
  -- ========================================
  SELECT COALESCE(current_streak, 0)
  INTO v_current_streak
  FROM user_stats
  WHERE user_id = v_user_id;
  
  -- If no user_stats record, streak is 0
  IF v_current_streak IS NULL THEN
    v_current_streak := 0;
  END IF;
  
  -- ========================================
  -- STEP 3: Calculate streak multiplier
  -- ========================================
  v_streak_multiplier := calculate_streak_multiplier(v_current_streak);
  
  -- Generate human-readable bonus label
  v_streak_bonus_label := CASE
    WHEN v_current_streak >= 30 THEN '🔥 30+ day streak (+20%)'
    WHEN v_current_streak >= 21 THEN '⚡ 21+ day streak (+15%)'
    WHEN v_current_streak >= 14 THEN '✨ 14+ day streak (+10%)'
    WHEN v_current_streak >= 7 THEN '🌟 7+ day streak (+5%)'
    ELSE 'Build a 7-day streak for bonus!'
  END;
  
  -- ========================================
  -- STEP 4: Calculate raw score and base index
  -- ========================================
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  
  -- Base normalization: ~10 shares + ~1000 taps = 110 pts = index 5
  v_base_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_raw_score / 110.0 * 4.0)
  ));
  
  -- ========================================
  -- STEP 5: Apply streak multiplier to get final index
  -- ========================================
  -- Apply multiplier but cap at 5.0
  v_final_index := LEAST(5.0, v_base_index * v_streak_multiplier);
  
  -- ========================================
  -- STEP 6: Calculate percentile (what % of users is this user ahead of)
  -- ========================================
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM hi_points_daily_activity
  WHERE day >= v_start_date;
  
  IF v_total_users > 1 THEN
    -- Count users with lower raw scores (before multiplier for fair comparison)
    WITH user_scores AS (
      SELECT 
        hpda.user_id,
        (COALESCE(SUM(hpda.share_count), 0) * 10.0 + 
         COALESCE(SUM(hpda.tap_accumulator + hpda.tap_batches_awarded * 100), 0) / 100.0) as base_score,
        COALESCE(us.current_streak, 0) as streak,
        calculate_streak_multiplier(COALESCE(us.current_streak, 0)) as multiplier
      FROM hi_points_daily_activity hpda
      LEFT JOIN user_stats us ON us.user_id = hpda.user_id
      WHERE hpda.day >= v_start_date AND hpda.day <= v_today
      GROUP BY hpda.user_id, us.current_streak
    )
    SELECT COUNT(*) INTO v_users_below
    FROM user_scores
    WHERE (base_score * multiplier) < (v_raw_score * v_streak_multiplier);
    
    v_percentile := (v_users_below::NUMERIC / v_total_users::NUMERIC) * 100;
  ELSE
    v_percentile := 100; -- Only user = top 100%
  END IF;
  
  -- ========================================
  -- STEP 7: Calculate % change from yesterday
  -- ========================================
  SELECT normalized_index INTO v_yesterday_index
  FROM hi_index_snapshots
  WHERE scope = v_user_id::text AND snapshot_date = v_today - 1;
  
  IF v_yesterday_index IS NOT NULL AND v_yesterday_index > 0 THEN
    v_percent_change := ((v_final_index - v_yesterday_index) / v_yesterday_index) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  -- ========================================
  -- STEP 8: Upsert today's snapshot (stores final index after multiplier)
  -- ========================================
  INSERT INTO hi_index_snapshots (
    snapshot_date, scope, raw_score, normalized_index, 
    share_count, tap_count, percentile, updated_at
  )
  VALUES (
    v_today, v_user_id::text, v_raw_score, v_final_index,
    v_share_count, v_tap_count, v_percentile, NOW()
  )
  ON CONFLICT (snapshot_date, scope) 
  DO UPDATE SET 
    raw_score = EXCLUDED.raw_score,
    normalized_index = EXCLUDED.normalized_index,
    share_count = EXCLUDED.share_count,
    tap_count = EXCLUDED.tap_count,
    percentile = EXCLUDED.percentile,
    updated_at = NOW();
  
  -- ========================================
  -- STEP 9: Return comprehensive JSON response
  -- ========================================
  RETURN jsonb_build_object(
    -- Final calculated index (after streak multiplier)
    'index', ROUND(v_final_index, 2),
    
    -- Base index (before streak multiplier - for transparency)
    'base_index', ROUND(v_base_index, 2),
    
    -- Raw activity data
    'raw_score', ROUND(v_raw_score, 2),
    'share_count', v_share_count,
    'tap_count', v_tap_count,
    
    -- Streak bonus info
    'streak', jsonb_build_object(
      'current', v_current_streak,
      'multiplier', v_streak_multiplier,
      'bonus_percent', ROUND((v_streak_multiplier - 1.0) * 100, 0),
      'label', v_streak_bonus_label,
      'next_tier', CASE
        WHEN v_current_streak >= 30 THEN NULL  -- Already at max
        WHEN v_current_streak >= 21 THEN 30 - v_current_streak
        WHEN v_current_streak >= 14 THEN 21 - v_current_streak
        WHEN v_current_streak >= 7 THEN 14 - v_current_streak
        ELSE 7 - v_current_streak
      END
    ),
    
    -- Trend info
    'percent_change', ROUND(COALESCE(v_percent_change, 0), 1),
    'trend', CASE 
      WHEN v_percent_change > 0 THEN 'up'
      WHEN v_percent_change < 0 THEN 'down'
      ELSE 'stable'
    END,
    
    -- Ranking
    'percentile', ROUND(COALESCE(v_percentile, 0), 0),
    
    -- Metadata
    'period_days', p_days,
    'as_of', v_today
  );
END;
$$;

COMMENT ON FUNCTION public.get_personal_hi_index IS 
  'Get personal Hi Index with streak multiplier bonus (7-day rolling wellness score)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

REVOKE ALL ON FUNCTION public.calculate_streak_multiplier(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_streak_multiplier(INT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_personal_hi_index(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personal_hi_index(INT) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test streak multiplier function
-- SELECT calculate_streak_multiplier(0);   -- Should return 1.00
-- SELECT calculate_streak_multiplier(6);   -- Should return 1.00
-- SELECT calculate_streak_multiplier(7);   -- Should return 1.05
-- SELECT calculate_streak_multiplier(14);  -- Should return 1.10
-- SELECT calculate_streak_multiplier(21);  -- Should return 1.15
-- SELECT calculate_streak_multiplier(30);  -- Should return 1.20
-- SELECT calculate_streak_multiplier(100); -- Should return 1.20 (capped)

-- Test personal index with streak (requires auth)
-- SELECT get_personal_hi_index(7);

SELECT '✅ Hi Index Streak Multiplier Deployed Successfully!' as status;
