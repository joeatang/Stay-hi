-- ================================================================
-- WOZ-GRADE TIER SYSTEM FIX - SINGLE SOURCE OF TRUTH
-- ================================================================
-- Problem: Three systems fighting (database, RPC, frontend)
-- Solution: Make database the ONLY source of truth
-- 
-- TIER HIERARCHY (4 tiers matching pricing):
-- 1. free ($0) - Basic access, default for new users
-- 2. bronze ($5.55/mo) - Entry paid tier
-- 3. premium ($55.55/mo) - Full features
-- 4. collective ($555 lifetime) - Admin/lifetime access
-- ================================================================

-- STEP 1: Update database constraint to match actual tiers
ALTER TABLE hi_members 
DROP CONSTRAINT IF EXISTS hi_members_membership_tier_check;

ALTER TABLE hi_members
ADD CONSTRAINT hi_members_membership_tier_check
CHECK (membership_tier IN ('free', 'bronze', 'premium', 'collective'));

-- STEP 2: Migrate existing data to new tier names
-- Map old tier names to new standard names
UPDATE hi_members
SET membership_tier = CASE
  -- Old names → New standard names
  WHEN membership_tier IN ('explorer', 'discovery', 'starter') THEN 'free'
  WHEN membership_tier IN ('enhanced', 'silver', 'gold') THEN 'bronze'
  WHEN membership_tier IN ('vip', 'premium', 'pioneer') THEN 'premium'
  WHEN membership_tier = 'collective' THEN 'collective'
  -- Fallback
  ELSE 'free'
END
WHERE membership_tier NOT IN ('free', 'bronze', 'premium', 'collective');

-- STEP 3: Fix the get_unified_membership RPC to read directly from database
CREATE OR REPLACE FUNCTION get_unified_membership()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_member RECORD;
  v_result JSON;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    -- Anonymous user
    RETURN json_build_object(
      'tier', 'free',
      'status', 'anonymous',
      'is_admin', false,
      'isAnonymous', true
    );
  END IF;

  -- Get member record - THIS IS THE SINGLE SOURCE OF TRUTH
  SELECT * INTO v_member
  FROM hi_members
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    -- User exists but no member record - create it
    INSERT INTO hi_members (user_id, membership_tier, is_active)
    VALUES (v_user_id, 'free', true)
    RETURNING * INTO v_member;
  END IF;

  -- Build response using ONLY database values (no transformation)
  v_result := json_build_object(
    'tier', v_member.membership_tier,  -- Use EXACT database value
    'displayName', CASE v_member.membership_tier
      WHEN 'free' THEN 'Hi Explorer'
      WHEN 'bronze' THEN 'Hi Pathfinder'
      WHEN 'premium' THEN 'Hi Pioneer'
      WHEN 'collective' THEN 'Hi Collective'
      ELSE 'Hi Friend'
    END,
    'status', CASE
      WHEN NOT v_member.is_active THEN 'inactive'
      WHEN v_member.membership_expires_at IS NOT NULL 
        AND v_member.membership_expires_at < NOW() THEN 'expired'
      ELSE 'active'
    END,
    'expires_at', v_member.membership_expires_at,
    'is_admin', COALESCE(v_member.is_admin, false),
    'isAnonymous', false,
    'username', v_member.username,
    'avatar_url', v_member.avatar_url
  );

  RETURN v_result;
END;
$$;

-- STEP 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_unified_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_membership() TO anon;

-- STEP 5: Verify your account specifically
SELECT 
  user_id,
  username,
  membership_tier as "Current Tier",
  is_admin,
  created_at
FROM hi_members
WHERE username = 'joeatang';

-- Show all tiers in use
SELECT 
  membership_tier,
  COUNT(*) as user_count
FROM hi_members
GROUP BY membership_tier
ORDER BY membership_tier;
