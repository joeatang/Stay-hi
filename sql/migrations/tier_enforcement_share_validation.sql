-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎯 HI-OS TIER ENFORCEMENT: Share Validation & Quota Tracking
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Purpose: Server-side enforcement of tier-based share limits
-- Author: Hi-OS Team
-- Date: December 11, 2025
-- Phase: 1 - Core Tier Enforcement
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 SHARE TRACKING TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Tracks all shares for quota enforcement and analytics

CREATE TABLE IF NOT EXISTS user_share_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('public', 'anonymous', 'private', 'scheduled')),
  origin TEXT NOT NULL CHECK (origin IN ('hi5', 'higym', 'hi-island', 'hi-muscle')),
  content_preview TEXT, -- First 100 chars for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month_year TEXT NOT NULL GENERATED ALWAYS AS (TO_CHAR(created_at, 'YYYY-MM')) STORED,
  tier_at_creation TEXT -- Track what tier user had when sharing
);

-- Performance indexes for quota checks
CREATE INDEX IF NOT EXISTS idx_user_share_tracking_user_month 
  ON user_share_tracking(user_id, month_year);

CREATE INDEX IF NOT EXISTS idx_user_share_tracking_created 
  ON user_share_tracking(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE user_share_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own share history
CREATE POLICY "Users can view own share history"
  ON user_share_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Only authenticated users can insert (validated via RPC)
CREATE POLICY "Authenticated users can track shares"
  ON user_share_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 GET USER SHARE COUNT (Monthly)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Returns: { count: number, month: 'YYYY-MM' }

CREATE OR REPLACE FUNCTION get_user_share_count(period TEXT DEFAULT 'month')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_current_month TEXT;
BEGIN
  -- Get current month
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Count shares in current period
  IF period = 'month' THEN
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND month_year = v_current_month;
  ELSIF period = 'day' THEN
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND created_at >= DATE_TRUNC('day', NOW());
  ELSIF period = 'week' THEN
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND created_at >= DATE_TRUNC('week', NOW());
  ELSE
    -- Default to month
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND month_year = v_current_month;
  END IF;
  
  RETURN jsonb_build_object(
    'count', COALESCE(v_count, 0),
    'month', v_current_month,
    'period', period
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_share_count(TEXT) TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ VALIDATE SHARE CREATION (Tier Enforcement)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Returns: { allowed: boolean, reason: text, quota: { used, limit } }

CREATE OR REPLACE FUNCTION validate_share_creation(
  p_share_type TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'hi5'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tier TEXT;
  v_share_limit INTEGER;
  v_shares_this_month INTEGER;
  v_allowed_types TEXT[];
  v_current_month TEXT;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Authentication required',
      'upgrade_required', true
    );
  END IF;
  
  -- Get user's tier from user_memberships
  SELECT tier INTO v_tier
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- Default to free if no tier found
  v_tier := COALESCE(v_tier, 'free');
  
  -- Define tier limits (matches TIER_CONFIG.js)
  CASE v_tier
    WHEN 'free' THEN
      v_share_limit := 0; -- Blocked
      v_allowed_types := ARRAY[]::TEXT[]; -- None
    WHEN 'bronze' THEN
      v_share_limit := 10; -- 10 per month
      v_allowed_types := ARRAY['public', 'anonymous']; -- No private
    WHEN 'silver' THEN
      v_share_limit := 50; -- 50 per month
      v_allowed_types := ARRAY['public', 'anonymous', 'private']; -- All
    WHEN 'gold', 'premium', 'collective' THEN
      v_share_limit := 999999; -- Unlimited
      v_allowed_types := ARRAY['public', 'anonymous', 'private', 'scheduled']; -- All + scheduled
    ELSE
      v_share_limit := 0; -- Unknown tier = block
      v_allowed_types := ARRAY[]::TEXT[];
  END CASE;
  
  -- Check if share type is allowed for tier
  IF NOT (p_share_type = ANY(v_allowed_types)) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Share type not available for your tier',
      'tier', v_tier,
      'share_type', p_share_type,
      'upgrade_required', true
    );
  END IF;
  
  -- Check monthly quota
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT COUNT(*) INTO v_shares_this_month
  FROM user_share_tracking
  WHERE user_id = v_user_id
    AND month_year = v_current_month;
  
  v_shares_this_month := COALESCE(v_shares_this_month, 0);
  
  -- Check if limit exceeded
  IF v_shares_this_month >= v_share_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Monthly share limit reached',
      'tier', v_tier,
      'quota', jsonb_build_object(
        'used', v_shares_this_month,
        'limit', v_share_limit,
        'month', v_current_month
      ),
      'upgrade_required', true
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'tier', v_tier,
    'quota', jsonb_build_object(
      'used', v_shares_this_month,
      'limit', v_share_limit,
      'remaining', v_share_limit - v_shares_this_month,
      'month', v_current_month
    )
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_share_creation(TEXT, TEXT) TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📝 TRACK SHARE SUBMISSION (Called after validation)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Records share in tracking table and increments quota

CREATE OR REPLACE FUNCTION track_share_submission(
  p_share_type TEXT,
  p_origin TEXT,
  p_content_preview TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tier TEXT;
  v_share_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get current tier
  SELECT tier INTO v_tier
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- Insert share tracking record
  INSERT INTO user_share_tracking (
    user_id,
    share_type,
    origin,
    content_preview,
    tier_at_creation
  ) VALUES (
    v_user_id,
    p_share_type,
    p_origin,
    LEFT(p_content_preview, 100), -- Only store first 100 chars
    COALESCE(v_tier, 'free')
  )
  RETURNING id INTO v_share_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'share_id', v_share_id,
    'tracked_at', NOW()
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION track_share_submission(TEXT, TEXT, TEXT) TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 ADMIN: Get Share Analytics by Tier
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION admin_get_share_analytics()
RETURNS TABLE (
  tier TEXT,
  total_shares BIGINT,
  shares_this_month BIGINT,
  avg_shares_per_user NUMERIC
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
    COUNT(*) as total_shares,
    COUNT(*) FILTER (WHERE ust.month_year = TO_CHAR(NOW(), 'YYYY-MM')) as shares_this_month,
    ROUND(COUNT(*)::NUMERIC / COUNT(DISTINCT ust.user_id), 2) as avg_shares_per_user
  FROM user_share_tracking ust
  LEFT JOIN user_memberships um ON ust.user_id = um.user_id
  GROUP BY um.tier
  ORDER BY total_shares DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_share_analytics() TO authenticated;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ VERIFICATION QUERIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Test: Check if functions exist
DO $$
BEGIN
  RAISE NOTICE '✅ Verifying tier enforcement functions...';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_share_count') THEN
    RAISE NOTICE '  ✓ get_user_share_count() created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_share_creation') THEN
    RAISE NOTICE '  ✓ validate_share_creation() created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_share_submission') THEN
    RAISE NOTICE '  ✓ track_share_submission() created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_share_tracking') THEN
    RAISE NOTICE '  ✓ user_share_tracking table created';
  END IF;
  
  RAISE NOTICE '🚀 Tier enforcement infrastructure ready!';
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📝 DEPLOYMENT NOTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- USAGE IN FRONTEND:
--
-- 1. Validate before share submission:
--    const { data } = await sb.rpc('validate_share_creation', {
--      p_share_type: 'public',
--      p_origin: 'hi5'
--    });
--    if (!data.allowed) {
--      showUpgradePrompt(data.reason);
--      return;
--    }
--
-- 2. Track after successful share:
--    await sb.rpc('track_share_submission', {
--      p_share_type: 'public',
--      p_origin: 'hi5',
--      p_content_preview: content.slice(0, 100)
--    });
--
-- 3. Get current quota:
--    const { data } = await sb.rpc('get_user_share_count', { period: 'month' });
--    console.log(`${data.count} shares this month`);
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
