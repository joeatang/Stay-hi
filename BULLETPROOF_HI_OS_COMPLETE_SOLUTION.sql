-- 🏆 BULLETPROOF HI OS COMPLETE ARCHITECTURE
-- MISSION: Handle ALL aspects - Global stats + Individual tracking + Rewards/Milestones
-- This is the ONE solution that fixes everything forever

-- ===============================================
-- PART 1: GLOBAL PUBLIC STATS (Community Wide)
-- ===============================================

-- Single source of truth for global community stats
CREATE TABLE IF NOT EXISTS global_community_stats (
  id SERIAL PRIMARY KEY,
  global_hi_waves BIGINT DEFAULT 0,    -- Total medallion taps across all users
  total_his BIGINT DEFAULT 0,          -- Total share submissions across all users  
  total_users BIGINT DEFAULT 0,        -- Community size
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize global stats
INSERT INTO global_community_stats (id, global_hi_waves, total_his, total_users) 
VALUES (1, 0, 86, 0) 
ON CONFLICT (id) DO NOTHING;

-- ===============================================
-- PART 2: INDIVIDUAL USER TRACKING TABLES
-- ===============================================

-- Personal user statistics (individual tracking)
CREATE TABLE IF NOT EXISTS user_personal_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal counters
  personal_hi_waves INTEGER DEFAULT 0,      -- Individual medallion taps
  personal_his INTEGER DEFAULT 0,           -- Individual share submissions
  total_activities INTEGER DEFAULT 0,       -- Combined activities
  
  -- Streak tracking
  current_streak INTEGER DEFAULT 0,         -- Current consecutive days
  longest_streak INTEGER DEFAULT 0,         -- Best streak ever
  last_activity_date DATE,                  -- Last interaction date
  
  -- Experience & Progress
  experience_points INTEGER DEFAULT 0,      -- XP earned
  user_level INTEGER DEFAULT 1,            -- User level (1-100)
  
  -- Activity breakdown
  dashboard_activities INTEGER DEFAULT 0,    -- Hi-Dashboard interactions
  island_activities INTEGER DEFAULT 0,      -- Hi-Island activities  
  muscle_activities INTEGER DEFAULT 0,      -- Hi-Muscle sessions
  
  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Individual activity history (detailed tracking)
CREATE TABLE IF NOT EXISTS user_activity_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL,              -- 'medallion_tap', 'share_submission', 'achievement_unlock'
  source_page TEXT NOT NULL,               -- 'hi-dashboard', 'hi-island', 'hi-muscle'
  activity_data JSONB,                     -- Flexible data storage
  
  -- Points & rewards
  points_earned INTEGER DEFAULT 0,         -- XP gained from this activity
  milestone_triggered TEXT,                -- Achievement unlocked (if any)
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,                   -- 'waves', 'shares', 'streaks', 'activities'
  requirement_type TEXT NOT NULL,           -- 'total_count', 'streak_days', 'combo'
  requirement_value INTEGER NOT NULL,       -- Target number
  points_reward INTEGER DEFAULT 0,          -- XP reward
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievement unlocks
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress_data JSONB,                      -- Progress details when unlocked
  
  UNIQUE(user_id, achievement_id)
);

-- ===============================================
-- PART 3: BULLETPROOF TRACKING FUNCTIONS
-- ===============================================

-- 🎯 MEDALLION TAP TRACKER (Global + Individual)
CREATE OR REPLACE FUNCTION track_medallion_tap(p_user_id UUID DEFAULT NULL, p_source_page TEXT DEFAULT 'hi-dashboard')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  new_global_waves BIGINT;
  new_personal_waves INTEGER;
  points_earned INTEGER := 1;
  milestone_unlocked TEXT := NULL;
