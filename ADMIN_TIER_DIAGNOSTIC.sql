-- 🔍 ADMIN TIER DIAGNOSTIC - joeatang7@gmail.com
-- Run this in Supabase SQL Editor to diagnose tier assignment issue

-- =============================================
-- 1. Check if user exists in auth.users
-- =============================================
SELECT 
  '1. USER AUTH CHECK' as check_section,
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  u.last_sign_in_at,
  u.user_metadata,
  u.app_metadata
FROM auth.users u
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- 2. Check user_memberships table
-- =============================================
SELECT 
  '2. USER MEMBERSHIPS CHECK' as check_section,
  um.id as membership_id,
  um.user_id,
  um.tier,
  um.status,
  um.invitation_code,
  um.trial_days_total,
  um.trial_start,
  um.trial_end,
  um.created_at,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com')
ORDER BY um.created_at DESC;

-- =============================================
-- 3. Check admin_roles table (if exists)
-- =============================================
SELECT 
  '3. ADMIN ROLES CHECK' as check_section,
  ar.*,
  u.email
FROM admin_roles ar
JOIN auth.users u ON u.id = ar.user_id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- 4. Check hi_members table (if exists)
-- =============================================
SELECT 
  '4. HI_MEMBERS CHECK' as check_section,
  hm.*,
  u.email
FROM hi_members hm
JOIN auth.users u ON u.id = hm.user_id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- 5. Check public.users table (if exists)
-- =============================================
SELECT 
  '5. PUBLIC.USERS CHECK' as check_section,
  pu.*
FROM public.users pu
WHERE pu.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- 6. Check what tier system is actually deployed
-- =============================================
SELECT 
  '6. TIER SYSTEM SCHEMA CHECK' as check_section,
  'user_memberships columns:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_memberships'
ORDER BY ordinal_position;

-- =============================================
-- 7. Test get_unified_membership() function
-- =============================================
-- Run this separately as the user (not here):
-- SELECT get_unified_membership();

-- =============================================
-- 8. Check invitation codes used by this user
-- =============================================
SELECT 
  '8. INVITATION CODES CHECK' as check_section,
  ic.code,
  ic.grants_tier,
  ic.trial_days,
  ic.valid_until,
  ic.created_at,
  um.user_id,
  u.email
FROM invitation_codes ic
LEFT JOIN user_memberships um ON um.invitation_code = ic.code
LEFT JOIN auth.users u ON u.id = um.user_id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com')
   OR ic.created_by = (SELECT id FROM auth.users WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com'));

-- =============================================
-- 9. Check if there are ANY admin users
-- =============================================
SELECT 
  '9. ALL ADMIN USERS' as check_section,
  COUNT(*) as admin_count
FROM admin_roles;

-- Show actual admin users if table exists
SELECT 
  '9b. ADMIN USER DETAILS' as check_section,
  u.email,
  ar.role,
  ar.created_at
FROM admin_roles ar
JOIN auth.users u ON u.id = ar.user_id
ORDER BY ar.created_at;

-- =============================================
-- 10. Database function availability check
-- =============================================
SELECT 
  '10. FUNCTION AVAILABILITY CHECK' as check_section,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_unified_membership',
    'check_user_access_tier',
    'use_invite_code',
    'redeem_access_code'
  )
ORDER BY routine_name;

-- =============================================
-- SUMMARY DIAGNOSIS
-- =============================================
SELECT 
  'DIAGNOSIS SUMMARY' as section,
  CASE 
    WHEN EXISTS(SELECT 1 FROM auth.users WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com'))
    THEN '✅ User exists in auth.users'
    ELSE '❌ User NOT found in auth.users'
  END as auth_check,
  CASE 
    WHEN EXISTS(SELECT 1 FROM user_memberships um JOIN auth.users u ON u.id = um.user_id WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com'))
    THEN '✅ User has membership record'
    ELSE '❌ User has NO membership record'
  END as membership_check,
  CASE 
    WHEN EXISTS(SELECT 1 FROM admin_roles ar JOIN auth.users u ON u.id = ar.user_id WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com'))
    THEN '✅ User has admin role'
    ELSE '❌ User has NO admin role'
  END as admin_check;
