-- ============================================================================
-- HI POINTS SYSTEM - PHASE 6: TAP BATCH POINTS AWARDING
-- ============================================================================
-- Purpose: Award points for medallion taps using batch accumulation
-- 
-- Logic:
--   - Only paid tiers can earn points (free tier gets 0)
--   - Taps accumulate: 100 taps = 1 base point
--   - Daily cap: 10 point batches (1000 taps = max 10 base points/day)
--   - Multiplier applied based on tier
--   - Accumulator persists across batches, resets daily
--
-- Example: User taps 350 times
--   - 3 batches of 100 = 3 base points awarded
--   - 50 taps remain in accumulator for next batch
--
-- Example earnings per 100-tap batch:
--   Bronze:     1 × 1.00 = 1 pt
--   Silver:     1 × 1.25 = 1 pt (rounded)
--   Gold:       1 × 1.50 = 2 pts (rounded)
--   Premium:    1 × 2.00 = 2 pts
--   Collective: 1 × 2.50 = 3 pts (rounded)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_tap_batch_points(
  p_taps int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text;
  v_multiplier numeric;
  v_is_paid boolean;
  v_display_name text;
  v_today date := CURRENT_DATE;
  v_tap_accumulator int;
  v_tap_batches_awarded int;
  v_taps_per_point int := 100;  -- 100 taps = 1 point batch
  v_daily_batch_cap int := 10;  -- Max 10 batches/day (1000 taps)
  v_batches_to_award int;
  v_points_per_batch int := 1;
  v_total_points int;
  v_new_balance bigint;
  v_taps_remaining int;
BEGIN
  -- ========================================
  -- 1. Validate user is authenticated
  -- ========================================
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'awarded', false, 
      'reason', 'not_authenticated',
      'message', 'Please sign in to earn points'
    );
  END IF;
  
  -- Validate tap count
  IF p_taps < 1 THEN
    p_taps := 1;
  END IF;
  
  -- ========================================
  -- 2. Get tier and multiplier
  -- ========================================
  SELECT tier, multiplier, is_paid, display_name 
  INTO v_tier, v_multiplier, v_is_paid, v_display_name
  FROM get_user_tier_for_points(v_user_id);
  
  -- ========================================
  -- 3. Check if paid tier (can earn points)
  -- ========================================
  IF NOT COALESCE(v_is_paid, false) THEN
    RETURN jsonb_build_object(
      'awarded', false, 
      'reason', 'free_tier',
      'tier', v_tier,
      'message', 'Upgrade to Bronze to earn Hi Points!'
    );
  END IF;
  
  -- ========================================
  -- 4. Get or create daily activity record
  -- ========================================
  INSERT INTO hi_points_daily_activity (user_id, day)
  VALUES (v_user_id, v_today)
  ON CONFLICT (user_id, day) DO NOTHING;
  
  SELECT tap_accumulator, tap_batches_awarded 
  INTO v_tap_accumulator, v_tap_batches_awarded
  FROM hi_points_daily_activity
  WHERE user_id = v_user_id AND day = v_today;
  
  v_tap_accumulator := COALESCE(v_tap_accumulator, 0);
  v_tap_batches_awarded := COALESCE(v_tap_batches_awarded, 0);
  
  -- ========================================
  -- 5. Add new taps to accumulator
  -- ========================================
  v_tap_accumulator := v_tap_accumulator + p_taps;
  
  -- ========================================
  -- 6. Calculate batches to award
  -- ========================================
  v_batches_to_award := v_tap_accumulator / v_taps_per_point;
  
  -- ========================================
  -- 7. Check if already at daily cap
  -- ========================================
  IF v_tap_batches_awarded >= v_daily_batch_cap THEN
    -- Still accumulate taps for user experience, but no points
    UPDATE hi_points_daily_activity
    SET tap_accumulator = v_tap_accumulator,
        updated_at = now()
    WHERE user_id = v_user_id AND day = v_today;
    
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
      'awarded', false,
      'reason', 'daily_cap_reached',
      'tap_batches_today', v_tap_batches_awarded,
      'cap', v_daily_batch_cap,
      'taps_accumulated', v_tap_accumulator,
      'tier', v_tier,
      'balance', COALESCE(v_new_balance, 0),
      'message', 'Daily tap points cap reached! Keep tapping for global Hi Waves.'
    );
  END IF;
  
  -- ========================================
  -- 8. Limit batches to remaining daily cap
  -- ========================================
  IF v_batches_to_award > (v_daily_batch_cap - v_tap_batches_awarded) THEN
    v_batches_to_award := v_daily_batch_cap - v_tap_batches_awarded;
  END IF;
  
  -- ========================================
  -- 9. Award points if we have complete batches
  -- ========================================
  IF v_batches_to_award > 0 THEN
    -- Calculate total points with multiplier (per batch)
    v_total_points := 0;
    FOR i IN 1..v_batches_to_award LOOP
      v_total_points := v_total_points + GREATEST(1, calculate_points_with_multiplier(v_points_per_batch, v_multiplier));
    END LOOP;
    
    -- Award points
    PERFORM hi_award_points(
      v_user_id, 
      v_total_points, 
      'medallion_taps',
      jsonb_build_object(
        'tier', v_tier, 
        'multiplier', v_multiplier, 
        'batches', v_batches_to_award,
        'taps', v_batches_to_award * v_taps_per_point
      )::text
    );
    
    -- Calculate remaining taps after awarding
    v_taps_remaining := v_tap_accumulator - (v_batches_to_award * v_taps_per_point);
    
    -- Update daily activity
    UPDATE hi_points_daily_activity
    SET 
      tap_accumulator = v_taps_remaining,
      tap_batches_awarded = tap_batches_awarded + v_batches_to_award,
      tap_points_earned = tap_points_earned + v_total_points,
      updated_at = now()
    WHERE user_id = v_user_id AND day = v_today;
    
    -- Get new balance
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
      'awarded', true,
      'points', v_total_points,
      'batches_awarded', v_batches_to_award,
      'taps_per_batch', v_taps_per_point,
      'multiplier', v_multiplier,
      'tier', v_tier,
      'tier_name', v_display_name,
      'tap_batches_today', v_tap_batches_awarded + v_batches_to_award,
      'batches_remaining', v_daily_batch_cap - (v_tap_batches_awarded + v_batches_to_award),
      'cap', v_daily_batch_cap,
      'taps_toward_next', v_taps_remaining,
      'taps_needed_for_next', v_taps_per_point - v_taps_remaining,
      'balance', COALESCE(v_new_balance, 0)
    );
  ELSE
    -- ========================================
    -- 10. No complete batch yet, just accumulate
    -- ========================================
    UPDATE hi_points_daily_activity
    SET tap_accumulator = v_tap_accumulator,
        updated_at = now()
    WHERE user_id = v_user_id AND day = v_today;
    
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
      'awarded', false,
      'reason', 'accumulating',
      'taps_accumulated', v_tap_accumulator,
      'taps_needed', v_taps_per_point - (v_tap_accumulator % v_taps_per_point),
      'taps_per_point', v_taps_per_point,
      'tap_batches_today', v_tap_batches_awarded,
      'cap', v_daily_batch_cap,
      'tier', v_tier,
      'balance', COALESCE(v_new_balance, 0),
      'message', 'Keep tapping! ' || (v_taps_per_point - (v_tap_accumulator % v_taps_per_point)) || ' more taps for 1 point.'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.award_tap_batch_points(int) IS 
  'Award points for medallion taps. 100 taps = 1 point batch. Paid tiers only, 10 batches/day cap.';

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.award_tap_batch_points(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_tap_batch_points(int) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- First tap (accumulating):
-- SELECT award_tap_batch_points(1);
-- Expected: { "awarded": false, "reason": "accumulating", "taps_accumulated": 1, ... }

-- After 100 taps:
-- SELECT award_tap_batch_points(100);
-- Expected: { "awarded": true, "points": 1-3, "batches_awarded": 1, ... }

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.award_tap_batch_points(int);
