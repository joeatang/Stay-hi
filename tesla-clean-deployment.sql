-- ========================================
-- 🚀 TESLA COMPLETE SECURITY DEPLOYMENT
-- Tables + RPC Functions for Invitation-Only System  
-- Copy this ENTIRE file to Supabase SQL Editor
-- ========================================

-- STEP 1: CREATE MISSING TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  code_type TEXT NOT NULL,
  trial_days INTEGER NOT NULL,
  grants_tier TEXT DEFAULT 'standard',
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

CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('trial', 'beta', 'standard', 'premium', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  trial_days_total INTEGER DEFAULT 7,
  invitation_code TEXT,
  subscription_status TEXT,
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  features_enabled TEXT[] DEFAULT ARRAY['basic_hi', 'location_sharing'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  CONSTRAINT valid_trial_dates CHECK (trial_start IS NULL OR trial_end IS NULL OR trial_start <= trial_end)
);

CREATE TABLE IF NOT EXISTS membership_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES user_memberships(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_transactions ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Admin can manage invitation codes" ON invitation_codes
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM user_memberships WHERE tier IN ('lifetime', 'admin')
  ));

CREATE POLICY "Anyone can read active invitation codes" ON invitation_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can read own membership" ON user_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON user_memberships
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own transactions" ON membership_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- STEP 2: TESLA RPC FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  code_row invitation_codes%ROWTYPE;
  invite_row invite_codes%ROWTYPE;
BEGIN
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
      NULL;
  END;
  
  RETURN jsonb_build_object(
    'valid', false,
    'error', 'Invalid, expired, or fully used invitation code'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_membership_access(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_uuid UUID;
  membership_row user_memberships%ROWTYPE;
  profile_row profiles%ROWTYPE;
BEGIN
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
  
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    BEGIN
      SELECT * INTO profile_row
      FROM profiles
      WHERE id = user_uuid;
      
      IF FOUND THEN
        RETURN jsonb_build_object(
          'access_granted', true,
          'membership_status', 'legacy',
          'user_id', user_uuid,
          'upgrade_required', true
        );
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
      'access_granted', false,
      'error', 'No valid membership found',
      'action_required', 'signup'
    );
  END IF;
  
  IF membership_row.status = 'active' THEN
    IF membership_row.trial_end IS NOT NULL AND membership_row.trial_end < NOW() THEN
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

CREATE OR REPLACE FUNCTION get_my_membership()
RETURNS JSON AS $$
DECLARE
  membership_row user_memberships%ROWTYPE;
  profile_row profiles%ROWTYPE;
BEGIN
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
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
  
  IF membership_row.trial_end IS NOT NULL AND membership_row.trial_end < NOW() THEN
    IF membership_row.subscription_status NOT IN ('active', 'trialing') THEN
      RETURN jsonb_build_object(
        'status', 'expired',
        'tier', membership_row.tier,
        'trial_ended_at', membership_row.trial_end,
        'upgrade_required', true,
        'access_revoked', true
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
BEGIN
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  
  WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  END LOOP;
  
  INSERT INTO invitation_codes (
    code, code_type, trial_days, grants_tier, max_uses, 
    features_granted, valid_until, created_by
  ) VALUES (
    new_code, p_code_type, p_trial_days, p_grants_tier, p_max_uses,
    p_features, NOW() + INTERVAL '30 days', auth.uid()
  ) RETURNING id INTO new_id;
  
  RETURN jsonb_build_object(
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION use_invitation_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  code_row invitation_codes%ROWTYPE;
  membership_row user_memberships%ROWTYPE;
BEGIN
  SELECT * INTO code_row
  FROM invitation_codes
  WHERE code = p_code 
    AND is_active = true 
    AND current_uses < max_uses
    AND (valid_until IS NULL OR valid_until > NOW());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation code');
  END IF;
  
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
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
  
  UPDATE invitation_codes SET
    current_uses = current_uses + 1,
    last_used_at = NOW(),
    last_used_by = auth.uid()
  WHERE code = p_code;
  
  INSERT INTO membership_transactions (
    user_id, membership_id, transaction_type, description, metadata
  ) VALUES (
    auth.uid(), membership_row.id, 'trial_started',
    'Trial started with invitation code: ' || p_code,
    jsonb_build_object('invitation_code', p_code, 'code_type', code_row.code_type)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'membership', get_my_membership()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_membership_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code(TEXT, INTEGER, TEXT, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION list_invite_codes(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION use_invitation_code(TEXT) TO authenticated;

-- Success notification
SELECT 'Tesla-grade invitation security system deployed successfully!' AS status;