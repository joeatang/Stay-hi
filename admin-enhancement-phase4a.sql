-- ========================================
-- 🏛️ ADMIN ACCESS ENHANCEMENT FOR PHASE 4A
-- Tesla-Grade Admin System Integration  
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
    
END $$;

-- ========================================
-- 👑 ADMIN TIER INTEGRATION
-- ========================================

-- Update tier system to include admin tier (Tier 4)
DO $$
BEGIN
    -- Expand access_tier constraint to include admin tier
    ALTER TABLE hi_members 
    DROP CONSTRAINT IF EXISTS hi_members_access_tier_check;
    
    ALTER TABLE hi_members 
    ADD CONSTRAINT hi_members_access_tier_check 
    CHECK (access_tier BETWEEN 0 AND 4);
    
    RAISE NOTICE '✅ Updated access_tier constraint to include Admin Tier (4)';
END $$;

-- ========================================
-- 🛡️ ADMIN ACCESS CONTROL FUNCTIONS
-- ========================================

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
  -- Use provided user_id or current authenticated user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get member record
  SELECT * INTO v_member_record 
  FROM hi_members 
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0, '{}'::JSONB;
    RETURN;
  END IF;
  
  -- Check admin status
  RETURN QUERY SELECT 
    COALESCE(v_member_record.is_admin, false),
    v_member_record.admin_role,
    v_member_record.access_tier,
    COALESCE(v_member_record.admin_permissions, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant admin access
CREATE OR REPLACE FUNCTION grant_admin_access(
  p_target_user_id UUID,
  p_admin_role TEXT DEFAULT 'admin',
  p_granted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_granter_id UUID;
  v_granter_role TEXT;
BEGIN
  -- Get granter info
  v_granter_id := COALESCE(p_granted_by, auth.uid());
  
  -- Check if granter has super_admin privileges
  SELECT admin_role INTO v_granter_role
  FROM hi_members 
  WHERE user_id = v_granter_id AND is_admin = true;
  
  -- Only super_admins can grant admin access
  IF v_granter_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can grant admin access';
  END IF;
  
  -- Grant admin access
  UPDATE hi_members 
  SET 
    is_admin = true,
    admin_role = p_admin_role,
    access_tier = CASE 
      WHEN p_admin_role = 'super_admin' THEN 4
      WHEN p_admin_role = 'admin' THEN 4  
      WHEN p_admin_role = 'moderator' THEN 3
      ELSE access_tier
    END,
    admin_permissions = jsonb_build_object(
      'granted_at', now(),
      'granted_by', v_granter_id,
      'role', p_admin_role
    ),
    tier_history = COALESCE(tier_history, '[]'::jsonb) || jsonb_build_object(
      'timestamp', now(),
      'action', 'admin_granted',
      'role', p_admin_role,
      'granted_by', v_granter_id
    )
  WHERE user_id = p_target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced tier check function with admin support
CREATE OR REPLACE FUNCTION check_user_access_tier_with_admin(user_member_id UUID)
RETURNS TABLE(
  current_tier INTEGER,
  tier_name TEXT,
  is_expired BOOLEAN,
  expires_at TIMESTAMPTZ,
  is_admin BOOLEAN,
  admin_role TEXT
) AS $$
DECLARE
  member_record hi_members%ROWTYPE;
BEGIN
  -- Get member record
  SELECT * INTO member_record FROM hi_members WHERE id = user_member_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 'Explorer', false, NULL::TIMESTAMPTZ, false, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if temporal access has expired (but not for admins)
  IF member_record.tier_expires_at IS NOT NULL 
     AND member_record.tier_expires_at < now() 
     AND NOT COALESCE(member_record.is_admin, false) THEN
    -- Expired - downgrade to Starter tier (Tier 1)
    UPDATE hi_members 
    SET access_tier = 1, 
        tier_expires_at = NULL,
        tier_upgraded_at = now()
    WHERE id = user_member_id;
    
    member_record.access_tier := 1;
  END IF;
  
  -- Return current status with admin info
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
      member_record.tier_expires_at,
      COALESCE(member_record.is_admin, false),
      member_record.admin_role;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 🎯 ADMIN CODE GENERATION
-- ========================================

-- Enhanced access code generation with admin privileges
CREATE OR REPLACE FUNCTION generate_admin_access_codes(
  p_code_type TEXT DEFAULT 'discovery_24h',
  p_quantity INTEGER DEFAULT 1,
  p_custom_duration_hours INTEGER DEFAULT NULL
)
RETURNS TABLE(
  code TEXT,
  code_type TEXT,
  grants_tier INTEGER,
  expires_at TIMESTAMPTZ,
  created_by_admin TEXT
) AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_admin_role TEXT;
  i INTEGER;
  v_code_value TEXT;
  v_code_expiry TIMESTAMPTZ;
  v_grants_tier INTEGER;
  v_duration_hours INTEGER;
BEGIN
  -- Check if current user is admin
  SELECT has_admin_access, admin_role 
  INTO v_admin_check, v_admin_role
  FROM check_admin_access();
  
  IF NOT v_admin_check THEN
    RAISE EXCEPTION 'Admin privileges required for code generation';
  END IF;
  
  -- Determine code parameters
  v_grants_tier := CASE p_code_type
    WHEN 'discovery_24h' THEN 1
    WHEN 'enhanced_7d' THEN 2
    WHEN 'enhanced_15d' THEN 2
    WHEN 'enhanced_30d' THEN 2
    WHEN 'collective_90d' THEN 3
    ELSE 1
  END;
  
  v_duration_hours := COALESCE(
    p_custom_duration_hours,
    CASE p_code_type
      WHEN 'discovery_24h' THEN 24
      WHEN 'enhanced_7d' THEN 168  -- 7 days
      WHEN 'enhanced_15d' THEN 360 -- 15 days
      WHEN 'enhanced_30d' THEN 720 -- 30 days
      WHEN 'collective_90d' THEN 2160 -- 90 days
      ELSE 24
    END
  );
  
  v_code_expiry := now() + (v_duration_hours || ' hours')::INTERVAL;
  
  -- Generate codes
  FOR i IN 1..p_quantity LOOP
    -- Generate unique code with admin prefix
    v_code_value := 'ADM' || upper(substring(md5(random()::text), 1, 5)) || 
                   CASE p_code_type
                     WHEN 'discovery_24h' THEN '24H'
                     WHEN 'enhanced_7d' THEN 'E7D'
                     WHEN 'enhanced_15d' THEN 'E15D'
                     WHEN 'enhanced_30d' THEN 'E30D'
                     WHEN 'collective_90d' THEN 'C90D'
                     ELSE 'GEN'
                   END;
    
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
      v_code_value,
      p_code_type,
      v_grants_tier,
      v_duration_hours,
      0, -- Using hours instead of days
      1, -- Single use
      v_code_expiry,
      (SELECT id FROM hi_members WHERE user_id = auth.uid() LIMIT 1),
      jsonb_build_object(
        'purpose', 'admin_generated',
        'generated_at', now(),
        'admin_role', v_admin_role,
        'batch_id', gen_random_uuid()
      )
    );
    
    RETURN QUERY SELECT 
      v_code_value, 
      p_code_type, 
      v_grants_tier, 
      v_code_expiry, 
      v_admin_role;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 📊 ADMIN ANALYTICS FUNCTIONS  
-- ========================================

-- Admin dashboard statistics
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  v_admin_check BOOLEAN;
  v_stats JSONB;
BEGIN
  -- Check admin access
  SELECT has_admin_access INTO v_admin_check FROM check_admin_access();
  
  IF NOT v_admin_check THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Gather statistics
  SELECT jsonb_build_object(
    'total_members', (SELECT COUNT(*) FROM hi_members),
    'active_members', (SELECT COUNT(*) FROM hi_members WHERE is_active = true),
    'tier_distribution', (
      SELECT jsonb_object_agg(
        CASE access_tier 
          WHEN 0 THEN 'Explorer'
          WHEN 1 THEN 'Starter'
          WHEN 2 THEN 'Enhanced'
          WHEN 3 THEN 'Collective'
          WHEN 4 THEN 'Admin'
          ELSE 'Unknown'
        END,
        member_count
      )
      FROM (
        SELECT access_tier, COUNT(*) as member_count
        FROM hi_members 
        GROUP BY access_tier
      ) tier_stats
    ),
    'access_codes', (
      SELECT jsonb_build_object(
        'total_generated', COUNT(*),
        'active_codes', COUNT(*) FILTER (WHERE is_active = true),
        'redeemed_codes', COUNT(*) FILTER (WHERE current_uses > 0)
      )
      FROM hi_access_codes
    ),
    'revenue_stats', (
      SELECT jsonb_build_object(
        'monthly_revenue', COALESCE(SUM(subscription_amount), 0),
        'paying_members', COUNT(*) FILTER (WHERE subscription_amount > 0),
        'avg_subscription', COALESCE(AVG(subscription_amount), 0)
      )
      FROM hi_members 
      WHERE subscription_status = 'active'
    ),
    'generated_at', now()
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 🔒 ADMIN SECURITY POLICIES
-- ========================================

-- Admin access codes policy (only admins can generate)
DROP POLICY IF EXISTS "Admin can manage access codes" ON hi_access_codes;
CREATE POLICY "Admin can manage access codes" ON hi_access_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM hi_members 
      WHERE user_id = auth.uid() 
      AND is_admin = true 
      AND admin_role IN ('super_admin', 'admin')
    )
  );

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
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage,
  COUNT(*) FILTER (WHERE is_admin = true) as admin_count,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as paying_count
