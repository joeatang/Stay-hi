-- Stay Hi - Complete Database Schema for Shared Profiles & Activity Tracking
-- Run these commands in your Supabase SQL Editor

-- =============================================================================
-- ACTIVITY TRACKING TABLES (NEW)
-- =============================================================================

-- Hi Island Activities (Location-based activities)
CREATE TABLE IF NOT EXISTS island_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'visit', 'explore', 'checkin', 'photo'
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  duration_minutes INTEGER,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  notes TEXT,
  photo_url TEXT,
  weather_condition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hi Muscle Activities (Fitness tracking)
CREATE TABLE IF NOT EXISTS muscle_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'sports'
  exercise_name TEXT NOT NULL,
  category TEXT, -- 'chest', 'back', 'legs', 'arms', 'core', 'cardio'
  sets INTEGER,
  reps INTEGER,
  weight_kg DECIMAL(5, 2),
  duration_minutes INTEGER,
  calories_burned INTEGER,
  intensity_level INTEGER CHECK (intensity_level >= 1 AND intensity_level <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Hi Moments (Main dashboard activities)
CREATE TABLE IF NOT EXISTS daily_hi_moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  moment_type TEXT NOT NULL, -- 'gratitude', 'achievement', 'reflection', 'goal'
  title TEXT NOT NULL,
  description TEXT,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  tags TEXT[], -- Array of tags for categorization
  is_favorite BOOLEAN DEFAULT false,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Sessions (Comprehensive session tracking)
CREATE TABLE IF NOT EXISTS activity_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL, -- 'island', 'muscle', 'daily'
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  activities_completed INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  streak_day INTEGER,
  session_data JSONB, -- Flexible data storage for session details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Streaks (Enhanced streak tracking)
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- 'daily_hi', 'island', 'muscle', 'overall'
  current_count INTEGER DEFAULT 0,
  longest_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_start_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- Invite Codes (Premium invite system)
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  code_type TEXT NOT NULL, -- '24h', '1week', 'unique', 'unlimited'
  created_by UUID REFERENCES auth.users(id),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- Additional code data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Invite Code Usage (Track who used which codes)
CREATE TABLE IF NOT EXISTS invite_code_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code_id UUID REFERENCES invite_codes(id) ON DELETE CASCADE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- =============================================================================
-- EXISTING TABLES (Updated)
-- =============================================================================

-- 1. PROFILES TABLE (Updated with public sharing)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  is_public BOOLEAN DEFAULT false, -- NEW: Enable public profile sharing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add public sharing column if table already exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Row Level Security for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view/edit their own profile
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Policy: Anyone can view public profiles (for sharing)
CREATE POLICY "Anyone can view public profiles" ON profiles
  FOR SELECT USING (is_public = true);

-- 2. USER STATS TABLE (Updated for sharing)
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_hi_moments INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_waves INTEGER DEFAULT 0,
  total_starts INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  last_hi_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS for user stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own stats
CREATE POLICY "Users can manage own stats" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Anyone can view stats for public profiles
CREATE POLICY "Anyone can view public profile stats" ON user_stats
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE is_public = true
    )
  );

-- 3. HI MOMENTS TABLE (for shared profile history)
CREATE TABLE IF NOT EXISTS hi_moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion_category TEXT NOT NULL,
  emotion_name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Share individual moments
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for hi moments
ALTER TABLE hi_moments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own moments
CREATE POLICY "Users can manage own moments" ON hi_moments
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Anyone can view public moments from public profiles
CREATE POLICY "Anyone can view public moments" ON hi_moments
  FOR SELECT USING (
    is_public = true AND user_id IN (
      SELECT id FROM profiles WHERE is_public = true
    )
  );

-- 4. ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'hi_count', 'streak', 'days_active', etc.
  requirement_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO achievements (id, name, description, icon, requirement_type, requirement_value) VALUES
  ('first_hi', 'First Hi', 'Complete your first Hi Moment', '🎉', 'hi_count', 1),
  ('streak_7', '7 Day Streak', 'Maintain a 7-day Hi streak', '🔥', 'streak', 7),
  ('hi_100', '100 Hi Moments', 'Complete 100 Hi Moments', '💯', 'hi_count', 100),
  ('wave_master', 'Wave Master', 'Send 50 Hi Waves', '🌊', 'wave_count', 50),
  ('streak_30', '30 Day Streak', 'Maintain a 30-day Hi streak', '⚡', 'streak', 30),
  ('social_butterfly', 'Social Butterfly', 'Share 10 public Hi Moments', '🦋', 'public_moments', 10)
