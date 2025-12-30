-- 🔍 TRIPLE-CHECK FOR CONFLICTING TRIGGERS/FUNCTIONS
-- Date: 2025-12-29
-- Purpose: Verify no duplicate or conflicting database logic after Phase 1

-- ============================================================================
-- 1. CHECK ALL TRIGGERS ON CRITICAL TABLES
-- ============================================================================

SELECT 
  'public_shares triggers' as check_type,
  trigger_name,
  event_manipulation as fires_on,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'public_shares'
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Expected: sync_moments_on_share (and maybe wave_count sync triggers)

SELECT 
  'wave_reactions triggers' as check_type,
  trigger_name,
  event_manipulation as fires_on,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'wave_reactions'
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Expected: sync_waves_on_reaction, trigger_sync_wave_count

SELECT 
  'user_stats triggers' as check_type,
  trigger_name,
  event_manipulation as fires_on,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_stats'
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Expected: None (user_stats should NOT have triggers updating itself)

-- ============================================================================
-- 2. CHECK ALL FUNCTIONS THAT UPDATE user_stats
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_definition LIKE '%current_streak%' THEN '⚠️ TOUCHES STREAKS'
    WHEN routine_definition LIKE '%longest_streak%' THEN '⚠️ TOUCHES STREAKS'
    ELSE '✅ Safe (no streak logic)'
  END as streak_safety
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_definition LIKE '%UPDATE user_stats%'
ORDER BY routine_name;

-- Expected: 
-- sync_moment_count() - ✅ Safe (only updates total_hi_moments)
-- sync_wave_count_on_public_share() - ✅ Safe (only updates total_waves)

-- ============================================================================
-- 3. CHECK FOR DUPLICATE/OLD FUNCTIONS (Should be dropped)
-- ============================================================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN (
  'update_user_stats_from_public_shares',
  'trigger_update_stats_on_share',
  'trigger_update_stats_on_reaction',
  'trigger_update_stats_on_checkin'
)
ORDER BY routine_name;

-- Expected: 0 rows (all should be dropped)

-- ============================================================================
-- 4. CHECK FOR STREAK RECALCULATION LOGIC (Should NOT exist)
-- ============================================================================

SELECT 
  routine_name,
  'DANGER: Recalculates streaks' as warning
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND (
  routine_definition LIKE '%calculateStreakUpdate%'
  OR routine_definition LIKE '%ROW_NUMBER%partition%'
  OR routine_definition LIKE '%LAG(%date%'
  OR (routine_definition LIKE '%current_streak%' AND routine_definition LIKE '%consecutive%')
);

-- Expected: 0 rows (no SQL should calculate streaks, only app does)

-- ============================================================================
-- 5. VERIFY ACTIVE TRIGGERS ARE SAFE
-- ============================================================================

-- Check sync_moment_count() function
SELECT 
  'sync_moment_count()' as function_name,
  CASE 
    WHEN routine_definition LIKE '%current_streak%' OR routine_definition LIKE '%longest_streak%' 
    THEN '❌ DANGER: Touches streaks'
    ELSE '✅ SAFE: Only counts moments'
  END as safety_check
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'sync_moment_count';

-- Check sync_wave_count_on_public_share() function
SELECT 
  'sync_wave_count_on_public_share()' as function_name,
  CASE 
    WHEN routine_definition LIKE '%current_streak%' OR routine_definition LIKE '%longest_streak%' 
    THEN '❌ DANGER: Touches streaks'
    ELSE '✅ SAFE: Only counts waves'
  END as safety_check
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'sync_wave_count_on_public_share';

-- ============================================================================
-- 6. FINAL SANITY CHECK - Count active triggers
-- ============================================================================

SELECT 
  event_object_table as table_name,
  COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('public_shares', 'wave_reactions', 'user_stats', 'hi_points_daily_checkins')
GROUP BY event_object_table
ORDER BY table_name;

-- Expected:
-- public_shares: 1-2 triggers (sync_moments_on_share, maybe wave_count sync)
-- wave_reactions: 1-2 triggers (sync_waves_on_reaction, trigger_sync_wave_count)
-- user_stats: 0 triggers (should NOT have any)
-- hi_points_daily_checkins: 0 triggers (check-ins managed by app)

-- ============================================================================
-- SUMMARY OF SAFE STATE:
-- ✅ Only counting triggers exist (moments, waves)
-- ✅ No streak recalculation in database
-- ✅ No conflicting/duplicate functions
-- ✅ Streaks managed by app only (streaks.js updateStreak())
-- ============================================================================
