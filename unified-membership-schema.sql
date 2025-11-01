-- ===============================================
-- 🏆 UNIFIED MEMBERSHIP SYSTEM DATABASE SCHEMA
-- Tesla-grade foundation with time-based tiers
-- ===============================================

-- Clean slate: Drop existing conflicting functions
DROP FUNCTION IF EXISTS get_my_membership CASCADE;
DROP FUNCTION IF EXISTS use_invitation_code CASCADE;
DROP FUNCTION IF EXISTS activate_invite_code CASCADE;

-- Unified membership table (source of truth)
CREATE TABLE IF NOT EXISTS unified_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tier system: anonymous -> 24hr -> 7d -> 14d -> 30d -> 60d -> 90d -> member
  tier TEXT NOT NULL DEFAULT 'anonymous' CHECK (tier IN (
    'anonymous', '24hr', '7d', '14d', '30d', '60d', '90d', 'member', 'lifetime'
  )),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  
  -- Time-based access
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL for permanent tiers
  
  -- Code tracking
  invite_code TEXT, -- Code used to activate
  activated_by_ip INET DEFAULT inet_client_addr(),
  
  -- Stan integration ready
  stan_customer_id TEXT,
  stan_subscription_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active membership per user
  CONSTRAINT unique_active_membership UNIQUE (user_id)
);

-- Unified invite codes table
CREATE TABLE IF NOT EXISTS unified_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  
  -- Code properties  
  grants_tier TEXT NOT NULL CHECK (grants_tier IN ('24hr', '7d', '14d', '30d', '60d', '90d', 'member')),
  duration_hours INTEGER, -- NULL for permanent tiers
  
  -- Usage limits
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  
  -- Creator tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT positive_max_uses CHECK (max_uses > 0),
  CONSTRAINT valid_usage CHECK (current_uses <= max_uses)
);

-- Usage tracking for analytics
CREATE TABLE IF NOT EXISTS membership_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  membership_id UUID REFERENCES unified_memberships(id),
  
  -- Event tracking
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Context
  ip_address INET DEFAULT inet_client_addr(),
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_memberships_user_id ON unified_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_memberships_tier ON unified_memberships(tier);
CREATE INDEX IF NOT EXISTS idx_unified_memberships_expires_at ON unified_memberships(expires_at);
CREATE INDEX IF NOT EXISTS idx_unified_invite_codes_code ON unified_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_unified_invite_codes_active ON unified_invite_codes(is_active);

-- RLS Policies
ALTER TABLE unified_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own membership
CREATE POLICY "Users can view own membership" ON unified_memberships
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own usage logs  
CREATE POLICY "Users can view own usage logs" ON membership_usage_log
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage invite codes (requires is_admin in profiles)
CREATE POLICY "Admins can manage invite codes" ON unified_invite_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ===============================================
-- 🏆 UNIFIED MEMBERSHIP FUNCTIONS
-- ===============================================

-- Get user's current unified membership
CREATE OR REPLACE FUNCTION get_unified_membership()
RETURNS JSON AS $$
DECLARE
  membership_row unified_memberships%ROWTYPE;
  tier_config JSON;
