-- Check the newest membership to see trial dates
SELECT 
  um.id,
  um.user_id,
  um.tier,
  um.status,
  um.trial_start,
  um.trial_end,
  um.trial_days_total,
  um.invitation_code,
  um.created_at,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
ORDER BY um.created_at DESC
LIMIT 3;
