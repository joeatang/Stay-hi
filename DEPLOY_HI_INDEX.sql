-- ============================================================================
-- HI INDEX SYSTEM — DEPLOYMENT SCRIPT
-- ============================================================================
--
-- Purpose: Create Hi Index wellness score system
-- Formula: Shares = 10pts, 100 taps = 1pt, normalized to 1-5 scale
-- 
-- SAFE TO RE-RUN: Yes (uses IF NOT EXISTS and CREATE OR REPLACE)
-- ADDITIVE ONLY: No changes to existing tables
-- ============================================================================

-- ============================================================================
-- PHASE 1: DAILY SNAPSHOTS TABLE (Aggregation Cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hi_index_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  scope TEXT NOT NULL,  -- 'community' for global, or user_id UUID for personal
  raw_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  normalized_index NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  share_count INT NOT NULL DEFAULT 0,
  tap_count INT NOT NULL DEFAULT 0,
  percentile NUMERIC(5,2),  -- NULL for community, calculated for users
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(snapshot_date, scope)
);

COMMENT ON TABLE public.hi_index_snapshots IS 'Daily Hi Index snapshots for community and personal wellness scores';
COMMENT ON COLUMN public.hi_index_snapshots.scope IS 'community for global index, or user UUID for personal index';
COMMENT ON COLUMN public.hi_index_snapshots.normalized_index IS 'Score normalized to 1.0-5.0 scale';
COMMENT ON COLUMN public.hi_index_snapshots.percentile IS 'User percentile rank (NULL for community scope)';

-- Enable RLS
ALTER TABLE public.hi_index_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read community snapshots
DROP POLICY IF EXISTS "hi_index_snapshots_read_community" ON public.hi_index_snapshots;
CREATE POLICY "hi_index_snapshots_read_community" 
  ON public.hi_index_snapshots 
  FOR SELECT 
  TO authenticated 
  USING (scope = 'community');

-- Policy: Users can read their own personal snapshots
DROP POLICY IF EXISTS "hi_index_snapshots_read_own" ON public.hi_index_snapshots;
CREATE POLICY "hi_index_snapshots_read_own" 
  ON public.hi_index_snapshots 
  FOR SELECT 
  TO authenticated 
  USING (scope = auth.uid()::text);

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "hi_index_snapshots_service_all" ON public.hi_index_snapshots;
CREATE POLICY "hi_index_snapshots_service_all" 
  ON public.hi_index_snapshots 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_hi_index_snapshots_date_scope 
  ON public.hi_index_snapshots(snapshot_date DESC, scope);

CREATE INDEX IF NOT EXISTS idx_hi_index_snapshots_scope 
  ON public.hi_index_snapshots(scope) 
  WHERE scope != 'community';

