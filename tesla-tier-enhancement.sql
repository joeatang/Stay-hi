-- 🎯 TESLA-GRADE TEMPORAL ACCESS ENHANCEMENT
-- Extends existing hi-database-foundation.sql with temporal access codes
-- Preserves all existing functionality while adding gold standard tier system

-- ===================================================================
-- 🚀 ENHANCED ACCESS TIER SYSTEM
-- ===================================================================

-- Enhanced membership tiers with temporal access support
ALTER TABLE hi_members 
ADD COLUMN IF NOT EXISTS access_tier INTEGER DEFAULT 1 CHECK (access_tier BETWEEN 0 AND 3),
ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_code_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS tier_upgraded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tier_history JSONB DEFAULT '[]';

-- Update existing membership_tier check to align with new system
ALTER TABLE hi_members 
DROP CONSTRAINT IF EXISTS hi_members_membership_tier_check,
ADD CONSTRAINT hi_members_membership_tier_check 
CHECK (membership_tier IN ('discovery', 'starter', 'enhanced', 'lifetime'));

-- ===================================================================
-- 🎫 TEMPORAL ACCESS CODES SYSTEM
-- ===================================================================

-- Access codes for 7/15/30/90 day temporary tier upgrades
CREATE TABLE IF NOT EXISTS hi_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code Details
  code VARCHAR(50) UNIQUE NOT NULL,
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('discovery_24h', 'trial_7d', 'standard_15d', 'standard_30d', 'power_90d')),
  
  -- Access Grants
  grants_tier INTEGER NOT NULL CHECK (grants_tier BETWEEN 1 AND 3), -- Tier 1, 2, or 3 access
  duration_hours INTEGER, -- For 24hr codes: 24
  duration_days INTEGER, -- For multi-day codes: 7, 15, 30, 90
  
  -- Usage Tracking
  created_by UUID, -- Admin who created the code
  used_by UUID REFERENCES hi_members(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- When the granted access expires
  
  -- Limits & Controls
  max_uses INTEGER DEFAULT 1, -- How many times code can be used
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT -- Admin notes about the code purpose
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON hi_access_codes (code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_codes_type ON hi_access_codes (code_type, is_active);
CREATE INDEX IF NOT EXISTS idx_access_codes_expiry ON hi_access_codes (expires_at) WHERE used_at IS NOT NULL;

-- ===================================================================
-- 🔍 ANONYMOUS SESSION TRACKING
-- ===================================================================

-- Track anonymous users for conversion analytics (no PII)
CREATE TABLE IF NOT EXISTS hi_anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session Identification (hashed for privacy)
  session_hash VARCHAR(64) UNIQUE NOT NULL, -- Hashed browser fingerprint
  
  -- Engagement Tracking
  page_views INTEGER DEFAULT 0,
  shares_viewed INTEGER DEFAULT 0,
  drop_hi_attempts INTEGER DEFAULT 0, -- Clicked but didn't complete
  medallion_taps INTEGER DEFAULT 0,
  
  -- Conversion Funnel
  showed_signup_prompt BOOLEAN DEFAULT false,
  completed_signup BOOLEAN DEFAULT false,
  converted_member_id UUID REFERENCES hi_members(id) ON DELETE SET NULL,
  
  -- Timestamps
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  session_duration INTERVAL GENERATED ALWAYS AS (last_activity - first_seen) STORED
);

-- Performance and cleanup indexes
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_hash ON hi_anonymous_sessions (session_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_activity ON hi_anonymous_sessions (last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_conversion ON hi_anonymous_sessions (completed_signup, converted_member_id);

-- Auto-cleanup old anonymous sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM hi_anonymous_sessions 
  WHERE last_activity < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 🎯 TIER MANAGEMENT FUNCTIONS
-- ===================================================================

-- Function to check and update user access tier
CREATE OR REPLACE FUNCTION check_user_access_tier(user_member_id UUID)
RETURNS TABLE(
  current_tier INTEGER,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  tier_name TEXT
) AS $$
DECLARE
  member_record hi_members%ROWTYPE;
  tier_name_result TEXT;
BEGIN
  -- Get current member data
  SELECT * INTO member_record FROM hi_members WHERE id = user_member_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, NULL::TIMESTAMPTZ, true, 'Not Found';
    RETURN;
  END IF;
  
  -- Check if temporal access has expired
  IF member_record.tier_expires_at IS NOT NULL AND member_record.tier_expires_at < now() THEN
    -- Downgrade to Tier 1 (Starter)
    UPDATE hi_members 
    SET access_tier = 1, 
        membership_tier = 'starter',
        tier_expires_at = NULL
    WHERE id = user_member_id;
    member_record.access_tier := 1;
    member_record.tier_expires_at := NULL;
  END IF;
  
  -- Determine tier name
  tier_name_result := CASE member_record.access_tier
    WHEN 0 THEN 'Discovery (Anonymous)'
    WHEN 1 THEN 'Starter (Email Verified)'
    WHEN 2 THEN 'Enhanced (Temporal Access)'
    WHEN 3 THEN 'Lifetime (Special Access)'
    ELSE 'Unknown'
  END;
  
  RETURN QUERY SELECT 
    member_record.access_tier,
    member_record.tier_expires_at,
    (member_record.tier_expires_at IS NOT NULL AND member_record.tier_expires_at < now()),
    tier_name_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem access code
CREATE OR REPLACE FUNCTION redeem_access_code(user_member_id UUID, access_code TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_tier INTEGER,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  code_record hi_access_codes%ROWTYPE;
  member_record hi_members%ROWTYPE;
  new_expiry TIMESTAMPTZ;
BEGIN
  -- Validate access code
  SELECT * INTO code_record FROM hi_access_codes 
  WHERE code = access_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or inactive access code', 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check usage limits
  IF code_record.current_uses >= code_record.max_uses THEN
    RETURN QUERY SELECT false, 'Access code has reached usage limit', 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get member info
  SELECT * INTO member_record FROM hi_members WHERE id = user_member_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Member not found', 0, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Calculate new expiry date
  new_expiry := CASE 
    WHEN code_record.duration_hours > 0 THEN 
      now() + (code_record.duration_hours || ' hours')::INTERVAL
    ELSE 
      now() + (code_record.duration_days || ' days')::INTERVAL
  END;
  
  -- Update member tier
  UPDATE hi_members 
  SET 
    access_tier = code_record.grants_tier,
    tier_expires_at = new_expiry,
    access_code_used = access_code,
    tier_upgraded_at = now(),
    membership_tier = CASE code_record.grants_tier
      WHEN 2 THEN 'enhanced'
      WHEN 3 THEN 'lifetime'
      ELSE membership_tier
    END,
    tier_history = tier_history || jsonb_build_object(
      'timestamp', now(),
      'action', 'code_redeemed',
      'code', access_code,
      'from_tier', access_tier,
      'to_tier', code_record.grants_tier,
      'expires_at', new_expiry
    )
  WHERE id = user_member_id;
  
  -- Update code usage
  UPDATE hi_access_codes 
  SET 
    current_uses = current_uses + 1,
    used_by = CASE WHEN used_by IS NULL THEN user_member_id ELSE used_by END,
    used_at = CASE WHEN used_at IS NULL THEN now() ELSE used_at END,
    expires_at = new_expiry
  WHERE id = code_record.id;
  
  RETURN QUERY SELECT true, 'Access code redeemed successfully', code_record.grants_tier, new_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 🔐 ENHANCED RLS POLICIES FOR TIER SYSTEM
-- ===================================================================

-- Policy for tier-based share access
CREATE POLICY IF NOT EXISTS "tier_based_share_access" ON hi_shares_geo
FOR SELECT USING (
  -- Tier 0 (Anonymous): Only public shares
  CASE 
    WHEN auth.uid() IS NULL THEN visibility = 'public' AND moderation_status = 'approved'
    -- Tier 1+ (Authenticated): Own shares + public shares
    ELSE visibility = 'public' OR member_id IN (
      SELECT id FROM hi_members WHERE user_id = auth.uid()
    )
  END
);

-- Policy for tier-based member profile access  
CREATE POLICY IF NOT EXISTS "tier_based_profile_access" ON hi_members
FOR SELECT USING (
  -- Anonymous: Only public profiles
  CASE 
    WHEN auth.uid() IS NULL THEN profile_visibility = 'public'
    -- Authenticated: Own profile + public profiles
    ELSE user_id = auth.uid() OR profile_visibility = 'public'
  END
);

-- ===================================================================
-- 🚀 TIER UPGRADE TRIGGERS
-- ===================================================================

-- Trigger to update tier history when access_tier changes
CREATE OR REPLACE FUNCTION log_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.access_tier IS DISTINCT FROM NEW.access_tier THEN
    NEW.tier_history = COALESCE(NEW.tier_history, '[]'::jsonb) || jsonb_build_object(
      'timestamp', now(),
      'action', 'tier_changed',
      'from_tier', OLD.access_tier,
      'to_tier', NEW.access_tier,
      'method', 'system_update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS tier_change_logger
BEFORE UPDATE ON hi_members
FOR EACH ROW
EXECUTE FUNCTION log_tier_change();

-- ===================================================================
-- 🎯 24HR DISCOVERY CODE GENERATION
-- ===================================================================

-- Function to generate 24hr discovery access codes
CREATE OR REPLACE FUNCTION generate_24hr_discovery_code(
  code_suffix TEXT DEFAULT NULL,
  batch_size INTEGER DEFAULT 1
)
RETURNS TABLE(
  code TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  i INTEGER;
  code_value TEXT;
  code_expiry TIMESTAMPTZ;
BEGIN
  -- Set expiry to 24 hours from generation
  code_expiry := now() + interval '24 hours';
  
  FOR i IN 1..batch_size LOOP
    -- Generate unique 8-character code
    code_value := 'HI24' || upper(substring(md5(random()::text), 1, 4));
    
    -- Add suffix if provided
    IF code_suffix IS NOT NULL THEN
      code_value := code_value || '-' || upper(code_suffix);
    END IF;
    
    -- Insert the code
    INSERT INTO hi_access_codes (
      code,
      code_type,
      grants_tier,
      duration_hours,
      duration_days,
      max_uses,
      expires_at,
      created_by,
      metadata
    ) VALUES (
      code_value,
      'discovery_24h',
      1, -- Starter tier
      24, -- 24 hours
      0, -- No days (using hours instead)
      1, -- Single use
      code_expiry,
      (SELECT id FROM hi_members WHERE email = 'system@stay-hi.com' LIMIT 1),
      jsonb_build_object(
        'purpose', '24hr_discovery',
        'generated_at', now(),
        'batch_id', gen_random_uuid()
      )
    );
    
    RETURN QUERY SELECT code_value, code_expiry;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 📊 ANALYTICS VIEWS FOR CONVERSION TRACKING
-- ===================================================================

-- View for conversion funnel analysis
CREATE OR REPLACE VIEW hi_conversion_funnel AS
SELECT 
  date_trunc('day', first_seen) as date,
  COUNT(*) as total_anonymous_sessions,
  SUM(CASE WHEN showed_signup_prompt THEN 1 ELSE 0 END) as prompted_signups,
  SUM(CASE WHEN completed_signup THEN 1 ELSE 0 END) as completed_signups,
  ROUND(
    (SUM(CASE WHEN completed_signup THEN 1 ELSE 0 END)::FLOAT / 
     NULLIF(SUM(CASE WHEN showed_signup_prompt THEN 1 ELSE 0 END), 0)) * 100, 2
  ) as conversion_rate_percent
FROM hi_anonymous_sessions
WHERE first_seen >= now() - interval '30 days'
GROUP BY date_trunc('day', first_seen)
ORDER BY date DESC;

-- View for tier distribution
CREATE OR REPLACE VIEW hi_tier_distribution AS
SELECT 
  access_tier,
  CASE access_tier
    WHEN 0 THEN 'Discovery (Anonymous)'
    WHEN 1 THEN 'Starter (Email Verified)'  
    WHEN 2 THEN 'Enhanced (Temporal Access)'
    WHEN 3 THEN 'Lifetime (Special Access)'
    ELSE 'Unknown'
  END as tier_name,
  COUNT(*) as member_count,
  ROUND((COUNT(*)::FLOAT / (SELECT COUNT(*) FROM hi_members)) * 100, 2) as percentage
FROM hi_members 
WHERE is_active = true
GROUP BY access_tier
ORDER BY access_tier;