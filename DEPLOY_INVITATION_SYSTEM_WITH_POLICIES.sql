-- ========================================
-- 🎫 INVITATION SYSTEM - COMPLETE SAFE DEPLOYMENT
-- Includes RLS policies with proper admin_roles check
-- ========================================

-- ========================================
-- STEP 1: DROP CONFLICTING POLICIES
-- ========================================

-- Drop old circular policies if they exist
DROP POLICY IF EXISTS "Admin can manage invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Anyone can read active invitation codes" ON invitation_codes;
DROP POLICY IF EXISTS "Users can read own membership" ON user_memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON user_memberships;

-- ========================================
-- STEP 2: CREATE SAFE RLS POLICIES
-- ========================================

-- Invitation Codes Policies (using admin_roles table, not user_memberships)
CREATE POLICY "Admins can manage invitation codes"
ON invitation_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.role_type IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Anyone can read active codes for validation"
ON invitation_codes
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- User Memberships Policies
CREATE POLICY "Users can read own membership"
ON user_memberships
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all memberships"
ON user_memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.role_type IN ('super_admin', 'admin')
  )
);

CREATE POLICY "System can insert memberships"
ON user_memberships
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own membership"
ON user_memberships
FOR UPDATE
USING (auth.uid() = user_id);

-- Membership Transactions Policies
CREATE POLICY "Users can read own transactions"
ON membership_transactions
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()
    AND admin_roles.role_type IN ('super_admin', 'admin')
  )
);

CREATE POLICY "System can insert transactions"
ON membership_transactions
FOR INSERT
WITH CHECK (true);

-- ========================================
-- STEP 3: DEPLOY RPC FUNCTIONS
-- ========================================

-- Function 1: Get Admin Dashboard Stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats() RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Verify admin access using admin_roles
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;

  -- Gather dashboard statistics
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'active_memberships', (SELECT COUNT(*) FROM user_memberships WHERE status = 'active'),
    'total_invitations', (SELECT COUNT(*) FROM invitation_codes),
    'active_invitations', (SELECT COUNT(*) FROM invitation_codes WHERE is_active = true),
    'recent_signups', (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days'),
    'admin_sessions', (SELECT COUNT(*) FROM admin_sessions WHERE is_active = true),
    'security_events', (SELECT COUNT(*) FROM admin_access_logs WHERE success = false AND created_at > NOW() - INTERVAL '24 hours')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Generate Invitation Code (Mission Control)
CREATE OR REPLACE FUNCTION admin_generate_invite_code(
  p_created_by UUID DEFAULT auth.uid(),
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_hours INTEGER DEFAULT 168 -- 7 days default
) RETURNS JSONB AS $$
DECLARE
  new_code TEXT;
  new_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
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
    code, code_type, trial_days, grants_tier, max_uses,
    features_granted, valid_until, created_by, is_active
  ) VALUES (
    new_code, 'admin_generated', 30, 'premium', p_max_uses,
    ARRAY['premium_features', 'location_sharing', 'hi_rewards'], 
    v_expires_at, p_created_by, true
  ) RETURNING id INTO new_id;
  
  -- Log admin action
  INSERT INTO admin_access_logs (
    user_id, action_type, resource_accessed, success, request_data
  ) VALUES (
    p_created_by, 'generate_invite_code', 'invitation_management', true,
    jsonb_build_object('code', new_code, 'expires_hours', p_expires_in_hours, 'max_uses', p_max_uses)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'code', new_code,
    'id', new_id,
    'expires_at', v_expires_at,
    'max_uses', p_max_uses,
    'created_by', p_created_by,
    'message', 'Invitation code generated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: List Invitation Codes (Mission Control)
CREATE OR REPLACE FUNCTION admin_list_invite_codes(
  p_include_expired BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  codes_array JSON;
BEGIN
  -- Verify admin access
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role_type IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Administrative access required';
  END IF;
  
  -- Log admin action
  INSERT INTO admin_access_logs (
    user_id, action_type, resource_accessed, success
  ) VALUES (
    auth.uid(), 'list_invite_codes', 'invitation_management', true
  );
  
  -- Get invitation codes
  SELECT json_agg(
    json_build_object(
      'id', id,
      'code', code,
      'code_type', code_type,
      'trial_days', trial_days,
      'grants_tier', grants_tier,
      'max_uses', max_uses,
      'current_uses', current_uses,
      'is_active', is_active,
      'valid_until', valid_until,
      'created_at', created_at,
      'created_by', created_by,
      'last_used_at', last_used_at,
      'features_granted', features_granted,
      'uses_remaining', max_uses - current_uses
    )
  ) INTO codes_array
  FROM invitation_codes
  WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW()))
  ORDER BY created_at DESC;
  
  RETURN jsonb_build_object(
    'success', true,
    'codes', COALESCE(codes_array, '[]'::json),
    'total_count', (
      SELECT count(*) FROM invitation_codes 
      WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW()))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_generate_invite_code(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_invite_codes(BOOLEAN) TO authenticated;

-- ========================================
-- 🎯 DEPLOYMENT VERIFICATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Invitation system deployed successfully!';
  RAISE NOTICE 'Invitation codes count: %', (SELECT COUNT(*) FROM invitation_codes);
  RAISE NOTICE 'Admin count: %', (SELECT COUNT(*) FROM admin_roles WHERE role_type IN ('super_admin', 'admin'));
  RAISE NOTICE 'RLS enabled on invitation_codes: %', (
    SELECT relrowsecurity FROM pg_class WHERE relname = 'invitation_codes'
  );
  RAISE NOTICE 'Active policies on invitation_codes: %', (
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'invitation_codes'
  );
END $$;
