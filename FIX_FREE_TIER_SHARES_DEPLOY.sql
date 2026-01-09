-- ========================================
-- 🚨 CRITICAL FREE TIER FIX - DEPLOY NOW
-- Date: January 7, 2026
-- Purpose: Fix free tier share limits (currently broken)
-- ========================================

-- ========================================
-- STEP 1: BACKUP CURRENT FUNCTION
-- ========================================

-- Create backup of current validation function
CREATE OR REPLACE FUNCTION validate_share_creation_BACKUP_20260107(
  p_share_type TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'hi5'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tier TEXT;
  v_share_limit INTEGER;
  v_shares_this_month INTEGER;
  v_allowed_types TEXT[];
  v_current_month TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Authentication required',
      'upgrade_required', true
    );
  END IF;
  
  SELECT tier INTO v_tier
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;
  
  v_tier := COALESCE(v_tier, 'free');
  
  -- OLD (BROKEN) VALUES - FOR BACKUP ONLY
  CASE v_tier
    WHEN 'free' THEN
      v_share_limit := 0; -- BROKEN: Blocks all shares
      v_allowed_types := ARRAY[]::TEXT[]; -- BROKEN: No types allowed
    WHEN 'bronze' THEN
      v_share_limit := 10;
      v_allowed_types := ARRAY['public', 'anonymous'];
    WHEN 'silver' THEN
      v_share_limit := 50;
      v_allowed_types := ARRAY['public', 'anonymous', 'private'];
    WHEN 'gold', 'premium', 'collective' THEN
      v_share_limit := 999999;
      v_allowed_types := ARRAY['public', 'anonymous', 'private', 'scheduled'];
    ELSE
      v_share_limit := 0;
      v_allowed_types := ARRAY[]::TEXT[];
  END CASE;
  
  IF NOT (p_share_type = ANY(v_allowed_types)) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Share type not available for your tier',
      'tier', v_tier,
      'share_type', p_share_type,
      'upgrade_required', true
    );
  END IF;
  
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT COUNT(*) INTO v_shares_this_month
  FROM user_share_tracking
  WHERE user_id = v_user_id
    AND month_year = v_current_month;
  
  v_shares_this_month := COALESCE(v_shares_this_month, 0);
  
  IF v_shares_this_month >= v_share_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Monthly share limit reached',
      'tier', v_tier,
      'quota', jsonb_build_object(
        'used', v_shares_this_month,
        'limit', v_share_limit,
        'month', v_current_month
      ),
      'upgrade_required', true
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'Share allowed',
    'tier', v_tier,
    'quota', jsonb_build_object(
      'used', v_shares_this_month,
      'limit', v_share_limit,
      'month', v_current_month,
      'remaining', v_share_limit - v_shares_this_month
    )
  );
END;
$$;

COMMENT ON FUNCTION validate_share_creation_BACKUP_20260107 IS 'BACKUP: Original broken function (free tier blocked)';

-- ========================================
-- STEP 2: DEPLOY FIXED FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION validate_share_creation(
  p_share_type TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'hi5'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tier TEXT;
  v_share_limit INTEGER;
  v_shares_this_month INTEGER;
  v_allowed_types TEXT[];
  v_current_month TEXT;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Authentication required',
      'upgrade_required', true
    );
  END IF;
  
  -- Get user's tier from user_memberships
  SELECT tier INTO v_tier
  FROM user_memberships
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- Default to free if no tier found
  v_tier := COALESCE(v_tier, 'free');
  
  -- 🔥 FIXED: Define tier limits (NOW MATCHES TIER_CONFIG.js)
  CASE v_tier
    WHEN 'free' THEN
      v_share_limit := 5; -- ✅ FIXED: 5 shares per month (was 0)
      v_allowed_types := ARRAY['private']; -- ✅ FIXED: Private only (was empty array)
    WHEN 'bronze' THEN
      v_share_limit := 30; -- ✅ UPDATED: 30 shares/month (was 10)
      v_allowed_types := ARRAY['public', 'anonymous', 'private']; -- ✅ UPDATED: All types (bronze gets private now)
    WHEN 'silver' THEN
      v_share_limit := 75; -- ✅ UPDATED: 75 shares/month (was 50)
      v_allowed_types := ARRAY['public', 'anonymous', 'private']; -- All types
    WHEN 'gold', 'premium', 'collective' THEN
      v_share_limit := 999999; -- Unlimited
      v_allowed_types := ARRAY['public', 'anonymous', 'private', 'scheduled']; -- All + scheduled
    ELSE
      v_share_limit := 0; -- Unknown tier = block
      v_allowed_types := ARRAY[]::TEXT[];
  END CASE;
  
  -- Check if share type is allowed for tier
  IF NOT (p_share_type = ANY(v_allowed_types)) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Share type not available for your tier',
      'tier', v_tier,
      'share_type', p_share_type,
      'upgrade_required', true
    );
  END IF;
  
  -- Check monthly quota
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT COUNT(*) INTO v_shares_this_month
  FROM user_share_tracking
  WHERE user_id = v_user_id
    AND month_year = v_current_month;
  
  v_shares_this_month := COALESCE(v_shares_this_month, 0);
  
  -- Check if limit exceeded
  IF v_shares_this_month >= v_share_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Monthly share limit reached',
      'tier', v_tier,
      'quota', jsonb_build_object(
        'used', v_shares_this_month,
        'limit', v_share_limit,
        'month', v_current_month
      ),
      'upgrade_required', true
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'Share allowed',
    'tier', v_tier,
    'quota', jsonb_build_object(
      'used', v_shares_this_month,
      'limit', v_share_limit,
      'month', v_current_month,
      'remaining', v_share_limit - v_shares_this_month
    )
  );
