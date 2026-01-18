-- ============================================================================
-- 📊 ANALYTICS SYSTEM v2.0 - GOLD STANDARD
-- ============================================================================
-- Migration: 003
-- Date: 2026-01-18
-- Description: Personal analytics system (Practice + Feeling measurement)
-- Dependencies: None (creates new tables, doesn't modify existing)
-- Rollback: See 2026-01-18_003_ROLLBACK_analytics_gold_standard_v2.sql
-- ============================================================================

-- This is the production-ready migration file.
-- Full implementation details in: /DEPLOY_ANALYTICS_GOLD_STANDARD_v2.sql

-- ============================================================================
-- PART 1: CREATE ANALYTICS TABLES
-- ============================================================================

-- Daily snapshots: Capture user's Hi Scale rating + activity counts each day
CREATE TABLE IF NOT EXISTS user_daily_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Feeling measurement (1-5 scale)
  hi_scale_rating SMALLINT CHECK (hi_scale_rating BETWEEN 1 AND 5),
  hi_scale_note TEXT, -- Optional: "Felt amazing after morning walk"
  
  -- Activity counts (practice measurement)
  shares_count INT DEFAULT 0,
  taps_given_count INT DEFAULT 0,
  check_ins_count INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, snapshot_date)
);

-- Trend summaries: Pre-computed weekly/monthly aggregates for performance
CREATE TABLE IF NOT EXISTS user_trend_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Aggregated feeling data
  avg_hi_scale NUMERIC(3,1),
  days_rated INT DEFAULT 0,
  days_in_period INT NOT NULL,
  
  -- Aggregated activity data
  total_shares INT DEFAULT 0,
  total_taps INT DEFAULT 0,
  total_check_ins INT DEFAULT 0,
  
  -- Trends
  hi_scale_trend TEXT CHECK (hi_scale_trend IN ('up', 'down', 'stable')),
  activity_trend TEXT CHECK (activity_trend IN ('up', 'down', 'stable')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

-- Behavior insights: Personalized correlations ("Sharing boosts feeling +0.7")
CREATE TABLE IF NOT EXISTS user_behavior_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('correlation', 'streak', 'peak_time', 'recommendation')),
  
  -- Insight content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1), -- 0.0 to 1.0
  
  -- Supporting data
  metric_1 TEXT, -- e.g., "shares"
  metric_2 TEXT, -- e.g., "hi_scale"
  correlation_value NUMERIC(4,2), -- e.g., 0.73
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Insights can be time-limited
  is_dismissed BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- PART 2: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_user_date 
  ON user_daily_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_trend_summaries_user_period 
  ON user_trend_summaries(user_id, period_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_user_behavior_insights_user_active 
  ON user_behavior_insights(user_id, is_dismissed) 
  WHERE is_dismissed = FALSE;

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trend_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_insights ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_daily_snapshots_own_data ON user_daily_snapshots
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_trend_summaries_own_data ON user_trend_summaries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_behavior_insights_own_data ON user_behavior_insights
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: ANALYTICS RPC FUNCTIONS
-- ============================================================================

-- Get emotional journey: 7/30/90-day Hi Scale trend line
CREATE OR REPLACE FUNCTION get_user_emotional_journey(p_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier TEXT;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Tier gating: Bronze (7 days), Silver (30 days), Gold (unlimited)
  SELECT tier INTO v_tier FROM profiles WHERE id = v_user_id;
  IF v_tier = 'bronze' AND p_days > 7 THEN
    RETURN jsonb_build_object('error', 'tier_limited', 'max_days', 7, 'tier', 'bronze');
  ELSIF v_tier = 'silver' AND p_days > 30 THEN
    RETURN jsonb_build_object('error', 'tier_limited', 'max_days', 30, 'tier', 'silver');
  END IF;
  
  -- Build journey data
  SELECT jsonb_build_object(
    'days', p_days,
    'data', jsonb_agg(
      jsonb_build_object(
        'date', snapshot_date,
        'hi_scale', hi_scale_rating,
        'note', hi_scale_note
      ) ORDER BY snapshot_date ASC
    ),
    'avg', ROUND(AVG(hi_scale_rating), 1),
    'trend', CASE
      WHEN AVG(hi_scale_rating) FILTER (WHERE snapshot_date > CURRENT_DATE - (p_days/2)) > 
           AVG(hi_scale_rating) FILTER (WHERE snapshot_date <= CURRENT_DATE - (p_days/2))
      THEN 'up'
      WHEN AVG(hi_scale_rating) FILTER (WHERE snapshot_date > CURRENT_DATE - (p_days/2)) < 
           AVG(hi_scale_rating) FILTER (WHERE snapshot_date <= CURRENT_DATE - (p_days/2))
      THEN 'down'
      ELSE 'stable'
    END
  ) INTO v_result
  FROM user_daily_snapshots
  WHERE user_id = v_user_id
    AND snapshot_date >= CURRENT_DATE - p_days
    AND hi_scale_rating IS NOT NULL;
  
  RETURN COALESCE(v_result, jsonb_build_object('days', p_days, 'data', '[]'::jsonb, 'avg', null, 'trend', 'stable'));
END;
$$;

-- Get weekly patterns: Which days of week feel best?
CREATE OR REPLACE FUNCTION get_user_weekly_patterns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  RETURN (
    SELECT jsonb_object_agg(
      dow,
      jsonb_build_object(
        'avg_hi_scale', ROUND(avg_rating, 1),
        'count', count
      )
    )
    FROM (
      SELECT 
        TO_CHAR(snapshot_date, 'Day') as dow,
        AVG(hi_scale_rating) as avg_rating,
        COUNT(*) as count
      FROM user_daily_snapshots
      WHERE user_id = v_user_id
        AND hi_scale_rating IS NOT NULL
        AND snapshot_date >= CURRENT_DATE - 30 -- Last 30 days
      GROUP BY TO_CHAR(snapshot_date, 'Day'), EXTRACT(DOW FROM snapshot_date)
      ORDER BY EXTRACT(DOW FROM snapshot_date)
    ) patterns
  );
END;
$$;

-- Get active insights: Personalized recommendations
CREATE OR REPLACE FUNCTION get_user_insights()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'type', insight_type,
        'title', title,
        'description', description,
        'confidence', confidence,
        'created_at', created_at
      ) ORDER BY created_at DESC
    ), '[]'::jsonb)
    FROM user_behavior_insights
    WHERE user_id = v_user_id
      AND is_dismissed = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

