-- ========================================
-- 🚀 PHASE 4A: TESLA-GRADE TIER SYSTEM DEPLOYMENT
-- Production-Ready Database Schema Enhancement
-- Date: November 10, 2025
-- ========================================

-- This script safely enhances the existing production database with:
-- 1. Tesla-grade 5-tier system (0,1,2,3,4) with Admin access
-- 2. 24hr access code system with admin generation
-- 3. Stan membership integration with webhook processing
-- 4. Temporal access management and admin controls

BEGIN;

-- ========================================
-- 🔧 STEP 0: EXTENSION REQUIREMENTS
-- ========================================

-- Enable PostGIS extension for geographic data types (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ========================================
-- 🏗️ STEP 1: ENHANCE EXISTING TABLES
-- ========================================

-- Enhance hi_members table (if exists) or create it
DO $$
BEGIN
    -- Check if hi_members exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_members') THEN
        -- Create hi_members table if it doesn't exist
        CREATE TABLE hi_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            username VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100),
            bio TEXT,
            avatar_url TEXT,
            location_city VARCHAR(100),
            location_state VARCHAR(50),
            location_country VARCHAR(50),
            coordinates GEOGRAPHY(POINT, 4326),
            membership_tier VARCHAR(20) DEFAULT 'explorer' CHECK (membership_tier IN ('explorer', 'starter', 'enhanced', 'collective')),
            membership_expires_at TIMESTAMPTZ,
            total_hi_count INTEGER DEFAULT 0,
            hi_streak INTEGER DEFAULT 0,
            last_hi_date DATE,
            profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
            location_sharing BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            is_active BOOLEAN DEFAULT true,
            CONSTRAINT unique_user_member UNIQUE (user_id)
        );
        
        -- Create indexes for new table
        CREATE INDEX IF NOT EXISTS idx_hi_members_coordinates ON hi_members USING GIST (coordinates);
        CREATE INDEX IF NOT EXISTS idx_hi_members_location ON hi_members (location_city, location_state);
        CREATE INDEX IF NOT EXISTS idx_hi_members_user_id ON hi_members (user_id);
        
        RAISE NOTICE '✅ Created new hi_members table with Tesla-grade tier system';
    END IF;
    
    -- Add tier system columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'access_tier') THEN
        ALTER TABLE hi_members 
        ADD COLUMN access_tier INTEGER DEFAULT 0 CHECK (access_tier BETWEEN 0 AND 4);
        RAISE NOTICE '✅ Added access_tier column to hi_members (5-tier system: 0-4, defaults to Explorer)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'tier_expires_at') THEN
        ALTER TABLE hi_members 
        ADD COLUMN tier_expires_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added tier_expires_at column to hi_members';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'access_code_used') THEN
        ALTER TABLE hi_members 
        ADD COLUMN access_code_used VARCHAR(50);
        RAISE NOTICE '✅ Added access_code_used column to hi_members';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'tier_upgraded_at') THEN
        ALTER TABLE hi_members 
        ADD COLUMN tier_upgraded_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added tier_upgraded_at column to hi_members';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'tier_history') THEN
        ALTER TABLE hi_members 
        ADD COLUMN tier_history JSONB DEFAULT '[]';
        RAISE NOTICE '✅ Added tier_history column to hi_members';
    END IF;
    
    -- Add Stan integration columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'stan_customer_id') THEN
        ALTER TABLE hi_members 
        ADD COLUMN stan_customer_id TEXT,
        ADD COLUMN billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
        ADD COLUMN subscription_amount DECIMAL(10,2),
        ADD COLUMN subscription_start TIMESTAMPTZ,
        ADD COLUMN subscription_status TEXT CHECK (subscription_status IN ('active', 'paused', 'cancelled', 'expired')),
        ADD COLUMN conversion_source TEXT;
        RAISE NOTICE '✅ Added Stan integration columns to hi_members';
    END IF;
    
    -- Update membership_tier constraint to include new tiers
    ALTER TABLE hi_members 
    DROP CONSTRAINT IF EXISTS hi_members_membership_tier_check;
    
    ALTER TABLE hi_members 
    ADD CONSTRAINT hi_members_membership_tier_check 
    CHECK (membership_tier IN ('explorer', 'starter', 'enhanced', 'collective'));
    
    RAISE NOTICE '✅ Updated membership_tier constraint for Explorer branding';
    
END $$;