END;
$$;

COMMENT ON FUNCTION validate_share_creation IS '✅ FIXED: Free tier now allows 5 private shares/month (matches TIER_CONFIG.js)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_share_creation(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_share_creation(TEXT, TEXT) TO anon;

-- ========================================
-- STEP 3: VERIFICATION QUERIES
-- ========================================

-- Test free tier validation (should return allowed=true for private shares under 5)
SELECT validate_share_creation('private', 'test') as free_tier_private;

-- Expected result:
-- { "allowed": true, "reason": "Share allowed", "tier": "free", 
--   "quota": { "used": 0, "limit": 5, "month": "2026-01", "remaining": 5 } }

-- Test free tier public share (should be blocked)
SELECT validate_share_creation('public', 'test') as free_tier_public;

-- Expected result:
-- { "allowed": false, "reason": "Share type not available for your tier", 
--   "tier": "free", "share_type": "public" }

-- ========================================
-- STEP 4: CHECK EXISTING USERS (OPTIONAL)
-- ========================================

-- ⚠️ NOTE: This step is OPTIONAL and may fail if user_share_tracking table doesn't exist yet
-- The table is created in tier_enforcement_share_validation.sql
-- If this query fails, it's safe to skip - Steps 1-3 are the critical fixes

-- Count users by tier (this always works)
SELECT 
  tier,
  COUNT(*) as user_count
FROM user_memberships
GROUP BY tier
ORDER BY 
  CASE tier
    WHEN 'free' THEN 1
    WHEN 'bronze' THEN 2
    WHEN 'silver' THEN 3
    WHEN 'gold' THEN 4
    WHEN 'premium' THEN 5
    WHEN 'collective' THEN 6
    ELSE 99
  END;

-- Check if any free tier users have exceeded 5 shares this month
-- ⚠️ SKIP THIS IF TABLE DOESN'T EXIST (safe to ignore error)
SELECT 
  u.email,
  COUNT(ust.id) as shares_this_month
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
LEFT JOIN user_share_tracking ust ON ust.user_id = um.user_id 
  AND ust.month_year = TO_CHAR(NOW(), 'YYYY-MM')
WHERE um.tier = 'free'
GROUP BY u.email, um.tier
HAVING COUNT(ust.id) > 5
ORDER BY shares_this_month DESC;

-- Expected: 0 rows (free tier was blocked, so no one could share)
-- If error: "relation 'user_share_tracking' does not exist" → SAFE TO IGNORE

-- ========================================
-- STEP 5: ROLLBACK PROCEDURE (EMERGENCY ONLY)
-- ========================================

-- ⚠️ ONLY USE IF CRITICAL BUG DISCOVERED AFTER DEPLOYMENT ⚠️
-- This is commented out - only uncomment if you need to restore old behavior

-- Restore original broken function (blocks free tier completely)
-- CREATE OR REPLACE FUNCTION validate_share_creation(p_share_type TEXT DEFAULT 'public', p_origin TEXT DEFAULT 'hi5')
-- RETURNS JSONB
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   RETURN validate_share_creation_BACKUP_20260107(p_share_type, p_origin);
-- END;
-- $$;

-- ========================================
-- DEPLOYMENT NOTES
-- ========================================

-- WHAT THIS FIXES:
-- 1. Free tier can now create 5 private shares per month (was completely blocked)
-- 2. Bronze tier limits updated to 30 shares/month (was 10)
-- 3. Bronze tier can now create private shares (was only public/anonymous)
-- 4. Silver tier limits updated to 75 shares/month (was 50)
-- 5. All tier limits now match TIER_CONFIG.js exactly

-- IMPACT:
-- - Zero breaking changes for existing users
-- - Free tier users can finally test sharing feature
-- - Bronze/Silver tier users get more shares (upgrade, not downgrade)
-- - No data loss or migration needed

-- TESTING CHECKLIST:
-- [ ] Run verification queries above
-- [ ] Check that free tier user can create private share
-- [ ] Check that free tier user CANNOT create public share
-- [ ] Check that bronze tier user can create all share types
-- [ ] Check that free tier stops at 5 shares
-- [ ] Monitor logs for errors after deployment

-- DEPLOYED BY: [Your Name]
-- DEPLOYED AT: [Timestamp]
-- VERIFIED BY: [Your Name]
