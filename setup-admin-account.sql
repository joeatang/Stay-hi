-- ========================================
-- 🎯 SETUP YOUR ADMIN ACCOUNT
-- Replace the email below with YOUR actual email
-- ========================================

-- STEP 1: Run the security schema first (hi-mission-control-security.sql)

-- STEP 2: Replace 'YOUR-EMAIL-HERE' with your actual email and run this:
-- 
-- EXAMPLE: If your email is joe@example.com, change:
-- WHERE email = 'YOUR-EMAIL-HERE' 
-- TO:
-- WHERE email = 'joe@example.com'

INSERT INTO admin_roles (
  user_id,
  role_type,
  permissions,
  security_level,
  mfa_required,
  session_timeout_minutes
) 
SELECT 
  id,
  'super_admin',
  '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}',
  'maximum',
  false, -- Set to true if you want MFA
  120    -- 2 hour sessions
FROM auth.users 
WHERE email = 'joeatang7@gmail.com'  -- ⚠️  REPLACE WITH YOUR EMAIL (keep quotes!)
ON CONFLICT (user_id) DO UPDATE SET
  role_type = 'super_admin',
  permissions = '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}',
  security_level = 'maximum',
  is_active = true,
  updated_at = NOW();

-- STEP 3: Verify your admin role was created
-- (Replace YOUR-EMAIL-HERE here too!)
SELECT 
  ar.role_type,
  ar.security_level,
  ar.is_active,
  au.email,
  ar.created_at
FROM admin_roles ar
JOIN auth.users au ON ar.user_id = au.id
WHERE au.email = 'joeatang7@gmail.com';  -- ⚠️  REPLACE WITH YOUR EMAIL (keep quotes!)