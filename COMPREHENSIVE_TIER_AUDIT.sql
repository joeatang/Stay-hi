-- ========================================
-- COMPREHENSIVE TIER SYSTEM AUDIT
-- ========================================

-- 1. Check invite code signup creates proper tier
SELECT 
  'Recent Signups via Invite Code' as check_type,
  um.id,
  um.tier,
  um.status,
  um.trial_start,
  um.trial_end,
  um.trial_days_total,
  um.invitation_code,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.invitation_code IS NOT NULL
ORDER BY um.created_at DESC
LIMIT 5;

-- 2. Check if HiTier.js can read these tiers
-- This query mimics what HiTier.js does: client.from('user_memberships').select('tier').eq('user_id', user.id)
SELECT 
  'What HiTier.js Will See' as check_type,
  user_id,
  tier,
  status
FROM user_memberships
WHERE invitation_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verify tier values match allowed tiers in HiTier.js
-- Allowed: ['free', 'bronze', 'silver', 'gold', 'premium', 'collective']
SELECT 
  'Tier Value Validation' as check_type,
  tier,
  COUNT(*) as count,
  CASE 
    WHEN tier IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective') THEN '✅ Valid'
    ELSE '❌ INVALID - Will default to free!'
  END as validation_status
FROM user_memberships
GROUP BY tier;

-- 4. Check for admin roles (collective tier needs admin_roles entry)
SELECT 
  'Admin Roles Check' as check_type,
  ar.user_id,
  ar.role_type,
  u.email,
  um.tier
FROM admin_roles ar
JOIN auth.users u ON u.id = ar.user_id
LEFT JOIN user_memberships um ON um.user_id = ar.user_id
ORDER BY ar.created_at DESC
LIMIT 5;

-- 5. Check trial expiration logic
SELECT 
  'Trial Status Check' as check_type,
  um.tier,
  um.status,
  um.trial_end,
  CASE 
    WHEN um.trial_end IS NULL THEN '⚠️ No trial_end set'
    WHEN um.trial_end < NOW() THEN '❌ Expired'
    WHEN um.trial_end > NOW() THEN '✅ Active'
  END as trial_status,
  um.trial_end - NOW() as time_remaining,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.invitation_code IS NOT NULL
ORDER BY um.created_at DESC;
