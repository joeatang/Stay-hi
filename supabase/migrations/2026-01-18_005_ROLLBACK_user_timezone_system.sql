-- ============================================================================
-- 🔙 ROLLBACK: User Timezone System
-- ============================================================================
-- Migration: 005 ROLLBACK
-- Date: 2026-01-18
-- Purpose: Remove timezone system (revert to UTC)
-- ============================================================================

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_date(UUID);
DROP FUNCTION IF EXISTS get_user_now(UUID);
DROP FUNCTION IF EXISTS is_user_yesterday(UUID, DATE);
DROP FUNCTION IF EXISTS is_user_today(UUID, DATE);
DROP FUNCTION IF EXISTS update_user_last_hi_date(UUID);

-- Remove timezone column (optional - won't hurt to keep it)
ALTER TABLE profiles DROP COLUMN IF EXISTS timezone;

SELECT '✅ Rollback 005: Timezone system removed, reverted to UTC' as status;

-- ============================================================================
