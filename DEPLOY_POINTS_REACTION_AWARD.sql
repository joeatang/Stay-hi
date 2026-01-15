-- ============================================================================
-- HI POINTS SYSTEM - PHASE 5: REACTION POINTS AWARDING
-- ============================================================================
-- Purpose: Award points for wave/peace reactions on shares
-- 
-- Logic:
--   - Only paid tiers can earn points (free tier gets 0)
--   - Base: 1 point per reaction
--   - Daily cap: 50 reactions (max 50 base points/day)
--   - Multiplier applied based on tier
--
-- Example earnings per reaction:
--   Bronze:     1 × 1.00 = 1 pt
--   Silver:     1 × 1.25 = 1 pt (rounded)
--   Gold:       1 × 1.50 = 2 pts (rounded)
--   Premium:    1 × 2.00 = 2 pts
--   Collective: 1 × 2.50 = 3 pts (rounded)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_reaction_points(
  p_reaction_type text DEFAULT 'wave'
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
  v_reaction_count int;
  v_base_points int := 1;    -- Base points per reaction
  v_daily_cap int := 50;     -- Max 50 reactions/day earn points
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
  
  SELECT reaction_count INTO v_reaction_count
  FROM hi_points_daily_activity
  WHERE user_id = v_user_id AND day = v_today;
  
  v_reaction_count := COALESCE(v_reaction_count, 0);
  
  -- ========================================
  -- 5. Check daily cap
  -- ========================================
  IF v_reaction_count >= v_daily_cap THEN
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'awarded', false,
      'reason', 'daily_cap_reached',
      'reaction_count', v_reaction_count,
      'cap', v_daily_cap,
      'tier', v_tier,
      'balance', COALESCE(v_new_balance, 0),
      'message', 'Daily reaction points cap reached!'
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
  -- 7. Award points
  -- ========================================
  PERFORM hi_award_points(
    v_user_id, 
    v_final_points, 
    'reaction_' || p_reaction_type,
    jsonb_build_object(
      'tier', v_tier, 
      'multiplier', v_multiplier, 
      'base', v_base_points,
      'reaction_type', p_reaction_type
    )::text
  );
  
  -- ========================================
  -- 8. Update daily activity counters
  -- ========================================
  UPDATE hi_points_daily_activity
  SET 
    reaction_count = reaction_count + 1,
    reaction_points_earned = reaction_points_earned + v_final_points,
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
    'reactions_today', v_reaction_count + 1,
    'reactions_remaining', v_daily_cap - (v_reaction_count + 1),
    'cap', v_daily_cap,
    'balance', COALESCE(v_new_balance, 0),
    'reaction_type', p_reaction_type
  );
END;
$$;

COMMENT ON FUNCTION public.award_reaction_points(text) IS 
  'Award points for wave/peace reactions. Paid tiers only, 1 base pt, 50/day cap, multiplier applied.';

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.award_reaction_points(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_reaction_points(text) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- As a paid tier user:
-- SELECT award_reaction_points('wave');
-- Expected: { "awarded": true, "points": 1-3 depending on tier, ... }

-- SELECT award_reaction_points('peace');
-- Expected: { "awarded": true, "points": 1-3 depending on tier, ... }

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.award_reaction_points(text);
