-- Comprehensive streak audit for Wendybydesign
-- Check actual data to verify streak accuracy

-- 1. Find Wendybydesign's user_id
SELECT u.id, u.email, p.display_name, p.username
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email ILIKE '%wendy%' 
   OR p.display_name ILIKE '%wendy%' 
   OR p.username ILIKE '%wendy%';

-- 2. Get current streak data from user_stats
SELECT 
  us.user_id,
  u.email,
  p.display_name,
  p.username,
  us.current_streak,
  us.longest_streak,
  us.last_hi_date,
  us.days_active,
  us.total_hi_moments,
  us.updated_at
FROM user_stats us
JOIN auth.users u ON us.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email ILIKE '%wendy%' 
   OR p.display_name ILIKE '%wendy%' 
   OR p.username ILIKE '%wendy%';

-- 3. Count actual check-ins for Wendybydesign (last 14 days)
SELECT 
  user_id,
  day,
  ts
FROM hi_points_daily_checkins
WHERE user_id = (
  SELECT u.id FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.email ILIKE '%wendy%' 
     OR p.display_name ILIKE '%wendy%' 
     OR p.username ILIKE '%wendy%'
  LIMIT 1
)
AND day >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY day DESC;

-- 4. Count actual shares for Wendybydesign (last 14 days)
SELECT 
  user_id,
  DATE(created_at) as share_date,
  COUNT(*) as shares_that_day
FROM public_shares
WHERE user_id = (
  SELECT u.id FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.email ILIKE '%wendy%' 
     OR p.display_name ILIKE '%wendy%' 
     OR p.username ILIKE '%wendy%'
  LIMIT 1
)
AND created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY user_id, DATE(created_at)
ORDER BY share_date DESC;

-- 5. Calculate ACTUAL streak from check-ins + shares
WITH wendyid AS (
  SELECT u.id FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.email ILIKE '%wendy%' 
     OR p.display_name ILIKE '%wendy%' 
     OR p.username ILIKE '%wendy%'
  LIMIT 1
),
all_activity_dates AS (
  SELECT DISTINCT DATE(created_at) as activity_date 
  FROM public_shares 
  WHERE user_id = (SELECT id FROM wendyid)
  UNION
  SELECT DISTINCT day as activity_date 
  FROM hi_points_daily_checkins 
  WHERE user_id = (SELECT id FROM wendyid)
),
ordered_dates AS (
  SELECT activity_date 
  FROM all_activity_dates 
  ORDER BY activity_date DESC
),
streak_calc AS (
  SELECT 
    activity_date,
    ROW_NUMBER() OVER (ORDER BY activity_date DESC) as row_num,
    activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC) - 1) * INTERVAL '1 day' as streak_group
  FROM ordered_dates
)
SELECT 
  'Calculated Streak' as label,
  COUNT(*) as current_streak_days,
  MIN(activity_date) as streak_start,
  MAX(activity_date) as streak_end
FROM streak_calc
WHERE streak_group = (SELECT MAX(activity_date) FROM ordered_dates)
  AND EXISTS (
    -- Only count as current streak if activity within last 2 days
    SELECT 1 FROM ordered_dates 
    WHERE activity_date >= CURRENT_DATE - INTERVAL '1 day'
  );

-- 6. Show last 7 days of activity for Wendybydesign
WITH wendyid AS (
  SELECT u.id FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.email ILIKE '%wendy%' 
     OR p.display_name ILIKE '%wendy%' 
     OR p.username ILIKE '%wendy%'
  LIMIT 1
),
days AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date as day
)
SELECT 
  days.day,
  EXISTS(
    SELECT 1 FROM hi_points_daily_checkins 
    WHERE user_id = (SELECT id FROM wendyid)
    AND hi_points_daily_checkins.day = days.day
  ) as had_checkin,
  EXISTS(
    SELECT 1 FROM public_shares 
    WHERE user_id = (SELECT id FROM wendyid)
    AND DATE(created_at) = days.day
  ) as had_share
FROM days
ORDER BY day DESC;
