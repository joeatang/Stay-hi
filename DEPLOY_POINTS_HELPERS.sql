-- ============================================================================
-- HI POINTS SYSTEM - PHASE 3: HELPER FUNCTIONS
-- ============================================================================
-- Purpose: Reusable functions for tier checking and point calculation
-- Used by all award_*_points() RPCs
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: Get user's tier info for points
-- Returns tier name, multiplier, and whether they can earn points
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_tier_for_points(p_user_id uuid)
RETURNS TABLE(
  tier text,
  multiplier numeric,
  is_paid boolean,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tier text;
BEGIN
  -- Get user's current tier from user_memberships
  SELECT um.tier INTO v_user_tier
  FROM user_memberships um
  WHERE um.user_id = p_user_id
  LIMIT 1;
  
  -- Default to 'free' if no membership found
  v_user_tier := COALESCE(v_user_tier, 'free');
  
  -- Return tier info from config
  RETURN QUERY
  SELECT 
    pc.tier,
    pc.multiplier,
    pc.is_paid,
    pc.display_name
  FROM hi_points_config pc
  WHERE pc.tier = v_user_tier;
  
  -- If tier not in config (shouldn't happen), return free tier values
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'free'::text, 0.00::numeric, false::boolean, 'Hi Explorer'::text;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_tier_for_points(uuid) IS 
  'Returns user tier info for points calculation. Checks user_memberships and hi_points_config.';

-- Grant execute
REVOKE ALL ON FUNCTION public.get_user_tier_for_points(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_tier_for_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier_for_points(uuid) TO service_role;


-- ============================================================================
-- FUNCTION 2: Calculate points with tier multiplier
-- Applies multiplier and rounds to nearest integer
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_points_with_multiplier(
  p_base_points int,
  p_multiplier numeric
)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(0, ROUND(p_base_points * p_multiplier)::int);
$$;

COMMENT ON FUNCTION public.calculate_points_with_multiplier(int, numeric) IS 
  'Applies tier multiplier to base points. Returns 0 for free tier (multiplier=0).';

-- Grant execute
REVOKE ALL ON FUNCTION public.calculate_points_with_multiplier(int, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_points_with_multiplier(int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_points_with_multiplier(int, numeric) TO service_role;


-- ============================================================================
-- FUNCTION 3: Check if user can earn points (paid tier check)
-- Quick boolean check for tier gating
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_user_earn_points(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_paid boolean;
BEGIN
  SELECT is_paid INTO v_is_paid
  FROM get_user_tier_for_points(p_user_id);
  
  RETURN COALESCE(v_is_paid, false);
END;
$$;

COMMENT ON FUNCTION public.can_user_earn_points(uuid) IS 
  'Returns true if user has a paid tier and can earn points.';

-- Grant execute
REVOKE ALL ON FUNCTION public.can_user_earn_points(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_earn_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_earn_points(uuid) TO service_role;


-- ============================================================================
-- FUNCTION 4: Get user's daily points summary
-- Returns all points info for display in UI
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_daily_points_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier_info RECORD;
  v_activity RECORD;
  v_balance bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Get tier info
  SELECT * INTO v_tier_info FROM get_user_tier_for_points(v_user_id);
  
  -- Get today's activity
  SELECT * INTO v_activity FROM hi_points_daily_activity
  WHERE user_id = v_user_id AND day = CURRENT_DATE;
  
  -- Get current balance
  SELECT balance INTO v_balance FROM hi_points WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'tier', v_tier_info.tier,
    'multiplier', v_tier_info.multiplier,
    'is_paid', v_tier_info.is_paid,
    'display_name', v_tier_info.display_name,
    'balance', COALESCE(v_balance, 0),
    'today', jsonb_build_object(
      'share_count', COALESCE(v_activity.share_count, 0),
      'share_cap', 10,
      'share_points', COALESCE(v_activity.share_points_earned, 0),
      'reaction_count', COALESCE(v_activity.reaction_count, 0),
      'reaction_cap', 50,
      'reaction_points', COALESCE(v_activity.reaction_points_earned, 0),
      'tap_accumulator', COALESCE(v_activity.tap_accumulator, 0),
      'tap_batches', COALESCE(v_activity.tap_batches_awarded, 0),
      'tap_cap', 10,
      'tap_points', COALESCE(v_activity.tap_points_earned, 0),
      'checkin_points', COALESCE(v_activity.checkin_points_earned, 0),
      'total_today', COALESCE(v_activity.share_points_earned, 0) + 
                     COALESCE(v_activity.reaction_points_earned, 0) +
                     COALESCE(v_activity.tap_points_earned, 0) +
                     COALESCE(v_activity.checkin_points_earned, 0)
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_daily_points_summary() IS 
  'Returns current user points summary including tier, balance, and daily activity.';

-- Grant execute
REVOKE ALL ON FUNCTION public.get_daily_points_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_points_summary() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- SELECT * FROM get_user_tier_for_points('YOUR_USER_ID');
-- SELECT calculate_points_with_multiplier(10, 1.5); -- Expected: 15
-- SELECT calculate_points_with_multiplier(10, 0.0); -- Expected: 0
-- SELECT can_user_earn_points('YOUR_USER_ID');
-- SELECT get_daily_points_summary();

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.get_daily_points_summary();
-- DROP FUNCTION IF EXISTS public.can_user_earn_points(uuid);
-- DROP FUNCTION IF EXISTS public.calculate_points_with_multiplier(int, numeric);
-- DROP FUNCTION IF EXISTS public.get_user_tier_for_points(uuid);
