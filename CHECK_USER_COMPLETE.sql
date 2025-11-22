-- Check if user exists at all and what their actual membership status is
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  um.id as membership_id,
  um.tier,
  um.status,
  um.invitation_code
FROM auth.users u
LEFT JOIN user_memberships um ON um.user_id = u.id
WHERE u.email = 'goocine10@gmail.com';

-- Also check if there are ANY transactions logged
SELECT 
  mt.id,
  mt.user_id,
  mt.transaction_type,
  mt.description,
  mt.metadata,
  u.email
FROM membership_transactions mt
JOIN auth.users u ON u.id = mt.user_id
WHERE u.email = 'goocine10@gmail.com';
