-- Check what's in user_metadata for membership_tier
SELECT 
  email,
  raw_user_meta_data->>'membership_tier' as metadata_tier,
  um.tier as db_tier,
  raw_user_meta_data
FROM auth.users u
LEFT JOIN user_memberships um ON um.user_id = u.id
WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com')
LIMIT 5;
