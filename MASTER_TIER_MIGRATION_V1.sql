-- ========================================
-- 🚀 MASTER TIER MIGRATION V1
-- Single Source of Truth: Align Database with TIER_CONFIG.js
-- ========================================
-- 
-- GOAL: Fix schema mismatch between database and frontend
-- 
-- CURRENT STATE:
--   Database: trial, beta, standard, premium, lifetime
--   Frontend: free, bronze, silver, gold, premium, collective
--
-- TARGET STATE:
--   Database: anonymous, free, bronze, silver, gold, premium, collective
--   Frontend: (same tier names, displayed with branded names)
--
-- USERS AFFECTED:
--   - 3 users with tier='premium' (no change needed)
--   - 1 user with tier='standard' → will migrate to 'bronze'
--
-- TIMELINE: 15-20 minutes total
-- RISK LEVEL: LOW (pre-launch, minimal data, reversible)
-- ========================================

-- ========================================
-- STEP 1: BACKUP CURRENT STATE
-- ========================================

-- Create backup table (just in case)
CREATE TABLE IF NOT EXISTS user_memberships_backup_20251211 AS
SELECT * FROM user_memberships;

-- Verify backup
SELECT COUNT(*) as backed_up_users FROM user_memberships_backup_20251211;
-- Expected: 4 users

-- ========================================
-- STEP 2: DROP OLD CONSTRAINT
-- ========================================

ALTER TABLE user_memberships 
DROP CONSTRAINT IF EXISTS user_memberships_tier_check;

-- Verify constraint dropped
SELECT constraint_name 
FROM information_schema.check_constraints
WHERE constraint_name = 'user_memberships_tier_check';
-- Expected: 0 rows (constraint removed)

-- ========================================
-- STEP 3: MIGRATE EXISTING USER DATA
-- ========================================

-- Map old tier names → new tier names
UPDATE user_memberships SET tier = CASE
  WHEN tier = 'trial' THEN 'free'
  WHEN tier = 'beta' THEN 'bronze'
  WHEN tier = 'standard' THEN 'bronze'  -- Your test user gets bronze
  WHEN tier = 'premium' THEN 'premium'  -- No change
  WHEN tier = 'lifetime' THEN 'collective'
  ELSE tier  -- Keep unknown tiers as-is (safety)
END
WHERE tier IN ('trial', 'beta', 'standard', 'premium', 'lifetime');

-- Verify migration
SELECT tier, COUNT(*) as user_count
FROM user_memberships
GROUP BY tier
ORDER BY user_count DESC;
-- Expected: premium=3, bronze=1

-- ========================================
-- STEP 4: ADD NEW CONSTRAINT
-- ========================================

-- Add constraint with new tier names matching TIER_CONFIG.js
-- NOTE: 'anonymous' NOT included (unauthenticated users don't have database rows)
ALTER TABLE user_memberships 
ADD CONSTRAINT user_memberships_tier_check 
CHECK (tier = ANY (ARRAY[
  'free',        -- $0/mo - 5 private shares (invite required for beta)
  'bronze',      -- $5.55/mo - 30 shares, all types
  'silver',      -- $15.55/mo - 75 shares
  'gold',        -- $25.55/mo - 150 shares
  'premium',     -- $55.55/mo - unlimited
  'collective'   -- $155.55/mo - unlimited + admin
]));

-- Verify new constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'user_memberships_tier_check';
-- Expected: Shows new constraint with 7 tier names

-- ========================================
-- STEP 5: UPDATE invitation_codes TABLE
-- ========================================

-- Check if invitation_codes has grants_tier column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invitation_codes' AND column_name = 'grants_tier';

-- If grants_tier exists, migrate its values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitation_codes' AND column_name = 'grants_tier'
  ) THEN
    UPDATE invitation_codes SET grants_tier = CASE
      WHEN grants_tier = 'trial' THEN 'free'
      WHEN grants_tier = 'beta' THEN 'bronze'
      WHEN grants_tier = 'standard' THEN 'bronze'
      WHEN grants_tier = 'premium' THEN 'premium'
      WHEN grants_tier = 'lifetime' THEN 'collective'
      ELSE grants_tier
    END
    WHERE grants_tier IN ('trial', 'beta', 'standard', 'lifetime');
    
    RAISE NOTICE 'invitation_codes.grants_tier migrated successfully';
  ELSE
    RAISE NOTICE 'invitation_codes.grants_tier column not found - skipping';
  END IF;
