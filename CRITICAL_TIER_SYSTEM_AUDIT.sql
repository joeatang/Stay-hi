-- ========================================
-- 🔍 CRITICAL TIER SYSTEM AUDIT
-- ========================================
-- Triple-check to find data mismatches and conflicts

-- 1. Which tables exist?
SELECT 
  '1️⃣ TABLES THAT EXIST' as audit_section,
  table_name,
  CASE 
    WHEN table_name = 'user_memberships' THEN '✅ USED BY use_invite_code()'
    WHEN table_name = 'hi_members' THEN '⚠️ USED BY get_unified_membership()??'
    ELSE ''
  END as usage_note
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_memberships', 'hi_members', 'invitation_codes')
ORDER BY table_name;

-- 2. Check user_memberships structure (what use_invite_code writes to)
SELECT 
  '2️⃣ user_memberships COLUMNS' as audit_section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_memberships'
ORDER BY ordinal_position;

-- 3. Check hi_members structure (what get_unified_membership reads from)
SELECT 
  '3️⃣ hi_members COLUMNS' as audit_section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'hi_members'
ORDER BY ordinal_position;

-- 4. Check which table has YOUR tier data
SELECT 
  '4️⃣ YOUR TIER IN user_memberships' as audit_section,
  um.user_id,
  um.tier,
  um.status,
  um.trial_days_total,
  um.trial_start,
  um.trial_end,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'atangj@me.com';

-- 5. Check if you exist in hi_members
SELECT 
  '5️⃣ YOUR TIER IN hi_members' as audit_section,
  hm.user_id,
  hm.membership_tier,
  hm.tier_expires_at,
  hm.is_active,
  u.email
FROM hi_members hm
JOIN auth.users u ON u.id = hm.user_id
WHERE u.email = 'atangj@me.com';

-- 6. Check get_unified_membership function definition
SELECT 
  '6️⃣ get_unified_membership SOURCE CODE' as audit_section,
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%hi_members%' THEN '⚠️ QUERIES hi_members'
    WHEN routine_definition LIKE '%user_memberships%' THEN '✅ QUERIES user_memberships'
    ELSE '❓ UNKNOWN TABLE'
  END as table_used,
  LEFT(routine_definition, 200) as first_200_chars
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_unified_membership';

-- 7. Check use_invite_code function definition
SELECT 
  '7️⃣ use_invite_code SOURCE CODE' as audit_section,
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%trial_start%' THEN '✅ SETS trial_start/trial_end'
    ELSE '❌ MISSING trial dates'
  END as trial_dates_status,
  LEFT(routine_definition, 200) as first_200_chars
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'use_invite_code';

-- 8. Check admin_generate_invite_code function signature
SELECT 
  '8️⃣ admin_generate_invite_code PARAMETERS' as audit_section,
  routine_name,
  parameter_name,
  parameter_mode,
  data_type,
  parameter_default
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'admin_generate_invite_code'
ORDER BY ordinal_position;

-- 9. Check invitation_codes tier values currently in database
SELECT 
  '9️⃣ ACTUAL TIER VALUES IN invitation_codes' as audit_section,
  grants_tier,
  COUNT(*) as code_count,
  AVG(trial_days) as avg_trial_days,
  ARRAY_AGG(DISTINCT trial_days ORDER BY trial_days) as unique_trial_days
FROM invitation_codes
GROUP BY grants_tier
ORDER BY code_count DESC;

-- 10. CRITICAL: Are there TWO different membership systems?
SELECT 
  '🔟 MEMBERSHIP TABLE MISMATCH CHECK' as audit_section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_members')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memberships')
    THEN '⚠️ BOTH TABLES EXIST - POTENTIAL CONFLICT!'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_members')
    THEN 'Only hi_members exists'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memberships')
    THEN 'Only user_memberships exists'
    ELSE 'NO MEMBERSHIP TABLE FOUND!'
  END as conflict_status;

-- ========================================
-- EXPECTED RESULTS:
-- ========================================
-- If TIER_CONFIG system is properly aligned:
-- ✅ use_invite_code writes to user_memberships
-- ✅ get_unified_membership reads from user_memberships (SAME TABLE)
-- ✅ admin_generate_invite_code has p_tier and p_trial_days parameters
-- ✅ invitation_codes has codes with multiple tier values (not just 'premium')
-- ✅ user_memberships.tier values match TIER_CONFIG tiers
--
-- If MISALIGNED:
-- ❌ get_unified_membership reads from hi_members (DIFFERENT TABLE)
-- ❌ Data written to one table but read from another
-- ❌ Two competing membership systems
-- ========================================
