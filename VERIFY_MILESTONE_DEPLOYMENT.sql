-- ================================================
-- 🔍 MILESTONE SYSTEM DEPLOYMENT VERIFICATION
-- ================================================
-- Run this in Supabase SQL Editor to verify milestone functions exist
-- Copy results and report back

-- ========================================
-- 1. Check milestone functions exist
-- ========================================
SELECT 
  routine_name as function_name,
  routine_schema as schema,
  routine_type as type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'award_milestone',
    'check_wave_milestone',
    'check_share_milestone',
    'check_streak_milestone',
    'update_user_waves',
    'update_user_shares',
    'get_user_stats'
  )
ORDER BY routine_name;

-- EXPECTED: 7 rows (all functions found)
-- IF 0 ROWS: Functions NOT deployed - run DEPLOY-2-MILESTONES.sql

-- ========================================
-- 2. Verify user_stats table structure
-- ========================================
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- EXPECTED: See hi_points, total_milestones, milestones_earned columns
-- IF MISSING: Table structure incomplete

-- ========================================
-- 3. Check milestone definitions seeded
-- ========================================
SELECT 
  milestone_type,
  COUNT(*) as count,
  MIN(threshold_value) as min_threshold,
  MAX(threshold_value) as max_threshold
FROM hi_milestone_definitions
WHERE is_active = true
GROUP BY milestone_type
ORDER BY milestone_type;

-- EXPECTED: 3 rows (waves, shares, streaks with multiple thresholds)
-- IF 0 ROWS: Milestone definitions NOT seeded

-- ========================================
-- 4. Verify user_memberships has tier column
-- ========================================
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'user_memberships'
  AND column_name IN ('tier', 'trial_start', 'trial_end', 'trial_days_total');

-- EXPECTED: 4 rows (tier, trial_start, trial_end, trial_days_total)
-- IF MISSING: DEPLOY_MASTER_TIER_SYSTEM.sql not deployed correctly

-- ========================================
-- 5. Test get_user_stats() returns points
-- ========================================
SELECT 
  (get_user_stats(auth.uid())->>'personalStats')::jsonb->>'hiPoints' as current_points,
  (get_user_stats(auth.uid())->>'personalStats')::jsonb->>'totalMilestones' as total_milestones;

-- EXPECTED: Returns your current points (likely 0 if new)
-- IF ERROR: get_user_stats() not deployed or user_stats table missing

-- ========================================
-- RESULTS INTERPRETATION:
-- ========================================
-- ✅ ALL GREEN: Milestone system fully deployed - proceed to Phase 1
-- ⚠️  SOME MISSING: Deploy missing components
-- ❌ ALL RED: Run full deployment sequence (DEPLOY-1-CORE-STATS.sql then DEPLOY-2-MILESTONES.sql)
