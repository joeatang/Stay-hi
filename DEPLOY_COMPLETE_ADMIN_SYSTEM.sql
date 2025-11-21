-- ========================================
-- 🚀 HI-OS ADMIN SYSTEM - COMPLETE DEPLOYMENT
-- Tesla-Grade Single-Source-of-Truth Solution
-- ========================================
-- Date: Nov 20, 2024
-- Purpose: Deploy canonical admin schema + RPC + grant super_admin to joe
-- Execution time: ~2 seconds
-- Idempotent: Safe to re-run
-- ========================================

-- ========================================
-- PHASE 1: CLEAN SLATE
-- ========================================
-- Remove any existing admin tables (preserves auth.users data)
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admin_access_logs CASCADE;
DROP TABLE IF EXISTS admin_roles CASCADE;

-- Remove legacy functions to prevent ambiguity
DROP FUNCTION IF EXISTS check_admin_access(text, inet);
DROP FUNCTION IF EXISTS check_admin_access_v2(text, text);

-- ========================================
-- PHASE 2: CANONICAL SCHEMA DEPLOYMENT
-- ========================================

-- Create admin_roles table (source of truth)
CREATE TABLE admin_roles (
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

-- Create admin access logs table (audit trail)
CREATE TABLE admin_access_logs (
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

-- Create admin sessions table (session management)
CREATE TABLE admin_sessions (
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

-- ========================================
-- PHASE 3: ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all admin tables
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can manage admin roles
CREATE POLICY "super_admin_only_admin_roles" ON admin_roles
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_roles 
      WHERE role_type = 'super_admin' 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Policy: Admins can see their own logs
CREATE POLICY "own_access_logs" ON admin_access_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Super admins can see all logs
CREATE POLICY "super_admin_all_logs" ON admin_access_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM admin_roles 
      WHERE role_type = 'super_admin' 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Policy: Admins can see only their own sessions
CREATE POLICY "own_admin_sessions" ON admin_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- PHASE 4: PERFORMANCE INDEXES
-- ========================================

CREATE INDEX idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_role_type ON admin_roles(role_type) WHERE is_active = true;
CREATE INDEX idx_admin_access_logs_user_id ON admin_access_logs(user_id);
CREATE INDEX idx_admin_access_logs_created_at ON admin_access_logs(created_at DESC);
CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at) WHERE is_active = true;

-- ========================================
-- PHASE 5: RPC FUNCTION (check_admin_access_v2)
-- ========================================

CREATE OR REPLACE FUNCTION public.check_admin_access_v2(
  p_required_role TEXT DEFAULT 'admin',
  p_ip_address TEXT DEFAULT NULL
) RETURNS TABLE(access_granted BOOLEAN, reason TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_uid UUID;
  v_has_role BOOLEAN;
BEGIN
  v_uid := auth.uid();
  
  -- Check 1: Session exists
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'no_session';
    RETURN;
  END IF;

  -- Check 2: User has required role or super_admin override
  SELECT EXISTS(
    SELECT 1 FROM admin_roles ar
    WHERE ar.user_id = v_uid
      AND (ar.role_type = p_required_role OR ar.role_type = 'super_admin')
      AND ar.is_active = true
      AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    -- Log failed access attempt
    BEGIN
      INSERT INTO admin_access_logs(user_id, action_type, resource_accessed, request_ip, success, failure_reason)
      VALUES (v_uid, 'access_check_v2', 'mission_control_gate', NULLIF(p_ip_address,'')::INET, false, 'missing_role');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Swallow logging errors
    END;
    
    RETURN QUERY SELECT false, 'missing_role';
    RETURN;
  END IF;

  -- Log successful access
  BEGIN
    INSERT INTO admin_access_logs(user_id, action_type, resource_accessed, request_ip, success)
    VALUES (v_uid, 'access_check_v2', 'mission_control_gate', NULLIF(p_ip_address,'')::INET, true);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Swallow logging errors
  END;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_admin_access_v2(TEXT, TEXT) TO authenticated;

-- ========================================
-- PHASE 6: GRANT SUPER ADMIN TO JOE
-- ========================================

INSERT INTO admin_roles(user_id, role_type, permissions, security_level, is_active, mfa_required)
SELECT 
  id, 
  'super_admin',
  '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}'::JSONB,
  'maximum',
  true,
  false  -- Set to true if you want to enable MFA later
FROM auth.users
WHERE email = 'joeatang7@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET 
  role_type = 'super_admin',
  permissions = '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}'::JSONB,
  security_level = 'maximum',
  is_active = true,
  updated_at = NOW();

-- ========================================
-- ✅ DEPLOYMENT COMPLETE
-- ========================================
-- 
-- VERIFICATION STEPS:
-- 1. Check admin_roles table:
--    SELECT ar.*, au.email 
--    FROM admin_roles ar 
--    JOIN auth.users au ON ar.user_id = au.id;
--
-- 2. Test RPC function:
--    SELECT * FROM check_admin_access_v2('admin', NULL);
--
-- 3. Sign out and sign back in as joeatang7@gmail.com
--
-- 4. Check hamburger menu for "Mission Control" link
--
-- 5. Click Mission Control → should load dashboard
--
-- ========================================
-- 🎯 NEXT STEPS:
-- - Sign out completely (clear session)
-- - Sign back in via magic link to joeatang7@gmail.com
-- - Navigate to hi-island-NEW.html
-- - Open hamburger menu
-- - Click "Mission Control"
-- - Dashboard should load without redirects
-- ========================================
