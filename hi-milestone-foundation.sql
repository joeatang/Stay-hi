-- ===============================================
-- 🌊 HI MILESTONE SYSTEM - DATABASE FOUNDATION
-- ===============================================
-- Hi-OS surgical approach: extends existing schema without breaking changes
-- Integrates with unified_memberships for trial-aware milestone access

-- ===============================================
-- STEP 1: EXTEND EXISTING USER_STATS (ADDITIVE ONLY)
-- ===============================================

-- Add milestone tracking to existing user_stats table
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS hi_points INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS milestones_earned JSONB DEFAULT '[]'::jsonb;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS daily_points_earned INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_points_reset DATE DEFAULT CURRENT_DATE;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS milestone_tier TEXT DEFAULT 'anonymous';

-- Add milestone-related activity tracking
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_milestones INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_milestone_at TIMESTAMPTZ;

-- ===============================================
-- STEP 2: CREATE MILESTONE EVENTS TABLE (AUDIT TRAIL)
-- ===============================================

CREATE TABLE IF NOT EXISTS hi_milestone_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Milestone details
  milestone_type TEXT NOT NULL, -- 'waves', 'shares', 'streaks', 'global'
  milestone_key TEXT NOT NULL, -- 'WAVES_100', 'SHARES_50', 'STREAK_7'
  milestone_name TEXT NOT NULL, -- 'First Century', 'Story Starter', 'Week Streak'
  
  -- Points and rewards
  points_awarded INTEGER DEFAULT 0,
  base_points INTEGER DEFAULT 0,
  tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  -- Trial/membership context
  membership_tier TEXT DEFAULT 'anonymous',
  trial_tier TEXT, -- '24hr', '7d', etc. if earned during trial
  trial_expires_at TIMESTAMPTZ,
  
  -- Milestone context
  milestone_value INTEGER, -- The actual number achieved (100 waves, 50 shares)
  global_milestone BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT milestone_events_unique UNIQUE (user_id, milestone_key),
  CONSTRAINT valid_milestone_type CHECK (milestone_type IN ('waves', 'shares', 'streaks', 'global', 'special')),
  CONSTRAINT positive_points CHECK (points_awarded >= 0)
);

-- ===============================================
-- STEP 3: CREATE MILESTONE DEFINITIONS TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS hi_milestone_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Milestone identity
  milestone_key TEXT UNIQUE NOT NULL, -- 'WAVES_100'
  milestone_type TEXT NOT NULL,
  milestone_name TEXT NOT NULL, -- 'First Century'
  description TEXT,
  
  -- Threshold and rewards
  threshold_value INTEGER NOT NULL,
  base_points INTEGER DEFAULT 0,
  
  -- Access control
  min_tier TEXT DEFAULT 'anonymous', -- Minimum tier to earn this milestone
  trial_accessible BOOLEAN DEFAULT true,
  
  -- Display
  emoji TEXT DEFAULT '🌊',
  color TEXT DEFAULT '#3B82F6',
  celebration_level TEXT DEFAULT 'basic', -- 'basic', 'enhanced', 'celebration'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- STEP 4: GLOBAL MILESTONE TRACKING
-- ===============================================

CREATE TABLE IF NOT EXISTS hi_global_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Milestone identity
  milestone_key TEXT UNIQUE NOT NULL, -- 'GLOBAL_WAVES_100K'
  milestone_name TEXT NOT NULL, -- 'Community Century'
  milestone_type TEXT NOT NULL, -- 'global_waves', 'global_shares'
  
  -- Threshold and status
  threshold_value BIGINT NOT NULL,
  current_value BIGINT DEFAULT 0,
  achieved_at TIMESTAMPTZ,
  
  -- Rewards for community
  community_bonus_points INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- STEP 5: TRIAL MILESTONE ANALYTICS
-- ===============================================

CREATE TABLE IF NOT EXISTS hi_trial_milestone_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Trial context
  trial_tier TEXT NOT NULL,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_expires_at TIMESTAMPTZ,
  
  -- Milestone performance during trial
  milestones_earned INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  
  -- Conversion tracking
  converted_to_member BOOLEAN DEFAULT false,
  conversion_date TIMESTAMPTZ,
  conversion_milestone_key TEXT, -- Which milestone triggered conversion interest
  
  -- Analytics metadata
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- STEP 6: INDEXES FOR PERFORMANCE
-- ===============================================

