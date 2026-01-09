-- ========================================
-- 🌟 FOUNDER TIER MIGRATION - REFERENCE FILE
-- Created: January 7, 2026
-- Status: NOT YET EXECUTED - For future use when ready
-- ========================================
-- 
-- PURPOSE: Grandfather early supporters into lifetime Founder tier
-- USE WHEN: Ready to go public and reward beta testers
-- 
-- FOUNDER TIER BENEFITS:
--   - Lifetime access (no expiration)
--   - Unlimited shares (all types)
--   - All premium features
--   - Special "Founder" badge
--   - Priority support
--   - Early access to new features
--   - $0/month forever (grandfathered)
-- ========================================

-- ========================================
-- STEP 1: BACKUP EVERYTHING
-- ========================================

-- Create full backup before ANY changes
CREATE TABLE IF NOT EXISTS user_memberships_backup_pre_founder AS
SELECT * FROM user_memberships;

-- Verify backup
SELECT 
  COUNT(*) as total_users_backed_up,
  COUNT(DISTINCT tier) as unique_tiers,
  ARRAY_AGG(DISTINCT tier) as tiers_in_backup
FROM user_memberships_backup_pre_founder;

-- ========================================
-- STEP 2: ADD FOUNDER TIER TO DATABASE
-- ========================================

-- Drop existing constraint
ALTER TABLE user_memberships 
DROP CONSTRAINT IF EXISTS user_memberships_tier_check;

-- Add new constraint including 'founder' tier
ALTER TABLE user_memberships 
ADD CONSTRAINT user_memberships_tier_check 
CHECK (tier = ANY (ARRAY[
  'free',        -- $0/mo - 5 private shares/month (invite required)
  'bronze',      -- $5.55/mo - 30 shares/month (all types)
  'silver',      -- $15.55/mo - 75 shares/month
  'gold',        -- $25.55/mo - 150 shares/month
  'premium',     -- $55.55/mo - unlimited shares
  'collective',  -- $155.55/mo - unlimited + admin tools
  'founder'      -- 🌟 LIFETIME - unlimited (grandfathered)
]));

-- Verify constraint updated
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'user_memberships_tier_check';

-- ========================================
-- STEP 3: IDENTIFY USERS TO GRANDFATHER
-- ========================================

-- Preview who will get Founder tier
SELECT 
  u.email,
  um.tier as current_tier,
  um.status,
  um.created_at,
  CASE 
    WHEN um.created_at < '2026-02-01' THEN '✅ Will get Founder'
    ELSE '❌ Too recent'
  END as founder_eligible
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.tier != 'collective'  -- Don't demote admins
ORDER BY um.created_at ASC;

-- Count eligible users
SELECT 
  COUNT(*) as eligible_for_founder,
  MIN(created_at) as earliest_signup,
  MAX(created_at) as latest_signup
FROM user_memberships
WHERE created_at < '2026-02-01'
AND tier != 'collective';

-- ========================================
-- STEP 4: EXECUTE MIGRATION
-- ========================================

-- ⚠️ EXECUTE THIS ONLY WHEN READY ⚠️
-- Upgrade early users to Founder tier
UPDATE user_memberships 
SET 
  tier = 'founder',
  status = 'active',
  trial_end = NULL,           -- Remove trial expiration (lifetime access)
  trial_days_total = NULL,    -- Clear trial days
  updated_at = NOW()
WHERE created_at < '2026-02-01'  -- Adjust date as needed
AND tier != 'collective'         -- Don't demote admins
RETURNING 
  user_id,
  tier,
  status,
  updated_at;

-- ========================================
-- STEP 5: VERIFICATION
-- ========================================

-- 1. Check all users migrated correctly
SELECT 
  tier,
  status,
  COUNT(*) as user_count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM user_memberships
GROUP BY tier, status
ORDER BY tier;

-- 2. Verify founder users have no trial_end
SELECT 
  u.email,
  um.tier,
  um.trial_end,
  um.trial_days_total
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.tier = 'founder';
-- Expected: All trial_end and trial_days_total should be NULL

-- 3. Check if any users were missed
SELECT 
  u.email,
  um.tier,
  um.created_at
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.created_at < '2026-02-01'
AND um.tier NOT IN ('founder', 'collective')
ORDER BY um.created_at;
-- Expected: 0 rows (everyone migrated)

-- ========================================
-- STEP 6: ROLLBACK (IF NEEDED)
-- ========================================

