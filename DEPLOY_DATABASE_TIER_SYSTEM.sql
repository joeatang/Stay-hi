-- ================================================
-- 🚀 TIER SYSTEM DEPLOYMENT - COMPLETE GUIDE
-- ================================================
-- This script updates your database to support the new 6-tier system
-- Run this in Supabase SQL Editor
-- ================================================

-- STEP 1: Backup current admin_generate_invite_code function (optional)
-- You can rollback to this if needed
-- CREATE TABLE IF NOT EXISTS function_backups (
--   id SERIAL PRIMARY KEY,
--   function_name TEXT,
--   function_definition TEXT,
--   backed_up_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- STEP 2: Drop old function (we're replacing it with new signature)
DROP FUNCTION IF EXISTS admin_generate_invite_code(UUID, INTEGER, INTEGER);

-- STEP 3: Create new tier-aware function
CREATE OR REPLACE FUNCTION admin_generate_invite_code(
  p_created_by UUID DEFAULT auth.uid(),
  p_tier TEXT DEFAULT 'premium', -- NEW: Tier selection
  p_trial_days INTEGER DEFAULT NULL, -- NEW: Custom trial days (NULL = use tier default)
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_hours INTEGER DEFAULT 168 -- 7 days default
) RETURNS JSONB AS $$
DECLARE
  new_code TEXT;
  new_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_tier TEXT;
  v_trial_days INTEGER;
  v_allowed_tiers TEXT[] := ARRAY['free', 'bronze', 'silver', 'gold', 'premium', 'collective'];
  v_tier_trial_defaults JSONB := '{
    "free": 0,
    "bronze": 7,
    "silver": 14,
    "gold": 21,
    "premium": 30,
    "collective": 90
  }'::JSONB;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
  -- Validate and normalize tier
  v_tier := LOWER(COALESCE(p_tier, 'premium'));
  IF NOT (v_tier = ANY(v_allowed_tiers)) THEN
    RAISE EXCEPTION 'Invalid tier: %. Allowed tiers: %', p_tier, array_to_string(v_allowed_tiers, ', ');
  END IF;
  
  -- Determine trial days (custom override or tier default)
  IF p_trial_days IS NOT NULL THEN
    v_trial_days := p_trial_days;
  ELSE
    v_trial_days := (v_tier_trial_defaults->v_tier)::INTEGER;
  END IF;
  
  -- Validate trial days
  IF v_trial_days < 0 THEN
    RAISE EXCEPTION 'Trial days cannot be negative';
  END IF;
  
  -- Generate unique 8-character code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END LOOP;
  
  -- Calculate expiration
  v_expires_at := NOW() + INTERVAL '1 hour' * p_expires_in_hours;
  
  -- Insert into invitation_codes table
  INSERT INTO invitation_codes (
    code, 
    code_type, 
    trial_days, 
    grants_tier, 
    max_uses,
    features_granted, 
    valid_until, 
    created_by, 
    is_active
  ) VALUES (
    new_code, 
    'admin_generated', 
    v_trial_days, -- DYNAMIC trial days
    v_tier, -- DYNAMIC tier
    p_max_uses,
    CASE v_tier
      WHEN 'free' THEN ARRAY['basic_access']
      WHEN 'bronze' THEN ARRAY['basic_sharing', 'basic_muscle', 'basic_archive']
      WHEN 'silver' THEN ARRAY['unlimited_sharing', 'full_muscle', 'full_archive', 'calendar']
      WHEN 'gold' THEN ARRAY['unlimited_taps', 'unlimited_sharing', 'full_analytics', 'share_scheduling']
      WHEN 'premium' THEN ARRAY['premium_features', 'location_sharing', 'hi_rewards', 'api_access', 'beta_features']
      WHEN 'collective' THEN ARRAY['admin_panel', 'user_management', 'invite_generation', 'analytics_access', 'content_moderation']
      ELSE ARRAY['premium_features'] -- fallback
    END,
    v_expires_at, 
    p_created_by, 
    true
  ) RETURNING id INTO new_id;
  
  -- Log admin action
  INSERT INTO admin_access_logs (
    user_id, action_type, resource_accessed, success, request_data
  ) VALUES (
    p_created_by, 
    'generate_invite_code', 
    'invitation_management', 
    true,
    jsonb_build_object(
      'code', new_code, 
      'tier', v_tier,
      'trial_days', v_trial_days,
      'expires_hours', p_expires_in_hours, 
      'max_uses', p_max_uses
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'code', new_code,
    'id', new_id,
    'tier', v_tier,
    'trial_days', v_trial_days,
    'expires_at', v_expires_at,
    'max_uses', p_max_uses,
    'created_by', p_created_by,
    'message', format('Invitation code generated successfully for %s tier with %s day trial', 
                      UPPER(v_tier), v_trial_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION admin_generate_invite_code IS 'Generate tier-specific invitation codes with custom trial periods. Supports: free, bronze, silver, gold, premium, collective tiers.';

-- ================================================
-- STEP 4: VERIFICATION - Test the new function
-- ================================================

-- Test 1: Generate Bronze tier code (should use 7-day default)
SELECT admin_generate_invite_code(
  p_tier := 'bronze',
  p_max_uses := 1,
  p_expires_in_hours := 24
);

-- Expected output:
-- {
--   "success": true,
--   "code": "ABC12345",
--   "tier": "bronze",
--   "trial_days": 7,
--   ...
-- }

-- ================================================
-- STEP 5: View generated codes to verify
-- ================================================

SELECT 
  code,
  grants_tier,
  trial_days,
  max_uses,
  current_uses,
  valid_until,
  is_active,
  created_at
FROM invitation_codes
ORDER BY created_at DESC
LIMIT 10;

-- ================================================
-- DEPLOYMENT COMPLETE ✅
-- ================================================
-- 
-- Next steps:
-- 1. Open Mission Control
-- 2. Click "Generate New Invite Code"
-- 3. Select a tier from the dropdown
-- 4. Generate and verify code details
-- 
-- ================================================
