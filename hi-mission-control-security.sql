-- ========================================
-- 🏛️ ENTERPRISE ADMIN SECURITY SYSTEM
-- Fortune 500-Grade Admin Role Management
-- ========================================

-- CREATE ADMIN ROLES TABLE
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('super_admin', 'admin', 'moderator', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '{}',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  ip_whitelist TEXT[],
  security_level TEXT DEFAULT 'standard' CHECK (security_level IN ('standard', 'elevated', 'maximum')),
  mfa_required BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 60,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- CREATE ADMIN ACCESS LOGS TABLE
CREATE TABLE IF NOT EXISTS admin_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role_id UUID REFERENCES admin_roles(id),
  action_type TEXT NOT NULL,
  resource_accessed TEXT,
  request_ip INET,
  user_agent TEXT,
  session_id TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  request_data JSONB,
  response_data JSONB,
  security_flags TEXT[],
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE ADMIN SESSIONS TABLE  
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role_id UUID NOT NULL REFERENCES admin_roles(id),
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  mfa_verified BOOLEAN DEFAULT false,
  security_checks JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES FOR ADMIN TABLES
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage other admin roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_roles' AND policyname = 'super_admin_only_admin_roles'
  ) THEN
    CREATE POLICY "super_admin_only_admin_roles" ON admin_roles
      FOR ALL USING (
        auth.uid() IN (
          SELECT user_id FROM admin_roles 
          WHERE role_type = 'super_admin' 
          AND is_active = true 
          AND (expires_at IS NULL OR expires_at > NOW())
        )
      );
  END IF;
END$$;

-- Admins can only see their own access logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_access_logs' AND policyname = 'own_access_logs'
  ) THEN
    CREATE POLICY "own_access_logs" ON admin_access_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END$$;

-- Super admins can see all access logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_access_logs' AND policyname = 'super_admin_all_logs'
  ) THEN
    CREATE POLICY "super_admin_all_logs" ON admin_access_logs
      FOR SELECT USING (
        auth.uid() IN (
          SELECT user_id FROM admin_roles 
          WHERE role_type = 'super_admin' 
          AND is_active = true 
          AND (expires_at IS NULL OR expires_at > NOW())
        )
      );
  END IF;
END$$;

-- Only own sessions visible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_sessions' AND policyname = 'own_admin_sessions'
  ) THEN
    CREATE POLICY "own_admin_sessions" ON admin_sessions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END$$;

-- ========================================
-- 🛡️ ADMIN AUTHENTICATION FUNCTIONS
-- ========================================

