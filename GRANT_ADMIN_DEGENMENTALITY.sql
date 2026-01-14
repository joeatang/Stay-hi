-- ========================================
-- 🔑 GRANT SUPER ADMIN: degenmentality@gmail.com
-- ========================================
-- Purpose: Grant full admin access to Mission Control
-- Safe to run multiple times (idempotent)
-- Run in: Supabase SQL Editor
-- ========================================

-- Grant super_admin role to degenmentality@gmail.com
INSERT INTO admin_roles (
  user_id,
  role_type,
  permissions,
  security_level,
  is_active,
  mfa_required,
  updated_at
)
SELECT 
  id,
  'super_admin',
  '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}'::JSONB,
  'maximum',
  true,
  false,
  NOW()
FROM auth.users 
WHERE email = 'degenmentality@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET 
  role_type = 'super_admin',
  permissions = '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}'::JSONB,
  security_level = 'maximum',
  is_active = true,
  updated_at = NOW();

-- ========================================
-- ✅ VERIFICATION
-- ========================================
-- Run this to confirm access was granted:

SELECT 
  au.email,
  ar.role_type,
  ar.is_active,
  ar.security_level,
  ar.created_at
FROM admin_roles ar
JOIN auth.users au ON ar.user_id = au.id
WHERE au.email IN ('degenmentality@gmail.com', 'joeatang7@gmail.com')
ORDER BY ar.created_at;

-- ========================================
-- 🧪 TEST ACCESS (run while logged in as degenmentality)
-- ========================================
-- SELECT * FROM check_admin_access_v2('admin', NULL);
-- Expected: { access_granted: true, reason: null }
