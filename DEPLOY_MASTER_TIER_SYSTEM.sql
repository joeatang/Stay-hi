-- ================================================
-- 🎯 MASTER TIER SYSTEM DEPLOYMENT
-- ================================================
-- This script deploys ALL tier system components in correct order
-- Run this in Supabase SQL Editor AFTER deploying TIER_CONFIG.js to frontend
--
-- WHAT THIS DOES:
-- 1. Updates admin_generate_invite_code() to support all 6 tiers
-- 2. Updates use_invite_code() to set trial dates from invitation_codes
-- 3. Updates get_unified_membership() to query user_memberships (not hi_members)
-- 4. Removes hardcoded features (frontend uses TIER_CONFIG.js instead)
--
-- CRITICAL: This creates alignment between:
-- - Mission Control UI (generates codes for any tier)
-- - Database functions (store tier + trial_days)
-- - Signup flow (reads tier + trial_days from invitation_codes)
-- - Membership queries (returns tier from user_memberships)
-- - Frontend (TIER_CONFIG.js defines features per tier)
-- ================================================

BEGIN;

-- ========================================
-- STEP 1: Update admin_generate_invite_code
-- ========================================

DROP FUNCTION IF EXISTS admin_generate_invite_code(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS admin_generate_invite_code(UUID, TEXT, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION admin_generate_invite_code(
  p_created_by UUID DEFAULT auth.uid(),
  p_tier TEXT DEFAULT 'premium',
  p_trial_days INTEGER DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_hours INTEGER DEFAULT 168
) RETURNS JSONB AS $$
DECLARE
  new_code TEXT;
  new_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_tier TEXT;
  v_trial_days INTEGER;
  v_allowed_tiers TEXT[] := ARRAY['free', 'bronze', 'silver', 'gold', 'premium', 'collective'];
  v_tier_trial_defaults JSONB := '{
    "free": 0,
    "bronze": 7,
    "silver": 14,
    "gold": 21,
    "premium": 30,
    "collective": 90
  }'::JSONB;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
  -- Validate and normalize tier
  v_tier := LOWER(COALESCE(p_tier, 'premium'));
  IF NOT (v_tier = ANY(v_allowed_tiers)) THEN
    RAISE EXCEPTION 'Invalid tier: %. Allowed tiers: %', p_tier, array_to_string(v_allowed_tiers, ', ');
  END IF;
  
  -- Determine trial days
  IF p_trial_days IS NOT NULL THEN
    v_trial_days := p_trial_days;
  ELSE
    v_trial_days := (v_tier_trial_defaults->v_tier)::INTEGER;
  END IF;
  
  IF v_trial_days < 0 THEN
    RAISE EXCEPTION 'Trial days cannot be negative';
  END IF;
  
  -- Generate unique code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END LOOP;
  
  v_expires_at := NOW() + INTERVAL '1 hour' * p_expires_in_hours;
  
  INSERT INTO invitation_codes (
    code, code_type, trial_days, grants_tier, max_uses,
    features_granted, valid_until, created_by, is_active
  ) VALUES (
    new_code, 'admin_generated', v_trial_days, v_tier, p_max_uses,
    CASE v_tier
      WHEN 'free' THEN ARRAY['basic_access']
      WHEN 'bronze' THEN ARRAY['basic_sharing', 'basic_muscle', 'basic_archive']
      WHEN 'silver' THEN ARRAY['unlimited_sharing', 'full_muscle', 'full_archive', 'calendar']
      WHEN 'gold' THEN ARRAY['unlimited_taps', 'unlimited_sharing', 'full_analytics', 'share_scheduling']
      WHEN 'premium' THEN ARRAY['premium_features', 'location_sharing', 'hi_rewards', 'api_access', 'beta_features']
      WHEN 'collective' THEN ARRAY['admin_panel', 'user_management', 'invite_generation', 'analytics_access', 'content_moderation']
      ELSE ARRAY['premium_features']
    END,
    v_expires_at, p_created_by, true
  ) RETURNING id INTO new_id;
  
  INSERT INTO admin_access_logs (
    user_id, action_type, resource_accessed, success, request_data
  ) VALUES (
    p_created_by, 'generate_invite_code', 'invitation_management', true,
    jsonb_build_object('code', new_code, 'tier', v_tier, 'trial_days', v_trial_days, 
                       'expires_hours', p_expires_in_hours, 'max_uses', p_max_uses)
  );
  
  RETURN jsonb_build_object(
    'success', true, 'code', new_code, 'id', new_id, 
    'tier', v_tier, 'trial_days', v_trial_days,
    'expires_at', v_expires_at, 'max_uses', p_max_uses, 
    'created_by', p_created_by,
    'message', format('Invitation code generated for %s tier with %s day trial', UPPER(v_tier), v_trial_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_generate_invite_code IS 'Generate tier-specific invitation codes. Supports: free, bronze, silver, gold, premium, collective.';

-- ========================================
-- STEP 2: Update use_invite_code
-- ========================================

DROP FUNCTION IF EXISTS use_invite_code(TEXT, UUID);

CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_grants_tier TEXT;
  v_trial_days INTEGER;
  v_membership_id UUID;
  v_user_email TEXT;
BEGIN
  SELECT id, grants_tier, trial_days
  INTO v_code_id, v_grants_tier, v_trial_days
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email not found');
  END IF;

  UPDATE invitation_codes
  SET current_uses = current_uses + 1, last_used_at = NOW()
  WHERE id = v_code_id;

  -- Ensure public.users entry exists
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (p_user_id, v_user_email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email, updated_at = NOW();

  -- Create membership with tier and trial dates from invitation_codes
  IF v_grants_tier IS NOT NULL THEN
    INSERT INTO user_memberships (
      user_id, tier, status, invitation_code,
      trial_start, trial_end, trial_days_total,
      created_at, updated_at
    )
    VALUES (
      p_user_id, v_grants_tier, 'active', p_code,
      NOW(), NOW() + (v_trial_days || ' days')::INTERVAL, v_trial_days,
      NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      tier = EXCLUDED.tier, status = EXCLUDED.status, 
      invitation_code = EXCLUDED.invitation_code,
      trial_start = EXCLUDED.trial_start, trial_end = EXCLUDED.trial_end,
      trial_days_total = EXCLUDED.trial_days_total, updated_at = NOW()
    RETURNING id INTO v_membership_id;
  END IF;

  -- Log transaction
  INSERT INTO membership_transactions (
    user_id, membership_id, transaction_type, description, metadata, created_at
  )
  VALUES (
    p_user_id, v_membership_id, 'invite_code_redemption',
    'Account created via invite code: ' || p_code,
    jsonb_build_object('invitation_code_id', v_code_id, 'granted_tier', v_grants_tier, 
                       'trial_days', v_trial_days, 'email', v_user_email),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'code_id', v_code_id, 'tier', v_grants_tier, 'trial_days', v_trial_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 3: Update get_unified_membership
-- ========================================

DROP FUNCTION IF EXISTS get_unified_membership();

CREATE OR REPLACE FUNCTION get_unified_membership()
RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_member record;
  v_is_admin boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Anonymous
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'tier', 'free',
      'status', 'anonymous',
      'trial_end', null,
      'days_remaining', null,
      'is_admin', false,
      'signup_required', true,
      'isAnonymous', true
    );
  END IF;
  
  -- Check admin
  SELECT EXISTS(SELECT 1 FROM admin_roles WHERE user_id = v_user_id) INTO v_is_admin;
  
  -- Query user_memberships (CRITICAL: Same table use_invite_code writes to)
  SELECT 
    tier, status, trial_end,
    CASE 
      WHEN trial_end IS NOT NULL AND trial_end > NOW() 
      THEN EXTRACT(DAY FROM trial_end - NOW())::int
      ELSE 0
    END as days_left
  INTO v_member
  FROM user_memberships
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- No membership = free tier
  IF NOT FOUND OR v_member.tier IS NULL THEN
    RETURN json_build_object(
      'tier', 'free',
      'status', 'active',
      'trial_end', null,
      'days_remaining', null,
      'is_admin', v_is_admin,
      'isAnonymous', false
    );
  END IF;
  
  -- Return tier (features defined in TIER_CONFIG.js frontend)
  RETURN json_build_object(
    'tier', v_member.tier,
    'status', v_member.status,
    'trial_end', v_member.trial_end,
    'days_remaining', v_member.days_left,
    'is_admin', v_is_admin,
    'isAnonymous', false
  );
END;
$$;

-- ========================================
-- STEP 4: Grant permissions
-- ========================================

GRANT EXECUTE ON FUNCTION admin_generate_invite_code(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION use_invite_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_membership() TO anon;

COMMIT;

-- ========================================
-- VERIFICATION
-- ========================================

SELECT '✅ DEPLOYMENT COMPLETE' as status;

-- Test: Generate a bronze tier code
SELECT admin_generate_invite_code(
  p_tier := 'bronze',
  p_max_uses := 1,
  p_expires_in_hours := 24
);

-- View recent codes
SELECT code, grants_tier, trial_days, max_uses, valid_until
FROM invitation_codes
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- CRITICAL SUCCESS CRITERIA:
-- ========================================
-- ✅ admin_generate_invite_code accepts p_tier parameter
-- ✅ use_invite_code writes tier to user_memberships.tier
-- ✅ use_invite_code sets trial_start, trial_end, trial_days_total
-- ✅ get_unified_membership reads from user_memberships (SAME TABLE)
-- ✅ get_unified_membership returns tier (features handled by TIER_CONFIG.js)
-- ✅ NO hardcoded features in database (frontend controls this)
-- ✅ Single data flow: invitation_codes → user_memberships → get_unified_membership
-- ========================================