-- Milestone events indexes
CREATE INDEX IF NOT EXISTS idx_milestone_events_user_id ON hi_milestone_events(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_events_type ON hi_milestone_events(milestone_type);
CREATE INDEX IF NOT EXISTS idx_milestone_events_achieved_at ON hi_milestone_events(achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_events_trial ON hi_milestone_events(trial_tier, achieved_at DESC);

-- Milestone definitions indexes  
CREATE INDEX IF NOT EXISTS idx_milestone_definitions_type ON hi_milestone_definitions(milestone_type);
CREATE INDEX IF NOT EXISTS idx_milestone_definitions_active ON hi_milestone_definitions(is_active, sort_order);

-- Global milestones indexes
CREATE INDEX IF NOT EXISTS idx_global_milestones_type ON hi_global_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_global_milestones_active ON hi_global_milestones(is_active);

-- Trial analytics indexes
CREATE INDEX IF NOT EXISTS idx_trial_analytics_user ON hi_trial_milestone_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_analytics_tier ON hi_trial_milestone_analytics(trial_tier);
CREATE INDEX IF NOT EXISTS idx_trial_analytics_conversion ON hi_trial_milestone_analytics(converted_to_member, conversion_date);

-- ===============================================
-- STEP 7: ROW LEVEL SECURITY (RLS)
-- ===============================================

-- Enable RLS on all milestone tables
ALTER TABLE hi_milestone_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_milestone_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_global_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_trial_milestone_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own milestone events
CREATE POLICY "Users can view own milestone events" ON hi_milestone_events
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view active milestone definitions
CREATE POLICY "Anyone can view active milestone definitions" ON hi_milestone_definitions
  FOR SELECT USING (is_active = true);

-- Anyone can view global milestones (community feature)
CREATE POLICY "Anyone can view global milestones" ON hi_global_milestones
  FOR SELECT USING (is_active = true);

-- Users can view their own trial analytics
CREATE POLICY "Users can view own trial analytics" ON hi_trial_milestone_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage milestone definitions
CREATE POLICY "Admins can manage milestone definitions" ON hi_milestone_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ===============================================
-- STEP 8: SEED MILESTONE DEFINITIONS (HI ETHOS)
-- ===============================================

-- Wave milestones (medallion taps) - Hi-themed names
INSERT INTO hi_milestone_definitions (milestone_key, milestone_type, milestone_name, description, threshold_value, base_points, emoji, color, trial_accessible) VALUES
('WAVES_10', 'waves', 'First Ripples', 'Your first 10 Hi waves', 10, 5, '🌊', '#3B82F6', true),
('WAVES_50', 'waves', 'Making Waves', '50 Hi waves sent', 50, 15, '🌊', '#3B82F6', true),
('WAVES_100', 'waves', 'First Century', '100 Hi waves milestone', 100, 25, '🌊', '#1D4ED8', true),
('WAVES_500', 'waves', 'Wave Rider', '500 Hi waves achieved', 500, 50, '🌊', '#1E40AF', false),
('WAVES_1000', 'waves', 'High Tide', '1,000 Hi waves milestone', 1000, 100, '🌊', '#1E3A8A', false),
('WAVES_5000', 'waves', 'Sea of Hi', '5,000 Hi waves milestone', 5000, 250, '🌊', '#172554', false);

-- Share milestones (Hi moments)
INSERT INTO hi_milestone_definitions (milestone_key, milestone_type, milestone_name, description, threshold_value, base_points, emoji, color, trial_accessible) VALUES
('SHARES_5', 'shares', 'First Hi', 'Your first 5 Hi moments', 5, 10, '👋', '#10B981', true),
('SHARES_25', 'shares', 'Hi Storyteller', '25 Hi moments shared', 25, 25, '👋', '#059669', true),
('SHARES_50', 'shares', 'Story Keeper', '50 Hi moments milestone', 50, 50, '👋', '#047857', false),
('SHARES_100', 'shares', 'Community Voice', '100 Hi moments milestone', 100, 100, '👋', '#065F46', false);

-- Streak milestones
INSERT INTO hi_milestone_definitions (milestone_key, milestone_type, milestone_name, description, threshold_value, base_points, emoji, color, trial_accessible) VALUES
('STREAK_3', 'streaks', 'Hi Habit', '3-day Hi streak', 3, 15, '🔥', '#F59E0B', true),
('STREAK_7', 'streaks', 'Week Keeper', '7-day Hi streak', 7, 35, '🔥', '#D97706', true),
('STREAK_30', 'streaks', 'Monthly Hi', '30-day Hi streak', 30, 150, '🔥', '#B45309', false),
('STREAK_100', 'streaks', 'Steady Light', '100-day Hi streak', 100, 500, '🔥', '#92400E', false);

-- Global community milestones (for future)
INSERT INTO hi_global_milestones (milestone_key, milestone_name, milestone_type, threshold_value, community_bonus_points) VALUES
('GLOBAL_WAVES_10K', 'Community Waves: 10K', 'global_waves', 10000, 5),
('GLOBAL_WAVES_100K', 'Community Waves: 100K', 'global_waves', 100000, 10),
('GLOBAL_WAVES_1M', 'Community Waves: 1M', 'global_waves', 1000000, 25),
('GLOBAL_SHARES_1K', 'Community Stories: 1K', 'global_shares', 1000, 5),
('GLOBAL_SHARES_10K', 'Community Stories: 10K', 'global_shares', 10000, 15);

-- ===============================================
-- STEP 9: FUNCTIONS FOR MILESTONE MANAGEMENT
-- ===============================================

-- Function to check user's milestone access based on membership
CREATE OR REPLACE FUNCTION get_user_milestone_access(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  membership_info JSON;
  access_config JSON;
BEGIN
  -- Get user's membership info
  SELECT get_unified_membership() INTO membership_info;
  
  -- Determine milestone access based on tier
  access_config := CASE 
    WHEN membership_info->>'tier' = 'anonymous' THEN
      jsonb_build_object(
        'canEarnPoints', false,
        'canViewMilestones', true,
        'maxPointsPerDay', 0,
        'milestoneTypes', array['waves'],
        'notifications', 'ghost',
        'trialTier', null
      )
    WHEN membership_info->>'tier' IN ('24hr') THEN
      jsonb_build_object(
        'canEarnPoints', false,
        'canViewMilestones', true,
        'maxPointsPerDay', 0,
        'milestoneTypes', array['waves'],
        'notifications', 'ghost',
        'trialTier', membership_info->>'tier'
      )
    WHEN membership_info->>'tier' IN ('7d', '14d') THEN
      jsonb_build_object(
        'canEarnPoints', true,
        'canViewMilestones', true,
        'maxPointsPerDay', 50,
        'milestoneTypes', array['waves', 'shares'],
        'notifications', 'basic',
        'trialTier', membership_info->>'tier'
      )
    WHEN membership_info->>'tier' IN ('30d', '60d', '90d') THEN
      jsonb_build_object(
        'canEarnPoints', true,
        'canViewMilestones', true,
        'maxPointsPerDay', 150,
        'milestoneTypes', array['waves', 'shares', 'streaks'],
        'notifications', 'enhanced',
        'trialTier', membership_info->>'tier'
      )
    ELSE -- member, lifetime
      jsonb_build_object(
        'canEarnPoints', true,
        'canViewMilestones', true,
        'maxPointsPerDay', 500,
        'milestoneTypes', array['waves', 'shares', 'streaks', 'special'],
        'notifications', 'celebration',
        'trialTier', null
      )
  END;
  
  RETURN jsonb_build_object(
    'membership', membership_info,
    'milestoneAccess', access_config
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION get_user_milestone_access(UUID) TO authenticated, anon;

-- ===============================================
-- COMMENTS AND DOCUMENTATION
-- ===============================================

COMMENT ON TABLE hi_milestone_events IS 'Audit trail of all milestone achievements with trial/membership context';
COMMENT ON TABLE hi_milestone_definitions IS 'Configuration for all available milestones in the Hi system';
COMMENT ON TABLE hi_global_milestones IS 'Community-wide milestone tracking for collective achievements';
COMMENT ON TABLE hi_trial_milestone_analytics IS 'Analytics for milestone engagement during trial periods';

COMMENT ON FUNCTION get_user_milestone_access(UUID) IS 'Returns user milestone permissions based on current membership tier';

-- ===============================================
-- DEPLOYMENT VERIFICATION QUERIES
-- ===============================================

-- Check that extensions were added properly
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
  AND column_name IN ('hi_points', 'milestones_earned', 'daily_points_earned')
ORDER BY column_name;

-- Check milestone definitions were seeded
SELECT 
  milestone_type,
  COUNT(*) as definition_count,
  SUM(CASE WHEN trial_accessible THEN 1 ELSE 0 END) as trial_accessible_count
FROM hi_milestone_definitions 
WHERE is_active = true
GROUP BY milestone_type
ORDER BY milestone_type;

-- Verify RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename LIKE 'hi_milestone%'
ORDER BY tablename, policyname;