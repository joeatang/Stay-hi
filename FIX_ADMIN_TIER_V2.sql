-- 🚨 EMERGENCY FIX V2: Set joeatang7@gmail.com to Admin Tier
-- Fixed version - admin_roles table schema corrected

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
-- STEP 4: Check if admin_roles table exists and its structure
-- =============================================
-- First, let's see what columns admin_roles actually has:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'admin_roles'
ORDER BY ordinal_position;

-- =============================================
-- STEP 5: Add admin role (simplified - just user_id)
-- =============================================
-- If admin_roles only has user_id column, use this:
INSERT INTO admin_roles (user_id, created_at)
SELECT 
  id,
  NOW()
FROM auth.users
WHERE email IN ('joeatang7@gmail.com', 'atangj@me.com')
  AND NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.users.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- STEP 6: Verify the fix
-- =============================================
SELECT 
  'AFTER FIX ✅' as status,
  u.id as user_id,
  u.email,
  um.tier as new_tier,
  um.status,
  um.trial_end,
  CASE WHEN ar.user_id IS NOT NULL THEN 'admin' ELSE NULL END as admin_status
FROM auth.users u
LEFT JOIN user_memberships um ON um.user_id = u.id
LEFT JOIN admin_roles ar ON ar.user_id = u.id
WHERE u.email IN ('joeatang7@gmail.com', 'atangj@me.com');

-- =============================================
-- ALTERNATIVE: If admin_roles table doesn't exist, skip it
-- =============================================
-- The tier='premium' in user_memberships should be enough
-- Many systems use tier level instead of separate admin table

-- =============================================
-- EXPECTED RESULT
-- =============================================
-- You should see:
-- new_tier: 'premium'
-- status: 'active'
-- trial_end: NULL
-- admin_status: 'admin' (or NULL if admin_roles doesn't exist - that's OK)