BEGIN
  -- 1. UPDATE GLOBAL COMMUNITY STATS (Always)
  UPDATE global_community_stats 
  SET global_hi_waves = global_hi_waves + 1, updated_at = NOW() 
  WHERE id = 1
  RETURNING global_hi_waves INTO new_global_waves;
  
  -- 2. UPDATE INDIVIDUAL USER STATS (If user provided)
  IF p_user_id IS NOT NULL THEN
    -- Upsert user stats
    INSERT INTO user_personal_stats (user_id, personal_hi_waves, last_activity_date, experience_points, updated_at)
    VALUES (p_user_id, 1, CURRENT_DATE, points_earned, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      personal_hi_waves = user_personal_stats.personal_hi_waves + 1,
      total_activities = user_personal_stats.total_activities + 1,
      experience_points = user_personal_stats.experience_points + points_earned,
      user_level = (user_personal_stats.experience_points + points_earned) / 100 + 1,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
    RETURNING personal_hi_waves INTO new_personal_waves;
    
    -- Log individual activity
    INSERT INTO user_activity_history (user_id, activity_type, source_page, points_earned, activity_data)
    VALUES (p_user_id, 'medallion_tap', p_source_page, points_earned, jsonb_build_object('global_waves', new_global_waves));
    
    -- Check for achievements
    IF new_personal_waves = 1 THEN milestone_unlocked = 'first_wave'; END IF;
    IF new_personal_waves = 100 THEN milestone_unlocked = 'wave_master'; END IF;
    
    -- Unlock achievement if earned
    IF milestone_unlocked IS NOT NULL THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, milestone_unlocked)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- 3. RETURN COMPREHENSIVE RESULT
  result = jsonb_build_object(
    'success', true,
    'global_hi_waves', new_global_waves,
    'personal_hi_waves', COALESCE(new_personal_waves, 0),
    'points_earned', points_earned,
    'milestone_unlocked', milestone_unlocked,
    'source_page', p_source_page
  );
  
  RETURN result;
END;
$$;

-- 🎯 SHARE SUBMISSION TRACKER (Global + Individual)  
CREATE OR REPLACE FUNCTION track_share_submission(p_user_id UUID DEFAULT NULL, p_source_page TEXT DEFAULT 'hi-dashboard', p_submission_data JSONB DEFAULT '{}')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  new_total_his BIGINT;
  new_personal_his INTEGER;
  points_earned INTEGER := 5;
  milestone_unlocked TEXT := NULL;
BEGIN
  -- 1. UPDATE GLOBAL COMMUNITY STATS (Always)
  UPDATE global_community_stats 
  SET total_his = total_his + 1, updated_at = NOW() 
  WHERE id = 1
  RETURNING total_his INTO new_total_his;
  
  -- 2. UPDATE INDIVIDUAL USER STATS (If user provided)
  IF p_user_id IS NOT NULL THEN
    -- Upsert user stats
    INSERT INTO user_personal_stats (user_id, personal_his, last_activity_date, experience_points, updated_at)
    VALUES (p_user_id, 1, CURRENT_DATE, points_earned, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      personal_his = user_personal_stats.personal_his + 1,
      total_activities = user_personal_stats.total_activities + 1,
      experience_points = user_personal_stats.experience_points + points_earned,
      user_level = (user_personal_stats.experience_points + points_earned) / 100 + 1,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
    RETURNING personal_his INTO new_personal_his;
    
    -- Update page-specific counter
    IF p_source_page = 'hi-dashboard' THEN
      UPDATE user_personal_stats SET dashboard_activities = dashboard_activities + 1 WHERE user_id = p_user_id;
    ELSIF p_source_page = 'hi-island' THEN  
      UPDATE user_personal_stats SET island_activities = island_activities + 1 WHERE user_id = p_user_id;
    ELSIF p_source_page = 'hi-muscle' THEN
      UPDATE user_personal_stats SET muscle_activities = muscle_activities + 1 WHERE user_id = p_user_id;
    END IF;
    
    -- Log individual activity
    INSERT INTO user_activity_history (user_id, activity_type, source_page, points_earned, activity_data)
    VALUES (p_user_id, 'share_submission', p_source_page, points_earned, 
            p_submission_data || jsonb_build_object('total_his', new_total_his));
    
    -- Check for achievements
    IF new_personal_his = 1 THEN milestone_unlocked = 'first_share'; END IF;
    IF new_personal_his = 10 THEN milestone_unlocked = 'share_warrior'; END IF;
    IF new_personal_his = 100 THEN milestone_unlocked = 'share_master'; END IF;
    
    -- Unlock achievement if earned
    IF milestone_unlocked IS NOT NULL THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, milestone_unlocked)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- 3. RETURN COMPREHENSIVE RESULT
  result = jsonb_build_object(
    'success', true,
    'total_his', new_total_his,
    'personal_his', COALESCE(new_personal_his, 0),
    'points_earned', points_earned,
    'milestone_unlocked', milestone_unlocked,
    'source_page', p_source_page
  );
  
  RETURN result;
