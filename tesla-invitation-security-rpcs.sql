-- ========================================
-- 🚀 TESLA-GRADE INVITATION-ONLY SECURITY
-- Complete RPC Functions for Invitation System
-- ========================================

-- 1️⃣ VALIDATE INVITE CODE (without using it)
-- This allows real-time validation during signup form
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  code_row invitation_codes%ROWTYPE;
  invite_row invite_codes%ROWTYPE;
  result JSON;
BEGIN
  -- First check Tesla membership schema invitation_codes
  SELECT * INTO code_row
  FROM invitation_codes
  WHERE code = p_code 
    AND is_active = true 
    AND current_uses < max_uses
    AND (valid_until IS NULL OR valid_until > NOW());
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'valid', true,
      'code_type', code_row.code_type,
      'trial_days', code_row.trial_days,
      'grants_tier', code_row.grants_tier,
      'expires_at', code_row.valid_until,
      'uses_remaining', code_row.max_uses - code_row.current_uses
    );
  END IF;
  
  -- Check legacy invite_codes table
  SELECT * INTO invite_row
  FROM invite_codes
  WHERE code = p_code 
    AND is_active = true 
    AND current_uses < max_uses
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'valid', true,
      'code_type', invite_row.code_type,
      'expires_at', invite_row.expires_at,
      'uses_remaining', invite_row.max_uses - invite_row.current_uses
    );
  END IF;
  
  -- Invalid code
  RETURN jsonb_build_object(
    'valid', false,
    'error', 'Invalid, expired, or fully used invitation code'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ CHECK MEMBERSHIP ACCESS (for signin authentication)
-- This validates existing users have active membership before signin
CREATE OR REPLACE FUNCTION check_membership_access(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_uuid UUID;
  membership_row user_memberships%ROWTYPE;
  profile_row shared_profiles%ROWTYPE;
  result JSON;
BEGIN
  -- Get user UUID from email (Supabase auth.users)
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = p_email;
  
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'No account found with this email',
      'action_required', 'signup'
    );
  END IF;
  
  -- Check membership status
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    -- Check legacy profile for invite code usage
    SELECT * INTO profile_row
    FROM shared_profiles
    WHERE id = user_uuid;
    
    IF profile_row.invite_code_used IS NOT NULL THEN
      -- Legacy user - grant access but needs membership upgrade
      RETURN jsonb_build_object(
        'access_granted', true,
        'membership_status', 'legacy',
        'user_id', user_uuid,
        'upgrade_required', true
      );
    ELSE
      RETURN jsonb_build_object(
        'access_granted', false,
        'error', 'No valid membership found',
        'action_required', 'signup'
      );
    END IF;
  END IF;
  
  -- Check if membership is active and not expired
  IF membership_row.status = 'active' THEN
    -- Check trial expiration
    IF membership_row.trial_end IS NOT NULL AND membership_row.trial_end < NOW() THEN
      -- Check if they have paid subscription
      IF membership_row.subscription_status IN ('active', 'trialing') THEN
        RETURN jsonb_build_object(
          'access_granted', true,
          'membership_status', 'subscribed',
          'user_id', user_uuid,
          'tier', membership_row.tier
        );
      ELSE
        RETURN jsonb_build_object(
          'access_granted', false,
          'error', 'Trial period has ended',
          'action_required', 'upgrade',
          'trial_ended_at', membership_row.trial_end
        );
      END IF;
    ELSE
      -- Active membership within trial period
      RETURN jsonb_build_object(
        'access_granted', true,
        'membership_status', 'active',
        'user_id', user_uuid,
        'tier', membership_row.tier,
        'trial_ends_at', membership_row.trial_end
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'Membership is ' || membership_row.status,
      'action_required', 'contact_admin'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ GET MY MEMBERSHIP (for session validation)
-- Enhanced version with trial expiration checking
CREATE OR REPLACE FUNCTION get_my_membership()
RETURNS JSON AS $$
DECLARE
  membership_row user_memberships%ROWTYPE;
  profile_row shared_profiles%ROWTYPE;
  result JSON;
BEGIN
  -- Get current user's membership
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    -- Check legacy profile
    SELECT * INTO profile_row
    FROM shared_profiles
    WHERE id = auth.uid();
    
    IF profile_row.invite_code_used IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status', 'legacy',
        'tier', 'standard',
        'upgrade_available', true,
        'features_enabled', array['basic_hi', 'location_sharing']
      );
    ELSE
      RETURN jsonb_build_object(
        'status', 'no_membership',
        'signup_required', true
      );
    END IF;
  END IF;
  
  -- Check if trial is expired
  IF membership_row.trial_end IS NOT NULL AND membership_row.trial_end < NOW() THEN
    IF membership_row.subscription_status NOT IN ('active', 'trialing') THEN
      -- Trial expired, no active subscription
      RETURN jsonb_build_object(
        'status', 'expired',
        'tier', membership_row.tier,
        'trial_ended_at', membership_row.trial_end,
        'upgrade_required', true,
        'access_revoked', true
      );
    END IF;
  END IF;
  
  -- Return active membership
  result := jsonb_build_object(
    'id', membership_row.id,
    'status', membership_row.status,
    'tier', membership_row.tier,
    'trial_start', membership_row.trial_start,
    'trial_end', membership_row.trial_end,
    'subscription_status', membership_row.subscription_status,
    'features_enabled', membership_row.features_enabled,
    'invitation_code', membership_row.invitation_code,
    'created_at', membership_row.created_at,
    'updated_at', membership_row.updated_at
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4️⃣ GENERATE INVITE CODE (for admin dashboard)
-- Creates time-based invitation codes with various durations
CREATE OR REPLACE FUNCTION generate_invite_code(
  p_code_type TEXT,
  p_trial_days INTEGER,
  p_grants_tier TEXT DEFAULT 'standard',
  p_max_uses INTEGER DEFAULT 1,
  p_features TEXT[] DEFAULT ARRAY['basic_hi', 'location_sharing']
)
RETURNS JSON AS $$
DECLARE
  new_code TEXT;
  new_id UUID;
  result JSON;
BEGIN
  -- Generate unique 8-character code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END LOOP;
  
  -- Insert into invitation_codes table
  INSERT INTO invitation_codes (
    code, code_type, trial_days, grants_tier, max_uses, 
    features_granted, valid_until, created_by
  ) VALUES (
    new_code, p_code_type, p_trial_days, p_grants_tier, p_max_uses,
    p_features, NOW() + INTERVAL '30 days', auth.uid()
  ) RETURNING id INTO new_id;
  
  result := jsonb_build_object(
    'success', true,
    'code', new_code,
    'code_id', new_id,
    'code_type', p_code_type,
    'trial_days', p_trial_days,
    'grants_tier', p_grants_tier,
    'max_uses', p_max_uses,
    'expires_at', NOW() + INTERVAL '30 days',
    'features_granted', p_features
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5️⃣ LIST INVITE CODES (for admin management)
-- Shows all codes with usage statistics
CREATE OR REPLACE FUNCTION list_invite_codes(p_include_expired BOOLEAN DEFAULT false)
RETURNS JSON AS $$
DECLARE
  codes_array JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'code', code,
      'code_type', code_type,
      'trial_days', trial_days,
      'grants_tier', grants_tier,
      'max_uses', max_uses,
      'current_uses', current_uses,
      'is_active', is_active,
      'valid_until', valid_until,
      'created_at', created_at,
      'last_used_at', last_used_at,
      'features_granted', features_granted,
      'uses_remaining', max_uses - current_uses
    )
  ) INTO codes_array
  FROM invitation_codes
  WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW()))
  ORDER BY created_at DESC;
  
  RETURN jsonb_build_object(
    'codes', COALESCE(codes_array, '[]'::json),
    'total_count', (SELECT count(*) FROM invitation_codes WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW())))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_membership_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code(TEXT, INTEGER, TEXT, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION list_invite_codes(BOOLEAN) TO authenticated;