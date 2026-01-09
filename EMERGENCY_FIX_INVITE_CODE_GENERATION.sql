-- ========================================
-- 🚨 EMERGENCY FIX: Mission Control Code Generation
-- Date: January 7, 2026
-- Purpose: Fix admin_generate_invite_code AbortError
-- ========================================

-- ISSUE: Function checks admin_roles table which might not exist
-- or user doesn't have admin role set properly

-- ========================================
-- OPTION 1: TEMPORARY FIX (Use email check)
-- ========================================

-- Replace admin_generate_invite_code with email-based admin check
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
  v_user_email TEXT;
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
  -- 🔥 EMERGENCY FIX: Check by email instead of admin_roles table
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Allow specific admin emails (CUSTOMIZE THIS LIST)
  IF v_user_email NOT IN ('joeatang7@gmail.com', 'atangj@me.com', 'admin@stay-hi.com') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Administrative access required. Contact support.',
      'user_email', v_user_email
    );
  END IF;
  
  -- Validate and normalize tier
  v_tier := LOWER(COALESCE(p_tier, 'premium'));
  IF NOT (v_tier = ANY(v_allowed_tiers)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Invalid tier: %s. Allowed: %s', p_tier, array_to_string(v_allowed_tiers, ', '))
    );
  END IF;
  
  -- Determine trial days
  IF p_trial_days IS NOT NULL THEN
    v_trial_days := p_trial_days;
  ELSE
    v_trial_days := (v_tier_trial_defaults->v_tier)::INTEGER;
  END IF;
  
  IF v_trial_days < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Trial days cannot be negative'
    );
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
  
  -- Try to log to admin_access_logs if table exists
  BEGIN
    INSERT INTO admin_access_logs (
      user_id, action_type, resource_accessed, success, request_data
    ) VALUES (
      p_created_by, 'generate_invite_code', 'invitation_management', true,
      jsonb_build_object('code', new_code, 'tier', v_tier, 'trial_days', v_trial_days, 
                         'expires_hours', p_expires_in_hours, 'max_uses', p_max_uses)
    );
  EXCEPTION WHEN undefined_table THEN
    -- Ignore if table doesn't exist
    NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true, 
    'code', new_code, 
    'id', new_id, 
    'tier', v_tier, 
    'trial_days', v_trial_days,
    'expires_at', v_expires_at, 
    'max_uses', p_max_uses, 
    'created_by', p_created_by,
    'message', format('Invitation code generated for %s tier with %s day trial', UPPER(v_tier), v_trial_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_generate_invite_code IS '✅ EMERGENCY FIX: Email-based admin check (bypasses admin_roles table)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_generate_invite_code(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ========================================
-- VERIFICATION
-- ========================================

-- Test the function (should work for joeatang7@gmail.com)
-- Run as joeatang7@gmail.com:
SELECT admin_generate_invite_code(
  p_tier := 'bronze',
  p_max_uses := 1,
  p_expires_in_hours := 168
);

-- Expected result:
-- { "success": true, "code": "ABC12345", "tier": "bronze", "trial_days": 7, ... }
