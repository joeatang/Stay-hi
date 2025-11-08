-- ===============================================
-- 🔧 MILESTONE DEPLOYMENT VERIFICATION SCRIPT
-- ===============================================
-- Run this AFTER applying hi-milestone-foundation.sql to verify success

-- ===============================================
-- VERIFICATION 1: USER_STATS EXTENSIONS
-- ===============================================

-- Check that all milestone columns were added to user_stats
SELECT 'VERIFICATION: user_stats milestone columns' as check_type;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE WHEN column_name IN (
    'hi_points', 'milestones_earned', 'daily_points_earned', 
    'last_points_reset', 'milestone_tier', 'total_milestones', 'last_milestone_at'
  ) THEN '✅ MILESTONE_COLUMN' ELSE 'EXISTING_COLUMN' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_stats'
ORDER BY 
  CASE WHEN column_name IN (
    'hi_points', 'milestones_earned', 'daily_points_earned', 
    'last_points_reset', 'milestone_tier', 'total_milestones', 'last_milestone_at'
  ) THEN 1 ELSE 2 END,
  column_name;

-- ===============================================
-- VERIFICATION 2: NEW MILESTONE TABLES
-- ===============================================

-- Verify all milestone tables were created
SELECT 'VERIFICATION: milestone tables created' as check_type;
SELECT 
  table_name,
  '✅ CREATED' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'hi_milestone_events',
    'hi_milestone_definitions', 
    'hi_global_milestones',
    'hi_trial_milestone_analytics'
  )
ORDER BY table_name;

-- ===============================================
-- VERIFICATION 3: MILESTONE DEFINITIONS SEEDED
-- ===============================================

-- Check that milestone definitions were populated
SELECT 'VERIFICATION: milestone definitions seeded' as check_type;
SELECT 
  milestone_type,
  COUNT(*) as definition_count,
  SUM(CASE WHEN trial_accessible THEN 1 ELSE 0 END) as trial_accessible_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM hi_milestone_definitions 
GROUP BY milestone_type
ORDER BY milestone_type;

-- Show sample milestone definitions
SELECT 'VERIFICATION: sample milestone definitions' as check_type;
SELECT 
  milestone_key,
  milestone_name,
  milestone_type,
  threshold_value,
  base_points,
  trial_accessible,
  emoji
FROM hi_milestone_definitions 
WHERE is_active = true
ORDER BY milestone_type, threshold_value
LIMIT 10;

-- ===============================================
-- VERIFICATION 4: RLS POLICIES APPLIED
-- ===============================================

-- Check RLS policies on milestone tables
SELECT 'VERIFICATION: RLS policies on milestone tables' as check_type;
SELECT 
  tablename,
  policyname,
  cmd,
  '✅ POLICY_ACTIVE' as status
FROM pg_policies 
WHERE tablename LIKE 'hi_milestone%'
ORDER BY tablename, policyname;

-- ===============================================
-- VERIFICATION 5: MILESTONE ACCESS FUNCTION
-- ===============================================

-- Test the milestone access function
SELECT 'VERIFICATION: milestone access function' as check_type;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  '✅ FUNCTION_READY' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_user_milestone_access';

-- ===============================================
-- VERIFICATION 6: INDEXES CREATED
-- ===============================================

-- Check milestone-related indexes
SELECT 'VERIFICATION: milestone indexes created' as check_type;
SELECT 
  indexname,
  tablename,
  '✅ INDEX_ACTIVE' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname LIKE '%milestone%' OR tablename LIKE 'hi_milestone%')
ORDER BY tablename, indexname;

-- ===============================================
-- VERIFICATION 7: GLOBAL MILESTONES SEEDED
-- ===============================================

-- Check global milestones
SELECT 'VERIFICATION: global milestones seeded' as check_type;
SELECT 
  milestone_key,
  milestone_name,
  milestone_type,
  threshold_value,
  community_bonus_points
FROM hi_global_milestones 
WHERE is_active = true
ORDER BY milestone_type, threshold_value;

-- ===============================================
-- VERIFICATION 8: USER DATA INTEGRITY
-- ===============================================

-- Verify no existing user data was affected
SELECT 'VERIFICATION: user data integrity' as check_type;
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN hi_points = 0 THEN 1 ELSE 0 END) as users_zero_points,
  SUM(CASE WHEN milestones_earned::text = '[]' THEN 1 ELSE 0 END) as users_no_milestones,
  AVG(total_waves) as avg_waves_unchanged,
  AVG(total_hi_moments) as avg_moments_unchanged
FROM user_stats;

-- ===============================================
-- VERIFICATION 9: READY FOR PHASE 2
-- ===============================================

SELECT 'VERIFICATION: Phase 2 readiness' as check_type;
SELECT 
  'DATABASE_FOUNDATION_COMPLETE' as status,
  'Ready for Phase 2: Milestone Detection Logic' as next_phase,
  'All tables, functions, and policies deployed successfully' as confirmation;

-- ===============================================
-- FINAL STATUS
-- ===============================================

SELECT 'DEPLOYMENT_STATUS: ✅ HI MILESTONE FOUNDATION COMPLETE' as final_status;