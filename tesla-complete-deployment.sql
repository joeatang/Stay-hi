-- ========================================
-- 🚀 TESLA-GRADE COMPLETE DEPLOYMENT
-- Tables + RPC Functions for Invitation-Only System
-- ========================================

-- STEP 1: CREATE MISSING TABLES FIRST
-- ========================================

-- Enhanced invitation_codes table (Tesla version)
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  code_type TEXT NOT NULL, -- '1_day_trial', '7_day_trial', etc.
  trial_days INTEGER NOT NULL,
  grants_tier TEXT DEFAULT 'standard', -- 'standard', 'premium', 'lifetime'
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_until TIMESTAMPTZ,
  features_granted TEXT[] DEFAULT ARRAY['basic_hi', 'location_sharing'],
  created_by UUID REFERENCES auth.users(id),
  last_used_at TIMESTAMPTZ,
  last_used_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User memberships table for trial management
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Membership details
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('trial', 'beta', 'standard', 'premium', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  
  -- Trial management
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  trial_days_total INTEGER DEFAULT 7,
  invitation_code TEXT, -- Code used to join
  
  -- Subscription integration (Stan platform ready)
  subscription_status TEXT, -- For Stan platform integration
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  
  -- Features and limits
  features_enabled TEXT[] DEFAULT ARRAY['basic_hi', 'location_sharing'],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  CONSTRAINT valid_trial_dates CHECK (trial_start IS NULL OR trial_end IS NULL OR trial_start <= trial_end)
);

-- Membership transaction history
CREATE TABLE IF NOT EXISTS membership_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES user_memberships(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'trial_started', 'upgraded', 'cancelled', etc.
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for invitation_codes (admin only create, authenticated read)
CREATE POLICY "Admin can manage invitation codes" ON invitation_codes
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM user_memberships WHERE tier IN ('lifetime', 'admin')
  ));

CREATE POLICY "Anyone can read active invitation codes" ON invitation_codes
  FOR SELECT USING (is_active = true);

-- Policies for user_memberships (users can read their own)
CREATE POLICY "Users can read own membership" ON user_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON user_memberships
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for membership_transactions (users can read their own)
CREATE POLICY "Users can read own transactions" ON membership_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- STEP 2: CREATE TESLA RPC FUNCTIONS
-- ========================================

-- 1️⃣ VALIDATE INVITE CODE (without using it)
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  code_row invitation_codes%ROWTYPE;
  invite_row invite_codes%ROWTYPE;
  result JSON;
