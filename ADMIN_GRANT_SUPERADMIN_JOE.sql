-- ADMIN_GRANT_SUPERADMIN_JOE.sql
-- Purpose: Grant/refresh super admin role for the specified email (idempotent)
-- Usage: Run in Supabase SQL editor once. Safe to re-run.

-- 1) Resolve user_id from email
WITH u AS (
  SELECT id AS user_id FROM auth.users WHERE email = 'joeatang7@gmail.com'
)
-- 2) Upsert admin role
INSERT INTO admin_roles (
  user_id,
  role_type,
  permissions,
  security_level,
  is_active,
  mfa_required,
  updated_at
)
SELECT u.user_id,
       'super_admin',
       '{"all": true, "user_management": true, "system_admin": true}',
       'maximum',
       true,
       true,
       NOW()
FROM u
ON CONFLICT (user_id) DO UPDATE SET
  role_type = EXCLUDED.role_type,
  permissions = EXCLUDED.permissions,
  security_level = EXCLUDED.security_level,
  is_active = EXCLUDED.is_active,
  mfa_required = EXCLUDED.mfa_required,
  updated_at = NOW();

-- 3) If session timeout column exists, ensure a sane default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_roles' AND column_name = 'session_timeout_minutes'
  ) THEN
    UPDATE admin_roles ar
    SET session_timeout_minutes = COALESCE(ar.session_timeout_minutes, 60)
    FROM auth.users au
    WHERE ar.user_id = au.id AND au.email = 'joeatang7@gmail.com';
  END IF;
END $$;

-- 4) Verify access via function (should return JSON with access_granted true)
-- SELECT check_admin_access('admin', NULL);
