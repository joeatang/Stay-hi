-- 🚀 PHASE 3: TESLA-GRADE DATABASE FOUNDATION
-- Production-ready Hi membership schema with geospatial optimization
-- Designed for millions of users and thousands of concurrent Hi shares

-- ===================================================================
-- 🏗️ CORE MEMBERSHIP TABLES
-- ===================================================================

-- Hi Members with comprehensive profile data
CREATE TABLE IF NOT EXISTS hi_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile Information
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  
  -- Location Data (for geospatial features)
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  location_country VARCHAR(50),
  coordinates GEOGRAPHY(POINT, 4326), -- PostGIS geospatial point
  
  -- Membership Tiers
  membership_tier VARCHAR(20) DEFAULT 'free' CHECK (membership_tier IN ('free', 'premium', 'vip')),
  membership_expires_at TIMESTAMPTZ,
  
  -- Engagement Metrics
  total_hi_count INTEGER DEFAULT 0,
  hi_streak INTEGER DEFAULT 0,
  last_hi_date DATE,
  
  -- Privacy Settings
  profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  location_sharing BOOLEAN DEFAULT true,
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  
  -- Indexes for performance
  CONSTRAINT unique_user_member UNIQUE (user_id)
);

-- Geospatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_hi_members_coordinates ON hi_members USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_hi_members_location ON hi_members (location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_hi_members_active ON hi_members (is_active) WHERE is_active = true;

-- ===================================================================
-- 🌍 GEOSPATIAL HI SHARES SYSTEM
-- ===================================================================

-- Enhanced public shares with geospatial optimization
CREATE TABLE IF NOT EXISTS hi_shares_geo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES hi_members(id) ON DELETE CASCADE,
  
  -- Share Content
  share_text TEXT NOT NULL,
  current_emoji VARCHAR(10) DEFAULT '👋',
  desired_emoji VARCHAR(10) DEFAULT '👋',
  
  -- Geospatial Data
  location_name VARCHAR(200), -- Human-readable location "San Francisco, CA"
  coordinates GEOGRAPHY(POINT, 4326), -- Precise lat/lng coordinates
  location_accuracy INTEGER, -- GPS accuracy in meters
  
  -- Real-time Features
  is_live BOOLEAN DEFAULT false, -- Currently live/active share
  live_until TIMESTAMPTZ, -- When live share expires
  
  -- Engagement Metrics
  view_count INTEGER DEFAULT 0,
  hi_count INTEGER DEFAULT 0, -- How many "Hi"s this share received
  
  -- Privacy & Moderation
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  is_anonymous BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  
  -- Origin Tracking
  origin_source VARCHAR(50) DEFAULT 'web', -- 'web', 'mobile', 'api'
  origin_page VARCHAR(100), -- 'hi-island', 'profile', 'mobile-app'
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- High-performance geospatial indexes
CREATE INDEX IF NOT EXISTS idx_hi_shares_geo_coordinates ON hi_shares_geo USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_hi_shares_geo_location ON hi_shares_geo (location_name);
CREATE INDEX IF NOT EXISTS idx_hi_shares_geo_live ON hi_shares_geo (is_live, live_until) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_hi_shares_geo_visibility ON hi_shares_geo (visibility, moderation_status);
CREATE INDEX IF NOT EXISTS idx_hi_shares_geo_recent ON hi_shares_geo (created_at DESC) WHERE deleted_at IS NULL;

-- ===================================================================
-- 🎯 HI INTERACTION TRACKING
-- ===================================================================

-- Track all Hi interactions for analytics and gamification
CREATE TABLE IF NOT EXISTS hi_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  sender_id UUID REFERENCES hi_members(id) ON DELETE CASCADE, -- Who sent the Hi
  receiver_id UUID REFERENCES hi_members(id) ON DELETE CASCADE, -- Who received it
  share_id UUID REFERENCES hi_shares_geo(id) ON DELETE CASCADE, -- Related share
  
  -- Interaction Details
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('hi', 'wave', 'love', 'support')),
  interaction_value INTEGER DEFAULT 1, -- Point value for gamification
  
  -- Geospatial Context
  sender_coordinates GEOGRAPHY(POINT, 4326),
  distance_km DECIMAL(10,2), -- Distance between sender and receiver
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for interaction analytics
CREATE INDEX IF NOT EXISTS idx_hi_interactions_sender ON hi_interactions (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_interactions_receiver ON hi_interactions (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_interactions_share ON hi_interactions (share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_interactions_type ON hi_interactions (interaction_type, created_at DESC);

-- ===================================================================
-- 🏆 GAMIFICATION & ACHIEVEMENTS
-- ===================================================================

-- Member achievements and milestones
CREATE TABLE IF NOT EXISTS hi_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES hi_members(id) ON DELETE CASCADE,
  
  -- Achievement Details
  achievement_type VARCHAR(50) NOT NULL, -- 'first_hi', 'streak_week', 'global_traveler'
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  
  -- Achievement Data
  achievement_value INTEGER, -- Numeric value (streak count, distance, etc.)
  achievement_data JSONB, -- Flexible data storage
  
  -- Gamification
  points_awarded INTEGER DEFAULT 0,
  badge_emoji VARCHAR(10),
  
  -- System Fields
  achieved_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_member_achievement UNIQUE (member_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_hi_achievements_member ON hi_achievements (member_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_achievements_type ON hi_achievements (achievement_type);

-- ===================================================================
-- 🔄 REAL-TIME ANALYTICS TABLES
-- ===================================================================

-- Global Hi statistics (updated in real-time)
CREATE TABLE IF NOT EXISTS hi_global_stats (
  id INTEGER PRIMARY KEY DEFAULT 1, -- Singleton table
  
  -- Core Metrics
  total_members INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  
  -- Geographic Distribution
  active_countries INTEGER DEFAULT 0,
  active_cities INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  daily_active_users INTEGER DEFAULT 0,
  weekly_active_users INTEGER DEFAULT 0,
  monthly_active_users INTEGER DEFAULT 0,
  
  -- Real-time Data
  current_live_shares INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  
  -- System Fields
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT singleton_stats CHECK (id = 1)
);

-- Initialize stats record
INSERT INTO hi_global_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- 🚀 HIGH-PERFORMANCE RPC FUNCTIONS
-- ===================================================================

-- Get nearby Hi shares with distance calculation
CREATE OR REPLACE FUNCTION get_nearby_hi_shares(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km INTEGER DEFAULT 50,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  share_text TEXT,
  current_emoji VARCHAR,
  location_name VARCHAR,
  coordinates_lat DECIMAL,
  coordinates_lng DECIMAL,
  distance_km DECIMAL,
  member_username VARCHAR,
  created_at TIMESTAMPTZ,
  hi_count INTEGER
) 
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT 
    s.id,
    s.share_text,
    s.current_emoji,
    s.location_name,
    ST_Y(s.coordinates::geometry) as coordinates_lat,
    ST_X(s.coordinates::geometry) as coordinates_lng,
    ROUND(ST_DistanceSphere(
      s.coordinates::geometry,
      ST_Point(user_lng, user_lat)::geometry
    ) / 1000.0, 2) as distance_km,
    m.username as member_username,
    s.created_at,
    s.hi_count
  FROM hi_shares_geo s
  LEFT JOIN hi_members m ON s.member_id = m.id
  WHERE 
    s.visibility = 'public' 
    AND s.moderation_status = 'approved'
    AND s.deleted_at IS NULL
    AND ST_DWithin(
      s.coordinates::geography,
      ST_Point(user_lng, user_lat)::geography,
      radius_km * 1000
    )
  ORDER BY 
    ST_DistanceSphere(
      s.coordinates::geometry,
      ST_Point(user_lng, user_lat)::geometry
    ) ASC
  LIMIT limit_count;
$$;

-- Get global Hi statistics with real-time data
CREATE OR REPLACE FUNCTION get_hi_global_stats()
RETURNS TABLE (
  total_members INTEGER,
  total_shares INTEGER,
  total_interactions INTEGER,
  active_countries INTEGER,
  daily_active_users INTEGER,
  current_live_shares INTEGER,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER
AS $$
  -- Update stats in real-time
  UPDATE hi_global_stats SET
    total_members = (SELECT COUNT(*) FROM hi_members WHERE is_active = true),
    total_shares = (SELECT COUNT(*) FROM hi_shares_geo WHERE deleted_at IS NULL),
    total_interactions = (SELECT COUNT(*) FROM hi_interactions),
    active_countries = (SELECT COUNT(DISTINCT location_country) FROM hi_members WHERE location_country IS NOT NULL),
    daily_active_users = (
      SELECT COUNT(DISTINCT member_id) 
      FROM hi_shares_geo 
      WHERE created_at > now() - interval '24 hours'
    ),
    current_live_shares = (
      SELECT COUNT(*) 
      FROM hi_shares_geo 
      WHERE is_live = true AND live_until > now()
    ),
    last_activity_at = now(),
    updated_at = now()
  WHERE id = 1;
  
  -- Return updated stats
  SELECT 
    total_members,
    total_shares,
    total_interactions,
    active_countries,
    daily_active_users,
    current_live_shares,
    last_activity_at
  FROM hi_global_stats 
  WHERE id = 1;
$$;

-- Create a Hi share with automatic geocoding
CREATE OR REPLACE FUNCTION create_hi_share(
  p_member_id UUID,
  p_share_text TEXT,
  p_current_emoji VARCHAR DEFAULT '👋',
  p_location_name VARCHAR DEFAULT NULL,
  p_lat DECIMAL DEFAULT NULL,
  p_lng DECIMAL DEFAULT NULL,
  p_origin_page VARCHAR DEFAULT 'web'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  share_id UUID;
  coordinates_point GEOGRAPHY;
BEGIN
  -- Create coordinates point if lat/lng provided
  IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    coordinates_point := ST_Point(p_lng, p_lat)::geography;
  END IF;
  
  -- Insert the share
  INSERT INTO hi_shares_geo (
    member_id,
    share_text,
    current_emoji,
    location_name,
    coordinates,
    origin_page,
    created_at
  ) VALUES (
    p_member_id,
    p_share_text,
    p_current_emoji,
    p_location_name,
    coordinates_point,
    p_origin_page,
    now()
  ) RETURNING id INTO share_id;
  
  -- Update member's Hi count
  UPDATE hi_members 
  SET 
    total_hi_count = total_hi_count + 1,
    last_hi_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = p_member_id;
  
  RETURN share_id;
END;
$$;

-- ===================================================================
-- 🔐 ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE hi_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_shares_geo ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_achievements ENABLE ROW LEVEL SECURITY;

-- Hi Members: Users can only access their own data
CREATE POLICY "Users can view own member data" ON hi_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own member data" ON hi_members
  FOR UPDATE USING (user_id = auth.uid());

-- Hi Shares: Public shares are visible to all, private shares only to owner
CREATE POLICY "Public shares are visible to all" ON hi_shares_geo
  FOR SELECT USING (
    visibility = 'public' 
    AND moderation_status = 'approved' 
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can view own shares" ON hi_shares_geo
  FOR SELECT USING (
    member_id IN (SELECT id FROM hi_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create shares" ON hi_shares_geo
  FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM hi_members WHERE user_id = auth.uid())
  );

-- Global stats are readable by all
CREATE POLICY "Global stats are public" ON hi_global_stats
  FOR SELECT TO PUBLIC USING (true);

-- ===================================================================
-- 🔄 REAL-TIME SUBSCRIPTIONS
-- ===================================================================

-- Enable real-time for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE hi_shares_geo;
ALTER PUBLICATION supabase_realtime ADD TABLE hi_global_stats;

-- ===================================================================
-- 📊 PERFORMANCE MONITORING VIEWS
-- ===================================================================

-- View for monitoring database performance
CREATE OR REPLACE VIEW hi_performance_metrics AS
SELECT 
  'members' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as records_24h
FROM hi_members
WHERE is_active = true

UNION ALL

SELECT 
  'shares' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as records_24h
FROM hi_shares_geo
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'interactions' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as records_24h
FROM hi_interactions;

-- ===================================================================
-- 🎯 SAMPLE DATA FOR DEVELOPMENT
-- ===================================================================

-- Create sample Hi member (run only in development)
-- INSERT INTO hi_members (
--   user_id,
--   username,
--   display_name,
--   location_city,
--   location_state,
--   location_country,
--   coordinates
-- ) VALUES (
--   'sample-user-id',
--   'hi_pioneer',
--   'Hi Pioneer',
--   'San Francisco',
--   'CA',
--   'USA',
--   ST_Point(-122.4194, 37.7749)::geography
-- ) ON CONFLICT (user_id) DO NOTHING;

COMMENT ON SCHEMA public IS 'Tesla-grade Hi membership database with geospatial optimization for millions of users';