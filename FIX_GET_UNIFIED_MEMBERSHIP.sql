-- ========================================
-- FIX get_unified_membership TO QUERY user_memberships
-- Problem: AuthReady.js calls get_unified_membership() which queries hi_members table
-- Reality: Invite signup creates records in user_memberships table
-- Solution: Update function to query user_memberships instead
-- ========================================

CREATE OR REPLACE FUNCTION get_unified_membership()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
  v_member record;
  v_days_remaining numeric;
  v_is_admin boolean;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  -- Anonymous user
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'tier', 'free',
      'status', 'anonymous',
      'trial_end', null,
      'days_remaining', null,
      'is_admin', false,
      'signup_required', true
    );
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM admin_roles 
    WHERE user_id = v_user_id
  ) INTO v_is_admin;
  
  -- Get membership from user_memberships table (CRITICAL FIX)
  SELECT 
    tier,
    status,
    trial_end,
    CASE 
      WHEN trial_end IS NOT NULL AND trial_end > NOW() 
      THEN EXTRACT(DAY FROM trial_end - NOW())::int
      ELSE 0
    END as days_left
  INTO v_member
  FROM user_memberships
  WHERE user_id = v_user_id
  ORDER BY created_at DESC  -- Get most recent membership
  LIMIT 1;
  
  -- If no membership found, return free tier
  IF NOT FOUND OR v_member.tier IS NULL THEN
    RETURN json_build_object(
      'tier', 'free',
      'status', 'active',
      'trial_end', null,
      'days_remaining', null,
      'is_admin', v_is_admin
    );
  END IF;
  
  -- Return actual membership
  RETURN json_build_object(
    'tier', v_member.tier,
    'status', v_member.status,
    'trial_end', v_member.trial_end,
    'days_remaining', v_member.days_left,
    'is_admin', v_is_admin
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_unified_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_membership() TO anon;

-- ========================================
-- VERIFICATION QUERY
-- ========================================
-- Run this after deploying to verify it works:
-- 
-- SELECT get_unified_membership();
-- 
-- Expected output for premium user:
-- {
--   "tier": "premium",
--   "status": "active", 
--   "trial_end": "2025-11-29T...",
--   "days_remaining": 7,
--   "is_admin": false
-- }
