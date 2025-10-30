-- ===============================================
-- 🔒 TESLA-GRADE AUTHENTICATION & MEMBERSHIP SCHEMA
-- ===============================================
-- Comprehensive membership system with trials, billing, and cancellation

-- User membership tiers and status
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Membership details
  tier TEXT NOT NULL DEFAULT 'trial' CHECK (tier IN ('trial', 'beta', 'standard', 'premium', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  
  -- Timing
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Billing integration
  stan_customer_id TEXT, -- Stan platform customer ID
  stan_subscription_id TEXT, -- Stan subscription ID
  external_payment_id TEXT, -- External payment processor ID
  
  -- Trial management
  trial_days_used INTEGER DEFAULT 0,
  trial_days_total INTEGER DEFAULT 7,
  invitation_code TEXT, -- Code used to join
  invited_by UUID REFERENCES auth.users(id), -- Who invited them
  
  -- Features and limits
  max_shares_per_day INTEGER DEFAULT 10,
  max_hi_waves_per_day INTEGER DEFAULT 50,
  features_enabled TEXT[] DEFAULT ARRAY['basic_sharing', 'hi_waves'],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  CONSTRAINT valid_trial_dates CHECK (trial_start IS NULL OR trial_end IS NULL OR trial_start <= trial_end),
  CONSTRAINT valid_subscription_dates CHECK (subscription_start IS NULL OR subscription_end IS NULL OR subscription_start <= subscription_end)
);

-- Membership transaction history (for audit and billing)
CREATE TABLE IF NOT EXISTS membership_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES user_memberships(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'trial_started', 'trial_extended', 'trial_ended',
    'subscription_started', 'subscription_renewed', 'subscription_cancelled',
    'payment_success', 'payment_failed', 'refund_issued',
    'tier_upgraded', 'tier_downgraded', 'account_suspended', 'account_reactivated'
  )),
  
  -- Amounts and billing
  amount_cents INTEGER DEFAULT 0, -- Amount in cents (USD)
  currency TEXT DEFAULT 'USD',
  stan_transaction_id TEXT, -- Stan payment ID
  external_transaction_id TEXT, -- External payment processor ID
  
  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Admin tracking
  created_by UUID REFERENCES auth.users(id), -- Admin who made the change
  ip_address INET,
  user_agent TEXT
);

-- Invitation codes system (enhanced)
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  
  -- Code properties
  code_type TEXT NOT NULL DEFAULT 'trial' CHECK (code_type IN ('trial', 'beta', 'standard', 'premium', 'lifetime')),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Benefits
  trial_days INTEGER DEFAULT 7,
  grants_tier TEXT DEFAULT 'trial' CHECK (grants_tier IN ('trial', 'beta', 'standard', 'premium', 'lifetime')),
  features_granted TEXT[] DEFAULT ARRAY['basic_sharing', 'hi_waves'],
  
  -- Metadata
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  last_used_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_uses CHECK (current_uses <= max_uses),
  CONSTRAINT valid_dates CHECK (valid_from <= valid_until)
);

-- Beta tester management
CREATE TABLE IF NOT EXISTS beta_testers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Beta details
  beta_group TEXT NOT NULL DEFAULT 'general' CHECK (beta_group IN ('general', 'early', 'core', 'vip')),
  access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 10), -- 1=basic, 10=full access
  
  -- Feature access
  features_enabled TEXT[] DEFAULT ARRAY['rewards_system', 'beta_features'],
  max_feature_flags INTEGER DEFAULT 5,
  
  -- Feedback and engagement
  feedback_submitted INTEGER DEFAULT 0,
  bugs_reported INTEGER DEFAULT 0,
  feature_requests INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  graduated_at TIMESTAMPTZ, -- When they became a paying customer
  
  -- Metadata
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature usage analytics
CREATE TABLE IF NOT EXISTS feature_usage_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feature tracking
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session context
  session_id TEXT,
  user_agent TEXT,
  
  -- Usage metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite index for efficient queries
  UNIQUE(user_id, feature_name, DATE(created_at))
);

-- Enable RLS on all tables
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_status ON user_memberships(status) WHERE status = 'active';
CREATE INDEX idx_user_memberships_tier ON user_memberships(tier);
CREATE INDEX idx_membership_transactions_user_id ON membership_transactions(user_id);
CREATE INDEX idx_membership_transactions_type ON membership_transactions(transaction_type);
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code) WHERE is_active = true;
CREATE INDEX idx_beta_testers_user_id ON beta_testers(user_id);
CREATE INDEX idx_beta_testers_group ON beta_testers(beta_group) WHERE is_active = true;
CREATE INDEX idx_feature_usage_user_feature ON feature_usage_analytics(user_id, feature_name);

-- Updated at triggers
CREATE TRIGGER update_user_memberships_updated_at 
  BEFORE UPDATE ON user_memberships 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beta_testers_updated_at 
  BEFORE UPDATE ON beta_testers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- User memberships: Users can view their own, admins can view all
CREATE POLICY "Users can view their own membership"
  ON user_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON user_memberships FOR UPDATE
  USING (auth.uid() = user_id);

-- Membership transactions: Users can view their own
CREATE POLICY "Users can view their own transactions"
  ON membership_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Invitation codes: Anyone can read active codes (for validation)
