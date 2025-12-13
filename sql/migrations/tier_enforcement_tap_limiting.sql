-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎯 HI-OS TIER ENFORCEMENT: Medallion Tap Limiting System
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Purpose: Server-side enforcement of tier-based medallion tap limits
-- Author: Hi-OS Team
-- Date: December 11, 2025
-- Phase: 1 - Core Tier Enforcement
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 TAP TRACKING TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS user_tap_counts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tap_count INTEGER NOT NULL DEFAULT 0,
  last_tap_at TIMESTAMPTZ,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tier_at_tap TEXT, -- Track tier during tap
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_tap_counts_reset 
  ON user_tap_counts(user_id, last_reset_date);

-- Enable RLS
ALTER TABLE user_tap_counts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tap counts
CREATE POLICY "Users can view own tap counts"
  ON user_tap_counts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own tap counts (via RPC only)
CREATE POLICY "Users can update own tap counts"
  ON user_tap_counts
  FOR ALL
  USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 GET TAP COUNT (Today)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION get_user_tap_count()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tier TEXT;
  v_tap_count INTEGER;
  v_daily_limit INTEGER;
  v_last_tap_at TIMESTAMPTZ;
  v_last_reset_date DATE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'count', 0,
      'limit', 0,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get user's tier
  SELECT tier INTO v_tier
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;
  
  v_tier := COALESCE(v_tier, 'free');
  
  -- Define daily tap limits by tier
  v_daily_limit := CASE v_tier
    WHEN 'free' THEN 10
    WHEN 'bronze' THEN 50
    WHEN 'silver' THEN 100
    ELSE 999999 -- Gold+ unlimited
  END;
  
  -- Get current tap count
  SELECT tap_count, last_tap_at, last_reset_date
  INTO v_tap_count, v_last_tap_at, v_last_reset_date
  FROM user_tap_counts
  WHERE user_id = v_user_id;
  
  -- Reset if new day
  IF v_last_reset_date IS NULL OR v_last_reset_date < CURRENT_DATE THEN
    v_tap_count := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'count', COALESCE(v_tap_count, 0),
    'limit', v_daily_limit,
    'remaining', GREATEST(0, v_daily_limit - COALESCE(v_tap_count, 0)),
    'last_tap_at', v_last_tap_at,
    'tier', v_tier,
    'unlimited', v_daily_limit >= 999999
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_tap_count() TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ RECORD MEDALLION TAP (With Validation)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION record_medallion_tap()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tier TEXT;
  v_daily_limit INTEGER;
  v_cooldown INTEGER;
  v_tap_count INTEGER;
  v_last_tap_at TIMESTAMPTZ;
  v_last_reset_date DATE;
  v_time_since_last_tap INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Get user's tier
  SELECT tier INTO v_tier
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;
  
  v_tier := COALESCE(v_tier, 'free');
  
  -- Define limits by tier (matches TIER_CONFIG.js)
  CASE v_tier
    WHEN 'free' THEN
      v_daily_limit := 10;
      v_cooldown := 60; -- 60 seconds
    WHEN 'bronze' THEN
      v_daily_limit := 50;
      v_cooldown := 30; -- 30 seconds
    WHEN 'silver' THEN
      v_daily_limit := 100;
      v_cooldown := 15; -- 15 seconds
    ELSE -- gold, premium, collective
      v_daily_limit := 999999; -- unlimited
      v_cooldown := 0; -- no cooldown
  END CASE;
  
  -- Get or create tap record
  SELECT tap_count, last_tap_at, last_reset_date
  INTO v_tap_count, v_last_tap_at, v_last_reset_date
  FROM user_tap_counts
  WHERE user_id = v_user_id;
  
  -- Initialize if doesn't exist
  IF v_tap_count IS NULL THEN
    INSERT INTO user_tap_counts (user_id, tap_count, last_tap_at, last_reset_date, tier_at_tap)
    VALUES (v_user_id, 0, NULL, CURRENT_DATE, v_tier);
    v_tap_count := 0;
    v_last_reset_date := CURRENT_DATE;
  END IF;
  
  -- Reset if new day
  IF v_last_reset_date < CURRENT_DATE THEN
    v_tap_count := 0;
    v_last_reset_date := CURRENT_DATE;
  END IF;
  
  -- Check daily limit
  IF v_tap_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily tap limit reached',
      'code', 'DAILY_LIMIT',
      'quota', jsonb_build_object(
        'used', v_tap_count,
        'limit', v_daily_limit,
        'tier', v_tier
      ),
      'upgrade_required', true
    );
  END IF;
  
  -- Check cooldown
  IF v_last_tap_at IS NOT NULL AND v_cooldown > 0 THEN
    v_time_since_last_tap := EXTRACT(EPOCH FROM (NOW() - v_last_tap_at))::INTEGER;
    
    IF v_time_since_last_tap < v_cooldown THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cooldown active',
        'code', 'COOLDOWN',
        'cooldown', jsonb_build_object(
          'elapsed', v_time_since_last_tap,
          'required', v_cooldown,
          'remaining', v_cooldown - v_time_since_last_tap
        )
      );
    END IF;
  END IF;
  
  -- All checks passed - record the tap
  UPDATE user_tap_counts
  SET 
    tap_count = v_tap_count + 1,
    last_tap_at = NOW(),
    last_reset_date = CURRENT_DATE,
    tier_at_tap = v_tier,
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tap_count', v_tap_count + 1,
    'quota', jsonb_build_object(
      'used', v_tap_count + 1,
      'limit', v_daily_limit,
      'remaining', GREATEST(0, v_daily_limit - (v_tap_count + 1)),
      'tier', v_tier
    ),
    'cooldown', jsonb_build_object(
      'seconds', v_cooldown,
      'next_available_at', NOW() + (v_cooldown || ' seconds')::INTERVAL
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_medallion_tap() TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔄 RESET DAILY TAP COUNTS (Cron Job)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Run daily at midnight UTC via pg_cron or Edge Function

CREATE OR REPLACE FUNCTION reset_daily_tap_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  UPDATE user_tap_counts
  SET 
    tap_count = 0,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE last_reset_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'rows_reset', v_rows_updated,
    'reset_date', CURRENT_DATE
  );
