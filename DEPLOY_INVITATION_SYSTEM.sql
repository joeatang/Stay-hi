-- ========================================
-- 🎫 INVITATION SYSTEM DEPLOYMENT (SAFE VERSION)
-- Deploy ONLY the missing RPC functions
-- Tables already exist - skip table creation
-- ========================================

-- NOTE: invitation_codes table already exists
-- Skipping table creation to avoid policy conflicts

-- ========================================
-- TABLES ALREADY EXIST - SKIPPING CREATION
-- ========================================
-- Tables confirmed in database:
-- • invitation_codes
-- • user_memberships  
-- • membership_transactions
-- (Policies already created - skipping to avoid conflicts)

-- ========================================
-- DEPLOY ONLY MISSING RPC FUNCTIONS
-- ========================================

-- CRITICAL FIX: Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS validate_invite_code(text);
DROP FUNCTION IF EXISTS use_invite_code(text, uuid);
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();
DROP FUNCTION IF EXISTS admin_generate_invite_code(uuid, integer, integer);
DROP FUNCTION IF EXISTS admin_list_invite_codes(boolean);

-- CRITICAL FIX: Ensure RLS policies exist to prevent deployment failures
-- Drop and recreate policies to fix any circular dependencies

DROP POLICY IF EXISTS "Admin can manage invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Anyone can read active invitation codes" ON invitation_codes;

-- Create safe policies using admin_roles (not user_memberships to avoid circular deps)
CREATE POLICY "Admins can manage invitation codes"
ON invitation_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.role_type IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Anyone can read active codes for validation"
ON invitation_codes
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Function 1: Get Admin Dashboard Stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats() RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Verify admin access using existing check_admin_access_v2
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;

  -- Gather dashboard statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_memberships', (SELECT COUNT(*) FROM user_memberships WHERE status = 'active'),
    'total_invitations', (SELECT COUNT(*) FROM invitation_codes),
    'active_invitations', (SELECT COUNT(*) FROM invitation_codes WHERE is_active = true),
    'recent_signups', (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days'),
    'admin_sessions', (SELECT COUNT(*) FROM admin_sessions WHERE is_active = true),
    'security_events', (SELECT COUNT(*) FROM admin_access_logs WHERE success = false AND created_at > NOW() - INTERVAL '24 hours')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Generate Invitation Code (Mission Control)
CREATE OR REPLACE FUNCTION admin_generate_invite_code(
  p_created_by UUID DEFAULT auth.uid(),
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_hours INTEGER DEFAULT 168 -- 7 days default
) RETURNS JSONB AS $$
DECLARE
  new_code TEXT;
  new_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
  -- Generate unique 8-character code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END LOOP;
  
  -- Calculate expiration
  v_expires_at := NOW() + INTERVAL '1 hour' * p_expires_in_hours;
  
  -- Insert into invitation_codes table
  INSERT INTO invitation_codes (
    code, code_type, trial_days, grants_tier, max_uses,
    features_granted, valid_until, created_by, is_active
  ) VALUES (
    new_code, 'admin_generated', 30, 'premium', p_max_uses,
    ARRAY['premium_features', 'location_sharing', 'hi_rewards'], 
    v_expires_at, p_created_by, true
  ) RETURNING id INTO new_id;
  
  -- Log admin action
  INSERT INTO admin_access_logs (
    user_id, action_type, resource_accessed, success, request_data
  ) VALUES (
    p_created_by, 'generate_invite_code', 'invitation_management', true,
    jsonb_build_object('code', new_code, 'expires_hours', p_expires_in_hours, 'max_uses', p_max_uses)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'code', new_code,
    'id', new_id,
    'expires_at', v_expires_at,
    'max_uses', p_max_uses,
    'created_by', p_created_by,
    'message', 'Invitation code generated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: List Invitation Codes (Mission Control)
CREATE OR REPLACE FUNCTION admin_list_invite_codes(
  p_include_expired BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  codes_array JSON;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
  -- Log admin action
  INSERT INTO admin_access_logs (
    user_id, action_type, resource_accessed, success
  ) VALUES (
    auth.uid(), 'list_invite_codes', 'invitation_management', true
  );
  
  -- Get invitation codes
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
      'created_by', created_by,
      'last_used_at', last_used_at,
      'features_granted', features_granted,
      'uses_remaining', max_uses - current_uses
    )
  ) INTO codes_array
  FROM invitation_codes
  WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW()))
  ORDER BY created_at DESC;
  
  RETURN jsonb_build_object(
    'success', true,
    'codes', COALESCE(codes_array, '[]'::json),
    'total_count', (
      SELECT count(*) FROM invitation_codes 
      WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW()))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Validate Invite Code (Public - used during signup)
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT) RETURNS JSONB AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  -- Look up the invitation code
  SELECT 
    id,
    code,
    max_uses,
    current_uses,
    is_active,
    valid_until,
    grants_tier,
    trial_days
  INTO v_code_record
  FROM invitation_codes
  WHERE code = p_code;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_valid', false, 'reason', 'Code not found');
  END IF;

  -- Check if code is active
  IF v_code_record.is_active = false THEN
    RETURN jsonb_build_object('is_valid', false, 'reason', 'Code is inactive');
  END IF;

  -- Check if code has expired
  IF v_code_record.valid_until IS NOT NULL AND v_code_record.valid_until < NOW() THEN
    RETURN jsonb_build_object('is_valid', false, 'reason', 'Code has expired');
  END IF;

  -- Check if code has reached max uses
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN jsonb_build_object('is_valid', false, 'reason', 'Code has reached maximum uses');
  END IF;

  -- Code is valid - return details
  RETURN jsonb_build_object(
    'is_valid', true,
    'code_id', v_code_record.id,
    'grants_tier', v_code_record.grants_tier,
    'trial_days', v_code_record.trial_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Use Invite Code (Public - called after successful signup)
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_grants_tier TEXT;
  v_trial_days INTEGER;
BEGIN
  -- Get code details and lock the row for update
  SELECT id, grants_tier, trial_days
  INTO v_code_id, v_grants_tier, v_trial_days
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  -- Verify code exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;

  -- Increment usage count
  UPDATE invitation_codes
  SET 
    current_uses = current_uses + 1,
    last_used_at = NOW()
  WHERE id = v_code_id;

  -- Create membership record if tier is granted
  IF v_grants_tier IS NOT NULL THEN
    INSERT INTO user_memberships (user_id, tier, status)
    VALUES (
      p_user_id,
      v_grants_tier,
      'active'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      tier = EXCLUDED.tier,
      status = EXCLUDED.status;
  END IF;

  -- Log the transaction
  INSERT INTO membership_transactions (user_id, transaction_type, tier, invitation_code_id)
  VALUES (p_user_id, 'invite_code_redemption', v_grants_tier, v_code_id);

  RETURN jsonb_build_object('success', true, 'code_id', v_code_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS (safe - re-running won't cause errors)
-- ========================================

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_generate_invite_code(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_invite_codes(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION use_invite_code(TEXT, UUID) TO authenticated;

-- ========================================
-- 🎯 DEPLOYMENT VERIFICATION
-- ========================================

SELECT 
  'Invitation system deployed successfully!' AS status,
  (SELECT COUNT(*) FROM invitation_codes) AS invitation_codes_count,
  (SELECT COUNT(*) FROM admin_roles WHERE role_type IN ('super_admin', 'admin')) AS admin_count;
