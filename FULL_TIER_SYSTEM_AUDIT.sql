-- ========================================
-- COMPREHENSIVE TIER SYSTEM AUDIT
-- Run this to see the FULL PICTURE of your tier system
-- ========================================

-- 1. What tier values exist in invitation_codes?
SELECT 
  '1️⃣ INVITATION CODES - grants_tier values' as audit_section,
  grants_tier,
  COUNT(*) as code_count,
  STRING_AGG(code, ', ') as sample_codes
FROM invitation_codes
GROUP BY grants_tier
ORDER BY MAX(created_at) DESC;

-- 2. What tier values exist in user_memberships?
SELECT 
  '2️⃣ USER_MEMBERSHIPS - tier values' as audit_section,
  tier,
  COUNT(*) as member_count,
  STRING_AGG(invitation_code, ', ') as codes_used
FROM user_memberships
GROUP BY tier;

-- 3. What does get_unified_membership() return for your account?
SELECT 
  '3️⃣ CURRENT get_unified_membership() OUTPUT' as audit_section,
  get_unified_membership() as current_membership;

-- 4. What tier does HiTier.js see for your account?
SELECT 
  '4️⃣ WHAT HiTier.js QUERIES' as audit_section,
  um.tier,
  um.status,
  um.trial_end,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'atangj@me.com'
ORDER BY um.created_at DESC
LIMIT 1;

-- 5. Check if there's a conflict between tables
SELECT 
  '5️⃣ TABLE OVERLAP CHECK' as audit_section,
  'user_memberships' as table_name,
  um.tier as tier_value,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'atangj@me.com'
UNION ALL
SELECT 
  '5️⃣ TABLE OVERLAP CHECK',
  'hi_members',
  hm.membership_tier,
  u.email
FROM hi_members hm
JOIN auth.users u ON u.id = hm.user_id
WHERE u.email = 'atangj@me.com';

-- 6. What badge names are mapped in your code?
-- HiTier.js allowedTiers: ['free', 'bronze', 'silver', 'gold', 'premium', 'collective']
-- header.js badges: free🌱, bronze🥉, silver🥈, gold🥇, premium⭐, collective🌟
-- But you saw "Hi Pioneer" - this suggests a DIFFERENT tier system is active!

SELECT 
  '6️⃣ TIER NAME MISMATCH' as audit_section,
  'Check if tier value matches header.js mapping' as note,
  um.tier as database_tier,
  CASE um.tier
    WHEN 'free' THEN '🌱 Free Tier'
    WHEN 'bronze' THEN '🥉 Bronze Member'
    WHEN 'silver' THEN '🥈 Silver Member'
    WHEN 'gold' THEN '🥇 Gold Member'
    WHEN 'premium' THEN '⭐ Premium Member'
    WHEN 'collective' THEN '🌟 Collective Member'
    ELSE '❌ UNMAPPED - will show: "Tier: ' || um.tier || '"'
  END as expected_badge_from_header_js,
  'But you saw: "Hi Pioneer"' as actual_badge_seen
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'atangj@me.com'
ORDER BY um.created_at DESC
LIMIT 1;
