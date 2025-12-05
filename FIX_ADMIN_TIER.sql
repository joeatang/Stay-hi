-- 🚨 EMERGENCY FIX: Set joeatang7@gmail.com to Admin Tier
-- Run this in Supabase SQL Editor NOW

-- =============================================
-- STEP 1: Check current state
-- =============================================
SELECT 
  'BEFORE FIX' as status,
  u.id as user_id,
  u.email,
  um.tier as current_tier,
  um.status,
  um.trial_end
FROM auth.users u
LEFT JOIN user_memberships um ON um.user_id = u.id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- STEP 2: Update tier to 'premium' (highest tier)
-- =============================================
UPDATE user_memberships
SET 
  tier = 'premium',
  status = 'active',
  trial_end = NULL, -- Remove trial expiration for admin
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com')
  LIMIT 1
);

-- =============================================
-- STEP 3: If no membership record exists, create one
-- =============================================
INSERT INTO user_memberships (user_id, tier, status, trial_end, created_at, updated_at)
SELECT 
  id,
  'premium',
  'active',
  NULL,
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com')
  AND NOT EXISTS (
    SELECT 1 FROM user_memberships 
    WHERE user_id = auth.users.id
  );

-- =============================================
-- STEP 4: Add admin role if admin_roles table exists
-- =============================================
INSERT INTO admin_roles (user_id, role, created_at)
SELECT 
  id,
  'super_admin',
  NOW()
FROM auth.users
WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com')
  AND NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.users.id
  )
ON CONFLICT (user_id) DO UPDATE 
SET role = 'super_admin';

-- =============================================
-- STEP 5: Verify the fix
-- =============================================
SELECT 
  'AFTER FIX ✅' as status,
  u.id as user_id,
  u.email,
  um.tier as new_tier,
  um.status,
  um.trial_end,
  ar.role as admin_role
FROM auth.users u
LEFT JOIN user_memberships um ON um.user_id = u.id
LEFT JOIN admin_roles ar ON ar.user_id = u.id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- EXPECTED RESULT
-- =============================================
-- You should see:
-- new_tier: 'premium'
-- status: 'active'
-- trial_end: NULL
-- admin_role: 'super_admin'
