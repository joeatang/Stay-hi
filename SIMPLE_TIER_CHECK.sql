-- Simple query without emojis
SELECT 
  code,
  grants_tier,
  trial_days,
  valid_until,
  created_at
FROM invitation_codes
WHERE trial_days <= 1
ORDER BY created_at DESC
LIMIT 5;

-- Your account membership
SELECT 
  um.tier,
  um.invitation_code,
  um.trial_days_total,
  um.status,
  um.created_at,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id  
WHERE u.email = 'atangj@me.com'
ORDER BY um.created_at DESC;