END $$;

-- ========================================
-- STEP 6: VERIFICATION
-- ========================================

-- 1. Check all users have valid tiers
SELECT 
  tier,
  COUNT(*) as user_count,
  ARRAY_AGG(DISTINCT status) as statuses
FROM user_memberships
GROUP BY tier;
-- Expected: All tiers should be in new tier list

-- 2. Check constraint is active
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'user_memberships_tier_check';
-- Expected: Shows CHECK with 7 tier names

-- 3. Test inserting valid tier (should succeed)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO user_memberships (user_id, tier, status, created_at, updated_at)
  VALUES (test_user_id, 'bronze', 'active', NOW(), NOW());
  
  DELETE FROM user_memberships WHERE user_id = test_user_id;
  RAISE NOTICE '✅ Test insert: bronze tier accepted';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;

-- 4. Test inserting invalid tier (should fail)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO user_memberships (user_id, tier, status, created_at, updated_at)
  VALUES (test_user_id, 'invalid_tier', 'active', NOW(), NOW());
  
  RAISE NOTICE '❌ Test failed: Invalid tier was accepted!';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE '✅ Test passed: Invalid tier rejected correctly';
END $$;

-- 5. Verify your test user
SELECT 
  u.email,
  um.tier,
  um.status,
  um.trial_days_total,
  um.created_at
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE u.email = 'degenmentality@gmail.com';
-- Expected: tier='bronze', status='active'

-- ========================================
-- STEP 7: UPDATE TIER_CONFIG.js SHARE LIMITS
-- ========================================

-- NOTE: After running this SQL, you need to update frontend files:
-- 
-- File: /public/lib/config/TIER_CONFIG.js
-- 
-- OLD (lines 25-45):
--   free: {
--     features: {
--       shareCreation: false,  // Cannot create shares
--       ...
--     }
--   }
--   bronze: {
--     features: {
--       shareCreation: 10,  // 10 shares per month
--       shareTypes: ['public', 'anonymous'],
--       ...
--     }
--   }
-- 
-- NEW:
--   free: {
--     features: {
--       shareCreation: 5,  // 5 shares per month
--       shareTypes: ['private'],  // Private only
--       ...
--     }
--   }
--   bronze: {
--     features: {
--       shareCreation: 30,  // 30 shares per month (1 per day)
--       shareTypes: ['private', 'public', 'anonymous'],  // All types
--       ...
--     }
--   }

-- ========================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ========================================

-- If something goes wrong, restore from backup:
-- 
-- 1. Drop new constraint:
--    ALTER TABLE user_memberships DROP CONSTRAINT user_memberships_tier_check;
-- 
-- 2. Restore data:
--    TRUNCATE user_memberships;
--    INSERT INTO user_memberships SELECT * FROM user_memberships_backup_20251211;
-- 
-- 3. Re-add old constraint:
--    ALTER TABLE user_memberships ADD CONSTRAINT user_memberships_tier_check 
--    CHECK (tier = ANY (ARRAY['trial', 'beta', 'standard', 'premium', 'lifetime']));

-- ========================================
-- FINAL STATUS
-- ========================================

SELECT '✅ Migration complete! Next steps:' as status
UNION ALL SELECT '1. Update TIER_CONFIG.js share limits'
UNION ALL SELECT '2. Test signup with bronze invitation code'
UNION ALL SELECT '3. Verify share sheet shows all options'
UNION ALL SELECT '4. Deploy to Vercel';