ON CONFLICT (id) DO NOTHING;

-- 5. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- RLS for user achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own achievements
CREATE POLICY "Users can manage own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Anyone can view achievements for public profiles
CREATE POLICY "Anyone can view public profile achievements" ON user_achievements
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE is_public = true
    )
  );

-- 6. STORAGE BUCKET for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Users can update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Anyone can view avatars (for public profiles)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 7. HELPER FUNCTIONS

-- Function to calculate current streak
CREATE OR REPLACE FUNCTION calculate_current_streak(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_hi BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM hi_moments 
      WHERE user_id = user_uuid 
      AND DATE(created_at) = check_date
    ) INTO has_hi;
    
    IF NOT has_hi THEN
      EXIT;
    END IF;
    
    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN current_streak;
END;
$$;

-- Function to update user stats (call after Hi moments)
CREATE OR REPLACE FUNCTION update_user_stats(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  moment_count INTEGER;
  wave_count INTEGER;
  start_count INTEGER;
  active_days INTEGER;
  current_streak INTEGER;
  public_moment_count INTEGER;
BEGIN
  -- Get totals
  SELECT COUNT(*) INTO moment_count FROM hi_moments WHERE user_id = user_uuid;
  SELECT COALESCE(total_waves, 0) INTO wave_count FROM user_stats WHERE user_id = user_uuid;
  SELECT COALESCE(total_starts, 0) INTO start_count FROM user_stats WHERE user_id = user_uuid;
  SELECT COUNT(DISTINCT DATE(created_at)) INTO active_days FROM hi_moments WHERE user_id = user_uuid;
  SELECT COUNT(*) INTO public_moment_count FROM hi_moments WHERE user_id = user_uuid AND is_public = true;
  
  -- Calculate current streak
  SELECT calculate_current_streak(user_uuid) INTO current_streak;
  
  -- Update or insert stats
  INSERT INTO user_stats (
    user_id, total_hi_moments, current_streak, total_waves, total_starts, 
    days_active, level, experience_points, last_hi_date, updated_at
  ) VALUES (
    user_uuid, moment_count, current_streak, wave_count, start_count,
    active_days, (moment_count / 10) + 1, moment_count * 10, CURRENT_DATE, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hi_moments = moment_count,
    current_streak = current_streak,
    days_active = active_days,
    level = (moment_count / 10) + 1,
    experience_points = moment_count * 10,
    last_hi_date = CURRENT_DATE,
    updated_at = NOW();
    
  -- Check for new achievements
  PERFORM check_and_unlock_achievements(user_uuid);
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES FOR ACTIVITY TRACKING
-- =============================================================================

-- Island Activities RLS
ALTER TABLE island_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own island activities" ON island_activities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public profiles island activities viewable" ON island_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = island_activities.user_id 
      AND profiles.is_public = true
    )
  );

-- Muscle Activities RLS
ALTER TABLE muscle_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own muscle activities" ON muscle_activities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public profiles muscle activities viewable" ON muscle_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = muscle_activities.user_id 
      AND profiles.is_public = true
    )
  );

-- Daily Hi Moments RLS
ALTER TABLE daily_hi_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own daily moments" ON daily_hi_moments
  FOR ALL USING (auth.uid() = user_id);

-- Activity Sessions RLS
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity sessions" ON activity_sessions
  FOR ALL USING (auth.uid() = user_id);

-- User Streaks RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Invite Codes RLS (Admin/Creator access)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own invite codes" ON invite_codes
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view active invite codes" ON invite_codes
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Invite Code Usage RLS
ALTER TABLE invite_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invite usage" ON invite_code_usage
  FOR SELECT USING (auth.uid() = used_by);

CREATE POLICY "Invite creators can view their code usage" ON invite_code_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invite_codes 
      WHERE invite_codes.id = invite_code_usage.invite_code_id 
      AND invite_codes.created_by = auth.uid()
    )
  );

-- =============================================================================
-- HELPER FUNCTIONS FOR ACTIVITY TRACKING
-- =============================================================================

-- Function to log island activity and update stats
CREATE OR REPLACE FUNCTION log_island_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_location_name TEXT DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT NULL,
  p_mood_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  activity_id UUID;
