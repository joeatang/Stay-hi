-- Check what tier the 1hr code was generated with
SELECT 
  code,
  grants_tier,
  trial_days,
  CASE 
    WHEN valid_until > NOW() THEN '✅ Still valid'
    ELSE '❌ Expired'
  END as validity,
  created_at
FROM invitation_codes
WHERE trial_days <= 1  -- 1 hour codes
ORDER BY created_at DESC
LIMIT 5;

-- Check what tier was actually written to user_memberships for your account
SELECT 
  um.tier,
  um.invitation_code,
  um.trial_days_total,
  um.created_at,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id  
WHERE u.email = 'atangj@me.com'
ORDER BY um.created_at DESC;
