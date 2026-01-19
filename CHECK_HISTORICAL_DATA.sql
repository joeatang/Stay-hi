-- ============================================================================
-- CHECK HISTORICAL DATA FOR USER
-- ============================================================================
-- Purpose: See what historical activity exists that could be migrated
-- User: degenmentality@gmail.com (68d6ac30-742a-47b4-b1d7-0631bf7a2ec6)
-- ============================================================================

-- YOUR USER ID
-- Replace if needed: SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com';

-- 1. CHECK PUBLIC SHARES (community posts)
SELECT 
  'public_shares' as table_name,
  COUNT(*) as total_rows,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 2. CHECK HI ARCHIVES (private journal entries)
SELECT 
  'hi_archives' as table_name,
  COUNT(*) as total_rows,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM hi_archives
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 3. CHECK DAILY CHECKINS (check-in history)
SELECT 
  'hi_points_daily_checkins' as table_name,
  COUNT(*) as total_rows,
  MIN(day) as earliest_date,
  MAX(day) as latest_date
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 4. CHECK HI POINTS ACTIVITY (medallion taps, reactions)
SELECT 
  'hi_points_daily_activity' as table_name,
  COUNT(*) as total_rows,
  MIN(day) as earliest_date,
  MAX(day) as latest_date,
  SUM(share_count) as total_shares,
  SUM(tap_accumulator + (tap_batches_awarded * 100)) as total_taps
FROM hi_points_daily_activity
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 5. CHECK USER STATS (current state)
SELECT 
  'user_stats' as table_name,
  current_streak,
  longest_streak,
  total_hi_moments,
  last_hi_date,
  created_at as user_joined_date
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ============================================================================
-- SUMMARY QUERY: What historical data exists?
-- ============================================================================
SELECT 
  'SUMMARY' as report_type,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as shares,
  (SELECT COUNT(*) FROM hi_archives WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as archives,
  (SELECT COUNT(*) FROM hi_points_daily_checkins WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as checkins,
  (SELECT COUNT(*) FROM hi_points_daily_activity WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as activity_days,
  (SELECT current_streak FROM user_stats WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as current_streak;