BEGIN
  -- Insert activity
  INSERT INTO island_activities (
    user_id, activity_type, location_name, latitude, longitude,
    duration_minutes, mood_rating, notes
  ) VALUES (
    p_user_id, p_activity_type, p_location_name, p_latitude, p_longitude,
    p_duration_minutes, p_mood_rating, p_notes
  ) RETURNING id INTO activity_id;
  
  -- Update user stats
  UPDATE user_stats 
  SET 
    total_hi_moments = total_hi_moments + 1,
    days_active = days_active + CASE 
      WHEN last_hi_date < CURRENT_DATE THEN 1 
      ELSE 0 
    END,
    last_hi_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Update streak
  PERFORM update_user_streak(p_user_id, 'island');
  
  RETURN activity_id;
END;
$$;

-- Function to log muscle activity and update stats
CREATE OR REPLACE FUNCTION log_muscle_activity(
  p_user_id UUID,
  p_workout_type TEXT,
  p_exercise_name TEXT,
  p_category TEXT DEFAULT NULL,
  p_sets INTEGER DEFAULT NULL,
  p_reps INTEGER DEFAULT NULL,
  p_weight_kg DECIMAL DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT NULL,
  p_calories_burned INTEGER DEFAULT NULL,
  p_intensity_level INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  activity_id UUID;
BEGIN
  -- Insert activity
  INSERT INTO muscle_activities (
    user_id, workout_type, exercise_name, category, sets, reps,
    weight_kg, duration_minutes, calories_burned, intensity_level
  ) VALUES (
    p_user_id, p_workout_type, p_exercise_name, p_category, p_sets, p_reps,
    p_weight_kg, p_duration_minutes, p_calories_burned, p_intensity_level
  ) RETURNING id INTO activity_id;
  
  -- Update user stats
  UPDATE user_stats 
  SET 
    total_hi_moments = total_hi_moments + 1,
    days_active = days_active + CASE 
      WHEN last_hi_date < CURRENT_DATE THEN 1 
      ELSE 0 
    END,
    last_hi_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Update streak
  PERFORM update_user_streak(p_user_id, 'muscle');
  
  RETURN activity_id;
END;
$$;

-- Function to update user streaks
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_streak_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_streak user_streaks%ROWTYPE;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Get or create streak record
  SELECT * INTO current_streak 
  FROM user_streaks 
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  IF current_streak IS NULL THEN
    -- Create new streak
    INSERT INTO user_streaks (user_id, streak_type, current_count, longest_count, last_activity_date, streak_start_date)
    VALUES (p_user_id, p_streak_type, 1, 1, CURRENT_DATE, CURRENT_DATE);
  ELSE
    -- Update existing streak
    IF current_streak.last_activity_date = yesterday THEN
      -- Continue streak
      UPDATE user_streaks 
      SET 
        current_count = current_count + 1,
        longest_count = GREATEST(longest_count, current_count + 1),
        last_activity_date = CURRENT_DATE,
        is_active = true,
        updated_at = NOW()
      WHERE user_id = p_user_id AND streak_type = p_streak_type;
    ELSIF current_streak.last_activity_date = CURRENT_DATE THEN
      -- Same day, no change needed
      RETURN;
    ELSE
      -- Streak broken, start new one
      UPDATE user_streaks 
      SET 
        current_count = 1,
        last_activity_date = CURRENT_DATE,
        streak_start_date = CURRENT_DATE,
        is_active = true,
        updated_at = NOW()
      WHERE user_id = p_user_id AND streak_type = p_streak_type;
    END IF;
  END IF;
  
  -- Update overall user stats
  UPDATE user_stats 
  SET 
    current_streak = (
      SELECT COALESCE(SUM(current_count), 0) 
      FROM user_streaks 
      WHERE user_id = p_user_id AND is_active = true
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Function to create invite code
CREATE OR REPLACE FUNCTION create_invite_code(
  p_creator_id UUID,
  p_code_type TEXT,
  p_custom_code TEXT DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_hours INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  generated_code TEXT;
  expiry_time TIMESTAMPTZ;
BEGIN
  -- Generate code if not provided
  IF p_custom_code IS NULL THEN
    generated_code := CASE p_code_type
      WHEN '24h' THEN 'HI24-' || UPPER(substring(gen_random_uuid()::text from 1 for 8))
      WHEN '1week' THEN 'HI7D-' || UPPER(substring(gen_random_uuid()::text from 1 for 8))
      WHEN 'unique' THEN 'HIUNI-' || UPPER(substring(gen_random_uuid()::text from 1 for 12))
      ELSE 'HI-' || UPPER(substring(gen_random_uuid()::text from 1 for 10))
    END;
  ELSE
    generated_code := p_custom_code;
  END IF;
  
  -- Set expiry based on type
  IF p_expires_hours IS NOT NULL THEN
    expiry_time := NOW() + (p_expires_hours || ' hours')::INTERVAL;
  ELSE
    expiry_time := CASE p_code_type
      WHEN '24h' THEN NOW() + INTERVAL '24 hours'
      WHEN '1week' THEN NOW() + INTERVAL '7 days'
      ELSE NULL -- No expiry for unique/unlimited codes
    END;
  END IF;
  
  -- Insert invite code
  INSERT INTO invite_codes (code, code_type, created_by, max_uses, expires_at)
  VALUES (generated_code, p_code_type, p_creator_id, p_max_uses, expiry_time);
  
  RETURN generated_code;
END;
$$;

-- Function to use invite code
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  invite_record invite_codes%ROWTYPE;
BEGIN
  -- Get invite code
  SELECT * INTO invite_record 
  FROM invite_codes 
  WHERE code = p_code AND is_active = true;
  
  -- Check if code exists and is valid
  IF invite_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if expired
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RETURN false;
  END IF;
  
  -- Check if usage limit reached
  IF invite_record.current_uses >= invite_record.max_uses THEN
    RETURN false;
  END IF;
  
  -- Record usage
  INSERT INTO invite_code_usage (invite_code_id, used_by)
  VALUES (invite_record.id, p_user_id);
  
  -- Update usage count
  UPDATE invite_codes 
  SET current_uses = current_uses + 1,
      used_at = CASE WHEN current_uses = 0 THEN NOW() ELSE used_at END
  WHERE id = invite_record.id;
  
  -- Deactivate if max uses reached
  IF invite_record.current_uses + 1 >= invite_record.max_uses THEN
    UPDATE invite_codes SET is_active = false WHERE id = invite_record.id;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  achievement RECORD;
  user_stat RECORD;
  public_moment_count INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO user_stat FROM user_stats WHERE user_id = user_uuid;
  SELECT COUNT(*) INTO public_moment_count FROM hi_moments WHERE user_id = user_uuid AND is_public = true;
  
  -- Check each achievement
  FOR achievement IN SELECT * FROM achievements WHERE is_active = true LOOP
    -- Skip if already unlocked
    IF EXISTS(SELECT 1 FROM user_achievements WHERE user_id = user_uuid AND achievement_id = achievement.id) THEN
      CONTINUE;
    END IF;
    
    -- Check requirement
    CASE achievement.requirement_type
      WHEN 'hi_count' THEN
        IF user_stat.total_hi_moments >= achievement.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (user_uuid, achievement.id);
        END IF;
      WHEN 'streak' THEN
        IF user_stat.current_streak >= achievement.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (user_uuid, achievement.id);
        END IF;
      WHEN 'wave_count' THEN
        IF user_stat.total_waves >= achievement.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (user_uuid, achievement.id);
        END IF;
      WHEN 'public_moments' THEN
        IF public_moment_count >= achievement.requirement_value THEN
          INSERT INTO user_achievements (user_id, achievement_id) VALUES (user_uuid, achievement.id);
        END IF;
    END CASE;
  END LOOP;
END;
$$;

-- 8. TRIGGERS

-- Trigger to update stats when hi_moments change
CREATE OR REPLACE FUNCTION trigger_update_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_user_stats(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_stats(OLD.user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS update_stats_on_hi_moment ON hi_moments;
CREATE TRIGGER update_stats_on_hi_moment
  AFTER INSERT OR DELETE ON hi_moments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

-- 9. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_hi_moments_user_date ON hi_moments(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hi_moments_public ON hi_moments(is_public, user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- SETUP COMPLETE! 
-- Your shared profile system is now ready.
-- 
-- NEXT STEPS:
-- 1. Deploy to Vercel for URL routing
-- 2. Test with: yoursite.com/profile/username
-- 3. Enable public sharing in user profiles
-- 4. Create test profiles for sharing