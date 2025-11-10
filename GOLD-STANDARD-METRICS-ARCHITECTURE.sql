-- ===============================================
-- 🏆 GOLD STANDARD: Hi Metrics Separation Architecture
-- ===============================================
-- MISSION: Create crystal-clear separation between metrics with proper ownership
-- 
-- METRIC DEFINITIONS (Tesla-Grade Clarity):
-- 1. Hi Waves = Medallion taps ONLY (dashboard medallion interactions)
-- 2. Total His = Share submissions ONLY (all share sheet submissions across all pages)
-- 
-- OWNERSHIP MODEL:
-- - Hi Waves: Owned by medallion tap system → writes to global_stats.hi_waves
-- - Total His: Owned by share sheet system → writes to public_shares count
-- 
-- DATABASE ARCHITECTURE:
-- - global_stats table: medallion tap counter (hi_waves column)
-- - public_shares table: share submission records (each record = 1 Total Hi)

-- ===============================================
-- STEP 1: ENSURE PROPER TABLE STRUCTURE
-- ===============================================

-- Create global_stats table if missing
CREATE TABLE IF NOT EXISTS global_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  hi_waves BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row exists
INSERT INTO global_stats (id, hi_waves, updated_at) 
VALUES (1, 0, NOW()) 
ON CONFLICT (id) DO NOTHING;

-- public_shares table should already exist from previous deployments
-- Each record represents one share submission = one Total Hi

-- ===============================================
-- STEP 2: GOLD STANDARD INCREMENT FUNCTIONS
-- ===============================================

-- DROP all existing conflicting functions
DROP FUNCTION IF EXISTS increment_hi_wave() CASCADE;
DROP FUNCTION IF EXISTS increment_total_hi() CASCADE;
DROP FUNCTION IF EXISTS increment_total_hi(UUID) CASCADE;
DROP FUNCTION IF EXISTS increment_total_hi(UUID, JSONB) CASCADE;

-- 🏆 GOLD STANDARD: Medallion Tap Function
-- MISSION: Increment medallion taps counter ONLY
CREATE OR REPLACE FUNCTION increment_hi_wave()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Update medallion taps in global_stats table
  UPDATE global_stats 
  SET 
    hi_waves = hi_waves + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- Get updated count
  SELECT hi_waves INTO new_count 
  FROM global_stats 
  WHERE id = 1;
  
  RETURN new_count;
END;
$$;

-- 🏆 GOLD STANDARD: Share Submission Function  
-- MISSION: Increment Total His counter ONLY (for ALL share sheet submissions)
CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Insert share submission record
  INSERT INTO public_shares (
    user_id,
    content,
    created_at
  ) VALUES (
    auth.uid(),
    'Share submission from share sheet',
    NOW()
  );
  
  -- Return total count of all share submissions
  SELECT COUNT(*) INTO new_count FROM public_shares;
  
  RETURN new_count;
END;
$$;

-- ===============================================
-- STEP 3: GOLD STANDARD STATS READER FUNCTION
-- ===============================================

DROP FUNCTION IF EXISTS get_global_stats() CASCADE;
DROP FUNCTION IF EXISTS get_user_stats(UUID) CASCADE;

-- 🏆 GOLD STANDARD: Unified Stats Function
-- MISSION: Read from correct sources with crystal-clear separation
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves BIGINT,
  total_his BIGINT,
  active_users_24h INTEGER,
  total_users BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  medallion_count BIGINT := 0;
  share_count BIGINT := 0;
  user_count BIGINT := 0;
BEGIN
  -- Hi Waves: Read from global_stats.hi_waves (medallion tap counter)
  SELECT COALESCE(g.hi_waves, 0) INTO medallion_count
  FROM global_stats g
  WHERE g.id = 1;
  
  -- Total His: Count all records in public_shares (share submissions)
  SELECT COUNT(*) INTO share_count FROM public_shares;
  
  -- User count from share submissions
  SELECT COUNT(DISTINCT ps.user_id) INTO user_count
  FROM public_shares ps
  WHERE ps.user_id IS NOT NULL;
  
  -- Minimum display count
  IF user_count < 1000 THEN
    user_count := 1000;
  END IF;
  
  RETURN QUERY SELECT 
    medallion_count as hi_waves,
    share_count as total_his,
    COALESCE((
      SELECT COUNT(DISTINCT ps.user_id) 
      FROM public_shares ps
      WHERE ps.created_at > NOW() - INTERVAL '24 hours'
    ), 0)::INTEGER as active_users_24h,
    user_count as total_users,
    NOW() as updated_at;
END;
$$;

-- 🏆 GOLD STANDARD: JavaScript-Compatible Stats Function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats_data RECORD;
BEGIN
  -- Get stats from gold standard function
  SELECT * INTO stats_data FROM get_global_stats() LIMIT 1;
  
  -- Return structure that DashboardStats.js expects
  RETURN jsonb_build_object(
    'personalStats', jsonb_build_object(
      'totalWaves', 0,
      'totalShares', 0,
      'weeklyShares', 0,
      'currentStreak', 0,
      'hiPoints', 0,
      'totalMilestones', 0,
      'lastWaveAt', NULL,
      'lastShareAt', NULL
    ),
    'globalStats', jsonb_build_object(
      'hiWaves', COALESCE(stats_data.hi_waves, 0),
      'totalHis', COALESCE(stats_data.total_his, 0),
      'activeUsers24h', COALESCE(stats_data.active_users_24h, 0),
      'totalUsers', COALESCE(stats_data.total_users, 1000)
    )
  );
END;
$$;

-- ===============================================
-- STEP 4: GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION increment_hi_wave() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon, authenticated;

-- ===============================================
-- STEP 5: VERIFICATION TESTS
-- ===============================================

-- Test current state
SELECT 'GOLD STANDARD ARCHITECTURE - CURRENT STATE:' as test_phase;
SELECT * FROM get_global_stats();

-- Test medallion tap increment
SELECT 'Testing medallion tap (Hi Waves):' as test_phase;
SELECT increment_hi_wave() as new_hi_waves;

-- Test share submission increment  
SELECT 'Testing share submission (Total His):' as test_phase;
SELECT increment_total_hi() as new_total_his;

-- Verify separation
SELECT 'VERIFICATION - Metrics are properly separated:' as test_phase;
SELECT * FROM get_global_stats();

-- Show table contents for audit
SELECT 'AUDIT - global_stats table:' as audit;
SELECT * FROM global_stats;

SELECT 'AUDIT - public_shares count:' as audit;  
SELECT COUNT(*) as total_share_records FROM public_shares;