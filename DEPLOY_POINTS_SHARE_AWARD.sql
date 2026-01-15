-- ============================================================================
-- HI POINTS SYSTEM - PHASE 4: SHARE POINTS AWARDING
-- ============================================================================
-- Purpose: Award points for share submissions
-- 
-- Logic:
--   - Only paid tiers can earn points (free tier gets 0)
--   - Base: 10 points per share
--   - Daily cap: 10 shares (max 100 base points/day)
--   - Multiplier applied based on tier
--
-- Example earnings per share:
--   Bronze:     10 × 1.00 = 10 pts
--   Silver:     10 × 1.25 = 13 pts (rounded)
--   Gold:       10 × 1.50 = 15 pts
--   Premium:    10 × 2.00 = 20 pts
--   Collective: 10 × 2.50 = 25 pts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_share_points(
  p_share_type text DEFAULT 'public'
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
  v_share_count int;
  v_base_points int := 10;   -- Base points per share
  v_daily_cap int := 10;     -- Max 10 shares/day earn points
  v_final_points int;
  v_new_balance bigint;
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
  
  SELECT share_count INTO v_share_count
  FROM hi_points_daily_activity
  WHERE user_id = v_user_id AND day = v_today;
  
  v_share_count := COALESCE(v_share_count, 0);
  
  -- ========================================
  -- 5. Check daily cap
  -- ========================================
  IF v_share_count >= v_daily_cap THEN
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'awarded', false,
      'reason', 'daily_cap_reached',
      'share_count', v_share_count,
      'cap', v_daily_cap,
      'tier', v_tier,
      'balance', COALESCE(v_new_balance, 0),
      'message', 'Daily share points cap reached! Come back tomorrow.'
    );
  END IF;
  
  -- ========================================
  -- 6. Calculate points with multiplier
  -- ========================================
  v_final_points := calculate_points_with_multiplier(v_base_points, v_multiplier);
  
  -- Ensure at least 1 point for paid tiers
  IF v_final_points < 1 AND v_is_paid THEN
    v_final_points := 1;
  END IF;
  
  -- ========================================
  -- 7. Award points (uses existing hi_award_points)
  -- ========================================
  PERFORM hi_award_points(
    v_user_id, 
    v_final_points, 
    'share_' || p_share_type,
    jsonb_build_object(
      'tier', v_tier, 
      'multiplier', v_multiplier, 
      'base', v_base_points,
      'share_type', p_share_type
    )::text
  );
  
  -- ========================================
  -- 8. Update daily activity counters
  -- ========================================
  UPDATE hi_points_daily_activity
  SET 
    share_count = share_count + 1,
    share_points_earned = share_points_earned + v_final_points,
    updated_at = now()
  WHERE user_id = v_user_id AND day = v_today;
  
  -- ========================================
  -- 9. Get new balance for response
  -- ========================================
  SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
  
  -- ========================================
  -- 10. Return success response
  -- ========================================
  RETURN jsonb_build_object(
    'awarded', true,
    'points', v_final_points,
    'base_points', v_base_points,
    'multiplier', v_multiplier,
    'tier', v_tier,
    'tier_name', v_display_name,
    'shares_today', v_share_count + 1,
    'shares_remaining', v_daily_cap - (v_share_count + 1),
    'cap', v_daily_cap,
    'balance', COALESCE(v_new_balance, 0),
    'share_type', p_share_type
  );
END;
$$;

COMMENT ON FUNCTION public.award_share_points(text) IS 
  'Award points for share submission. Paid tiers only, 10 base pts, 10/day cap, multiplier applied.';

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.award_share_points(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_share_points(text) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- As a paid tier user:
-- SELECT award_share_points('public');
-- Expected: { "awarded": true, "points": 10-25 depending on tier, ... }

-- As a free tier user:
-- SELECT award_share_points('public');
-- Expected: { "awarded": false, "reason": "free_tier", ... }

-- After 10 shares:
-- SELECT award_share_points('public');
-- Expected: { "awarded": false, "reason": "daily_cap_reached", ... }

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.award_share_points(text);
