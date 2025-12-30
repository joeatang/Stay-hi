-- Check the 3 tables that have user_id for Dec 27 activity

-- Check hi_events
SELECT 'hi_events' as source, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'hi_events' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'hi_events' as source, *
FROM hi_events
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 20;

-- Check user_activity_log
SELECT 'user_activity_log' as source, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_activity_log' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'user_activity_log' as source, *
FROM user_activity_log
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 20;

-- Check island_activities for YOUR complete activity history
SELECT DATE(created_at) as activity_date, COUNT(*) as activities, array_agg(DISTINCT activity_type) as types
FROM island_activities
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
GROUP BY DATE(created_at)
ORDER BY activity_date DESC
LIMIT 10;