END;
$$;

-- ===============================================
-- PART 4: QUERY FUNCTIONS FOR UI
-- ===============================================

-- Get global community stats
CREATE OR REPLACE FUNCTION get_global_community_stats()
RETURNS TABLE (
  global_hi_waves BIGINT,
  total_his BIGINT,
  total_users BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT g.global_hi_waves, g.total_his, g.total_users, g.updated_at
  FROM global_community_stats g
  WHERE g.id = 1;
END;
$$;

-- Get individual user stats with achievements
CREATE OR REPLACE FUNCTION get_user_complete_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_stats RECORD;
  achievements_count INTEGER;
  recent_activity JSONB;
  result JSONB;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats FROM user_personal_stats WHERE user_id = p_user_id;
  
  -- Get achievements count
  SELECT COUNT(*) INTO achievements_count FROM user_achievements WHERE user_id = p_user_id;
  
  -- Get recent activity (last 10)
  SELECT jsonb_agg(jsonb_build_object(
    'type', activity_type,
    'page', source_page, 
    'points', points_earned,
    'date', created_at
  )) INTO recent_activity
  FROM (
    SELECT * FROM user_activity_history 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC 
    LIMIT 10
  ) recent;
  
  -- Build comprehensive result
  result = jsonb_build_object(
    'personal_stats', row_to_json(user_stats),
    'achievements_unlocked', achievements_count,
    'recent_activity', COALESCE(recent_activity, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- ===============================================
-- PART 5: INITIAL ACHIEVEMENTS SETUP
-- ===============================================

INSERT INTO achievements (id, name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
('first_wave', 'First Wave', 'Send your first Hi Wave', '👋', 'waves', 'total_count', 1, 10),
('wave_master', 'Wave Master', 'Send 100 Hi Waves', '🌊', 'waves', 'total_count', 100, 100),
('first_share', 'First Share', 'Complete your first share', '🎉', 'shares', 'total_count', 1, 20),
('share_warrior', 'Share Warrior', 'Complete 10 shares', '⚔️', 'shares', 'total_count', 10, 50),
('share_master', 'Share Master', 'Complete 100 shares', '🏆', 'shares', 'total_count', 100, 200),
('streak_7', '7-Day Streak', 'Maintain activity for 7 days', '🔥', 'streaks', 'streak_days', 7, 70),
('streak_30', '30-Day Streak', 'Maintain activity for 30 days', '⚡', 'streaks', 'streak_days', 30, 300)
ON CONFLICT (id) DO NOTHING;

-- ===============================================  
-- PART 6: PERMISSIONS & SECURITY
-- ===============================================

-- Grant permissions for global functions
GRANT EXECUTE ON FUNCTION track_medallion_tap(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_share_submission(UUID, TEXT, JSONB) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_global_community_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_complete_stats(UUID) TO authenticated;

-- Grant table permissions  
GRANT SELECT ON global_community_stats TO authenticated, anon;
GRANT SELECT ON user_personal_stats TO authenticated;
GRANT SELECT ON achievements TO authenticated, anon;

-- ===============================================
-- PART 7: TESTING & VERIFICATION
-- ===============================================

-- Test global stats
SELECT * FROM get_global_community_stats();

-- Test medallion tap (anonymous)
SELECT track_medallion_tap(NULL, 'hi-dashboard');

-- Test share submission (anonymous) 
SELECT track_share_submission(NULL, 'hi-dashboard', '{"type": "test"}');

-- Verify results
SELECT * FROM get_global_community_stats();