-- ========================================
-- WOZ-GRADE TIER BOUNDARY TESTING
-- ========================================
-- Test the extremes: FREE (most restricted) and COLLECTIVE (least restricted)
-- If boundaries work, everything in between will work.

-- ========================================
-- TEST 1: FREE TIER (Lowest Boundary)
-- ========================================
-- Expected Frontend Behavior:
--   - Dashboard header: "🌱 Hi Explorer"
--   - Share sheet: Upgrade prompt OR limited to 5 shares
--   - Share types: ONLY "Private" button visible
-- ========================================

UPDATE user_memberships 
SET tier = 'free' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com');

-- Verify change
SELECT u.email, um.tier, um.status, um.created_at 
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'degenmentality@gmail.com';

-- ⏸️ PAUSE HERE: 
--   1. Hard refresh Dashboard (Cmd+Shift+R)
--   2. Verify header shows "🌱 Hi Explorer"
--   3. Open share sheet, verify only Private button visible
--   4. Come back when ready for next test

-- ========================================
-- TEST 2: COLLECTIVE TIER (Highest Boundary)
-- ========================================
-- Expected Frontend Behavior:
--   - Dashboard header: "🌟 Hi Collective"
--   - Share sheet: All 3 buttons (Private, Public, Anonymous)
--   - Share quota: Unlimited (no quota counter shown)
-- ========================================

UPDATE user_memberships 
SET tier = 'collective' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com');

-- Verify change
SELECT u.email, um.tier, um.status, um.created_at 
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'degenmentality@gmail.com';

-- ⏸️ PAUSE HERE:
--   1. Hard refresh Dashboard (Cmd+Shift+R)
--   2. Verify header shows "🌟 Hi Collective"
--   3. Open share sheet, verify all 3 buttons visible
--   4. Come back when ready for next test

-- ========================================
-- TEST 3: PREMIUM TIER (Unlimited Middle Tier)
-- ========================================
-- Expected Frontend Behavior:
--   - Dashboard header: "🔥 Hi Pioneer"
--   - Share sheet: All 3 buttons visible, unlimited quota
-- ========================================

UPDATE user_memberships 
SET tier = 'premium' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com');

-- Verify change
SELECT u.email, um.tier, um.status, um.created_at 
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'degenmentality@gmail.com';

-- ⏸️ PAUSE HERE:
--   1. Hard refresh Dashboard (Cmd+Shift+R)
--   2. Verify header shows "🔥 Hi Pioneer"
--   3. Open share sheet, verify all 3 buttons visible

-- ========================================
-- RESET: Return to BRONZE (Production State)
-- ========================================

UPDATE user_memberships 
SET tier = 'bronze' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com');

-- Final verification
SELECT u.email, um.tier, um.status, um.created_at 
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'degenmentality@gmail.com';

-- Expected: tier='bronze', status='active'

-- ========================================
-- TESTING CHECKLIST (Mark as you go)
-- ========================================
-- [ ] FREE tier: Header shows "🌱 Hi Explorer"
-- [ ] FREE tier: Only Private button in share sheet
-- [ ] COLLECTIVE tier: Header shows "🌟 Hi Collective"
-- [ ] COLLECTIVE tier: All 3 buttons in share sheet
-- [ ] PREMIUM tier: Header shows "🔥 Hi Pioneer"
-- [ ] PREMIUM tier: All 3 buttons in share sheet
-- [ ] Tier transitions happen instantly (no logout required)
-- [ ] Reset to BRONZE successful

-- ========================================
-- SUCCESS CRITERIA
-- ========================================
-- ✅ If all 3 tier displays work correctly → HiBrandTiers.js is solid
-- ✅ If share buttons change based on tier → TIER_CONFIG.js enforcement works
-- ✅ If database accepts all UPDATEs → Constraint is valid
-- ✅ System is production-ready for tier-based features
