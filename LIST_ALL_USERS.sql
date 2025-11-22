-- Show ALL users to see what accounts exist
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  um.tier,
  um.status,
  ar.role_type
FROM auth.users u
LEFT JOIN user_memberships um ON um.user_id = u.id
LEFT JOIN admin_roles ar ON ar.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;
