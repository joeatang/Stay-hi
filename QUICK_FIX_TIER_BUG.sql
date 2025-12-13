-- 🚀 QUICK FIX: Bronze Tier Display Bug
-- Deploy this immediately to fix tier display issue
-- Root cause: get_unified_membership() querying wrong table

-- ========================================
-- FIX: Update get_unified_membership() to query user_memberships
-- ========================================

DROP FUNCTION IF EXISTS get_unified_membership();
DROP FUNCTION IF EXISTS get_unified_membership(uuid);

CREATE OR REPLACE FUNCTION get_unified_membership()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  membership_row RECORD;
  days_remaining INTEGER;
  result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    -- Anonymous user
    RETURN jsonb_build_object(
      'tier', 'anonymous',
      'status', 'anonymous',
      'expires_at', NULL,
      'days_remaining', NULL,
      'trial_end', NULL,
      'can_access_calendar', false,
      'can_access_hi_muscle', true,
      'upgrade_available', true,
      'signup_required', true,
      'is_admin', false
    );
  END IF;

  -- ✅ CRITICAL FIX: Query user_memberships table (NOT hi_members)
  SELECT 
    tier,
    status,
    trial_start,
    trial_end,
    trial_days_total,
    invitation_code,
    created_at,
    updated_at
  INTO membership_row
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;

  -- If no membership found, default to free tier
  IF membership_row IS NULL THEN
    RETURN jsonb_build_object(
      'tier', 'free',
      'status', 'active',
      'expires_at', NULL,
      'days_remaining', NULL,
      'trial_end', NULL,
      'can_access_calendar', false,
      'can_access_hi_muscle', false,
      'upgrade_available', true,
      'signup_required', false,
      'is_admin', false
    );
  END IF;

  -- Calculate days remaining in trial
  days_remaining := NULL;
  IF membership_row.trial_end IS NOT NULL THEN
    days_remaining := EXTRACT(DAY FROM membership_row.trial_end - NOW())::INTEGER;
    IF days_remaining < 0 THEN
      days_remaining := 0;
    END IF;
  END IF;

  -- Build result (admin check removed - not needed for tier display)
  result := jsonb_build_object(
    'tier', membership_row.tier,
    'status', membership_row.status,
    'trial_start', membership_row.trial_start,
    'trial_end', membership_row.trial_end,
    'expires_at', membership_row.trial_end,
    'days_remaining', days_remaining,
    'trial_days_total', membership_row.trial_days_total,
    'invitation_code', membership_row.invitation_code,
    'created_at', membership_row.created_at,
    'updated_at', membership_row.updated_at,
    'can_access_calendar', (membership_row.tier != 'free' AND membership_row.tier != 'anonymous'),
    'can_access_hi_muscle', true,
    'upgrade_available', (membership_row.tier != 'collective'),
    'signup_required', false,
    'is_admin', false
  );

  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_unified_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_membership() TO anon;

-- ========================================
-- VERIFICATION
-- ========================================

-- 1. Check function was created
SELECT 
  '✅ Function created' as status,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_unified_membership';

-- 2. Verify it queries user_memberships table
SELECT 
  CASE 
    WHEN routine_definition LIKE '%FROM user_memberships%' THEN '✅ Queries correct table (user_memberships)'
    WHEN routine_definition LIKE '%FROM hi_members%' THEN '❌ Still queries wrong table (hi_members)'
    ELSE '⚠️ Cannot determine table'
  END as verification
FROM information_schema.routines
WHERE routine_name = 'get_unified_membership';

-- 3. Test function (run while logged in)
-- SELECT get_unified_membership();
-- Expected: Returns your actual tier from user_memberships table

-- ========================================
-- POST-DEPLOYMENT INSTRUCTIONS
-- ========================================

-- 1. ✅ Function deployed
-- 2. Clear browser cache: localStorage.clear(); window.location.reload();
-- 3. Test bronze signup in incognito
-- 4. Verify header shows "🧭 Hi Pathfinder" instead of "👋 Hi Friend"

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- If tier still shows wrong after deploying:

-- A. Check if user has row in user_memberships
-- SELECT tier FROM user_memberships WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

-- B. If NO ROW found, re-run use_invite_code for that user:
-- SELECT use_invite_code('YOUR_CODE', 'YOUR_USER_ID'::uuid);

-- C. If row exists with correct tier but frontend shows wrong:
-- Clear cache: localStorage.clear(); sessionStorage.clear(); window.location.reload();

SELECT '✅ Deployment complete! Test by logging in and checking tier display.' as final_status;
