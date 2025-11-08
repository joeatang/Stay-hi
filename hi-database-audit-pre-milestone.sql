-- ===============================================
-- 🔍 HI-OS DATABASE AUDIT - PRE-MILESTONE DEPLOYMENT
-- ===============================================
-- CRITICAL: Run this BEFORE applying milestone foundation
-- This audits existing schema to ensure safe, surgical integration

-- ===============================================
-- STEP 1: AUDIT EXISTING TABLES STRUCTURE
-- ===============================================

-- Check current user_stats table structure
SELECT 'AUDIT: user_stats table structure' as audit_step;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- Check if milestone columns already exist
SELECT 'AUDIT: Checking for existing milestone columns' as audit_step;
SELECT 
  column_name,
  CASE WHEN column_name IN ('hi_points', 'milestones_earned', 'daily_points_earned', 'last_points_reset', 'milestone_tier') 
       THEN 'ALREADY_EXISTS' 
       ELSE 'NEW_COLUMN' 
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_stats'
  AND column_name IN ('hi_points', 'milestones_earned', 'daily_points_earned', 'last_points_reset', 'milestone_tier');

-- ===============================================
-- STEP 2: AUDIT EXISTING MEMBERSHIP INTEGRATION
-- ===============================================

-- Check unified_memberships table exists
SELECT 'AUDIT: unified_memberships table' as audit_step;
SELECT 
  COUNT(*) as table_exists,
  CASE WHEN COUNT(*) > 0 THEN 'TABLE_EXISTS' ELSE 'TABLE_MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'unified_memberships';

-- Check membership tier distribution
SELECT 'AUDIT: Current membership tier distribution' as audit_step;
SELECT 
  tier,
  COUNT(*) as user_count,
  status
FROM unified_memberships 
GROUP BY tier, status
ORDER BY tier;

-- ===============================================
-- STEP 3: AUDIT EXISTING MILESTONE TABLES
-- ===============================================

-- Check if milestone tables already exist
SELECT 'AUDIT: Checking existing milestone tables' as audit_step;
SELECT 
  table_name,
  CASE WHEN table_name LIKE 'hi_milestone%' THEN 'MILESTONE_TABLE' ELSE 'OTHER' END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'milestone%' OR table_name LIKE 'hi_milestone%')
ORDER BY table_name;

-- ===============================================
-- STEP 4: AUDIT RPC FUNCTIONS THAT NEED INTEGRATION
-- ===============================================

-- Check existing RPC functions that we'll need to integrate with
SELECT 'AUDIT: Existing RPC functions for integration' as audit_step;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name ILIKE '%stats%' 
       OR routine_name ILIKE '%membership%'
       OR routine_name ILIKE '%milestone%'
       OR routine_name ILIKE '%global%')
ORDER BY routine_name;

-- ===============================================
-- STEP 5: AUDIT USER DATA FOR SAFE MIGRATION
-- ===============================================

-- Check current user_stats data distribution
SELECT 'AUDIT: Current user_stats data sample' as audit_step;
SELECT 
  COUNT(*) as total_users,
  AVG(total_hi_moments) as avg_moments,
  MAX(total_hi_moments) as max_moments,
  AVG(total_waves) as avg_waves,
  MAX(total_waves) as max_waves,
  AVG(current_streak) as avg_streak,
  MAX(current_streak) as max_streak
FROM user_stats;

-- Check for users who would immediately earn milestones
SELECT 'AUDIT: Users ready for immediate milestone awards' as audit_step;
SELECT 
  'WAVES_10' as milestone_key,
  COUNT(*) as eligible_users
FROM user_stats 
WHERE total_waves >= 10

UNION ALL

SELECT 
  'WAVES_100' as milestone_key,
  COUNT(*) as eligible_users
FROM user_stats 
WHERE total_waves >= 100

UNION ALL

SELECT 
  'SHARES_5' as milestone_key,
  COUNT(*) as eligible_users
FROM user_stats 
WHERE total_hi_moments >= 5;

-- ===============================================
-- STEP 6: AUDIT EXISTING PERMISSIONS AND RLS
-- ===============================================

-- Check existing RLS policies on user_stats
SELECT 'AUDIT: Existing RLS policies on user_stats' as audit_step;
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_stats'
ORDER BY policyname;

-- Check permissions for authenticated users
SELECT 'AUDIT: Current table permissions' as audit_step;
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('user_stats', 'unified_memberships')
  AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY table_name, privilege_type;

-- ===============================================
-- STEP 7: CHECKPOINT RECOMMENDATIONS
-- ===============================================

-- Create backup recommendations
SELECT 'CHECKPOINT: Backup recommendations' as audit_step;
SELECT 
  'BACKUP_REQUIRED' as action,
  'user_stats' as table_name,
  COUNT(*) as record_count,
  pg_size_pretty(pg_total_relation_size('user_stats'::regclass)) as table_size
FROM user_stats

UNION ALL

SELECT 
  'BACKUP_REQUIRED' as action,
  'unified_memberships' as table_name,
  COUNT(*) as record_count,
  pg_size_pretty(pg_total_relation_size('unified_memberships'::regclass)) as table_size
FROM unified_memberships;

-- ===============================================
-- STEP 8: SAFETY CHECKS BEFORE DEPLOYMENT
-- ===============================================

-- Verify no conflicting indexes
SELECT 'SAFETY_CHECK: Existing indexes that might conflict' as audit_step;
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname ILIKE '%milestone%' OR indexname ILIKE '%hi_points%')
ORDER BY tablename, indexname;

-- Check for any existing triggers that might conflict
SELECT 'SAFETY_CHECK: Existing triggers on user_stats' as audit_step;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_stats'
ORDER BY trigger_name;

-- ===============================================
-- STEP 9: DEPLOYMENT READINESS SUMMARY
-- ===============================================

SELECT 'DEPLOYMENT_READINESS_SUMMARY' as final_check;

-- Summary of what will be modified
SELECT 
  'user_stats' as table_name,
  'ADD_COLUMNS' as modification_type,
  'hi_points, milestones_earned, daily_points_earned, last_points_reset, milestone_tier, total_milestones, last_milestone_at' as changes
  
UNION ALL

SELECT 
  'NEW_TABLE' as table_name,
  'CREATE' as modification_type,
  'hi_milestone_events' as changes

UNION ALL

SELECT 
  'NEW_TABLE' as table_name,
  'CREATE' as modification_type,
  'hi_milestone_definitions' as changes

UNION ALL

SELECT 
  'NEW_TABLE' as table_name,
  'CREATE' as modification_type,
  'hi_global_milestones' as changes

UNION ALL

SELECT 
  'NEW_TABLE' as table_name,
  'CREATE' as modification_type,
  'hi_trial_milestone_analytics' as changes;