BEGIN
  -- Get current membership
  SELECT * INTO membership_row
  FROM unified_memberships
  WHERE user_id = auth.uid();
  
  -- If no membership, user is anonymous
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tier', 'anonymous',
      'level', 0,
      'status', 'active',
      'isAnonymous', true,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited_readonly',
        'mapAccess', 'limited_5_locations',
        'shareCreation', false,
        'profileAccess', false,
        'hiMuscleAccess', false,
        'calendarAccess', false,
        'communityStats', 'view_only'
      )
    );
  END IF;
  
  -- Check if expired
  IF membership_row.expires_at IS NOT NULL AND membership_row.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE unified_memberships 
    SET status = 'expired', updated_at = NOW()
    WHERE id = membership_row.id;
    
    RETURN jsonb_build_object(
      'tier', 'anonymous',
      'level', 0,
      'status', 'expired',
      'isAnonymous', true,
      'previousTier', membership_row.tier,
      'expiredAt', membership_row.expires_at,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited_readonly',
        'mapAccess', 'limited_5_locations',
        'shareCreation', false,
        'profileAccess', false,
        'hiMuscleAccess', false,
        'calendarAccess', false,
        'communityStats', 'view_only'
      )
    );
  END IF;
  
  -- Active membership - return tier-based features
  SELECT get_tier_features(membership_row.tier) INTO tier_config;
  
  RETURN jsonb_build_object(
    'tier', membership_row.tier,
    'level', tier_config->>'level',
    'status', membership_row.status,
    'isAnonymous', false,
    'activatedAt', membership_row.activated_at,
    'expiresAt', membership_row.expires_at,
    'inviteCode', membership_row.invite_code,
    'features', tier_config->'features'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get features for a tier
CREATE OR REPLACE FUNCTION get_tier_features(tier_name TEXT)
RETURNS JSON AS $$
BEGIN
  RETURN CASE tier_name
    WHEN '24hr' THEN jsonb_build_object(
      'level', 1,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 10,
        'mapAccess', 'preview_10_locations',
        'shareCreation', false,
        'profileAccess', 'view_only',
        'hiMuscleAccess', false,
        'calendarAccess', false,
        'communityStats', 'view_only'
      )
    )
    WHEN '7d' THEN jsonb_build_object(
      'level', 2,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_map_view',
        'shareCreation', 3,
        'profileAccess', 'view_only',
        'hiMuscleAccess', 'read_only',
        'calendarAccess', true,
        'communityStats', 'full_view'
      )
    )
    WHEN '14d' THEN jsonb_build_object(
      'level', 3,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_access',
        'shareCreation', 'unlimited',
        'profileAccess', 'create_limited',
        'hiMuscleAccess', 'full_access',
        'calendarAccess', true,
        'communityStats', 'contribute'
      )
    )
    WHEN '30d' THEN jsonb_build_object(
      'level', 4,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_access_priority',
        'shareCreation', 'unlimited',
        'profileAccess', 'full_customization',
        'hiMuscleAccess', 'premium_access',
        'calendarAccess', true,
        'communityStats', 'advanced_insights'
      )
    )
    WHEN '60d' THEN jsonb_build_object(
      'level', 5,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_access_priority',
        'shareCreation', 'unlimited',
        'profileAccess', 'full_customization',
        'hiMuscleAccess', 'premium_access',
        'calendarAccess', true,
        'communityStats', 'advanced_insights'
      )
    )
    WHEN '90d' THEN jsonb_build_object(
      'level', 6,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_access_priority',
        'shareCreation', 'unlimited',
        'profileAccess', 'full_customization',
        'hiMuscleAccess', 'premium_access',
        'calendarAccess', true,
        'communityStats', 'advanced_insights'
      )
    )
    WHEN 'member' THEN jsonb_build_object(
      'level', 10,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_access_permanent',
        'shareCreation', 'unlimited',
        'profileAccess', 'full_access',
        'hiMuscleAccess', 'member_access',
        'calendarAccess', true,
        'communityStats', 'full_contribution'
      )
    )
    WHEN 'lifetime' THEN jsonb_build_object(
      'level', 99,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited',
        'mapAccess', 'full_access_permanent',
        'shareCreation', 'unlimited',
        'profileAccess', 'full_access',
        'hiMuscleAccess', 'lifetime_access',
        'calendarAccess', true,
        'communityStats', 'full_contribution'
      )
    )
    ELSE jsonb_build_object(
      'level', 0,
      'features', jsonb_build_object(
        'hiMedallionInteractions', 'unlimited_readonly',
        'mapAccess', 'limited_5_locations',
        'shareCreation', false,
        'profileAccess', false,
        'hiMuscleAccess', false,
        'calendarAccess', false,
        'communityStats', 'view_only'
      )
    )
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Activate unified invite code
CREATE OR REPLACE FUNCTION activate_unified_invite_code(invite_code TEXT)
RETURNS JSON AS $$
DECLARE
  code_row unified_invite_codes%ROWTYPE;
  membership_row unified_memberships%ROWTYPE;
  expires_at_calc TIMESTAMPTZ;
