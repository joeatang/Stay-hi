-- ============================================================================
-- 📊 HI-OS ANALYTICS ENGINE v2.0 - GOLD STANDARD
-- ============================================================================
-- GOAL: Enable rich personal analytics while honoring v1.1.0 simplicity push
-- APPROACH: Practice (activity) + Feeling (Hi Scale) balanced measurement
-- LOCATION: Hi Pulse page (💫) with tier-gated tabs
-- ============================================================================
-- DATE: 2026-01-18
-- PHILOSOPHY: Measure both effort (showing up) AND results (feeling better)
-- IMPACT: Users see authentic progress without toxic positivity
-- ============================================================================

-- ============================================================================
-- PART 1: DAILY EMOTIONAL SNAPSHOTS
-- ============================================================================

-- Track user's daily emotional state (Hi Scale responses)
CREATE TABLE IF NOT EXISTS user_daily_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Date (timezone-aware via get_user_date)
  snapshot_date DATE NOT NULL,
  
  -- Hi Scale (1-5 self-reported feeling)
  hi_scale_rating INTEGER CHECK (hi_scale_rating >= 1 AND hi_scale_rating <= 5),
  hi_scale_recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Activity counts (calculated daily)
  shares_count INTEGER DEFAULT 0,
  taps_given_count INTEGER DEFAULT 0,
  hi_gym_visits INTEGER DEFAULT 0,
  medallion_taps INTEGER DEFAULT 0,
  
  -- Timing patterns
  first_activity_time TIME, -- What time did they first engage?
  last_activity_time TIME,
  total_active_minutes INTEGER DEFAULT 0, -- Session time
  
  -- Check-in status
  checked_in BOOLEAN DEFAULT FALSE,
  streak_day INTEGER DEFAULT 0, -- Which day of streak (0 = broke streak)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: One snapshot per user per day
  UNIQUE(user_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_user_date 
  ON user_daily_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_hi_scale 
  ON user_daily_snapshots(user_id, hi_scale_rating) 
  WHERE hi_scale_rating IS NOT NULL;

-- ============================================================================
-- PART 2: EMOTIONAL TREND AGGREGATES (Pre-computed for fast queries)
-- ============================================================================

-- Weekly/Monthly aggregates for faster analytics
CREATE TABLE IF NOT EXISTS user_trend_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Time period
  period_type TEXT CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Hi Scale trends
  avg_hi_scale NUMERIC(3,1), -- e.g., 3.8
  min_hi_scale INTEGER,
  max_hi_scale INTEGER,
  hi_scale_trend TEXT, -- 'improving', 'stable', 'declining'
  
  -- Activity trends
  total_shares INTEGER DEFAULT 0,
  total_taps_given INTEGER DEFAULT 0,
  total_hi_gym_visits INTEGER DEFAULT 0,
  avg_shares_per_day NUMERIC(4,1),
  
  -- Consistency metrics
  days_active INTEGER DEFAULT 0,
  days_possible INTEGER NOT NULL, -- How many days in period
  consistency_rate NUMERIC(3,1), -- days_active / days_possible * 100
  longest_streak INTEGER DEFAULT 0,
  
  -- Best/Worst days
  best_day_of_week TEXT, -- 'Sunday', 'Monday', etc.
  best_day_avg_scale NUMERIC(3,1),
  toughest_day_of_week TEXT,
  toughest_day_avg_scale NUMERIC(3,1),
  
  -- Peak times
  peak_activity_hour INTEGER, -- 0-23 (hour when most active)
  peak_feeling_hour INTEGER, -- Hour with highest Hi Scale avg
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_trend_summaries_user_period 
  ON user_trend_summaries(user_id, period_type, period_start DESC);

-- ============================================================================
-- PART 3: CORRELATION INSIGHTS (What helps this user specifically?)
-- ============================================================================

-- Track what behaviors correlate with higher Hi Scale ratings
CREATE TABLE IF NOT EXISTS user_behavior_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Insight type
  insight_type TEXT NOT NULL, -- 'sharing_boost', 'gym_boost', 'time_pattern', 'streak_resilience'
  insight_category TEXT, -- 'practice', 'timing', 'recovery'
  
  -- The insight
  insight_text TEXT NOT NULL, -- "Sharing boosts your feeling by +0.7 next day"
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00 (statistical confidence)
  
  -- Supporting data
  sample_size INTEGER, -- How many days used for correlation
  effect_size NUMERIC(4,2), -- e.g., 0.7 = +0.7 Hi Scale points
  
  -- Time period analyzed
  analyzed_from DATE,
  analyzed_to DATE,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Recalculate after this date
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, insight_type, analyzed_to)
);

