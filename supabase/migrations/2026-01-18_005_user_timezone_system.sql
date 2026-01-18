-- ============================================================================
-- 🌍 USER-SPECIFIC TIMEZONE SYSTEM
-- ============================================================================
-- Migration: 005
-- Date: 2026-01-18
-- Description: Add timezone awareness for midnight resets (global UX)
-- Dependencies: None (adds to profiles table)
-- Rollback: See 2026-01-18_005_ROLLBACK_user_timezone_system.sql
-- ============================================================================

-- This is the production-ready migration file.
-- Full implementation details in: /DEPLOY_USER_TIMEZONE_GOLD_STANDARD.sql

-- ============================================================================
-- PART 1: ADD TIMEZONE COLUMN
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON profiles(timezone);

-- Auto-populate existing users with EST (maintains current behavior)
UPDATE profiles 
SET timezone = 'America/New_York' 
WHERE timezone IS NULL;

-- Add check constraint (IANA timezone format)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_timezone_check;
ALTER TABLE profiles
ADD CONSTRAINT profiles_timezone_check 
CHECK (
  timezone IS NULL OR 
  timezone ~ '^[A-Z][a-z]+/[A-Za-z_]+$'
);

-- ============================================================================
-- PART 2: TIMEZONE HELPER FUNCTIONS
-- ============================================================================

-- Get user's current date in their timezone
CREATE OR REPLACE FUNCTION get_user_date(p_user_id UUID)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT COALESCE(timezone, 'UTC') INTO v_timezone 
  FROM profiles 
  WHERE id = p_user_id;
  
  RETURN (NOW() AT TIME ZONE v_timezone)::DATE;
  
EXCEPTION WHEN OTHERS THEN
  RETURN (NOW() AT TIME ZONE 'UTC')::DATE;
END;
$$;

-- Get user's current timestamp in their timezone
CREATE OR REPLACE FUNCTION get_user_now(p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT COALESCE(timezone, 'UTC') INTO v_timezone 
  FROM profiles 
  WHERE id = p_user_id;
  
  RETURN NOW() AT TIME ZONE v_timezone;
  
EXCEPTION WHEN OTHERS THEN
  RETURN NOW();
END;
$$;

-- Check if date is "yesterday" in user's timezone
CREATE OR REPLACE FUNCTION is_user_yesterday(p_user_id UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_today DATE;
  v_user_yesterday DATE;
BEGIN
  v_user_today := get_user_date(p_user_id);
  v_user_yesterday := v_user_today - INTERVAL '1 day';
  
  RETURN p_date = v_user_yesterday;
END;
$$;

-- Check if date is "today" in user's timezone
CREATE OR REPLACE FUNCTION is_user_today(p_user_id UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN p_date = get_user_date(p_user_id);
END;
$$;

-- Helper: Update user_stats.last_hi_date with timezone awareness
CREATE OR REPLACE FUNCTION update_user_last_hi_date(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_today DATE;
BEGIN
  v_user_today := get_user_date(p_user_id);
  
  UPDATE user_stats
  SET 
    last_hi_date = v_user_today,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND (last_hi_date IS NULL OR last_hi_date < v_user_today);
END;
$$;

-- ============================================================================
-- PART 3: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_date(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_now(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_user_yesterday(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_user_today(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_last_hi_date(UUID) TO authenticated;

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

-- Check timezone column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'timezone';

-- Check helper functions exist
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_date',
    'get_user_now', 
    'is_user_yesterday',
    'is_user_today',
    'update_user_last_hi_date'
  )
ORDER BY routine_name;

-- Verify no NULL timezones
SELECT COUNT(*) as users_without_timezone
FROM profiles
WHERE timezone IS NULL;
-- Expected: 0

SELECT '✅ Migration 005: User timezone system deployed successfully!' as status;

-- ============================================================================
