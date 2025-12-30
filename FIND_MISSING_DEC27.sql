-- 🚨 FIND THE MISSING ACTIVITY DATA
-- Screenshot shows activity on Dec 26, 27, 28, 29 but we only found 28, 29

-- 1. Check ALL tables for activity on Dec 27
SELECT 'public_shares' as source, COUNT(*) as count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND DATE(created_at) = '2025-12-27';

SELECT 'hi_points_daily_checkins' as source, COUNT(*) as count
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND day = '2025-12-27';

-- 2. Check if there's an island_activities table (Hi Island taps)
SELECT COUNT(*) as dec27_activity
FROM island_activities
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND DATE(created_at) = '2025-12-27';

-- 3. Check user_activity_log
SELECT COUNT(*) as dec27_activity
FROM user_activity_log
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND DATE(timestamp) = '2025-12-27';

-- 4. Check if there are hi_events or track_events
SELECT table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = 'user_id') as has_user_id
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (table_name LIKE '%event%' OR table_name LIKE '%track%' OR table_name LIKE '%activity%')
ORDER BY table_name;
