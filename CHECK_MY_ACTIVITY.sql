-- Check YOUR check-in history (columns: user_id, day, ts)
SELECT 
  day,
  ts,
  user_id
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY day DESC
LIMIT 15;

-- Check YOUR shares by date
SELECT 
  DATE(created_at) as share_date,
  COUNT(*) as shares_that_day
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
GROUP BY DATE(created_at)
ORDER BY share_date DESC
LIMIT 10;

-- Calculate what your streak SHOULD be (using correct column: day)
WITH all_activity AS (
  SELECT DISTINCT DATE(created_at) as activity_date 
  FROM public_shares 
  WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  UNION
  SELECT DISTINCT day as activity_date 
  FROM hi_points_daily_checkins 
  WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
)
SELECT activity_date
FROM all_activity
ORDER BY activity_date DESC;
