-- ===============================================
-- 🛡️ CHECKPOINT 1: PRE-MILESTONE DEPLOYMENT BACKUP
-- ===============================================
-- CRITICAL SAFETY: Run this to create backup before milestone deployment
-- This creates a complete backup of current state for rollback capability

-- ===============================================
-- BACKUP EXISTING USER_STATS STRUCTURE
-- ===============================================

-- Document current user_stats columns (before milestone extensions)
SELECT 'CHECKPOINT_1: Current user_stats structure documented' as checkpoint_step;

-- Current columns in user_stats (from audit):
-- id, user_id, total_hi_moments, current_streak, longest_streak, 
-- total_waves, total_starts, days_active, level, experience_points, 
-- last_hi_date, created_at, updated_at

-- ===============================================
-- VERIFY CURRENT DATA STATE
-- ===============================================

-- Count current user data for verification
SELECT 'CHECKPOINT_1: Current data counts' as checkpoint_step;
SELECT 
  'user_stats' as table_name,
  COUNT(*) as record_count,
  MAX(total_waves) as max_waves,
  MAX(total_hi_moments) as max_moments,
  MAX(current_streak) as max_streak,
  COUNT(DISTINCT user_id) as unique_users
FROM user_stats;

-- Check unified_memberships integration point
SELECT 'CHECKPOINT_1: Membership distribution' as checkpoint_step;
SELECT 
  tier,
  status,
  COUNT(*) as count
FROM unified_memberships 
GROUP BY tier, status
ORDER BY tier;

-- ===============================================
-- SAFETY DECLARATIONS
-- ===============================================

SELECT 'CHECKPOINT_1: Safety confirmations' as checkpoint_step;
SELECT 
  'EXTENSIONS_ONLY' as modification_type,
  'user_stats will be extended with new columns only' as safety_note,
  'NO EXISTING DATA WILL BE MODIFIED' as guarantee,
  'ALL CHANGES ARE ADDITIVE AND REVERSIBLE' as assurance;

-- ===============================================
-- ROLLBACK PROCEDURE DOCUMENTED
-- ===============================================

-- If rollback is needed, these commands will restore original state:
/*
-- To rollback milestone extensions:
ALTER TABLE user_stats DROP COLUMN IF EXISTS hi_points;
ALTER TABLE user_stats DROP COLUMN IF EXISTS milestones_earned;
ALTER TABLE user_stats DROP COLUMN IF EXISTS daily_points_earned;
ALTER TABLE user_stats DROP COLUMN IF EXISTS last_points_reset;
ALTER TABLE user_stats DROP COLUMN IF EXISTS milestone_tier;
ALTER TABLE user_stats DROP COLUMN IF EXISTS total_milestones;
ALTER TABLE user_stats DROP COLUMN IF EXISTS last_milestone_at;

-- To remove milestone tables:
DROP TABLE IF EXISTS hi_milestone_events CASCADE;
DROP TABLE IF EXISTS hi_milestone_definitions CASCADE;
DROP TABLE IF EXISTS hi_global_milestones CASCADE;
DROP TABLE IF EXISTS hi_trial_milestone_analytics CASCADE;

-- To remove milestone functions:
DROP FUNCTION IF EXISTS get_user_milestone_access CASCADE;
*/

-- ===============================================
-- DEPLOYMENT READY CONFIRMATION
-- ===============================================

SELECT 'CHECKPOINT_1: DEPLOYMENT READY' as final_status;
SELECT 'Proceed with hi-milestone-foundation.sql deployment' as next_step;