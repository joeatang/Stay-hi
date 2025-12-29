-- 🔍 DEBUG: Stats Inconsistency Issue
-- User seeing different stats each page load: 239→150→58 moments, 10→28→19 streak

-- ========================================
-- STEP 1: Run this FIRST to see column names
-- ========================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: After seeing columns, run this with CORRECT column names
-- ========================================
-- Check 1: Are there MULTIPLE user_stats rows for your user?
SELECT *
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY updated_at DESC;

-- Check 2: Check if there are orphaned stats without user_id
SELECT COUNT(*) as orphaned_count
FROM user_stats
WHERE user_id IS NULL;

-- Check 3: Check for points balance
SELECT 
  user_id,
  balance,
  updated_at
FROM hi_points_balances
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check 4: Check daily check-in record
SELECT 
  user_id,
  checkin_date,
  points_awarded,
  created_at
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY checkin_date DESC
LIMIT 5;

-- Check 5: Are stats triggers working correctly?
-- (This shows if stats are being updated when shares/waves happen)
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%stat%'
  AND routine_type = 'FUNCTION';