CREATE POLICY "Anyone can read active invitation codes"
  ON invitation_codes FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Beta testers: Users can view their own status
CREATE POLICY "Users can view their own beta status"
  ON beta_testers FOR SELECT
  USING (auth.uid() = user_id);

-- Feature analytics: Users can view their own usage
CREATE POLICY "Users can view their own feature usage"
  ON feature_usage_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature usage"
  ON feature_usage_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Core functions for membership management

-- Get user's current membership status
CREATE OR REPLACE FUNCTION get_my_membership()
RETURNS JSON AS $$
DECLARE
  membership_row user_memberships%ROWTYPE;
  result JSON;
BEGIN
  -- Get current membership
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
  -- If no membership exists, create trial membership
  IF NOT FOUND THEN
    INSERT INTO user_memberships (
      user_id, tier, status, trial_start, trial_end,
      trial_days_total, features_enabled
    ) VALUES (
      auth.uid(), 'trial', 'active', NOW(), NOW() + INTERVAL '7 days',
      7, ARRAY['basic_sharing', 'hi_waves']
    ) RETURNING * INTO membership_row;
  END IF;
  
  -- Build result with computed fields
  result := jsonb_build_object(
    'id', membership_row.id,
    'tier', membership_row.tier,
    'status', membership_row.status,
    'is_member', membership_row.status = 'active',
    'is_trial', membership_row.tier = 'trial',
    'trial_days_remaining', 
      CASE 
        WHEN membership_row.trial_end IS NULL THEN 0
        WHEN membership_row.trial_end > NOW() THEN 
          EXTRACT(days FROM membership_row.trial_end - NOW())::INTEGER
        ELSE 0
      END,
    'features_enabled', membership_row.features_enabled,
    'max_shares_per_day', membership_row.max_shares_per_day,
    'max_hi_waves_per_day', membership_row.max_hi_waves_per_day,
    'subscription_end', membership_row.subscription_end,
    'created_at', membership_row.created_at
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use invitation code
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

-- Cancel membership (graceful downgrade)
CREATE OR REPLACE FUNCTION cancel_membership(p_reason TEXT DEFAULT 'user_requested')
RETURNS JSON AS $$
DECLARE
  membership_row user_memberships%ROWTYPE;
BEGIN
  -- Get current membership
  SELECT * INTO membership_row
  FROM user_memberships
  WHERE user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active membership found');
  END IF;
  
  -- Update membership to cancelled
  UPDATE user_memberships SET
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE user_id = auth.uid();
  
  -- Log transaction
  INSERT INTO membership_transactions (
    user_id, membership_id, transaction_type, description, metadata
  ) VALUES (
    auth.uid(), membership_row.id, 'subscription_cancelled',
    'Membership cancelled: ' || p_reason,
    jsonb_build_object('reason', p_reason, 'cancelled_at', NOW())
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Membership cancelled successfully',
    'access_until', membership_row.subscription_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track feature usage
CREATE OR REPLACE FUNCTION track_feature_usage(
  p_feature_name TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO feature_usage_analytics (
    user_id, feature_name, usage_count, metadata, session_id, user_agent
  ) VALUES (
    auth.uid(), p_feature_name, 1, p_metadata,
    current_setting('request.headers', true)::jsonb->>'x-session-id',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  )
  ON CONFLICT (user_id, feature_name, DATE(created_at))
  DO UPDATE SET 
    usage_count = feature_usage_analytics.usage_count + 1,
    last_used_at = NOW(),
    metadata = p_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_membership TO authenticated;
GRANT EXECUTE ON FUNCTION use_invitation_code TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_membership TO authenticated;
GRANT EXECUTE ON FUNCTION track_feature_usage TO authenticated;

-- Insert default invitation codes
INSERT INTO invitation_codes (
  code, code_type, max_uses, trial_days, grants_tier, features_granted, description
) VALUES
  ('BETA2025', 'beta', 100, 30, 'beta', ARRAY['basic_sharing', 'hi_waves', 'rewards_system'], 'Beta tester access for 2025'),
  ('TRIAL7D', 'trial', 1000, 7, 'trial', ARRAY['basic_sharing', 'hi_waves'], 'Standard 7-day trial'),
  ('VIP30D', 'premium', 50, 30, 'premium', ARRAY['basic_sharing', 'hi_waves', 'rewards_system', 'premium_features'], 'VIP 30-day trial')
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE user_memberships IS 'Tesla-grade membership system with trials, billing integration, and feature controls';
COMMENT ON TABLE membership_transactions IS 'Complete audit trail for all membership changes and billing events';
COMMENT ON TABLE invitation_codes IS 'Flexible invitation code system supporting multiple tiers and benefits';
COMMENT ON TABLE beta_testers IS 'Beta tester management with engagement tracking and graduation workflow';
COMMENT ON TABLE feature_usage_analytics IS 'Feature usage tracking for product analytics and billing';

COMMENT ON FUNCTION get_my_membership IS 'Get current user membership with computed fields like trial days remaining';
COMMENT ON FUNCTION use_invitation_code IS 'Redeem invitation code and activate membership benefits';
COMMENT ON FUNCTION cancel_membership IS 'Graceful membership cancellation with access retention until end date';
COMMENT ON FUNCTION track_feature_usage IS 'Track feature usage for analytics and billing purposes';