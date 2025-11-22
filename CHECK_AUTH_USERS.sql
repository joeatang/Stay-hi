-- Check if goocine10 account was created at all
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'goocine10@gmail.com';

-- Check ALL users created in last 2 hours to see what emails were actually created
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
