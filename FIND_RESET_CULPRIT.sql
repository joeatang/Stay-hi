-- 🔍 FIND WHAT'S RESETTING total_hi_moments TO 1
-- Based on VERIFY results: Value reset from 53 → 1 at 21:47:22 (4 hours after fix)

-- 1. Check if sync_moment_count trigger is actually installed
SELECT 
  'SYNC TRIGGER CHECK' as section,
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as on_table,
  pg_get_triggerdef(oid) as full_definition
FROM pg_trigger
WHERE tgname LIKE '%sync%moment%' OR tgname LIKE '%sync%count%';

-- 2. Check ALL triggers on public_shares (the table that should fire sync)
SELECT 
  'ALL TRIGGERS ON public_shares' as section,
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    WHEN tgtype & 4 = 4 THEN 'AFTER'
    ELSE 'INSTEAD OF'
  END as timing,
  CASE 
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
    ELSE 'OTHER'
  END as event_type,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public_shares'::regclass;

-- 3. Check ALL triggers on user_stats (something might be resetting on UPDATE)
SELECT 
  'ALL TRIGGERS ON user_stats' as section,
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'user_stats'::regclass;

-- 4. Search for ANY function that sets total_hi_moments = 1 (the reset value)
SELECT 
  'FUNCTIONS SETTING VALUE TO 1' as section,
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE prosrc LIKE '%total_hi_moments%'
  AND prosrc LIKE '%1%';

-- 5. Check the actual sync_moment_count function definition
SELECT 
  'SYNC FUNCTION CODE' as section,
  proname as function_name,
  prosrc as code
FROM pg_proc
WHERE proname = 'sync_moment_count';

-- 6. Look for INSERT statements that might be resetting user_stats
SELECT 
  'FUNCTIONS WITH INSERT user_stats' as section,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%INSERT INTO user_stats%' THEN '⚠️ INSERTS into user_stats'
    WHEN prosrc LIKE '%INSERT%user_stats%' THEN '⚠️ Might insert into user_stats'
    ELSE 'OK'
  END as issue
FROM pg_proc
WHERE prosrc LIKE '%user_stats%'
  AND prosrc LIKE '%INSERT%';

-- 🎯 EXPECTED FINDINGS:
-- 
-- If sync trigger is MISSING:
-- - Query 1 returns empty
-- - Need to recreate trigger
--
-- If sync trigger EXISTS but DISABLED:
-- - Query 1 shows enabled = 'D'
-- - Need to enable it
--
-- If there's a BAD trigger on user_stats:
-- - Query 3 shows trigger that resets value
-- - Need to drop bad trigger
--
-- If there's a BAD function:
-- - Query 4 shows function setting total_hi_moments = 1
-- - Need to fix or drop function