-- ========================================
-- 🎫 STEP 2: ACCESS CODES SYSTEM
-- ========================================

-- Access codes for temporal tier upgrades
CREATE TABLE IF NOT EXISTS hi_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('discovery_24h', 'enhanced_7d', 'enhanced_15d', 'enhanced_30d', 'collective_90d')),
  grants_tier INTEGER NOT NULL CHECK (grants_tier BETWEEN 0 AND 4),
  duration_hours INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure either hours or days is specified
  CONSTRAINT duration_specified CHECK (duration_hours > 0 OR duration_days > 0)
);

-- Indexes for access codes
CREATE INDEX IF NOT EXISTS idx_hi_access_codes_code ON hi_access_codes (code);
CREATE INDEX IF NOT EXISTS idx_hi_access_codes_active ON hi_access_codes (is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_hi_access_codes_type ON hi_access_codes (code_type);

-- ========================================
-- 🎯 STEP 3: TIER MANAGEMENT FUNCTIONS
-- ========================================

-- Function to check and update user access tier
CREATE OR REPLACE FUNCTION check_user_access_tier(user_member_id UUID)
RETURNS TABLE(
  current_tier INTEGER,
  tier_name TEXT,
  is_expired BOOLEAN,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  member_record hi_members%ROWTYPE;
BEGIN
  -- Get member record
  SELECT * INTO member_record FROM hi_members WHERE id = user_member_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 'Explorer', false, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if temporal access has expired
  IF member_record.tier_expires_at IS NOT NULL AND member_record.tier_expires_at < now() THEN
    -- Expired - downgrade to Explorer tier (Tier 0)
    UPDATE hi_members 
    SET access_tier = 0, 
        tier_expires_at = NULL,
        tier_upgraded_at = now(),
        membership_tier = 'explorer'
    WHERE id = user_member_id;
    
    member_record.access_tier := 0;
  END IF;
  
  -- Return current status
  DECLARE
    tier_name_result TEXT;
  BEGIN
    tier_name_result := CASE member_record.access_tier
      WHEN 0 THEN 'Explorer'
      WHEN 1 THEN 'Starter'
      WHEN 2 THEN 'Enhanced' 
      WHEN 3 THEN 'Collective'
      WHEN 4 THEN 'Admin'
      ELSE 'Unknown'
    END;
    
    RETURN QUERY SELECT 
      member_record.access_tier,
      tier_name_result,
      (member_record.tier_expires_at IS NOT NULL AND member_record.tier_expires_at < now()),
      member_record.tier_expires_at;
  END;
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
      WHEN 0 THEN 'explorer'
      WHEN 1 THEN 'starter'
      WHEN 2 THEN 'enhanced'
      WHEN 3 THEN 'collective'
      ELSE membership_tier
    END,
    tier_history = COALESCE(tier_history, '[]'::jsonb) || jsonb_build_object(
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
    updated_at = now()
  WHERE code = access_code;
  
  RETURN QUERY SELECT true, 'Access code redeemed successfully', code_record.grants_tier, new_expiry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate 24hr discovery codes
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
      (SELECT id FROM hi_members WHERE user_id = auth.uid() LIMIT 1),
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

-- ========================================
-- 🔄 STEP 4: STAN INTEGRATION TABLES
-- ========================================

-- Pending memberships for users who haven't signed up yet
CREATE TABLE IF NOT EXISTS hi_pending_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  target_tier INTEGER NOT NULL,
  stan_customer_id TEXT,
  subscription_amount DECIMAL(10,2),
  subscription_start TIMESTAMPTZ,
  tier_expires_at TIMESTAMPTZ,
  billing_cycle TEXT,
  subscription_status TEXT,
  conversion_source TEXT,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membership transaction history
CREATE TABLE IF NOT EXISTS hi_membership_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES hi_members(id),
  transaction_type TEXT NOT NULL,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  stan_transaction_id TEXT,
  stan_customer_id TEXT,
  tier_granted INTEGER,
  tier_previous INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stan pricing tier mapping view
CREATE OR REPLACE VIEW stan_tier_mapping AS
SELECT 
  price_usd,
  tier_level,
  tier_name,
  tier_description,
  capabilities
FROM (VALUES
  (5.55, 1, 'Starter', 'Full Hi access with core features', ARRAY['drop_hi', 'view_archive', 'create_profile', 'share_public']),
  (15.55, 2, 'Enhanced', 'Premium analytics and trend insights', ARRAY['drop_hi', 'view_archive', 'create_profile', 'share_public', 'view_trends', 'premium_analytics']),
  (55.55, 3, 'Collective', 'Exclusive access and VIP features', ARRAY['drop_hi', 'view_archive', 'create_profile', 'share_public', 'view_trends', 'premium_analytics', 'view_hi_show', 'beta_access'])
) AS stan_tiers(price_usd, tier_level, tier_name, tier_description, capabilities);

-- ========================================
-- 🚀 STEP 5: STAN WEBHOOK PROCESSOR
-- ========================================

-- Enhanced Stan webhook processor function
CREATE OR REPLACE FUNCTION process_stan_purchase_v2(
  p_customer_email TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL,
  p_stan_customer_id TEXT DEFAULT NULL,
  p_stan_transaction_id TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT 'monthly'
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
  v_target_tier INTEGER;
  v_tier_name TEXT;
  v_expiry_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Step 1: Determine tier based on amount
  SELECT tier_level, tier_name INTO v_target_tier, v_tier_name
  FROM stan_tier_mapping 
  WHERE price_usd = p_amount
  LIMIT 1;
  
  IF v_target_tier IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid subscription amount',
      'amount', p_amount
    );
  END IF;
  
  -- Step 2: Calculate expiry based on billing cycle
  v_expiry_date := CASE p_billing_cycle
    WHEN 'monthly' THEN now() + INTERVAL '1 month'
    WHEN 'yearly' THEN now() + INTERVAL '1 year'
    WHEN 'lifetime' THEN now() + INTERVAL '100 years' -- Effectively permanent
    ELSE now() + INTERVAL '1 month'
  END;
  
  -- Step 3: Get or create user
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_customer_email;
  
  IF v_user_id IS NULL THEN
    -- For webhook, we'll create a pending membership record
    INSERT INTO hi_pending_memberships (
      email,
      target_tier,
      stan_customer_id,
      subscription_amount,
      subscription_start,
      tier_expires_at,
      billing_cycle,
      subscription_status,
      conversion_source,
      created_at
    ) VALUES (
      p_customer_email,
      v_target_tier,
      p_stan_customer_id,
      p_amount,
      NOW(),
      v_expiry_date,
      p_billing_cycle,
      'active',
      'stan_purchase',
      NOW()
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Pending membership created for new user',
      'email', p_customer_email,
      'tier', v_target_tier,
      'expires_at', v_expiry_date
    );
  END IF;
  
  -- Step 4: Update existing member
  UPDATE hi_members SET
    access_tier = v_target_tier,
    tier_expires_at = v_expiry_date,
    stan_customer_id = p_stan_customer_id,
    subscription_amount = p_amount,
    subscription_start = NOW(),
    subscription_status = 'active',
    billing_cycle = p_billing_cycle,
    conversion_source = COALESCE(conversion_source, 'stan_purchase'),
    tier_upgraded_at = NOW(),
    membership_tier = v_tier_name,
    tier_history = COALESCE(tier_history, '[]'::jsonb) || jsonb_build_object(
      'timestamp', NOW(),
      'action', 'stan_purchase',
      'from_tier', access_tier,
      'to_tier', v_target_tier,
      'amount', p_amount,
      'billing_cycle', p_billing_cycle,
      'stan_transaction_id', p_stan_transaction_id
    )
  WHERE user_id = v_user_id
  RETURNING id INTO v_member_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Membership upgraded successfully',
    'member_id', v_member_id,
    'tier', v_target_tier,
    'tier_name', v_tier_name,
    'expires_at', v_expiry_date,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim pending membership when user signs up
CREATE OR REPLACE FUNCTION claim_pending_membership(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_record hi_pending_memberships%ROWTYPE;
BEGIN
  -- Check for pending membership
  SELECT * INTO v_pending_record
  FROM hi_pending_memberships
  WHERE email = p_email AND claimed_at IS NULL;
  
  IF FOUND THEN
    -- Update member with pending membership data
    UPDATE hi_members SET
      access_tier = v_pending_record.target_tier,
      tier_expires_at = v_pending_record.tier_expires_at,
      stan_customer_id = v_pending_record.stan_customer_id,
      subscription_amount = v_pending_record.subscription_amount,
      subscription_start = v_pending_record.subscription_start,
      subscription_status = v_pending_record.subscription_status,
      billing_cycle = v_pending_record.billing_cycle,
      conversion_source = v_pending_record.conversion_source,
      tier_upgraded_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Mark pending membership as claimed
    UPDATE hi_pending_memberships SET
      claimed_at = NOW(),
      claimed_by = p_user_id
    WHERE id = v_pending_record.id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 🔒 STEP 6: ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on new tables
ALTER TABLE hi_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_pending_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_membership_transactions ENABLE ROW LEVEL SECURITY;

-- Access codes policies (admin manage, users redeem) - Updated after admin columns are added
-- Note: This policy will be updated in Step 8 after admin columns are created
CREATE POLICY "Admin can manage access codes" ON hi_access_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM hi_members 
      WHERE user_id = auth.uid() 
      AND access_tier >= 3
    )
  );

CREATE POLICY "Users can redeem access codes" ON hi_access_codes
  FOR SELECT USING (is_active = true);

-- Pending memberships policies
CREATE POLICY "Users can view own pending memberships" ON hi_pending_memberships
  FOR SELECT USING (claimed_by = auth.uid());

-- Transaction history policies
CREATE POLICY "Users can view own transactions" ON hi_membership_transactions
  FOR SELECT USING (
    member_id IN (SELECT id FROM hi_members WHERE user_id = auth.uid())
  );

-- ========================================
-- 🎯 STEP 7: ANALYTICS VIEWS
-- ========================================

-- Stan subscription analytics
CREATE OR REPLACE VIEW stan_subscription_analytics AS
SELECT 
  subscription_amount as price_tier,
  COUNT(*) as subscriber_count,
  SUM(subscription_amount) as monthly_revenue,
  AVG(subscription_amount) as avg_subscription_value,
  COUNT(CASE WHEN conversion_source = '24hr_trial' THEN 1 END) as trial_conversions,
  COUNT(CASE WHEN conversion_source = 'direct_signup' THEN 1 END) as direct_signups,
  ROUND(
    CAST((COUNT(CASE WHEN conversion_source = '24hr_trial' THEN 1 END)::FLOAT / 
     NULLIF(COUNT(*), 0)) * 100 AS NUMERIC), 2
  ) as trial_conversion_rate_percent
FROM hi_members 
WHERE subscription_status = 'active' 
  AND subscription_amount IS NOT NULL
GROUP BY subscription_amount
ORDER BY subscription_amount;

-- Tier distribution view (public version)
CREATE OR REPLACE VIEW hi_tier_distribution AS
SELECT 
  access_tier,
  CASE access_tier
    WHEN 0 THEN 'Explorer'
    WHEN 1 THEN 'Starter'  
    WHEN 2 THEN 'Enhanced'
    WHEN 3 THEN 'Collective'
    WHEN 4 THEN 'Admin'
    ELSE 'Unknown'
  END as tier_name,
  COUNT(*) as member_count,
  ROUND(CAST((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()) AS NUMERIC), 2) as percentage
FROM hi_members 
GROUP BY access_tier
ORDER BY access_tier;

-- ========================================
-- 🏛️ STEP 8: ADMIN ACCESS INTEGRATION
-- ========================================

-- Add admin columns to hi_members table if they don't exist
DO $$
BEGIN
    -- Add is_admin column for basic admin flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'is_admin') THEN
        ALTER TABLE hi_members 
        ADD COLUMN is_admin BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_admin column to hi_members';
    END IF;
    
    -- Add admin_role column for role hierarchy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'admin_role') THEN
        ALTER TABLE hi_members 
        ADD COLUMN admin_role TEXT CHECK (admin_role IN ('super_admin', 'admin', 'moderator', NULL));
        RAISE NOTICE '✅ Added admin_role column to hi_members';
    END IF;
    
    -- Add admin_permissions for granular control
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_members' AND column_name = 'admin_permissions') THEN
        ALTER TABLE hi_members 
        ADD COLUMN admin_permissions JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added admin_permissions column to hi_members';
    END IF;
    
    -- Expand access_tier constraint to include admin tier (Tier 4)
    ALTER TABLE hi_members 
    DROP CONSTRAINT IF EXISTS hi_members_access_tier_check;
    
    ALTER TABLE hi_members 
    ADD CONSTRAINT hi_members_access_tier_check 
    CHECK (access_tier BETWEEN 0 AND 4);
    
    RAISE NOTICE '✅ Updated access_tier constraint to include Admin Tier (4)';