-- Check if user has admin access
CREATE OR REPLACE FUNCTION check_admin_access(
  p_required_role TEXT DEFAULT 'admin',
  p_ip_address INET DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_admin_record admin_roles%ROWTYPE;
  v_session_valid BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'Authentication required',
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Get admin role
  SELECT * INTO v_admin_record
  FROM admin_roles
  WHERE user_id = v_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    -- Log unauthorized access attempt
    INSERT INTO admin_access_logs (
      user_id, action_type, resource_accessed, request_ip,
      success, failure_reason, security_flags
    ) VALUES (
      v_user_id, 'access_attempt', 'admin_dashboard', p_ip_address,
      false, 'No admin role found', ARRAY['unauthorized_access']
    );
    
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'Administrative privileges required',
      'error_code', 'INSUFFICIENT_PRIVILEGES'
    );
  END IF;
  
  -- Check role hierarchy
  IF p_required_role = 'super_admin' AND v_admin_record.role_type != 'super_admin' THEN
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'Super administrator privileges required',
      'error_code', 'INSUFFICIENT_ROLE'
    );
  END IF;
  
  -- IP whitelist check (if configured)
  IF v_admin_record.ip_whitelist IS NOT NULL 
     AND array_length(v_admin_record.ip_whitelist, 1) > 0 
     AND p_ip_address IS NOT NULL THEN
    
    IF NOT (p_ip_address::TEXT = ANY(v_admin_record.ip_whitelist)) THEN
      INSERT INTO admin_access_logs (
        user_id, admin_role_id, action_type, request_ip,
        success, failure_reason, security_flags, risk_score
      ) VALUES (
        v_user_id, v_admin_record.id, 'access_attempt', p_ip_address,
        false, 'IP not in whitelist', ARRAY['ip_restriction'], 8
      );
      
      RETURN jsonb_build_object(
        'access_granted', false,
        'error', 'Access restricted from this location',
        'error_code', 'IP_RESTRICTED'
      );
    END IF;
  END IF;
  
  -- Update access statistics
  UPDATE admin_roles 
  SET 
    last_accessed = NOW(),
    access_count = access_count + 1,
    updated_at = NOW()
  WHERE id = v_admin_record.id;
  
  -- Log successful access
  INSERT INTO admin_access_logs (
    user_id, admin_role_id, action_type, resource_accessed,
    request_ip, success
  ) VALUES (
    v_user_id, v_admin_record.id, 'dashboard_access', 'hi_mission_control',
    p_ip_address, true
  );
  
  v_result := jsonb_build_object(
    'access_granted', true,
    'role_type', v_admin_record.role_type,
    'permissions', v_admin_record.permissions,
    'security_level', v_admin_record.security_level,
    'mfa_required', v_admin_record.mfa_required,
    'session_timeout', v_admin_record.session_timeout_minutes,
    'user_id', v_user_id,
    'admin_role_id', v_admin_record.id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin session
CREATE OR REPLACE FUNCTION create_admin_session(
  p_ip_address INET,
  p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_admin_role admin_roles%ROWTYPE;
  v_session_token TEXT;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify admin access first
  SELECT * INTO v_admin_role
  FROM admin_roles
  WHERE user_id = v_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Generate secure session token
  v_session_token := encode(gen_random_bytes(32), 'base64');
  v_expires_at := NOW() + INTERVAL '1 hour' * v_admin_role.session_timeout_minutes / 60;
  
  -- Create session record
  INSERT INTO admin_sessions (
    user_id, admin_role_id, session_token, ip_address,
    user_agent, expires_at, mfa_verified
  ) VALUES (
    v_user_id, v_admin_role.id, v_session_token, p_ip_address,
    p_user_agent, v_expires_at, NOT v_admin_role.mfa_required
  ) RETURNING id INTO v_session_id;
  
  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'session_token', v_session_token,
    'expires_at', v_expires_at,
    'mfa_required', v_admin_role.mfa_required
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats() RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Verify admin access
  IF NOT (check_admin_access()->'access_granted')::BOOLEAN THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
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

-- ========================================
-- 🎫 INVITATION MANAGEMENT FUNCTIONS
-- ========================================

-- Generate invitation code (Hi Mission Control specific)
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
  IF NOT (check_admin_access()->'access_granted')::BOOLEAN THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
  -- Generate unique 8-character code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  
  -- Ensure uniqueness (check existing invitation_codes table)
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

-- List invitation codes (Hi Mission Control specific)
CREATE OR REPLACE FUNCTION admin_list_invite_codes(
  p_include_expired BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  codes_array JSON;
BEGIN
  -- Verify admin access
  IF NOT (check_admin_access()->'access_granted')::BOOLEAN THEN
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_admin_access(TEXT, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_session(INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_generate_invite_code(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_invite_codes(BOOLEAN) TO authenticated;

-- ========================================
-- 🎯 INITIAL SUPER ADMIN SETUP
-- Insert your email here to become the first super admin
-- ========================================

-- REPLACE 'your-email@example.com' WITH YOUR ACTUAL EMAIL
/*
INSERT INTO admin_roles (
  user_id,
  role_type,
  permissions,
  security_level,
  mfa_required
) 
SELECT 
  id,
  'super_admin',
  '{"all": true, "user_management": true, "system_admin": true}',
  'maximum',
  true
FROM auth.users 
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  role_type = 'super_admin',
  permissions = '{"all": true, "user_management": true, "system_admin": true}',
  security_level = 'maximum',
  is_active = true,
  updated_at = NOW();
*/

-- ========================================
-- 🔐 ADMIN PASSCODE UNLOCK (Optional Helper)
-- Provides a secure, auditable way to grant 'admin' role via a shared passcode.
-- - Store only a bcrypt hash server-side (pgcrypto required)
-- - Only super_admins can set/reset the passcode
-- - Any authenticated user with the correct passcode is granted 'admin'
-- ========================================

-- Ensure pgcrypto available for crypt/gen_salt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Config table stores a single active passcode hash (latest row used)
CREATE TABLE IF NOT EXISTS admin_passcode_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passcode_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE admin_passcode_config ENABLE ROW LEVEL SECURITY;
-- Only super_admins can read/write the config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_passcode_config' AND policyname = 'admin_passcode_super_read'
  ) THEN
    CREATE POLICY admin_passcode_super_read ON admin_passcode_config
      FOR SELECT USING (
        auth.uid() IN (
          SELECT user_id FROM admin_roles
          WHERE role_type='super_admin' AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_passcode_config' AND policyname = 'admin_passcode_super_write'
  ) THEN
    CREATE POLICY admin_passcode_super_write ON admin_passcode_config
      FOR ALL USING (
        auth.uid() IN (
          SELECT user_id FROM admin_roles
          WHERE role_type='super_admin' AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        )
      );
  END IF;
END$$;

-- Super admin API to set/reset the passcode
CREATE OR REPLACE FUNCTION set_admin_passcode(p_new_passcode TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
BEGIN
  -- Verify super_admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = v_uid AND role_type='super_admin' AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RAISE EXCEPTION 'Super admin privileges required';
  END IF;

  IF p_new_passcode IS NULL OR length(trim(p_new_passcode)) < 4 THEN
    RAISE EXCEPTION 'Passcode must be at least 4 characters';
  END IF;

  v_hash := crypt(p_new_passcode, gen_salt('bf', 12));

  -- Deactivate any previously active passcodes so only newest remains active
  UPDATE admin_passcode_config SET is_active = false WHERE is_active = true;

  INSERT INTO admin_passcode_config(passcode_hash, is_active, created_by, notes)
  VALUES (v_hash, true, v_uid, p_notes);

  RETURN jsonb_build_object('success', true, 'message', 'Admin passcode updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Authenticated API to unlock admin via passcode
CREATE OR REPLACE FUNCTION admin_unlock_with_passcode(p_passcode TEXT)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_match BOOLEAN := false;
  v_admin_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  -- Get latest active hash
  SELECT passcode_hash INTO v_hash
  FROM admin_passcode_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Passcode not configured');
  END IF;

  v_match := crypt(p_passcode, v_hash) = v_hash;
  IF NOT v_match THEN
    -- Log failed attempt
    INSERT INTO admin_access_logs(user_id, action_type, success, failure_reason, security_flags)
    VALUES (v_uid, 'unlock_with_passcode', false, 'Invalid passcode', ARRAY['passcode_invalid']);
    RETURN jsonb_build_object('success', false, 'message', 'Invalid passcode');
  END IF;

  -- Upsert admin role for this user
  INSERT INTO admin_roles(user_id, role_type, permissions, is_active, security_level, mfa_required)
  VALUES (v_uid, 'admin', '{"basic": true}', true, 'standard', false)
  ON CONFLICT (user_id) DO UPDATE SET
    role_type = excluded.role_type,
    is_active = true,
    updated_at = NOW();

  -- Log success
  INSERT INTO admin_access_logs(user_id, action_type, success, resource_accessed)
  VALUES (v_uid, 'unlock_with_passcode', true, 'admin_role_granted');

  RETURN jsonb_build_object('success', true, 'message', 'Admin access granted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_admin_passcode(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unlock_with_passcode(TEXT) TO authenticated;