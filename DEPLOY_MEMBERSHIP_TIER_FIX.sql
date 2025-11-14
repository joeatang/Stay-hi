-- 🏗️ MISSION CONTROL MEMBERSHIP TIER FIX
-- Deploy this to Supabase SQL Editor
-- Fixes: "HiFriend" tier display + Admin menu not appearing

-- =============================================
-- 0. Drop any existing versions
-- =============================================
DROP FUNCTION IF EXISTS get_unified_membership();
DROP FUNCTION IF EXISTS get_unified_membership(uuid);

-- =============================================
-- 1. Get Unified Membership Function
-- =============================================
CREATE OR REPLACE FUNCTION get_unified_membership()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
  v_member record;
  v_days_remaining int;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'tier', 'anonymous',
      'status', 'anonymous',
      'expires_at', null,
      'days_remaining', null,
      'can_access_calendar', false,
      'can_access_hi_muscle', true,
      'upgrade_available', true,
      'signup_required', true
    );
  END IF;
  
  -- Get membership from hi_members table
  SELECT 
    membership_tier,
    tier_expires_at,
    is_admin,
    is_active
  INTO v_member
  FROM hi_members
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- If no membership found, return anonymous
  IF v_member IS NULL THEN
    RETURN json_build_object(
      'tier', 'anonymous',
      'status', 'no_membership',
      'expires_at', null,
      'days_remaining', null,
      'can_access_calendar', false,
      'can_access_hi_muscle', false,
      'upgrade_available', true,
      'signup_required', true,
      'is_admin', false
    );
  END IF;
  
  -- Calculate days remaining
  v_days_remaining := NULL;
  IF v_member.tier_expires_at IS NOT NULL THEN
    v_days_remaining := EXTRACT(DAY FROM v_member.tier_expires_at - NOW())::int;
  END IF;
  
  -- Return unified membership object
  RETURN json_build_object(
    'tier', v_member.membership_tier,
    'status', CASE 
      WHEN NOT v_member.is_active THEN 'inactive'
      WHEN v_member.tier_expires_at IS NOT NULL AND v_member.tier_expires_at < NOW() THEN 'expired'
      ELSE 'active'
    END,
    'expires_at', v_member.tier_expires_at,
    'days_remaining', v_days_remaining,
    'can_access_calendar', CASE v_member.membership_tier
      WHEN 'collective' THEN true
      WHEN 'enhanced' THEN true
      WHEN 'starter' THEN true
      ELSE false
    END,
    'can_access_hi_muscle', true,
    'upgrade_available', CASE v_member.membership_tier
      WHEN 'collective' THEN false
      ELSE true
    END,
    'signup_required', false,
    'is_admin', COALESCE(v_member.is_admin, false)
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_unified_membership() TO authenticated;

-- =============================================
-- 2. Verify Data
-- =============================================
-- Check your membership record exists
SELECT 
  user_id,
  username,
  membership_tier,
  is_admin,
  tier_expires_at,
  created_at
FROM hi_members
WHERE username = 'joeatang'
LIMIT 1;

-- =============================================
-- 3. Test Function
-- =============================================
-- Run this after deploying (while logged in)
SELECT get_unified_membership();

-- Expected output for your account:
-- {
--   "tier": "collective",
--   "status": "active",
--   "expires_at": null,
--   "days_remaining": null,
--   "can_access_calendar": true,
--   "can_access_hi_muscle": true,
--   "upgrade_available": false,
--   "signup_required": false,
--   "is_admin": true
-- }
