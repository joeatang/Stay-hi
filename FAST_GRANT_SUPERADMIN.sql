-- FAST_GRANT_SUPERADMIN.sql
-- Purpose: Idempotently grant super_admin role to primary operator email.
-- Usage: Run once in Supabase SQL editor after deploying hi-mission-control-security.sql.
-- Safe to re-run; updates existing row.

-- PARAMETERS --------------------------------------------------------------
-- Change this if operator email differs.
WITH target AS (
  SELECT id AS user_id FROM auth.users WHERE email = 'joeatang7@gmail.com'
)
INSERT INTO admin_roles (
  user_id, role_type, permissions, granted_by, security_level, is_active, mfa_required, session_timeout_minutes, updated_at
)
SELECT t.user_id,
       'super_admin',
       '{"all": true, "system_admin": true, "user_management": true}',
       t.user_id, -- self-grant (first bootstrap)
       'maximum',
       true,
       true,
       60,
       NOW()
FROM target t
ON CONFLICT (user_id) DO UPDATE SET
  role_type='super_admin',
  permissions=EXCLUDED.permissions,
  security_level=EXCLUDED.security_level,
  is_active=true,
  mfa_required=EXCLUDED.mfa_required,
  session_timeout_minutes=EXCLUDED.session_timeout_minutes,
  updated_at=NOW();

-- Verification query (uncomment to view result)
-- select check_admin_access('admin', null);
