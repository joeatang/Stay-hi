-- 🚨 CRITICAL AUDIT: What did we overwrite?

-- 1. Check if longest_streak was preserved (should be 7, not reset)
SELECT 
  user_id,
  current_streak,
  longest_streak,
  last_hi_date,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 2. Check if there's a streak tracking table we missed
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%streak%'
ORDER BY table_name;

-- 3. Check if there's a user_activity_log with streak history
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%activity%'
ORDER BY table_name;

-- 4. Check for any audit/history tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%history%' OR table_name LIKE '%log%' OR table_name LIKE '%audit%')
ORDER BY table_name;

-- 5. Check what columns exist in user_stats (might have streak_history)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
  AND table_schema = 'public'
  AND column_name LIKE '%streak%'
ORDER BY ordinal_position;