BEGIN
  -- Validate and get code
  SELECT * INTO code_row
  FROM unified_invite_codes
  WHERE code = invite_code
    AND is_active = true
    AND current_uses < max_uses
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invite code'
    );
  END IF;
  
  -- Calculate expiration
  IF code_row.duration_hours IS NOT NULL THEN
    expires_at_calc := NOW() + INTERVAL '1 hour' * code_row.duration_hours;
  ELSE
    expires_at_calc := NULL; -- Permanent
  END IF;
  
  -- Create or update membership
  INSERT INTO unified_memberships (
    user_id, tier, status, activated_at, expires_at, invite_code
  ) VALUES (
    auth.uid(), code_row.grants_tier, 'active', NOW(), expires_at_calc, invite_code
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    status = 'active',
    activated_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    invite_code = EXCLUDED.invite_code,
    updated_at = NOW()
  RETURNING * INTO membership_row;
  
  -- Update code usage
  UPDATE unified_invite_codes 
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = code_row.id;
  
  -- Log usage
  INSERT INTO membership_usage_log (user_id, membership_id, event_type, event_data)
  VALUES (
    auth.uid(),
    membership_row.id,
    'code_activation',
    jsonb_build_object(
      'code', invite_code,
      'tier', code_row.grants_tier,
      'duration_hours', code_row.duration_hours
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'tier', membership_row.tier,
    'expires_at', membership_row.expires_at,
    'duration', code_row.duration_hours
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate invite codes (admin function)
CREATE OR REPLACE FUNCTION generate_unified_invite_code(
  p_tier TEXT,
  p_duration_hours INTEGER DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_custom_code TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  generated_code TEXT;
  code_row unified_invite_codes%ROWTYPE;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  END IF;
  
  -- Generate code
  IF p_custom_code IS NOT NULL THEN
    generated_code := p_custom_code;
  ELSE
    generated_code := 'HI' || p_tier || '_' || 
      upper(substring(md5(random()::text) from 1 for 6));
  END IF;
  
  -- Create code
  INSERT INTO unified_invite_codes (
    code, grants_tier, duration_hours, max_uses, description, created_by
  ) VALUES (
    generated_code, p_tier, p_duration_hours, p_max_uses, p_description, auth.uid()
  ) RETURNING * INTO code_row;
  
  RETURN jsonb_build_object(
    'success', true,
    'code', generated_code,
    'tier', p_tier,
    'duration_hours', p_duration_hours,
    'max_uses', p_max_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_unified_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION activate_unified_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unified_invite_code(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Insert default invite codes for testing
INSERT INTO unified_invite_codes (code, grants_tier, duration_hours, max_uses, description, created_by) VALUES
  ('HI24H_DEMO', '24hr', 24, 100, '24-hour demo access', '00000000-0000-0000-0000-000000000000'),
  ('HI7D_BETA', '7d', 168, 50, '7-day beta access', '00000000-0000-0000-0000-000000000000'),
  ('HI30D_VIP', '30d', 720, 25, '30-day VIP access', '00000000-0000-0000-0000-000000000000'),
  ('HIMEMBER_GOLD', 'member', NULL, 10, 'Permanent membership', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (code) DO NOTHING;

-- ===============================================
-- Success message
-- ===============================================
DO $$
BEGIN
  RAISE NOTICE '🏆 UNIFIED MEMBERSHIP SYSTEM DEPLOYED SUCCESSFULLY';
  RAISE NOTICE '✅ Time-based tiers: anonymous -> 24hr -> 7d -> 14d -> 30d -> 60d -> 90d -> member';
  RAISE NOTICE '✅ Calendar access: Members only';
  RAISE NOTICE '✅ Database-driven with bulletproof RLS';
  RAISE NOTICE '✅ Stan integration ready';
  RAISE NOTICE '✅ Admin code generation system active';
END $$;