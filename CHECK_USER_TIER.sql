-- Check what tier was actually assigned to goocine10@gmail.com
SELECT 
  um.user_id,
  um.tier,
  um.status,
  um.invitation_code,
  u.email,
  ic.grants_tier as code_grants_tier
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
LEFT JOIN invitation_codes ic ON ic.code = um.invitation_code
WHERE u.email = 'goocine10@gmail.com';