-- ============================================================================
-- PHASE 2: COMMUNITY HI INDEX RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_community_hi_index(
  p_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_start_date DATE := CURRENT_DATE - (p_days - 1);
  v_raw_score NUMERIC(10,2) := 0;
  v_share_count INT := 0;
  v_tap_count INT := 0;
  v_normalized_index NUMERIC(3,2);
  v_yesterday_score NUMERIC(10,2);
  v_percent_change NUMERIC(5,2);
  v_expected_max NUMERIC(10,2);
BEGIN
  -- Calculate raw score from all activity in date range
  -- Shares = 10 points each, Taps = 1 point per 100
  SELECT 
    COALESCE(SUM(share_count), 0),
    COALESCE(SUM(tap_accumulator + (tap_batches_awarded * 100)), 0)
  INTO v_share_count, v_tap_count
  FROM hi_points_daily_activity
  WHERE day >= v_start_date AND day <= v_today;
  
  -- Also count public shares that may not have points records
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ
    AND user_id IS NOT NULL;  -- Only count attributed shares
  
  -- Calculate raw score
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  
  -- Expected max for normalization (adjusts based on community size)
  -- Base: ~50 shares + ~10000 taps per week = 600 pts = index 5
  v_expected_max := 600.0;
  
  -- Normalize to 1-5 scale
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_raw_score / v_expected_max * 4.0)
  ));
  
  -- Get yesterday's score for % change
  SELECT normalized_index INTO v_yesterday_score
  FROM hi_index_snapshots
  WHERE scope = 'community' AND snapshot_date = v_today - 1;
  
  IF v_yesterday_score IS NOT NULL AND v_yesterday_score > 0 THEN
    v_percent_change := ((v_normalized_index - v_yesterday_score) / v_yesterday_score) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  -- Upsert today's snapshot
  INSERT INTO hi_index_snapshots (snapshot_date, scope, raw_score, normalized_index, share_count, tap_count, updated_at)
  VALUES (v_today, 'community', v_raw_score, v_normalized_index, v_share_count, v_tap_count, NOW())
  ON CONFLICT (snapshot_date, scope) 
  DO UPDATE SET 
    raw_score = EXCLUDED.raw_score,
    normalized_index = EXCLUDED.normalized_index,
    share_count = EXCLUDED.share_count,
    tap_count = EXCLUDED.tap_count,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'index', ROUND(v_normalized_index, 2),
    'raw_score', ROUND(v_raw_score, 2),
    'share_count', v_share_count,
    'tap_count', v_tap_count,
    'percent_change', ROUND(COALESCE(v_percent_change, 0), 1),
    'trend', CASE 
      WHEN v_percent_change > 0 THEN 'up'
      WHEN v_percent_change < 0 THEN 'down'
      ELSE 'stable'
    END,
    'period_days', p_days,
    'as_of', v_today
  );
END;
$$;

COMMENT ON FUNCTION public.get_community_hi_index IS 'Get community-wide Hi Index (7-day rolling wellness score)';

REVOKE ALL ON FUNCTION public.get_community_hi_index(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_hi_index(INT) TO authenticated;

-- ============================================================================
-- PHASE 3: PERSONAL HI INDEX RPC
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
  v_raw_score NUMERIC(10,2) := 0;
  v_share_count INT := 0;
  v_tap_count INT := 0;
  v_normalized_index NUMERIC(3,2);
  v_yesterday_score NUMERIC(10,2);
  v_percent_change NUMERIC(5,2);
  v_percentile NUMERIC(5,2);
  v_community_avg NUMERIC(10,2);
  v_total_users INT;
  v_users_below INT;
BEGIN
  -- Require authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Get user's activity
  SELECT 
    COALESCE(SUM(share_count), 0),
    COALESCE(SUM(tap_accumulator + (tap_batches_awarded * 100)), 0)
  INTO v_share_count, v_tap_count
  FROM hi_points_daily_activity
  WHERE user_id = v_user_id 
    AND day >= v_start_date 
    AND day <= v_today;
  
  -- Also count user's public shares
  SELECT v_share_count + COALESCE(COUNT(*), 0)
  INTO v_share_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date::TIMESTAMPTZ 
    AND created_at < (v_today + 1)::TIMESTAMPTZ;
  
  -- Calculate raw score
  v_raw_score := (v_share_count * 10.0) + (v_tap_count / 100.0);
  
  -- Personal normalization (same scale as community for comparison)
  -- But personal max is lower (one person vs many)
  -- Base: ~10 shares + ~1000 taps per week = 110 pts = index 5 for engaged user
  v_normalized_index := LEAST(5.0, GREATEST(1.0, 
    1.0 + (v_raw_score / 110.0 * 4.0)
  ));
  
  -- Calculate percentile (what % of users is this user ahead of)
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM hi_points_daily_activity
  WHERE day >= v_start_date;
  
  IF v_total_users > 1 THEN
    -- Count users with lower raw scores
    WITH user_scores AS (
      SELECT 
        user_id,
        (COALESCE(SUM(share_count), 0) * 10.0 + 
         COALESCE(SUM(tap_accumulator + tap_batches_awarded * 100), 0) / 100.0) as score
      FROM hi_points_daily_activity
      WHERE day >= v_start_date AND day <= v_today
      GROUP BY user_id
    )
    SELECT COUNT(*) INTO v_users_below
    FROM user_scores
    WHERE score < v_raw_score;
    
    v_percentile := (v_users_below::NUMERIC / v_total_users::NUMERIC) * 100;
  ELSE
    v_percentile := 100; -- Only user = top 100%
  END IF;
  
  -- Get yesterday's score for % change
  SELECT normalized_index INTO v_yesterday_score
  FROM hi_index_snapshots
  WHERE scope = v_user_id::text AND snapshot_date = v_today - 1;
  
  IF v_yesterday_score IS NOT NULL AND v_yesterday_score > 0 THEN
    v_percent_change := ((v_normalized_index - v_yesterday_score) / v_yesterday_score) * 100;
  ELSE
    v_percent_change := 0;
  END IF;
  
  -- Upsert today's personal snapshot
  INSERT INTO hi_index_snapshots (snapshot_date, scope, raw_score, normalized_index, share_count, tap_count, percentile, updated_at)
  VALUES (v_today, v_user_id::text, v_raw_score, v_normalized_index, v_share_count, v_tap_count, v_percentile, NOW())
  ON CONFLICT (snapshot_date, scope) 
  DO UPDATE SET 
    raw_score = EXCLUDED.raw_score,
    normalized_index = EXCLUDED.normalized_index,
    share_count = EXCLUDED.share_count,
    tap_count = EXCLUDED.tap_count,
    percentile = EXCLUDED.percentile,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'index', ROUND(v_normalized_index, 2),
    'raw_score', ROUND(v_raw_score, 2),
    'share_count', v_share_count,
    'tap_count', v_tap_count,
    'percent_change', ROUND(COALESCE(v_percent_change, 0), 1),
    'trend', CASE 
      WHEN v_percent_change > 0 THEN 'up'
      WHEN v_percent_change < 0 THEN 'down'
      ELSE 'stable'
    END,
    'percentile', ROUND(COALESCE(v_percentile, 0), 0),
    'period_days', p_days,
    'as_of', v_today
  );
