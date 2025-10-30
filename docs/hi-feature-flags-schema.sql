-- ===============================================
-- 🚀 HI FEATURE FLAGS DATABASE SCHEMA
-- ===============================================
-- Tesla-grade feature flag management for Stay Hi

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  environments TEXT[] DEFAULT ARRAY['development'], -- ['development', 'staging', 'production', 'all']
  config JSONB DEFAULT '{}',
  
  -- Rollout controls
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_cohorts TEXT[] DEFAULT ARRAY['stable'], -- ['beta', 'early', 'stable']
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Safety controls
  is_killswitch BOOLEAN DEFAULT false, -- Emergency disable
  dependencies TEXT[], -- Other flags this depends on
  
  CONSTRAINT valid_flag_key CHECK (flag_key ~ '^[a-z][a-z0-9_]*$')
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policies for feature flags
CREATE POLICY "Feature flags are readable by everyone"
  ON feature_flags FOR SELECT
  USING (true);

-- Only authenticated users can manage flags (admin check in app layer)
CREATE POLICY "Authenticated users can manage feature flags"
  ON feature_flags FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Index for performance
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX idx_feature_flags_environments ON feature_flags USING GIN(environments);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_flags_updated_at 
  BEFORE UPDATE ON feature_flags 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default flags
INSERT INTO feature_flags (flag_key, display_name, description, enabled, environments, config) VALUES
  -- Authentication & Core
  ('auth_enabled', 'Authentication System', 'Main authentication system', true, ARRAY['all'], '{}'),
  ('auth_hybrid_mode', 'Hybrid Auth Mode', 'Allow both authenticated and guest experiences', true, ARRAY['all'], '{}'),
  
  -- Hi Rewards System (disabled by default for gradual rollout)
  ('rewards_enabled', 'Hi Rewards System', 'Main rewards and points system', false, ARRAY['development'], '{"version": "1.0"}'),
  ('rewards_waves_enabled', 'Wave Rewards', 'Points for sending Hi waves', false, ARRAY['development'], '{"points_per_wave": 5}'),
  ('rewards_shares_enabled', 'Share Rewards', 'Points for sharing location', false, ARRAY['development'], '{"points_per_share": 10}'),
  ('rewards_streaks_enabled', 'Streak Rewards', 'Daily engagement streaks', false, ARRAY['development'], '{"points_per_day": 2}'),
  ('rewards_global_events', 'Global Events', 'Community challenges and events', false, ARRAY['development'], '{}'),
  
  -- Core Features
  ('location_sharing', 'Location Sharing', 'Share and view locations on map', true, ARRAY['all'], '{}'),
  ('hi_island_map', 'Hi Island Map', 'World map with shared locations', true, ARRAY['all'], '{}'),
  ('profile_system', 'User Profiles', 'User profiles and customization', true, ARRAY['all'], '{}'),
  ('hi_gym', 'Hi Gym', 'Fitness tracking and goals', true, ARRAY['all'], '{}'),
  
  -- UI/UX Features
  ('premium_animations', 'Premium Animations', 'Enhanced UI animations', true, ARRAY['all'], '{}'),
  ('debug_mode', 'Debug Mode', 'Development debugging tools', true, ARRAY['development'], '{}'),
  
  -- A/B Tests (placeholder)
  ('ab_new_onboarding', 'New Onboarding Flow', 'A/B test for improved onboarding', false, ARRAY['development'], '{"variant": "control"}')
ON CONFLICT (flag_key) DO NOTHING;

-- Hi Rewards Points Ledger
CREATE TABLE IF NOT EXISTS hi_points_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount INTEGER NOT NULL, -- Can be negative for spending
  transaction_type TEXT NOT NULL, -- 'wave', 'share', 'streak', 'global_event', 'purchase', 'admin'
  description TEXT NOT NULL,
  reference_id UUID, -- Link to specific action (share_id, wave_id, etc.)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- Fraud prevention
  ip_address INET,
  user_agent TEXT,
  
  CONSTRAINT valid_amount CHECK (amount != 0),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('wave', 'share', 'streak', 'global_event', 'purchase', 'admin', 'bonus'))
);

-- Enable RLS for points
ALTER TABLE hi_points_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only see their own points
CREATE POLICY "Users can view their own points"
  ON hi_points_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert points (app handles validation)
CREATE POLICY "Authenticated users can earn points"
  ON hi_points_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id AND amount > 0);

-- Indexes for points ledger
CREATE INDEX idx_points_ledger_user_id ON hi_points_ledger(user_id);
CREATE INDEX idx_points_ledger_created_at ON hi_points_ledger(created_at DESC);
CREATE INDEX idx_points_ledger_type ON hi_points_ledger(transaction_type);

-- User points summary view
CREATE OR REPLACE VIEW user_points_summary AS
SELECT 
  user_id,
  SUM(amount) as total_points,
  COUNT(*) as total_transactions,
  MAX(created_at) as last_activity,
  COUNT(*) FILTER (WHERE transaction_type = 'wave') as wave_count,
  COUNT(*) FILTER (WHERE transaction_type = 'share') as share_count,
  COUNT(*) FILTER (WHERE transaction_type = 'streak') as streak_count
FROM hi_points_ledger
GROUP BY user_id;

-- Grant access to view
ALTER VIEW user_points_summary OWNER TO postgres;
GRANT SELECT ON user_points_summary TO authenticated;

-- RLS for view
CREATE POLICY "Users can view their own points summary"
  ON user_points_summary FOR SELECT
  USING (auth.uid() = user_id);

-- Function to get user's current points
CREATE OR REPLACE FUNCTION get_user_points(user_uuid UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM hi_points_ledger
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to award points (with anti-spam protection)
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
  daily_limit INTEGER := 1000; -- Max 1000 points per day per user
BEGIN
  -- Basic validation
  IF p_amount <= 0 OR p_amount > 100 THEN
    RAISE EXCEPTION 'Invalid point amount: %', p_amount;
  END IF;
  
  -- Anti-spam: Check recent activity
  SELECT COUNT(*) INTO recent_count
  FROM hi_points_ledger
  WHERE user_id = p_user_id
    AND transaction_type = p_transaction_type
    AND created_at > NOW() - INTERVAL '1 minute';
  
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded for transaction type: %', p_transaction_type;
  END IF;
  
  -- Daily limit check
  SELECT COALESCE(SUM(amount), 0) INTO recent_count
  FROM hi_points_ledger
  WHERE user_id = p_user_id
    AND created_at > CURRENT_DATE;
  
  IF recent_count + p_amount > daily_limit THEN
    RAISE EXCEPTION 'Daily points limit would be exceeded';
  END IF;
  
  -- Award points
  INSERT INTO hi_points_ledger (
    user_id, amount, transaction_type, description, 
    reference_id, metadata, ip_address, user_agent
  ) VALUES (
    p_user_id, p_amount, p_transaction_type, p_description,
    p_reference_id, p_metadata, inet_client_addr(), current_setting('request.headers', true)::jsonb->>'user-agent'
  );
  
  RETURN TRUE;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO system_logs (level, message, metadata) 
    VALUES ('error', 'Failed to award points: ' || SQLERRM, jsonb_build_object('user_id', p_user_id, 'amount', p_amount));
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE feature_flags IS 'Tesla-grade feature flag system for controlled feature rollouts';
COMMENT ON TABLE hi_points_ledger IS 'Complete transaction history for Hi Rewards points system';
COMMENT ON FUNCTION get_user_points IS 'Get current points balance for a user';
COMMENT ON FUNCTION award_points IS 'Safely award points with anti-spam protection';

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON hi_points_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION award_points TO authenticated;