-- ============================================
-- 7-DAY PILL TESTING: Mock Various Streak Lengths
-- Date: January 2, 2026
-- ============================================
-- Use these scripts to test pills with different streak scenarios
-- IMPORTANT: Run RESTORE script at end to reset to real data!

-- ============================================
-- STEP 1: Save your current real data
-- ============================================
CREATE TEMP TABLE IF NOT EXISTS backup_user_stats AS
SELECT current_streak, longest_streak FROM user_stats WHERE user_id = auth.uid();

-- Verify backup created
SELECT 'Backup created with current streak: ' || current_streak || ' days' as status
FROM backup_user_stats;

-- ============================================
-- TEST SCENARIO 1: Zero-day streak (new user)
-- ============================================
-- Expected: Pills show all empty, stat box shows "0"
UPDATE user_stats
SET 
  current_streak = 0,
  longest_streak = 0
WHERE user_id = auth.uid();

SELECT 'TEST 1: Zero-day streak set' as status;
-- Now refresh dashboard and verify pills are all empty

-- ============================================
-- TEST SCENARIO 2: 1-day streak
-- ============================================
-- Expected: Only today's pill filled, stat box shows "1"
UPDATE user_streaks
SET ats
SET 
  current_streak = 1,
  longest_streak = 1

SELECT 'TEST 2: 1-day streak set' as status;
-- Refresh dashboard - should see 1 pill filled (today)

-- ============================================
-- TEST SCENARIO 3: 3-day streak
-- ============================================
-- Expected: Last 3 pills filled (today, yesterday, 2 days ago)
UPDATE user_streaks
SET ats
SET 
  current_streak = 3,
  longest_streak = 3

SELECT 'TEST 3: 3-day streak set' as status;
-- Refresh dashboard - should see 3 pills filled

-- ============================================
-- TEST SCENARIO 4: 7-day streak (full week)
-- ============================================
-- Expected: All 7 pills filled, stat box shows "7"
UPDATE user_streaks
SET ats
SET 
  current_streak = 7,
  longest_streak = 7

SELECT 'TEST 4: 7-day streak set' as status;
-- Refresh dashboard - all 7 pills should be filled

-- ============================================
-- TEST SCENARIO 5: 30-day streak (1 month)
-- ============================================
-- Expected: Only last 7 days filled (not first 7), stat shows "30"
UPDATE user_streaks
SET ats
SET 
  current_streak = 30,
  longest_streak = 30

SELECT 'TEST 5: 30-day streak set (should show last 7 days)' as status;
-- Refresh dashboard - last 7 days filled, not days 1-7

-- ============================================
-- TEST SCENARIO 6: 365-day streak (1 year)
-- ============================================
-- Expected: Only last 7 days filled, stat shows "365"
UPDATE user_streaks
SET ats
SET 
  current_streak = 365,
  longest_streak = 365

SELECT 'TEST 6: 365-day streak set' as status;
-- Refresh dashboard - should render instantly (< 100ms)

-- ============================================
-- TEST SCENARIO 7: 2000-day streak (SCALE TEST)
-- ============================================
-- Expected: Only last 7 days filled, renders fast, no lag
UPDATE user_streaks
SET ats
SET 
  current_streak = 2000,
  longest_streak = 2000

SELECT 'TEST 7: 2000-day streak set (PERFORMANCE TEST)' as status;
-- Refresh dashboard - should render in < 100ms
-- Open calendar - should scroll smoothly through 2000 days

-- ============================================
-- TEST SCENARIO 8: Broken streak (lastHiDate old)
-- ================================old)
-- ============================================
-- Expected: Pills show empty, graceful handling
UPDATE user_stats
SET 
  current_streak = 0,
  longest_streak = 100

SELECT 'TEST 8: Broken streak (10 days old)' as status;
-- Refresh dashboard - should show empty pills

-- ============================================
-- TEST SCENARIO 9: Edge case (yesterday's Hi)
-- ============================1-day streak)
-- ============================================
-- Expected: Shows 1-day streak
UPDATE user_stats
SET 
  current_streak = 1,
  longest_streak = 100

SELECT 'TEST 9: Yesterday was last Hi' as status;
-- Refresh dashboard - yesterday filled, today empty

-- ============================================
-- RESTORE: Get your real data back
-- ============================================
UPDATE user_streaks
SET ats
SET 
  current_streak = b.current_streak,
  longest_streak = b.longest_streak
FROM backup_user_stats b
WHERE user_stats.user_id = auth.uid();

SELECT 
  'RESTORED: Real streak is ' || current_streak || ' days' as status
FROM user_stats
WHERE user_id = auth.uid();

-- Clean up temp table
DROP TABLE IF EXISTS backup_user_stat
-- ============================================
-- QUICK VERIFICATION QUERIES
-- ============================================

-- Check current streak value
SELECT current as current_streak, lastHiDate, longest 
FROM user_stre_streak, longest_streak
FROM user_statauth.uid();

-- See what date range the 7 pills should show
SELECT 
  'Today: ' || CURRENT_DATE as today,
  'Last 7 days from: ' || (CURRENT_DATE - INTERVAL '6 days') as range_start,
  'Last 7 days to: ' || CURRENT_DATE as range_end;
