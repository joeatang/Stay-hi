-- 🔍 VERIFY CURRENT STATE - Run this RIGHT NOW
-- Check if database value is still correct or if it reset

-- 1. Check CURRENT value in database
SELECT 
  'DATABASE CHECK' as section,
  user_id,
  total_hi_moments as current_value,
  updated_at as last_modified,
  NOW() - updated_at as time_since_update,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as should_be,
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ CORRECT'
    ELSE '❌ WRONG - VALUE RESET!'
  END as status
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 2. Check when value was last modified (was it recent SQL fix or did something overwrite it?)
SELECT 
  'MODIFICATION HISTORY' as section,
  total_hi_moments,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_ago
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 3. Check recent INSERT activity (did user create new moments that should've triggered sync?)
SELECT 
  'RECENT ACTIVITY' as section,
  COUNT(*) as moments_in_last_hour,
  MAX(created_at) as most_recent_moment
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND created_at > NOW() - INTERVAL '1 hour';

-- 4. Manual test: Try inserting a test row to see if trigger works
BEGIN;
-- This will NOT actually insert (we'll rollback), just test the trigger logic
INSERT INTO public_shares (user_id, content, visibility, created_at)
VALUES ('68d6ac30-742a-47b4-b1d7-0631bf7a2ec6', 'TEST - WILL ROLLBACK', 'public', NOW());

-- Check if user_stats was updated by trigger
SELECT 
  'TRIGGER TEST' as section,
  total_hi_moments as value_after_test_insert,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as actual_count,
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ TRIGGER WORKING'
    ELSE '❌ TRIGGER BROKEN OR NOT FIRING'
  END as trigger_status
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

ROLLBACK; -- Don't actually insert the test row

-- 5. Check if there are competing triggers/functions that might reset the value
SELECT 
  'COMPETING TRIGGERS' as section,
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'user_stats'::regclass
  AND tgname != 'sync_moments_on_share';

-- 🎯 INTERPRETATION GUIDE:
--
-- DATABASE CHECK:
-- - If status = ❌ WRONG → Something reset the value after SQL fix
-- - If current_value = 1 → Value definitely reset
-- - If current_value = 53 → Database is correct, might be cache issue
--
-- MODIFICATION HISTORY:
-- - If minutes_ago < 10 → Recently modified (maybe by trigger)
-- - If minutes_ago > 60 → Not modified recently, check if trigger is working
--
-- RECENT ACTIVITY:
-- - If moments_in_last_hour > 0 → User created moments, trigger should've fired
-- - If moments_in_last_hour = 0 → No activity, value should be stable
--
-- TRIGGER TEST:
-- - If ✅ TRIGGER WORKING → Sync mechanism is fine
-- - If ❌ TRIGGER BROKEN → Need to fix trigger
--
-- COMPETING TRIGGERS:
-- - If empty → Good, no conflicts
-- - If rows returned → Other triggers might be resetting value