-- Dismiss an insight
CREATE OR REPLACE FUNCTION dismiss_user_insight(p_insight_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE user_behavior_insights
  SET is_dismissed = TRUE
  WHERE id = p_insight_id
    AND user_id = v_user_id;
  
  RETURN FOUND;
END;
$$;

-- Record Hi Scale rating (called after check-in)
CREATE OR REPLACE FUNCTION record_hi_scale_rating(
  p_rating SMALLINT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_rating');
  END IF;
  
  -- Upsert daily snapshot
  INSERT INTO user_daily_snapshots (user_id, snapshot_date, hi_scale_rating, hi_scale_note, updated_at)
  VALUES (v_user_id, v_today, p_rating, p_note, NOW())
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    hi_scale_rating = EXCLUDED.hi_scale_rating,
    hi_scale_note = EXCLUDED.hi_scale_note,
    updated_at = NOW();
  
  RETURN jsonb_build_object('success', true, 'rating', p_rating, 'date', v_today);
END;
$$;

-- Update activity counts (called when user shares/taps/checks in)
CREATE OR REPLACE FUNCTION update_daily_activity_counts(
  p_shares INT DEFAULT 0,
  p_taps INT DEFAULT 0,
  p_check_ins INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO user_daily_snapshots (user_id, snapshot_date, shares_count, taps_given_count, check_ins_count)
  VALUES (v_user_id, v_today, p_shares, p_taps, p_check_ins)
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    shares_count = user_daily_snapshots.shares_count + EXCLUDED.shares_count,
    taps_given_count = user_daily_snapshots.taps_given_count + EXCLUDED.taps_given_count,
    check_ins_count = user_daily_snapshots.check_ins_count + EXCLUDED.check_ins_count,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- PART 5: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_emotional_journey(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_weekly_patterns() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_insights() TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_user_insight(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_hi_scale_rating(SMALLINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_activity_counts(INT, INT, INT) TO authenticated;

-- ============================================================================
-- PART 6: VERIFICATION
-- ============================================================================

-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_daily_snapshots', 'user_trend_summaries', 'user_behavior_insights');

-- Check RPC functions created
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_emotional_journey',
    'get_user_weekly_patterns',
    'get_user_insights',
    'dismiss_user_insight',
    'record_hi_scale_rating',
    'update_daily_activity_counts'
  )
ORDER BY routine_name;

SELECT '✅ Migration 003: Analytics Gold Standard v2.0 deployed successfully!' as status;

-- ============================================================================