END $$;

-- Update access codes policy to include admin column (now that it exists)
DROP POLICY IF EXISTS "Admin can manage access codes" ON hi_access_codes;
CREATE POLICY "Admin can manage access codes" ON hi_access_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM hi_members 
      WHERE user_id = auth.uid() 
      AND (access_tier >= 3 OR is_admin = true)
    )
  );

-- Function to check admin access
CREATE OR REPLACE FUNCTION check_admin_access(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  has_admin_access BOOLEAN,
  admin_role TEXT,
  access_tier INTEGER,
  permissions JSONB
) AS $$
DECLARE
  v_user_id UUID;
  v_member_record hi_members%ROWTYPE;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT * INTO v_member_record 
  FROM hi_members 
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0, '{}'::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    COALESCE(v_member_record.is_admin, false),
    v_member_record.admin_role,
    v_member_record.access_tier,
    COALESCE(v_member_record.admin_permissions, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced admin code generation function
CREATE OR REPLACE FUNCTION generate_admin_access_codes(
  p_code_type TEXT DEFAULT 'discovery_24h',
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(
  code TEXT,
  expires_at TIMESTAMPTZ,
  grants_tier INTEGER
) AS $$
DECLARE
  v_admin_check BOOLEAN;
  i INTEGER;
  v_code_value TEXT;
  v_code_expiry TIMESTAMPTZ;
  v_grants_tier INTEGER;
  v_duration_hours INTEGER;
BEGIN
  -- Check if current user is admin
  SELECT has_admin_access INTO v_admin_check FROM check_admin_access();
  
  IF NOT v_admin_check THEN
    RAISE EXCEPTION 'Admin privileges required for code generation';
  END IF;
  
  -- Determine code parameters
  v_grants_tier := CASE p_code_type
    WHEN 'discovery_24h' THEN 1
    WHEN 'enhanced_7d' THEN 2
    WHEN 'enhanced_30d' THEN 2
    WHEN 'collective_90d' THEN 3
    ELSE 1
  END;
  
  v_duration_hours := CASE p_code_type
    WHEN 'discovery_24h' THEN 24
    WHEN 'enhanced_7d' THEN 168
    WHEN 'enhanced_30d' THEN 720
    WHEN 'collective_90d' THEN 2160
    ELSE 24
  END;
  
  v_code_expiry := now() + (v_duration_hours || ' hours')::INTERVAL;
  
  -- Generate codes
  FOR i IN 1..p_quantity LOOP
    v_code_value := 'ADM' || upper(substring(md5(random()::text), 1, 5));
    
    INSERT INTO hi_access_codes (
      code, code_type, grants_tier, duration_hours, duration_days,
      max_uses, expires_at, created_by, metadata
    ) VALUES (
      v_code_value, p_code_type, v_grants_tier, v_duration_hours, 0,
      1, v_code_expiry,
      (SELECT id FROM hi_members WHERE user_id = auth.uid() LIMIT 1),
      jsonb_build_object('purpose', 'admin_generated', 'generated_at', now())
    );
    
    RETURN QUERY SELECT v_code_value, v_code_expiry, v_grants_tier;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced tier analytics view with admin data
CREATE OR REPLACE VIEW hi_tier_distribution_admin AS
SELECT 
  access_tier,
  CASE access_tier
    WHEN 0 THEN 'Explorer'
    WHEN 1 THEN 'Starter'  
    WHEN 2 THEN 'Enhanced'
    WHEN 3 THEN 'Collective'
    WHEN 4 THEN 'Admin'
    ELSE 'Unknown'
  END as tier_name,
  COUNT(*) as member_count,
  ROUND(CAST((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()) AS NUMERIC), 2) as percentage,
  COUNT(*) FILTER (WHERE is_admin = true) as admin_count
FROM hi_members 
GROUP BY access_tier
ORDER BY access_tier;

COMMIT;

-- ========================================
-- 🎉 DEPLOYMENT VERIFICATION
-- ========================================

SELECT 
  '🚀 Tesla-Grade Tier System Deployed Successfully!' as status,
  'Phase 4A Complete with Admin System' as phase,
  now() as deployed_at,
  'Database enhanced with 5-tier system (0-4), admin controls, 24hr access codes, and Stan integration' as description;

-- Show tier distribution
SELECT 'Current Tier Distribution:' as info;
SELECT * FROM hi_tier_distribution;

-- Show available functions
SELECT 'Available Functions:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%tier%' OR routine_name LIKE '%access_code%' OR routine_name LIKE '%stan%'
ORDER BY routine_name;