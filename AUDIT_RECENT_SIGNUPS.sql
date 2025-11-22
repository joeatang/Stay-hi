-- Comprehensive test: Check if use_invite_code actually worked for the most recent signup
SELECT 
  ic.code,
  ic.current_uses,
  ic.max_uses,
  ic.grants_tier,
  ic.last_used_at
FROM invitation_codes ic
WHERE ic.code = '01945A26';

-- Check if there's a membership created today
SELECT 
  um.id,
  um.user_id,
  um.tier,
  um.status,
  um.invitation_code,
  um.created_at,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.created_at > NOW() - INTERVAL '1 hour'
ORDER BY um.created_at DESC;

-- Check if there's a transaction logged today
SELECT 
  mt.id,
  mt.user_id,
  mt.transaction_type,
  mt.description,
  mt.created_at,
  u.email
FROM membership_transactions mt
JOIN auth.users u ON u.id = mt.user_id
WHERE mt.created_at > NOW() - INTERVAL '1 hour'
ORDER BY mt.created_at DESC;
