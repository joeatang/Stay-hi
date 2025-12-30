-- Find actual column names in hi_points_daily_checkins
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hi_points_daily_checkins' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Then check your check-in records
SELECT * 
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 15;
