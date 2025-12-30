-- 🔍 VERIFICATION: Check if streak fix is complete and correct

-- 1. Check YOUR actual check-in history (should show 4 days if you have 4-day streak)
SELECT 
  checkin_date,
  points_awarded,
  created_at
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY checkin_date DESC
LIMIT 10;

-- 2. Check YOUR shares by date
SELECT 
  DATE(created_at) as share_date,
  COUNT(*) as shares_that_day
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
GROUP BY DATE(created_at)
ORDER BY share_date DESC
LIMIT 10;

-- 3. Check if triggers are installed correctly
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'update_stats_on_public_share',
  'update_stats_on_wave',
  'update_stats_on_start',
  'update_stats_on_checkin'
)
ORDER BY trigger_name;

-- 4. Verify the function exists and is correct
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_user_stats_from_public_shares'
  AND routine_schema = 'public';

-- 5. Test: What SHOULD your streak be based on actual data?
WITH all_activity AS (
  SELECT DISTINCT DATE(created_at) as activity_date 
  FROM public_shares 
  WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  UNION
  SELECT DISTINCT checkin_date as activity_date 
  FROM hi_points_daily_checkins 
  WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
),
ordered_dates AS (
  SELECT activity_date
  FROM all_activity
  ORDER BY activity_date DESC
),
streak_calc AS (
  SELECT 
    activity_date,
    ROW_NUMBER() OVER (ORDER BY activity_date DESC) as row_num,
    activity_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY activity_date DESC) - 1) as streak_group
  FROM ordered_dates
)
SELECT 
  'Expected Streak' as label,
  COUNT(*) as streak_days,
  MIN(activity_date) as streak_start,
  MAX(activity_date) as streak_end
FROM streak_calc
WHERE streak_group = (SELECT MAX(activity_date) FROM ordered_dates)
  AND activity_date >= CURRENT_DATE - INTERVAL '1 day';
