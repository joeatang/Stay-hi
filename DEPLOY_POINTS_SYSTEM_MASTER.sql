-- ============================================================================
-- HI POINTS SYSTEM - MASTER DEPLOYMENT SCRIPT
-- ============================================================================
-- 
-- Run this file in Supabase SQL Editor to deploy the complete points system.
-- 
-- DEPLOYMENT ORDER:
--   1. hi_points_config        - Tier multipliers (foundation)
--   2. hi_points_daily_activity - Rate limiting table
--   3. Helper functions        - Tier checking, multiplier calculation
--   4. award_share_points()    - Share points RPC
--   5. award_reaction_points() - Reaction points RPC
--   6. award_tap_batch_points()- Tap points RPC
--   7. hi_points_redemptions   - Future redemption table
--
-- PREREQUISITES:
--   - hi_points table must exist (DEPLOY_HI_POINTS.sql)
--   - hi_award_points() function must exist
--   - user_memberships table must exist
--
-- SAFE TO RE-RUN: Yes (uses IF NOT EXISTS and ON CONFLICT)
-- ============================================================================

-- ============================================================================
-- PHASE 1: TIER MULTIPLIER CONFIG
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hi_points_config (
  tier text PRIMARY KEY,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.00,
  is_paid boolean NOT NULL DEFAULT false,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hi_points_config IS 'Tier multipliers for Hi Points system. Paid tiers earn points, free cannot.';

INSERT INTO public.hi_points_config (tier, multiplier, is_paid, display_name) VALUES
  ('free',       0.00, false, 'Hi Explorer'),
  ('bronze',     1.00, true,  'Hi Pathfinder'),
  ('silver',     1.25, true,  'Hi Trailblazer'),
  ('gold',       1.50, true,  'Hi Champion'),
  ('premium',    2.00, true,  'Hi Pioneer'),
  ('collective', 2.50, true,  'Hi Collective')
ON CONFLICT (tier) DO UPDATE SET
  multiplier = EXCLUDED.multiplier,
  is_paid = EXCLUDED.is_paid,
  display_name = EXCLUDED.display_name,
  updated_at = now();

ALTER TABLE public.hi_points_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hi_points_config_select_all" ON public.hi_points_config;
CREATE POLICY "hi_points_config_select_all" ON public.hi_points_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hi_points_config_all_service" ON public.hi_points_config;
CREATE POLICY "hi_points_config_all_service" ON public.hi_points_config FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hi_points_config_is_paid ON public.hi_points_config(is_paid) WHERE is_paid = true;

-- ============================================================================
-- PHASE 2: DAILY ACTIVITY TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hi_points_daily_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  share_count int NOT NULL DEFAULT 0,
  reaction_count int NOT NULL DEFAULT 0,
  tap_accumulator int NOT NULL DEFAULT 0,
  tap_batches_awarded int NOT NULL DEFAULT 0,
  share_points_earned int NOT NULL DEFAULT 0,
  reaction_points_earned int NOT NULL DEFAULT 0,
  tap_points_earned int NOT NULL DEFAULT 0,
  checkin_points_earned int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

COMMENT ON TABLE public.hi_points_daily_activity IS 'Per-user daily activity tracking for points rate limiting';

ALTER TABLE public.hi_points_daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hi_points_daily_activity_select_self" ON public.hi_points_daily_activity;
CREATE POLICY "hi_points_daily_activity_select_self" ON public.hi_points_daily_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "hi_points_daily_activity_all_service" ON public.hi_points_daily_activity;
CREATE POLICY "hi_points_daily_activity_all_service" ON public.hi_points_daily_activity FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hi_points_daily_activity_user_day ON public.hi_points_daily_activity(user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_hi_points_daily_activity_day ON public.hi_points_daily_activity(day);

-- ============================================================================
-- PHASE 3: HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user tier for points
CREATE OR REPLACE FUNCTION public.get_user_tier_for_points(p_user_id uuid)
RETURNS TABLE(tier text, multiplier numeric, is_paid boolean, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_tier text;
BEGIN
  SELECT um.tier INTO v_user_tier FROM user_memberships um WHERE um.user_id = p_user_id LIMIT 1;
  v_user_tier := COALESCE(v_user_tier, 'free');
  RETURN QUERY SELECT pc.tier, pc.multiplier, pc.is_paid, pc.display_name FROM hi_points_config pc WHERE pc.tier = v_user_tier;
  IF NOT FOUND THEN RETURN QUERY SELECT 'free'::text, 0.00::numeric, false::boolean, 'Hi Explorer'::text; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_tier_for_points(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_tier_for_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier_for_points(uuid) TO service_role;

-- Function: Calculate points with multiplier
CREATE OR REPLACE FUNCTION public.calculate_points_with_multiplier(p_base_points int, p_multiplier numeric)
RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT GREATEST(0, ROUND(p_base_points * p_multiplier)::int); $$;

REVOKE ALL ON FUNCTION public.calculate_points_with_multiplier(int, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_points_with_multiplier(int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_points_with_multiplier(int, numeric) TO service_role;

-- Function: Check if user can earn points
CREATE OR REPLACE FUNCTION public.can_user_earn_points(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_is_paid boolean;
BEGIN
  SELECT is_paid INTO v_is_paid FROM get_user_tier_for_points(p_user_id);
  RETURN COALESCE(v_is_paid, false);
END;
$$;

REVOKE ALL ON FUNCTION public.can_user_earn_points(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_earn_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_earn_points(uuid) TO service_role;

-- Function: Get daily points summary
CREATE OR REPLACE FUNCTION public.get_daily_points_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier_info RECORD;
  v_activity RECORD;
  v_balance bigint;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('error', 'not_authenticated'); END IF;
  SELECT * INTO v_tier_info FROM get_user_tier_for_points(v_user_id);
  SELECT * INTO v_activity FROM hi_points_daily_activity WHERE user_id = v_user_id AND day = CURRENT_DATE;
  SELECT balance INTO v_balance FROM hi_points WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'user_id', v_user_id, 'tier', v_tier_info.tier, 'multiplier', v_tier_info.multiplier,
    'is_paid', v_tier_info.is_paid, 'display_name', v_tier_info.display_name,
    'balance', COALESCE(v_balance, 0),
    'today', jsonb_build_object(
      'share_count', COALESCE(v_activity.share_count, 0), 'share_cap', 10,
      'reaction_count', COALESCE(v_activity.reaction_count, 0), 'reaction_cap', 50,
      'tap_accumulator', COALESCE(v_activity.tap_accumulator, 0),
      'tap_batches', COALESCE(v_activity.tap_batches_awarded, 0), 'tap_cap', 10,
      'total_points_today', COALESCE(v_activity.share_points_earned, 0) + 
        COALESCE(v_activity.reaction_points_earned, 0) + COALESCE(v_activity.tap_points_earned, 0) +
        COALESCE(v_activity.checkin_points_earned, 0)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_points_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_points_summary() TO authenticated;

-- ============================================================================
-- PHASE 4: AWARD SHARE POINTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.award_share_points(p_share_type text DEFAULT 'public')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text; v_multiplier numeric; v_is_paid boolean; v_display_name text;
  v_today date := CURRENT_DATE;
  v_share_count int; v_base_points int := 10; v_daily_cap int := 10;
  v_final_points int; v_new_balance bigint;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('awarded', false, 'reason', 'not_authenticated'); END IF;
  SELECT tier, multiplier, is_paid, display_name INTO v_tier, v_multiplier, v_is_paid, v_display_name FROM get_user_tier_for_points(v_user_id);
  IF NOT COALESCE(v_is_paid, false) THEN RETURN jsonb_build_object('awarded', false, 'reason', 'free_tier', 'tier', v_tier, 'message', 'Upgrade to Bronze to earn Hi Points!'); END IF;
  INSERT INTO hi_points_daily_activity (user_id, day) VALUES (v_user_id, v_today) ON CONFLICT (user_id, day) DO NOTHING;
  SELECT share_count INTO v_share_count FROM hi_points_daily_activity WHERE user_id = v_user_id AND day = v_today;
  v_share_count := COALESCE(v_share_count, 0);
  IF v_share_count >= v_daily_cap THEN
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('awarded', false, 'reason', 'daily_cap_reached', 'share_count', v_share_count, 'cap', v_daily_cap, 'balance', COALESCE(v_new_balance, 0));
  END IF;
  v_final_points := calculate_points_with_multiplier(v_base_points, v_multiplier);
  IF v_final_points < 1 AND v_is_paid THEN v_final_points := 1; END IF;
  PERFORM hi_award_points(v_user_id, v_final_points, 'share_' || p_share_type, jsonb_build_object('tier', v_tier, 'multiplier', v_multiplier, 'base', v_base_points)::text);
  UPDATE hi_points_daily_activity SET share_count = share_count + 1, share_points_earned = share_points_earned + v_final_points, updated_at = now() WHERE user_id = v_user_id AND day = v_today;
  SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
  RETURN jsonb_build_object('awarded', true, 'points', v_final_points, 'base_points', v_base_points, 'multiplier', v_multiplier, 'tier', v_tier, 'tier_name', v_display_name, 'shares_today', v_share_count + 1, 'cap', v_daily_cap, 'balance', COALESCE(v_new_balance, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.award_share_points(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_share_points(text) TO authenticated;

-- ============================================================================
-- PHASE 5: AWARD REACTION POINTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.award_reaction_points(p_reaction_type text DEFAULT 'wave')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text; v_multiplier numeric; v_is_paid boolean; v_display_name text;
  v_today date := CURRENT_DATE;
  v_reaction_count int; v_base_points int := 1; v_daily_cap int := 50;
  v_final_points int; v_new_balance bigint;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('awarded', false, 'reason', 'not_authenticated'); END IF;
  SELECT tier, multiplier, is_paid, display_name INTO v_tier, v_multiplier, v_is_paid, v_display_name FROM get_user_tier_for_points(v_user_id);
  IF NOT COALESCE(v_is_paid, false) THEN RETURN jsonb_build_object('awarded', false, 'reason', 'free_tier', 'tier', v_tier); END IF;
  INSERT INTO hi_points_daily_activity (user_id, day) VALUES (v_user_id, v_today) ON CONFLICT (user_id, day) DO NOTHING;
  SELECT reaction_count INTO v_reaction_count FROM hi_points_daily_activity WHERE user_id = v_user_id AND day = v_today;
  v_reaction_count := COALESCE(v_reaction_count, 0);
  IF v_reaction_count >= v_daily_cap THEN
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('awarded', false, 'reason', 'daily_cap_reached', 'reaction_count', v_reaction_count, 'cap', v_daily_cap, 'balance', COALESCE(v_new_balance, 0));
  END IF;
  v_final_points := calculate_points_with_multiplier(v_base_points, v_multiplier);
  IF v_final_points < 1 AND v_is_paid THEN v_final_points := 1; END IF;
  PERFORM hi_award_points(v_user_id, v_final_points, 'reaction_' || p_reaction_type, jsonb_build_object('tier', v_tier, 'multiplier', v_multiplier)::text);
  UPDATE hi_points_daily_activity SET reaction_count = reaction_count + 1, reaction_points_earned = reaction_points_earned + v_final_points, updated_at = now() WHERE user_id = v_user_id AND day = v_today;
  SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
  RETURN jsonb_build_object('awarded', true, 'points', v_final_points, 'tier', v_tier, 'reactions_today', v_reaction_count + 1, 'cap', v_daily_cap, 'balance', COALESCE(v_new_balance, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.award_reaction_points(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_reaction_points(text) TO authenticated;

-- ============================================================================
-- PHASE 6: AWARD TAP BATCH POINTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.award_tap_batch_points(p_taps int DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text; v_multiplier numeric; v_is_paid boolean; v_display_name text;
  v_today date := CURRENT_DATE;
  v_tap_accumulator int; v_tap_batches_awarded int;
  v_taps_per_point int := 100; v_daily_batch_cap int := 10;
  v_batches_to_award int; v_points_per_batch int := 1;
  v_total_points int; v_new_balance bigint; v_taps_remaining int;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('awarded', false, 'reason', 'not_authenticated'); END IF;
  IF p_taps < 1 THEN p_taps := 1; END IF;
  SELECT tier, multiplier, is_paid, display_name INTO v_tier, v_multiplier, v_is_paid, v_display_name FROM get_user_tier_for_points(v_user_id);
  IF NOT COALESCE(v_is_paid, false) THEN RETURN jsonb_build_object('awarded', false, 'reason', 'free_tier', 'tier', v_tier); END IF;
  INSERT INTO hi_points_daily_activity (user_id, day) VALUES (v_user_id, v_today) ON CONFLICT (user_id, day) DO NOTHING;
  SELECT tap_accumulator, tap_batches_awarded INTO v_tap_accumulator, v_tap_batches_awarded FROM hi_points_daily_activity WHERE user_id = v_user_id AND day = v_today;
  v_tap_accumulator := COALESCE(v_tap_accumulator, 0) + p_taps;
  v_tap_batches_awarded := COALESCE(v_tap_batches_awarded, 0);
  v_batches_to_award := v_tap_accumulator / v_taps_per_point;
  IF v_tap_batches_awarded >= v_daily_batch_cap THEN
    UPDATE hi_points_daily_activity SET tap_accumulator = v_tap_accumulator, updated_at = now() WHERE user_id = v_user_id AND day = v_today;
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('awarded', false, 'reason', 'daily_cap_reached', 'tap_batches_today', v_tap_batches_awarded, 'cap', v_daily_batch_cap, 'taps_accumulated', v_tap_accumulator, 'balance', COALESCE(v_new_balance, 0));
  END IF;
  IF v_batches_to_award > (v_daily_batch_cap - v_tap_batches_awarded) THEN v_batches_to_award := v_daily_batch_cap - v_tap_batches_awarded; END IF;
  IF v_batches_to_award > 0 THEN
    v_total_points := 0;
    FOR i IN 1..v_batches_to_award LOOP v_total_points := v_total_points + GREATEST(1, calculate_points_with_multiplier(v_points_per_batch, v_multiplier)); END LOOP;
    PERFORM hi_award_points(v_user_id, v_total_points, 'medallion_taps', jsonb_build_object('tier', v_tier, 'batches', v_batches_to_award)::text);
    v_taps_remaining := v_tap_accumulator - (v_batches_to_award * v_taps_per_point);
    UPDATE hi_points_daily_activity SET tap_accumulator = v_taps_remaining, tap_batches_awarded = tap_batches_awarded + v_batches_to_award, tap_points_earned = tap_points_earned + v_total_points, updated_at = now() WHERE user_id = v_user_id AND day = v_today;
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('awarded', true, 'points', v_total_points, 'batches_awarded', v_batches_to_award, 'tier', v_tier, 'tap_batches_today', v_tap_batches_awarded + v_batches_to_award, 'cap', v_daily_batch_cap, 'taps_toward_next', v_taps_remaining, 'balance', COALESCE(v_new_balance, 0));
  ELSE
    UPDATE hi_points_daily_activity SET tap_accumulator = v_tap_accumulator, updated_at = now() WHERE user_id = v_user_id AND day = v_today;
    SELECT balance INTO v_new_balance FROM hi_points WHERE user_id = v_user_id;
    RETURN jsonb_build_object('awarded', false, 'reason', 'accumulating', 'taps_accumulated', v_tap_accumulator, 'taps_needed', v_taps_per_point - (v_tap_accumulator % v_taps_per_point), 'tier', v_tier, 'balance', COALESCE(v_new_balance, 0));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.award_tap_batch_points(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_tap_batch_points(int) TO authenticated;

-- ============================================================================
-- PHASE 7: REDEMPTION TABLE (Future)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hi_points_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_spent bigint NOT NULL CHECK (points_spent > 0),
  redemption_type text NOT NULL,
  item_id text,
  item_details jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  ledger_entry_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  refunded_at timestamptz
);

ALTER TABLE public.hi_points_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hi_points_redemptions_select_self" ON public.hi_points_redemptions;
CREATE POLICY "hi_points_redemptions_select_self" ON public.hi_points_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "hi_points_redemptions_all_service" ON public.hi_points_redemptions;
CREATE POLICY "hi_points_redemptions_all_service" ON public.hi_points_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hi_points_redemptions_user ON public.hi_points_redemptions(user_id, created_at DESC);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Hi Points System Deployed Successfully!' as status;
SELECT tier, multiplier, is_paid, display_name FROM hi_points_config ORDER BY multiplier;
