-- DIAGNOSTIC: Why is user_stats row being deleted?
-- Run this in Supabase SQL Editor to investigate

-- 1. Check user_stats table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- 2. Check for foreign key constraints that might CASCADE DELETE
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'user_stats' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Check for triggers on user_stats
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_stats';

-- 4. Check recent activity on user_stats for this user
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  updated_at,
  created_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 5. Check if there's a function that deletes user_stats
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%DELETE%user_stats%'
  OR routine_definition ILIKE '%TRUNCATE%user_stats%';
