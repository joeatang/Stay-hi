-- ============================================================================
-- 🔙 ROLLBACK: Analytics Gold Standard v2.0
-- ============================================================================
-- Migration: 003 ROLLBACK
-- Date: 2026-01-18
-- Purpose: Remove analytics tables and functions if issues occur
-- ============================================================================

-- Drop RPC functions
DROP FUNCTION IF EXISTS get_user_emotional_journey(INT);
DROP FUNCTION IF EXISTS get_user_weekly_patterns();
DROP FUNCTION IF EXISTS get_user_insights();
DROP FUNCTION IF EXISTS dismiss_user_insight(UUID);
DROP FUNCTION IF EXISTS record_hi_scale_rating(SMALLINT, TEXT);
DROP FUNCTION IF EXISTS update_daily_activity_counts(INT, INT, INT);

-- Drop tables (cascade to remove dependent objects)
DROP TABLE IF EXISTS user_behavior_insights CASCADE;
DROP TABLE IF EXISTS user_trend_summaries CASCADE;
DROP TABLE IF EXISTS user_daily_snapshots CASCADE;

SELECT '✅ Rollback 003: Analytics system removed successfully' as status;

-- ============================================================================
