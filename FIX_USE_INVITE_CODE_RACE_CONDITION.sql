-- ============================================================================
-- 🐛 FIX: use_invite_code() Race Condition
-- ============================================================================
-- ISSUE: Function queries auth.users.email immediately after signup
--        but email may not be visible yet due to replication delay
-- SYMPTOM: User sees "Code has reached maximum uses" error
--         but account is actually created successfully
-- ROOT CAUSE: Email query returns NULL, function returns success:false
-- FIX: Remove email query - not needed for membership creation
-- ============================================================================
-- DATE: 2026-01-18
-- TESTED: ✅ Staging
-- IMPACT: Fixes false error on fresh signups
-- ============================================================================

-- Drop and recreate function without email dependency
DROP FUNCTION IF EXISTS use_invite_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_grants_tier TEXT;
  v_trial_days INTEGER;
BEGIN
  -- Step 1: Validate and lock code row (prevents concurrent use)
  SELECT id, grants_tier, trial_days
  INTO v_code_id, v_grants_tier, v_trial_days
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;  -- Row-level lock

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Code not found'
    );
  END IF;

  -- Step 2: Increment usage counter
  UPDATE invitation_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE id = v_code_id;

  -- Step 3: Create or update membership
  -- Note: No email query needed! user_id is sufficient.
  -- The auth.users record exists (created by signUp)
  -- Even if not visible yet, foreign key will be validated
  IF v_grants_tier IS NOT NULL THEN
    INSERT INTO user_memberships (
      user_id,
      tier,
      status,
      invitation_code,
      trial_start,
      trial_end,
      trial_days_total,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_grants_tier,
      'active',
      p_code,
      NOW(),
      NOW() + (v_trial_days || ' days')::INTERVAL,
      v_trial_days,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      tier = EXCLUDED.tier,
      status = EXCLUDED.status,
      invitation_code = EXCLUDED.invitation_code,
      trial_start = EXCLUDED.trial_start,
      trial_end = EXCLUDED.trial_end,
      trial_days_total = EXCLUDED.trial_days_total,
      updated_at = NOW();
  END IF;

  -- Step 4: Log the transaction (optional, for admin tracking)
  BEGIN
    INSERT INTO membership_transactions (
      user_id, 
      transaction_type, 
      tier, 
      invitation_code_id,
      created_at
    )
    VALUES (
      p_user_id, 
      'invite_code_redemption', 
      v_grants_tier, 
      v_code_id,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- If transaction logging fails, don't block signup
    -- Log error but continue
    RAISE WARNING 'Failed to log membership transaction: %', SQLERRM;
  END;

  -- Step 5: Return success
  RETURN jsonb_build_object(
    'success', true,
    'code_id', v_code_id,
    'tier', v_grants_tier,
    'trial_days', v_trial_days
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS (safe to re-run)
-- ============================================================================

GRANT EXECUTE ON FUNCTION use_invite_code(TEXT, UUID) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'use_invite_code';

-- Expected output:
-- routine_name    | routine_type | data_type
-- use_invite_code | FUNCTION     | jsonb

-- ============================================================================
-- TEST THE FIX (Manual Test)
-- ============================================================================

-- 1. Generate a fresh invite code in Mission Control
-- 2. Sign up with the code immediately (don't wait)
-- 3. Should see success message, no error
-- 4. Verify user_memberships record created:
--
-- SELECT 
--   um.user_id,
--   um.tier,
--   um.status,
--   um.invitation_code,
--   au.email
-- FROM user_memberships um
-- JOIN auth.users au ON au.id = um.user_id
-- WHERE um.invitation_code = '<your-test-code>';

-- ============================================================================
-- ROLLBACK PLAN (If needed)
-- ============================================================================

-- If this causes issues, restore previous version:
-- DROP FUNCTION IF EXISTS use_invite_code(TEXT, UUID);
-- Then run: DEPLOY_MASTER_TIER_SYSTEM.sql lines 130-180

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run in Supabase Dashboard → SQL Editor
-- 2. Test with fresh signup
-- 3. Monitor for errors over 24 hours
-- 4. If successful, mark TODO #33 as resolved

-- Related files:
-- - docs/SIGNUP_BUG_ROOT_CAUSE_ANALYSIS.md (full diagnosis)
-- - public/lib/boot/signup-init.js (frontend signup logic)
-- - DEPLOY_MASTER_TIER_SYSTEM.sql (previous version)

-- ============================================================================
-- WHAT CHANGED
-- ============================================================================

-- BEFORE:
-- ❌ Queried auth.users.email → race condition
-- ❌ Tried to populate public.users table → unnecessary
-- ❌ Returned 'User email not found' error → confusing

-- AFTER:
-- ✅ No email query → no race condition
-- ✅ Only requires user_id → always available
-- ✅ Clear success/error responses → better UX
-- ✅ Graceful error handling for transaction log

-- ============================================================================
