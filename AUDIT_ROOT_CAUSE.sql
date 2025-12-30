-- 🔍 AUDIT: Find what's resetting the count

-- 1. Check for any triggers that might be setting total_hi_moments to 1
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%moment%' OR trigger_name LIKE '%stat%';

-- 2. Check the actual trigger function code for sync_moment_count
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'sync_moment_count';

-- 3. Check if there's a default value on the column
SELECT 
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_stats' 
  AND column_name = 'total_hi_moments';

-- 4. Check audit trail - when was it last updated?
SELECT 
  user_id,
  total_hi_moments,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 5. Check if there are multiple rows (shouldn't be, but let's verify)
SELECT COUNT(*) as row_count
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 6. Check for any RPC functions that update user_stats
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE prosrc LIKE '%user_stats%' 
  AND prosrc LIKE '%total_hi_moments%';