END;
$$;

COMMENT ON FUNCTION public.get_personal_hi_index IS 'Get personal Hi Index (7-day rolling wellness score) - private to user';

REVOKE ALL ON FUNCTION public.get_personal_hi_index(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personal_hi_index(INT) TO authenticated;

-- ============================================================================
-- PHASE 4: HISTORICAL DATA RPC (For Charts)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_hi_index_history(
  p_scope TEXT DEFAULT 'personal',  -- 'personal' or 'community'
  p_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_scope_value TEXT;
  v_result JSONB;
BEGIN
  -- Determine scope
  IF p_scope = 'community' THEN
    v_scope_value := 'community';
  ELSE
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('error', 'not_authenticated');
    END IF;
    v_scope_value := v_user_id::text;
  END IF;
  
  -- Get historical snapshots
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', snapshot_date,
      'index', ROUND(normalized_index, 2),
      'raw_score', ROUND(raw_score, 2),
      'share_count', share_count,
      'tap_count', tap_count,
      'percentile', ROUND(COALESCE(percentile, 0), 0)
    ) ORDER BY snapshot_date ASC
  )
  INTO v_result
  FROM hi_index_snapshots
  WHERE scope = v_scope_value
    AND snapshot_date >= CURRENT_DATE - p_days;
  
  RETURN jsonb_build_object(
    'scope', p_scope,
    'days', p_days,
    'data', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.get_hi_index_history IS 'Get Hi Index historical data for charts';

REVOKE ALL ON FUNCTION public.get_hi_index_history(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hi_index_history(TEXT, INT) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run after deployment)
-- ============================================================================

-- Verify table created
-- SELECT * FROM hi_index_snapshots LIMIT 5;

-- Test community index
-- SELECT get_community_hi_index(7);

-- Test personal index (requires auth)
-- SELECT get_personal_hi_index(7);

-- Test history
-- SELECT get_hi_index_history('community', 30);

SELECT '✅ Hi Index System Deployed Successfully!' as status;
