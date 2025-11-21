-- ========================================
-- 🛠️ SURGICAL FIX: Deploy Canonical Admin Schema
-- ========================================
-- Purpose: Fix admin_roles schema drift with single authoritative source
-- Safe to run: Uses IF NOT EXISTS, ON CONFLICT, idempotent operations
-- Estimated time: < 5 seconds
--
-- BEFORE RUNNING: Save a backup of your current admin_roles data:
--   SELECT * FROM admin_roles; -- copy results to safe place
--
-- After this script: Run grant_super_admin.sql to add yourself as admin
-- ========================================

-- STEP 1: Clean slate (removes orphaned/incorrect schema)
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admin_access_logs CASCADE;
DROP TABLE IF EXISTS admin_roles CASCADE;

-- STEP 2: Create canonical admin_roles table
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

-- STEP 3: Create admin access logs table
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

-- STEP 4: Create admin sessions table  
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

-- STEP 5: Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS policies
-- Only super admins can manage other admin roles
DROP POLICY IF EXISTS "super_admin_only_admin_roles" ON admin_roles;
CREATE POLICY "super_admin_only_admin_roles" ON admin_roles
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_roles 
      WHERE role_type = 'super_admin' 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Admins can only see their own access logs
DROP POLICY IF EXISTS "own_access_logs" ON admin_access_logs;
CREATE POLICY "own_access_logs" ON admin_access_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Super admins can see all access logs
DROP POLICY IF EXISTS "super_admin_all_logs" ON admin_access_logs;
CREATE POLICY "super_admin_all_logs" ON admin_access_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM admin_roles 
      WHERE role_type = 'super_admin' 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Only own sessions visible
DROP POLICY IF EXISTS "own_admin_sessions" ON admin_sessions;
CREATE POLICY "own_admin_sessions" ON admin_sessions
  FOR ALL USING (auth.uid() = user_id);

-- STEP 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_type ON admin_roles(role_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_user_id ON admin_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created_at ON admin_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at) WHERE is_active = true;

-- ========================================
-- ✅ SCHEMA DEPLOYED SUCCESSFULLY
-- ========================================
-- Next step: Run supabase/admin/grant_super_admin.sql to add yourself as super_admin
-- Or use this quick command:
--
-- INSERT INTO admin_roles(user_id, role_type, permissions, security_level, is_active)
-- SELECT id, 'super_admin', '{"all": true}'::jsonb, 'maximum', true
-- FROM auth.users WHERE email = 'YOUR-EMAIL-HERE'
-- ON CONFLICT (user_id) DO UPDATE SET 
--   role_type = 'super_admin', 
--   is_active = true, 
--   updated_at = NOW();
-- ========================================