CREATE INDEX IF NOT EXISTS idx_user_behavior_insights_user_active 
  ON user_behavior_insights(user_id, is_active, confidence_score DESC);

-- ============================================================================
-- PART 4: MILESTONE TRACKING (Already exists, but linking for completeness)
-- ============================================================================

-- NOTE: hi_points_ledger and user_stats already track:
-- - Total shares, waves, points
-- - Current/longest streaks
-- - Milestone achievements
-- This analytics system READS from those, doesn't duplicate

-- ============================================================================
-- PART 5: HELPER FUNCTIONS (Analytics Queries)
-- ============================================================================

-- Get user's 7/30/90 day emotional journey
CREATE OR REPLACE FUNCTION get_user_emotional_journey(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  snapshot_date DATE,
  hi_scale_rating INTEGER,
  shares_count INTEGER,
  taps_given_count INTEGER,
  hi_gym_visits INTEGER,
  checked_in BOOLEAN,
  streak_day INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uds.snapshot_date,
    uds.hi_scale_rating,
    uds.shares_count,
    uds.taps_given_count,
    uds.hi_gym_visits,
    uds.checked_in,
    uds.streak_day
  FROM user_daily_snapshots uds
  WHERE uds.user_id = p_user_id
    AND uds.snapshot_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY uds.snapshot_date DESC;
END;
$$;

-- Get user's weekly pattern (which days are best/worst?)
CREATE OR REPLACE FUNCTION get_user_weekly_pattern(p_user_id UUID)
RETURNS TABLE (
  day_of_week TEXT,
  avg_hi_scale NUMERIC(3,1),
  total_days INTEGER,
  avg_shares NUMERIC(4,1)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(uds.snapshot_date, 'Day') as day_of_week,
    ROUND(AVG(uds.hi_scale_rating)::NUMERIC, 1) as avg_hi_scale,
    COUNT(*)::INTEGER as total_days,
    ROUND(AVG(uds.shares_count)::NUMERIC, 1) as avg_shares
  FROM user_daily_snapshots uds
  WHERE uds.user_id = p_user_id
    AND uds.hi_scale_rating IS NOT NULL
    AND uds.snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY TO_CHAR(uds.snapshot_date, 'Day'), EXTRACT(DOW FROM uds.snapshot_date)
  ORDER BY EXTRACT(DOW FROM uds.snapshot_date);
END;
$$;

-- Get user's best correlations (what helps?)
CREATE OR REPLACE FUNCTION get_user_top_insights(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  insight_text TEXT,
  confidence_score NUMERIC(3,2),
  effect_size NUMERIC(4,2),
  insight_category TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubi.insight_text,
    ubi.confidence_score,
    ubi.effect_size,
    ubi.insight_category
  FROM user_behavior_insights ubi
  WHERE ubi.user_id = p_user_id
    AND ubi.is_active = TRUE
    AND ubi.confidence_score >= 0.60 -- Only show confident insights
  ORDER BY ubi.confidence_score DESC, ubi.effect_size DESC
  LIMIT p_limit;
END;
$$;

-- Calculate sharing boost correlation (does sharing improve feeling?)
CREATE OR REPLACE FUNCTION calculate_sharing_boost_insight(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_days_with_shares RECORD;
  v_days_without_shares RECORD;
  v_boost NUMERIC;
  v_sample_size INTEGER;
BEGIN
  -- Compare avg Hi Scale on days user shared vs didn't share
  SELECT 
    AVG(hi_scale_rating) as avg_scale,
    COUNT(*) as total_days
  INTO v_days_with_shares
  FROM user_daily_snapshots
  WHERE user_id = p_user_id
    AND shares_count > 0
    AND hi_scale_rating IS NOT NULL
    AND snapshot_date >= CURRENT_DATE - INTERVAL '90 days';
  
  SELECT 
    AVG(hi_scale_rating) as avg_scale,
    COUNT(*) as total_days
  INTO v_days_without_shares
  FROM user_daily_snapshots
  WHERE user_id = p_user_id
    AND shares_count = 0
    AND hi_scale_rating IS NOT NULL
    AND snapshot_date >= CURRENT_DATE - INTERVAL '90 days';
  
  -- Calculate boost
  v_boost := COALESCE(v_days_with_shares.avg_scale, 0) - COALESCE(v_days_without_shares.avg_scale, 0);
  v_sample_size := COALESCE(v_days_with_shares.total_days, 0) + COALESCE(v_days_without_shares.total_days, 0);
  
  -- Only return if we have enough data
  IF v_sample_size < 10 THEN
    RETURN jsonb_build_object(
      'insufficient_data', true,
      'sample_size', v_sample_size
    );
  END IF;
  
  RETURN jsonb_build_object(
    'boost', ROUND(v_boost, 1),
    'days_with_shares_avg', ROUND(v_days_with_shares.avg_scale, 1),
    'days_without_shares_avg', ROUND(v_days_without_shares.avg_scale, 1),
    'sample_size', v_sample_size,
    'confidence', CASE 
      WHEN v_sample_size >= 30 THEN 0.90
      WHEN v_sample_size >= 20 THEN 0.75
      ELSE 0.60
    END
  );
END;
$$;

-- ============================================================================
-- PART 6: AUTOMATED INSIGHT GENERATION (Run nightly)
-- ============================================================================

-- Function to regenerate all insights for a user
CREATE OR REPLACE FUNCTION regenerate_user_insights(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sharing_boost JSONB;
  v_gym_boost JSONB;
  v_insights_created INTEGER := 0;
BEGIN
  -- Clear expired insights
  DELETE FROM user_behavior_insights
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at < NOW());
  
  -- Calculate sharing boost
  v_sharing_boost := calculate_sharing_boost_insight(p_user_id);
  
  IF v_sharing_boost->>'insufficient_data' IS NULL THEN
    INSERT INTO user_behavior_insights (
      user_id, insight_type, insight_category, insight_text, 
      confidence_score, effect_size, sample_size, 
      analyzed_from, analyzed_to, expires_at
    ) VALUES (
      p_user_id,
      'sharing_boost',
      'practice',
      'Sharing boosts your feeling by +' || (v_sharing_boost->>'boost') || ' points',
      (v_sharing_boost->>'confidence')::NUMERIC,
      (v_sharing_boost->>'boost')::NUMERIC,
      (v_sharing_boost->>'sample_size')::INTEGER,
      CURRENT_DATE - INTERVAL '90 days',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '7 days' -- Recalculate weekly
    )
    ON CONFLICT (user_id, insight_type, analyzed_to) 
    DO UPDATE SET
      insight_text = EXCLUDED.insight_text,
      confidence_score = EXCLUDED.confidence_score,
      effect_size = EXCLUDED.effect_size,
      generated_at = NOW();
    
    v_insights_created := v_insights_created + 1;
  END IF;
  
  -- TODO: Add more insight calculations (Hi Gym boost, timing patterns, etc.)
  
  RETURN v_insights_created;
END;
$$;

-- ============================================================================
-- PART 7: DATA POPULATION TRIGGER (Auto-populate daily snapshots)
-- ============================================================================

-- Function to upsert today's snapshot for a user
CREATE OR REPLACE FUNCTION upsert_daily_snapshot(
  p_user_id UUID,
  p_hi_scale_rating INTEGER DEFAULT NULL,
  p_activity_type TEXT DEFAULT NULL -- 'share', 'tap', 'gym', 'medallion', 'checkin'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_today DATE;
  v_now TIME;
BEGIN
  -- Get user's today (timezone-aware)
  v_today := get_user_date(p_user_id);
  v_now := NOW()::TIME;
  
  -- Insert or update today's snapshot
  INSERT INTO user_daily_snapshots (
    user_id,
    snapshot_date,
    hi_scale_rating,
    hi_scale_recorded_at,
    first_activity_time,
    last_activity_time,
    shares_count,
    taps_given_count,
    hi_gym_visits,
    medallion_taps,
    checked_in,
    updated_at
  ) VALUES (
    p_user_id,
    v_today,
    p_hi_scale_rating,
    CASE WHEN p_hi_scale_rating IS NOT NULL THEN NOW() ELSE NULL END,
    v_now, -- First activity time
    v_now, -- Last activity time
    CASE WHEN p_activity_type = 'share' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'tap' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'gym' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'medallion' THEN 1 ELSE 0 END,
    CASE WHEN p_activity_type = 'checkin' THEN TRUE ELSE FALSE END,
    NOW()
  )
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    hi_scale_rating = COALESCE(EXCLUDED.hi_scale_rating, user_daily_snapshots.hi_scale_rating),
    hi_scale_recorded_at = COALESCE(EXCLUDED.hi_scale_recorded_at, user_daily_snapshots.hi_scale_recorded_at),
    last_activity_time = EXCLUDED.last_activity_time,
    shares_count = user_daily_snapshots.shares_count + EXCLUDED.shares_count,
    taps_given_count = user_daily_snapshots.taps_given_count + EXCLUDED.taps_given_count,
    hi_gym_visits = user_daily_snapshots.hi_gym_visits + EXCLUDED.hi_gym_visits,
    medallion_taps = user_daily_snapshots.medallion_taps + EXCLUDED.medallion_taps,
    checked_in = EXCLUDED.checked_in OR user_daily_snapshots.checked_in,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- PART 8: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON user_daily_snapshots TO authenticated;
GRANT SELECT ON user_trend_summaries TO authenticated;
GRANT SELECT ON user_behavior_insights TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_emotional_journey(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_weekly_pattern(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_top_insights(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sharing_boost_insight(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_snapshot(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_user_insights(UUID) TO authenticated;

-- Admin-only for trend calculations
GRANT EXECUTE ON FUNCTION regenerate_user_insights(UUID) TO service_role;

-- ============================================================================
-- PART 9: VERIFICATION QUERIES
-- ============================================================================

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_daily_snapshots', 'user_trend_summaries', 'user_behavior_insights')
ORDER BY table_name;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_emotional_journey',
    'get_user_weekly_pattern',
    'get_user_top_insights',
    'calculate_sharing_boost_insight',
    'upsert_daily_snapshot',
    'regenerate_user_insights'
  )
ORDER BY routine_name;

-- ============================================================================
-- PART 10: INTEGRATION POINTS (How frontend uses this)
-- ============================================================================

-- When user rates Hi Scale (1-5):
-- SELECT upsert_daily_snapshot(auth.uid(), 4, NULL); -- Rating = 4/5

-- When user shares:
-- SELECT upsert_daily_snapshot(auth.uid(), NULL, 'share');

-- When user taps medallion:
-- SELECT upsert_daily_snapshot(auth.uid(), NULL, 'medallion');

-- When user visits Hi Gym:
-- SELECT upsert_daily_snapshot(auth.uid(), NULL, 'gym');

-- Get 7-day emotional journey for charts:
-- SELECT * FROM get_user_emotional_journey(auth.uid(), 7);

-- Get weekly pattern (best/worst days):
-- SELECT * FROM get_user_weekly_pattern(auth.uid());

-- Get personalized insights:
-- SELECT * FROM get_user_top_insights(auth.uid(), 5);

-- ============================================================================
-- DEPLOYMENT CHECKLIST
-- ============================================================================

-- ✅ Step 1: Run this file in Supabase SQL Editor
-- ✅ Step 2: Verify tables and functions created (use verification queries above)
-- ✅ Step 3: Test upsert_daily_snapshot with your user ID
-- ✅ Step 4: Deploy frontend Hi Pulse v2.0 with analytics tabs
-- ✅ Step 5: Add Hi Scale rating prompt to check-in flow
-- ✅ Step 6: Schedule nightly job: regenerate_user_insights() for all active users
-- ✅ Step 7: Monitor for 7 days to gather baseline data

-- ============================================================================
-- WHAT THIS ENABLES
-- ============================================================================

-- BRONZE/HI FRIEND (Free):
-- - Last 7 days emotional journey
-- - Current week stats (shares, taps, streak)
-- - Basic "Your best day: Sunday" insight

-- SILVER/HI PATHFINDER ($):
-- - Last 30 days emotional journey
-- - Weekly pattern analysis (best/worst days)
-- - Top 3 personalized insights
-- - Streak calendar heatmap

-- GOLD/HI CHAMPION ($$):
-- - All-time data access
-- - 90-day trends
-- - Full insights (what helps YOU specifically)
-- - Correlation charts (sharing boost, gym boost, timing)
-- - Export data (CSV)

-- ============================================================================
-- FUTURE ENHANCEMENTS (Not in v1)
-- ============================================================================

-- - Seasonal patterns (winter vs summer comparison)
-- - Predictive analytics ("Trending toward 4.5/5 next month")
-- - AI-powered insights (GPT-4 analysis of journal entries)
-- - Recovery time tracking (bounce-back speed after low days)
-- - Notification triggers (low 3-day avg → gentle prompt)

-- ============================================================================