-- ⚠️ ONLY USE IF SOMETHING WENT WRONG ⚠️

-- Restore from backup
TRUNCATE user_memberships;
INSERT INTO user_memberships 
SELECT * FROM user_memberships_backup_pre_founder;

-- Verify rollback
SELECT COUNT(*) as restored_users FROM user_memberships;

-- Drop founder constraint (restore original)
ALTER TABLE user_memberships 
DROP CONSTRAINT user_memberships_tier_check;

ALTER TABLE user_memberships 
ADD CONSTRAINT user_memberships_tier_check 
CHECK (tier = ANY (ARRAY[
  'free', 'bronze', 'silver', 'gold', 'premium', 'collective'
]));

-- ========================================
-- FRONTEND CHANGES NEEDED
-- ========================================

-- After running this SQL, you MUST update frontend files:
-- 
-- 1. /public/lib/config/TIER_CONFIG.js
--    Add founder tier configuration (see below)
-- 
-- 2. /public/lib/HiBrandTiers.js
--    Add founder tier display name and styling
-- 
-- 3. Test tier display on all pages:
--    - Dashboard status pill
--    - Profile page
--    - Share sheet access
--    - Calendar access
-- 
-- ========================================

-- TIER_CONFIG.js Addition (Reference):
/*
  founder: {
    level: 5.5, // Between premium and collective
    name: 'Founding Member',
    displayName: 'Hi Founder',
    emoji: '🌟',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    trialDays: 0, // No trial, lifetime access
    price: 0, // Grandfathered - no charge
    description: 'Early supporter - lifetime premium access',
    
    features: {
      // Medallion & Map
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      mapAccess: 'full',
      mapRadius: 'unlimited',
      mapFilters: true,
      
      // Sharing (Unlimited like Premium)
      shareCreation: 'unlimited',
      shareViewing: 'all',
      shareTypes: ['private', 'public', 'anonymous'],
      shareAnalytics: 'full',
      shareScheduling: 'unlimited',
      
      // Profile
      profileAccess: 'full',
      avatarUpload: true,
      usernameChange: 'unlimited',
      customThemes: true,
      profileBadges: true,
      customBadges: true,
      verifiedBadge: true, // Special "Founder" badge
      
      // Advanced Features
      hiMuscleAccess: 'unlimited',
      calendarAccess: true,
      trendsAccess: 'premium',
      archiveAccess: 'unlimited',
      exportData: true,
      
      // Community
      communityStats: 'full',
      leaderboard: 'visible_with_rank',
      directMessages: 'unlimited',
      prioritySupport: true,
      betaFeatures: true,
      
      // Founder Exclusive
      founderBadge: true,
      lifetimeAccess: true
    },
    
    upgradePrompt: 'Thank you for being an early supporter! 🌟',
    ctaText: null // No upgrade needed
  }
*/

-- HiBrandTiers.js Addition (Reference):
/*
  'founder': {
    name: 'Hi Founder',
    color: '#FFD700',
    emoji: '🌟',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    description: 'Founding member - lifetime access'
  }
*/

-- ========================================
-- COMMUNICATION PLAN
-- ========================================

-- Send email to all founder tier users:
/*
Subject: 🌟 You're a Hi Founding Member!

Hi [Name],

Thank you for being an early supporter of Hi! 

As a thank you for believing in us during beta, you've been 
upgraded to Founding Member status with:

✨ Lifetime premium access (no expiration)
🚀 Unlimited sharing forever
🌟 Special "Founder" badge on your profile
💎 Priority support
🎁 Early access to all new features

You'll never be charged - this is our gift to you for being
part of Hi's journey from the beginning.

Welcome to the founding family!

With gratitude,
The Hi Team
*/

-- ========================================
-- NOTES
-- ========================================

-- Cutoff date logic:
--   created_at < '2026-02-01' = Anyone who signed up in January 2026
--   Adjust this date based on your public launch date
--
-- Why not demote collective tier?
--   Admins already have highest access, no need to change
--
-- Revenue impact:
--   If 10 users get founder tier at $55.55/mo = ~$555/mo foregone
--   But: Builds loyalty, encourages referrals, creates brand ambassadors
--
-- Alternative approaches:
--   1. Lifetime discount instead of free (e.g., $15.55/mo forever)
--   2. Time-limited founder tier (e.g., free for 2 years)
--   3. Founder tier with share limits (e.g., 200/month instead of unlimited)

-- ========================================
-- END OF REFERENCE FILE
-- ========================================
