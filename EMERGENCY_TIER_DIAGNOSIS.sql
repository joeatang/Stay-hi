-- ========================================
-- EMERGENCY TIER SYSTEM DIAGNOSIS
-- Run this to see what's actually in database after your signup
-- ========================================

-- 1. What email did you use for signup?
-- Replace 'YOUR_EMAIL_HERE' with actual email below

-- 2. Check if user exists in auth.users
SELECT 
  '🔍 AUTH USER CHECK' as diagnosis,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'  -- ⚠️ REPLACE THIS
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check if public.users entry was created
SELECT 
  '🔍 PUBLIC USER CHECK' as diagnosis,
  u.id,
  u.email,
  u.created_at,
  'Entry exists' as status
FROM public.users u
WHERE u.email = 'YOUR_EMAIL_HERE'  -- ⚠️ REPLACE THIS
UNION ALL
SELECT 
  '⚠️ PUBLIC USER MISSING' as diagnosis,
  au.id,
  au.email,
  au.created_at,
  'NOT FOUND - signup may have failed!' as status
FROM auth.users au
WHERE au.email = 'YOUR_EMAIL_HERE'  -- ⚠️ REPLACE THIS
  AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);

-- 4. Check if user_memberships entry was created
SELECT 
  '🔍 MEMBERSHIP CHECK' as diagnosis,
  um.id,
  um.user_id,
  um.tier,
  um.status,
  um.trial_start,
  um.trial_end,
  um.trial_days_total,
  um.invitation_code,
  um.created_at,
  CASE 
    WHEN um.trial_end > NOW() THEN '✅ Active Trial (' || EXTRACT(DAY FROM um.trial_end - NOW()) || ' days left)'
    WHEN um.trial_end < NOW() THEN '❌ Expired'
    ELSE '⚠️ No trial_end set'
  END as trial_status
FROM user_memberships um
WHERE um.user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')  -- ⚠️ REPLACE THIS
ORDER BY um.created_at DESC
LIMIT 1;

-- 5. Check what tier HiTier.js will see when it queries
-- This EXACTLY mimics: client.from('user_memberships').select('tier, status').eq('user_id', user.id)
SELECT 
  '🔍 WHAT HiTier.js SEES' as diagnosis,
  tier,
  status,
  trial_end,
  CASE 
    WHEN tier NOT IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective') 
    THEN '❌ INVALID TIER - will default to free!'
    ELSE '✅ Valid tier value'
  END as tier_validation
FROM user_memberships
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')  -- ⚠️ REPLACE THIS
ORDER BY created_at DESC
LIMIT 1;

-- 6. Check if invitation code was used correctly
SELECT 
  '🔍 INVITE CODE USED' as diagnosis,
  ic.code,
  ic.grants_tier,
  ic.trial_days,
  ic.current_uses,
  ic.max_uses,
  ic.last_used_at,
  CASE 
    WHEN ic.current_uses >= ic.max_uses THEN '⚠️ Code fully used'
    ELSE '✅ Code has uses remaining'
  END as code_status
FROM invitation_codes ic
WHERE ic.code = (
  SELECT invitation_code 
  FROM user_memberships 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')  -- ⚠️ REPLACE THIS
  LIMIT 1
);

-- 7. Check membership transaction log
SELECT 
  '🔍 TRANSACTION LOG' as diagnosis,
  mt.transaction_type,
  mt.description,
  mt.metadata,
  mt.created_at
FROM membership_transactions mt
WHERE mt.user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')  -- ⚠️ REPLACE THIS
ORDER BY mt.created_at DESC;

-- 8. Full diagnostic summary
SELECT 
  '📊 DIAGNOSTIC SUMMARY' as section,
  (SELECT COUNT(*) FROM auth.users WHERE email = 'YOUR_EMAIL_HERE') as auth_user_exists,  -- ⚠️ REPLACE THIS
  (SELECT COUNT(*) FROM public.users WHERE email = 'YOUR_EMAIL_HERE') as public_user_exists,  -- ⚠️ REPLACE THIS
  (SELECT COUNT(*) FROM user_memberships WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')) as membership_exists,  -- ⚠️ REPLACE THIS
  (SELECT tier FROM user_memberships WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE') LIMIT 1) as current_tier,  -- ⚠️ REPLACE THIS
  (SELECT status FROM user_memberships WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE') LIMIT 1) as membership_status;  -- ⚠️ REPLACE THIS