FROM hi_members 
GROUP BY access_tier
ORDER BY access_tier;

-- ========================================
-- 🎯 FOUNDER/SUPER ADMIN INITIALIZATION
-- ========================================

-- Function to initialize founder as super admin (one-time setup)
CREATE OR REPLACE FUNCTION initialize_founder_admin(p_founder_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = p_founder_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Founder email not found in auth.users: %', p_founder_email;
  END IF;
  
  -- Get or create member record
  SELECT id INTO v_member_id 
  FROM hi_members 
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    -- Create founder member record
    INSERT INTO hi_members (
      user_id, username, display_name, access_tier, is_admin, admin_role, 
      admin_permissions, membership_tier, tier_history
    ) VALUES (
      v_user_id,
      'founder',
      'Hi Founder',
      4, -- Admin tier
      true,
      'super_admin',
      jsonb_build_object(
        'role', 'super_admin',
        'granted_at', now(),
        'founder_account', true,
        'all_permissions', true
      ),
      'collective',
      jsonb_build_array(
        jsonb_build_object(
          'timestamp', now(),
          'action', 'founder_initialization',
          'tier', 4,
          'role', 'super_admin'
        )
      )
    ) RETURNING id INTO v_member_id;
  ELSE
    -- Update existing member to super admin
    UPDATE hi_members 
    SET 
      access_tier = 4,
      is_admin = true,
      admin_role = 'super_admin',
      admin_permissions = jsonb_build_object(
        'role', 'super_admin',
        'granted_at', now(),
        'founder_account', true,
        'all_permissions', true
      ),
      tier_history = COALESCE(tier_history, '[]'::jsonb) || jsonb_build_object(
        'timestamp', now(),
        'action', 'founder_upgrade',
        'to_tier', 4,
        'role', 'super_admin'
      )
    WHERE id = v_member_id;
  END IF;
  
  RAISE NOTICE '🎯 Founder admin initialized: % (Member ID: %)', p_founder_email, v_member_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;