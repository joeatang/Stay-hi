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
      'signup_required', true,
      'isAnonymous', true,
      'features', json_build_object(
        'hiMedallionInteractions', 10,
        'shareCreation', false,
        'calendarAccess', false,
        'hiMuscleAccess', true,
        'mapAccess', 'preview'
      )
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
      'is_admin', v_is_admin,
      'isAnonymous', false,
      'features', json_build_object(
        'hiMedallionInteractions', 10,
        'shareCreation', false,
        'calendarAccess', false,
        'hiMuscleAccess', true,
        'mapAccess', 'preview'
      )
    );
  END IF;
  
  -- Return actual membership with features based on tier
  RETURN json_build_object(
    'tier', v_member.tier,
    'status', v_member.status,
    'trial_end', v_member.trial_end,
    'days_remaining', v_member.days_left,
    'is_admin', v_is_admin,
    'isAnonymous', false,
    'features', CASE v_member.tier
      -- Free tier: limited access
      WHEN 'free' THEN json_build_object(
        'hiMedallionInteractions', 10,
        'shareCreation', false,
        'calendarAccess', false,
        'hiMuscleAccess', true,
        'mapAccess', 'preview'
      )
      -- Bronze tier: basic features
      WHEN 'bronze' THEN json_build_object(
        'hiMedallionInteractions', 50,
        'shareCreation', true,
        'calendarAccess', false,
        'hiMuscleAccess', true,
        'mapAccess', 'basic'
      )
      -- Silver tier: enhanced features
      WHEN 'silver' THEN json_build_object(
        'hiMedallionInteractions', 'unlimited',
        'shareCreation', 'unlimited',
        'calendarAccess', true,
        'hiMuscleAccess', true,
        'mapAccess', 'full'
      )
      -- Gold tier: premium features
      WHEN 'gold' THEN json_build_object(
        'hiMedallionInteractions', 'unlimited',
        'shareCreation', 'unlimited',
        'calendarAccess', true,
        'hiMuscleAccess', true,
        'mapAccess', 'full'
      )
      -- Premium tier: all features (YOUR TIER)
      WHEN 'premium' THEN json_build_object(
        'hiMedallionInteractions', 'unlimited',
        'shareCreation', 'unlimited',
        'calendarAccess', true,
        'hiMuscleAccess', true,
        'mapAccess', 'full',
        'profileAccess', 'full'
      )
      -- Collective tier: full access + admin features
      WHEN 'collective' THEN json_build_object(
        'hiMedallionInteractions', 'unlimited',
        'shareCreation', 'unlimited',
        'calendarAccess', true,
        'hiMuscleAccess', true,
        'mapAccess', 'full',
        'profileAccess', 'full',
        'adminFeatures', true
      )
      -- Default: same as free
      ELSE json_build_object(
        'hiMedallionInteractions', 10,
        'shareCreation', false,
        'calendarAccess', false,
        'hiMuscleAccess', true,
        'mapAccess', 'preview'
      )
    END
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