BEGIN
  -- First check Tesla membership schema invitation_codes
  SELECT * INTO code_row
  FROM invitation_codes
  WHERE code = p_code 
    AND is_active = true 
    AND current_uses < max_uses
    AND (valid_until IS NULL OR valid_until > NOW());
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'valid', true,
      'code_type', code_row.code_type,
      'trial_days', code_row.trial_days,
      'grants_tier', code_row.grants_tier,
      'expires_at', code_row.valid_until,
      'uses_remaining', code_row.max_uses - code_row.current_uses
    );
  END IF;
  
  -- Check legacy invite_codes table (if it exists)
  BEGIN
    SELECT * INTO invite_row
    FROM invite_codes
    WHERE code = p_code 
      AND is_active = true 
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'valid', true,
        'code_type', invite_row.code_type,
        'expires_at', invite_row.expires_at,
        'uses_remaining', invite_row.max_uses - invite_row.current_uses
      );
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Legacy table doesn't exist, continue
      NULL;
  END;
  
  -- Invalid code
  RETURN jsonb_build_object(
    'valid', false,
    'error', 'Invalid, expired, or fully used invitation code'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ CHECK MEMBERSHIP ACCESS (for signin authentication)
CREATE OR REPLACE FUNCTION check_membership_access(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_uuid UUID;
  membership_row user_memberships%ROWTYPE;
  profile_row profiles%ROWTYPE;
  result JSON;
BEGIN
  -- Get user UUID from email (Supabase auth.users)
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = p_email;
  
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'No account found with this email',
      'action_required', 'signup'
    );
  END IF;
  
  -- Check membership status
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    -- Check legacy profile for basic access (if profiles table exists)
    BEGIN
      SELECT * INTO profile_row
      FROM profiles
      WHERE id = user_uuid;
      
      IF FOUND THEN
        -- Legacy user - grant access but needs membership upgrade
        RETURN jsonb_build_object(
          'access_granted', true,
          'membership_status', 'legacy',
          'user_id', user_uuid,
          'upgrade_required', true
        );
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        -- Profiles table doesn't exist
        NULL;
    END;
    
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'No valid membership found',
      'action_required', 'signup'
    );
  END IF;
  
  -- Check if membership is active and not expired
  IF membership_row.status = 'active' THEN
    -- Check trial expiration
    IF membership_row.trial_end IS NOT NULL AND membership_row.trial_end < NOW() THEN
      -- Check if they have paid subscription
      IF membership_row.subscription_status IN ('active', 'trialing') THEN
        RETURN jsonb_build_object(
          'access_granted', true,
          'membership_status', 'subscribed',
          'user_id', user_uuid,
          'tier', membership_row.tier
        );
      ELSE
        RETURN jsonb_build_object(
          'access_granted', false,
          'error', 'Trial period has ended',
          'action_required', 'upgrade',
          'trial_ended_at', membership_row.trial_end
        );
      END IF;
    ELSE
      -- Active membership within trial period
      RETURN jsonb_build_object(
        'access_granted', true,
        'membership_status', 'active',
        'user_id', user_uuid,
        'tier', membership_row.tier,
        'trial_ends_at', membership_row.trial_end
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'Membership is ' || membership_row.status,
      'action_required', 'contact_admin'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3️⃣ GET MY MEMBERSHIP (for session validation)
CREATE OR REPLACE FUNCTION get_my_membership()
RETURNS JSON AS $$
DECLARE
  membership_row user_memberships%ROWTYPE;
  profile_row profiles%ROWTYPE;
  result JSON;
BEGIN
  -- Get current user's membership
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    -- Check legacy profile (if exists)
    BEGIN
      SELECT * INTO profile_row
      FROM profiles
      WHERE id = auth.uid();
      
      IF FOUND THEN
        RETURN jsonb_build_object(
          'status', 'legacy',
          'tier', 'standard',
          'upgrade_available', true,
          'features_enabled', array['basic_hi', 'location_sharing']
        );
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
      'status', 'no_membership',
      'signup_required', true
    );
  END IF;
  
  -- Check if trial is expired
  IF membership_row.trial_end IS NOT NULL AND membership_row.trial_end < NOW() THEN
    IF membership_row.subscription_status NOT IN ('active', 'trialing') THEN
      -- Trial expired, no active subscription
      RETURN jsonb_build_object(
        'status', 'expired',
        'tier', membership_row.tier,
        'trial_ended_at', membership_row.trial_end,
        'upgrade_required', true,
        'access_revoked', true
      );
    END IF;
  END IF;
  
  -- Return active membership
  result := jsonb_build_object(
    'id', membership_row.id,
    'status', membership_row.status,
    'tier', membership_row.tier,
    'trial_start', membership_row.trial_start,
    'trial_end', membership_row.trial_end,
    'subscription_status', membership_row.subscription_status,
    'features_enabled', membership_row.features_enabled,
    'invitation_code', membership_row.invitation_code,
    'created_at', membership_row.created_at,
    'updated_at', membership_row.updated_at
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4️⃣ GENERATE INVITE CODE (for admin dashboard)
CREATE OR REPLACE FUNCTION generate_invite_code(
  p_code_type TEXT,
  p_trial_days INTEGER,
  p_grants_tier TEXT DEFAULT 'standard',
  p_max_uses INTEGER DEFAULT 1,
  p_features TEXT[] DEFAULT ARRAY['basic_hi', 'location_sharing']
)
RETURNS JSON AS $$
DECLARE
  new_code TEXT;
  new_id UUID;
  result JSON;
BEGIN
  -- Generate unique 8-character code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END LOOP;
  
  -- Insert into invitation_codes table
  INSERT INTO invitation_codes (
    code, code_type, trial_days, grants_tier, max_uses, 
    features_granted, valid_until, created_by
  ) VALUES (
    new_code, p_code_type, p_trial_days, p_grants_tier, p_max_uses,
    p_features, NOW() + INTERVAL '30 days', auth.uid()
  ) RETURNING id INTO new_id;
  
  result := jsonb_build_object(
    'success', true,
    'code', new_code,
    'code_id', new_id,
    'code_type', p_code_type,
    'trial_days', p_trial_days,
    'grants_tier', p_grants_tier,
    'max_uses', p_max_uses,
    'expires_at', NOW() + INTERVAL '30 days',
    'features_granted', p_features
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5️⃣ LIST INVITE CODES (for admin management)
CREATE OR REPLACE FUNCTION list_invite_codes(p_include_expired BOOLEAN DEFAULT false)
RETURNS JSON AS $$
DECLARE
  codes_array JSON;
BEGIN
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
      'last_used_at', last_used_at,
      'features_granted', features_granted,
      'uses_remaining', max_uses - current_uses
    )
  ) INTO codes_array
  FROM invitation_codes
  WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW()))
  ORDER BY created_at DESC;
  
  RETURN jsonb_build_object(
    'codes', COALESCE(codes_array, '[]'::json),
    'total_count', (SELECT count(*) FROM invitation_codes WHERE p_include_expired = true OR (is_active = true AND (valid_until IS NULL OR valid_until > NOW())))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6️⃣ USE INVITATION CODE (Enhanced version)
CREATE OR REPLACE FUNCTION use_invitation_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  code_row invitation_codes%ROWTYPE;
  membership_row user_memberships%ROWTYPE;
  result JSON;
BEGIN
  -- Validate code
  SELECT * INTO code_row
  FROM invitation_codes
  WHERE code = p_code 
    AND is_active = true 
    AND current_uses < max_uses
    AND (valid_until IS NULL OR valid_until > NOW());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation code');
  END IF;
  
  -- Get or create user membership
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
  -- Update or create membership
  IF FOUND THEN
    UPDATE user_memberships SET
      tier = code_row.grants_tier,
      status = 'active',
      trial_start = CASE WHEN trial_start IS NULL THEN NOW() ELSE trial_start END,
      trial_end = NOW() + INTERVAL '1 day' * code_row.trial_days,
      trial_days_total = code_row.trial_days,
      features_enabled = code_row.features_granted,
      invitation_code = p_code,
      updated_at = NOW()
    WHERE user_id = auth.uid()
    RETURNING * INTO membership_row;
  ELSE
    INSERT INTO user_memberships (
      user_id, tier, status, trial_start, trial_end, trial_days_total,
      features_enabled, invitation_code
    ) VALUES (
      auth.uid(), code_row.grants_tier, 'active', NOW(), 
      NOW() + INTERVAL '1 day' * code_row.trial_days,
      code_row.trial_days, code_row.features_granted, p_code
    ) RETURNING * INTO membership_row;
  END IF;
  
  -- Update code usage
  UPDATE invitation_codes SET
    current_uses = current_uses + 1,
    last_used_at = NOW(),
    last_used_by = auth.uid()
  WHERE code = p_code;
  
  -- Log transaction
  INSERT INTO membership_transactions (
    user_id, membership_id, transaction_type, description, metadata
  ) VALUES (
    auth.uid(), membership_row.id, 'trial_started',
    'Trial started with invitation code: ' || p_code,
    jsonb_build_object('invitation_code', p_code, 'code_type', code_row.code_type)
  );
  
  result := jsonb_build_object(
    'success', true,
    'membership', get_my_membership()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_membership_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code(TEXT, INTEGER, TEXT, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION list_invite_codes(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION use_invitation_code(TEXT) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🚀 TESLA-GRADE INVITATION-ONLY SECURITY SYSTEM DEPLOYED SUCCESSFULLY!';
  RAISE NOTICE '✅ Tables created: invitation_codes, user_memberships, membership_transactions';
  RAISE NOTICE '✅ RPC Functions deployed: validate_invite_code, check_membership_access, get_my_membership, generate_invite_code, list_invite_codes, use_invitation_code';
  RAISE NOTICE '🎯 System ready for invitation-only authentication!';
END $$;