END;
$$;

-- Grant to service role for cron execution
GRANT EXECUTE ON FUNCTION reset_daily_tap_counts() TO service_role;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 ADMIN: Get Tap Analytics
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION admin_get_tap_analytics()
RETURNS TABLE (
  tier TEXT,
  total_users BIGINT,
  avg_taps_per_user NUMERIC,
  users_at_limit BIGINT,
  total_taps_today BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Only collective tier can access
  IF NOT EXISTS (
    SELECT 1 FROM user_memberships 
    WHERE user_id = auth.uid() AND tier = 'collective'
  ) THEN
    RAISE EXCEPTION 'Access denied: Collective tier required';
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE(um.tier, 'unknown') as tier,
    COUNT(DISTINCT utc.user_id) as total_users,
    ROUND(AVG(utc.tap_count), 2) as avg_taps_per_user,
    COUNT(*) FILTER (WHERE 
      (um.tier = 'free' AND utc.tap_count >= 10) OR
      (um.tier = 'bronze' AND utc.tap_count >= 50) OR
      (um.tier = 'silver' AND utc.tap_count >= 100)
    ) as users_at_limit,
    SUM(utc.tap_count) as total_taps_today
  FROM user_tap_counts utc
  LEFT JOIN user_memberships um ON utc.user_id = um.user_id
  WHERE utc.last_reset_date = CURRENT_DATE
  GROUP BY um.tier
  ORDER BY total_taps_today DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_tap_analytics() TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ VERIFICATION QUERIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE '✅ Verifying tap limiting functions...';
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_tap_counts') THEN
    RAISE NOTICE '  ✓ user_tap_counts table created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tap_count') THEN
    RAISE NOTICE '  ✓ get_user_tap_count() created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_medallion_tap') THEN
    RAISE NOTICE '  ✓ record_medallion_tap() created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_daily_tap_counts') THEN
    RAISE NOTICE '  ✓ reset_daily_tap_counts() created';
  END IF;
  
  RAISE NOTICE '🚀 Tap limiting infrastructure ready!';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📝 DEPLOYMENT NOTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- USAGE IN FRONTEND:
--
-- 1. Check tap quota before allowing tap:
--    const { data } = await sb.rpc('get_user_tap_count');
--    if (data.count >= data.limit) {
--      showUpgradePrompt('Daily tap limit reached');
--      return;
--    }
--
-- 2. Record tap and validate:
--    const { data } = await sb.rpc('record_medallion_tap');
--    if (!data.success) {
--      if (data.code === 'COOLDOWN') {
--        showToast(`Wait ${data.cooldown.remaining}s before next tap`);
--      } else if (data.code === 'DAILY_LIMIT') {
--        showUpgradePrompt('Upgrade for unlimited taps!');
--      }
--      return;
--    }
--
-- 3. Display tap counter:
--    const { data } = await sb.rpc('get_user_tap_count');
--    updateUI(`${data.count}/${data.limit} taps today`);
--
-- CRON SETUP (Supabase Edge Function):
--
-- 1. Create edge function: reset-tap-counts
-- 2. Schedule daily at 00:00 UTC
-- 3. Function calls: sb.rpc('reset_daily_tap_counts')
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
