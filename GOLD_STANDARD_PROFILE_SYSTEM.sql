-- ===============================================
-- 🏆 GOLD STANDARD PROFILE SYSTEM
-- ===============================================
-- Woz-grade architecture: Own your data, forever accessible
-- Like Finch/Zero - complete historical profile with real-time sync
-- Date: December 10, 2025

-- ===============================================
-- PHASE 1: FIX PROFILE PROPAGATION (SNAPSHOTS → LIVE REFS)
-- ===============================================

-- Remove snapshot columns from public_shares (they'll come from JOIN)
-- NOTE: Run this ONLY if you want to migrate existing data
-- For NEW deployments, skip to the view creation

-- Migration approach (safe, preserves existing data):
-- Keep snapshot columns for backwards compatibility during transition
-- Add profile_user_id for JOIN-based lookups
-- Views will prioritize live data, fall back to snapshots

-- ===============================================
-- PHASE 2: STREAK HISTORY TRACKING
-- ===============================================

-- Track daily streak snapshots (so you can see past streaks)
CREATE TABLE IF NOT EXISTS streak_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  streak_value INTEGER NOT NULL,
  milestone_reached TEXT, -- 'Week Keeper', 'Monthly Hi', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date) -- One entry per user per day
);

-- Enable RLS
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak history
CREATE POLICY "Users can view their own streak history" ON streak_history
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert streak history (via trigger or function)
CREATE POLICY "System can insert streak history" ON streak_history
  FOR INSERT WITH CHECK (true);

-- Index for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, date DESC);

-- ===============================================
-- PHASE 3: MILESTONE TIMELINE (HISTORICAL VIEW)
-- ===============================================

-- The hi_milestone_events table already exists and tracks achievements!
-- Just need to ensure it's populated correctly and queryable

-- Add index for timeline queries
CREATE INDEX IF NOT EXISTS idx_milestone_events_user_achieved ON hi_milestone_events(user_id, achieved_at DESC);

-- Ensure RLS policy exists
ALTER TABLE hi_milestone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own milestone events" ON hi_milestone_events;
CREATE POLICY "Users can view their own milestone events" ON hi_milestone_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert milestone events" ON hi_milestone_events;
CREATE POLICY "System can insert milestone events" ON hi_milestone_events
  FOR INSERT WITH CHECK (true);

-- ===============================================
-- PHASE 4: ACTIVITY LOG HISTORY (HI ARCHIVES)
-- ===============================================

-- hi_archives already exists - just ensure proper indexing

-- Index for date-range filtering
CREATE INDEX IF NOT EXISTS idx_archives_user_created_date ON hi_archives(user_id, (created_at::date) DESC);

-- Index for share type filtering
CREATE INDEX IF NOT EXISTS idx_archives_user_type_date ON hi_archives(user_id, share_type, created_at DESC);

-- ===============================================
-- PHASE 5: SMART VIEWS FOR LIVE PROFILE DATA
-- ===============================================

-- View: public_shares with LIVE profile data (not snapshots)
CREATE OR REPLACE VIEW public_shares_with_live_profiles AS
SELECT 
  ps.id,
  ps.user_id,
  ps.content,
  ps.visibility,
  ps.share_type,
  ps.location_data,
  ps.metadata,
  ps.total_his,
  ps.created_at,
  ps.updated_at,
  -- LIVE profile data (always current)
  COALESCE(p.username, ps.metadata->>'username') as username,
  COALESCE(p.display_name, ps.metadata->>'display_name') as display_name,
  COALESCE(p.avatar_url, ps.metadata->>'avatar_url') as avatar_url,
  COALESCE(p.bio, ps.metadata->>'bio') as bio
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id;

-- Comment explaining the view
COMMENT ON VIEW public_shares_with_live_profiles IS 
'Joins public_shares with live profile data. Always shows current username/avatar, falls back to metadata snapshot if user deleted.';

-- ===============================================
-- PHASE 6: HISTORICAL STATS SNAPSHOTS
-- ===============================================

-- Track stats over time (so you can see your growth)
CREATE TABLE IF NOT EXISTS user_stats_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Stats snapshot
  total_hi_moments INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_waves INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  
  -- Milestone context
  milestones_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE user_stats_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats history" ON user_stats_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert stats history" ON user_stats_history
  FOR INSERT WITH CHECK (true);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_stats_history_user_date ON user_stats_history(user_id, snapshot_date DESC);

-- ===============================================
-- PHASE 7: AUTOMATIC DAILY SNAPSHOT TRIGGERS
-- ===============================================

-- Function to capture daily streak snapshot
CREATE OR REPLACE FUNCTION capture_daily_streak_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update today's streak snapshot
  INSERT INTO streak_history (user_id, date, streak_value)
  VALUES (NEW.user_id, CURRENT_DATE, NEW.current_streak)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    streak_value = NEW.current_streak,
    created_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user_stats updates
DROP TRIGGER IF EXISTS trigger_capture_streak_snapshot ON user_stats;
CREATE TRIGGER trigger_capture_streak_snapshot
  AFTER INSERT OR UPDATE OF current_streak ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION capture_daily_streak_snapshot();

-- Function to capture daily stats snapshot
CREATE OR REPLACE FUNCTION capture_daily_stats_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update today's stats snapshot
  INSERT INTO user_stats_history (
    user_id, snapshot_date, total_hi_moments, current_streak, 
    longest_streak, total_waves, days_active, level, experience_points
  )
  VALUES (
    NEW.user_id, CURRENT_DATE, NEW.total_hi_moments, NEW.current_streak,
    NEW.longest_streak, NEW.total_waves, NEW.days_active, NEW.level, NEW.experience_points
  )
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    total_hi_moments = NEW.total_hi_moments,
    current_streak = NEW.current_streak,
    longest_streak = NEW.longest_streak,
    total_waves = NEW.total_waves,
    days_active = NEW.days_active,
    level = NEW.level,
    experience_points = NEW.experience_points,
    created_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user_stats updates
DROP TRIGGER IF EXISTS trigger_capture_stats_snapshot ON user_stats;
CREATE TRIGGER trigger_capture_stats_snapshot
  AFTER INSERT OR UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION capture_daily_stats_snapshot();

-- ===============================================
-- PHASE 8: CONVENIENCE FUNCTIONS FOR FRONTEND
-- ===============================================

-- Get user's complete profile with latest stats
CREATE OR REPLACE FUNCTION get_user_profile_complete(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', row_to_json(p.*),
    'stats', row_to_json(s.*),
    'recent_milestones', (
      SELECT json_agg(row_to_json(m.*))
      FROM (
        SELECT * FROM hi_milestone_events 
        WHERE user_id = p_user_id 
        ORDER BY achieved_at DESC 
        LIMIT 10
      ) m
    ),
    'current_streak', s.current_streak,
    'total_archives', (SELECT COUNT(*) FROM hi_archives WHERE user_id = p_user_id)
  )
  INTO result
  FROM profiles p
  LEFT JOIN user_stats s ON p.id = s.user_id
  WHERE p.id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's streak history (for calendar/graph)
CREATE OR REPLACE FUNCTION get_streak_history(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  streak_value INTEGER,
  milestone_reached TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sh.date, sh.streak_value, sh.milestone_reached
  FROM streak_history sh
  WHERE sh.user_id = p_user_id
    AND sh.date BETWEEN p_start_date AND p_end_date
  ORDER BY sh.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's milestone timeline
CREATE OR REPLACE FUNCTION get_milestone_timeline(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  milestone_name TEXT,
  milestone_type TEXT,
  points_awarded INTEGER,
  milestone_value INTEGER,
  achieved_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hme.id,
    hme.milestone_name,
    hme.milestone_type,
    hme.points_awarded,
    hme.milestone_value,
    hme.achieved_at
  FROM hi_milestone_events hme
  WHERE hme.user_id = p_user_id
  ORDER BY hme.achieved_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's activity history (archives with date filtering)
CREATE OR REPLACE FUNCTION get_activity_history(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_share_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  share_type TEXT,
  visibility TEXT,
  location_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ha.id,
    ha.content,
    ha.share_type,
    ha.visibility,
    ha.location_data,
    ha.created_at
  FROM hi_archives ha
  WHERE ha.user_id = p_user_id
    AND ha.created_at BETWEEN p_start_date AND p_end_date
    AND (p_share_type IS NULL OR ha.share_type = p_share_type)
  ORDER BY ha.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's stats growth over time
CREATE OR REPLACE FUNCTION get_stats_growth(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days'
)
RETURNS TABLE (
  snapshot_date DATE,
  total_hi_moments INTEGER,
  current_streak INTEGER,
  total_waves INTEGER,
  days_active INTEGER,
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ush.snapshot_date,
    ush.total_hi_moments,
    ush.current_streak,
    ush.total_waves,
    ush.days_active,
    ush.level
  FROM user_stats_history ush
  WHERE ush.user_id = p_user_id
    AND ush.snapshot_date >= p_start_date
  ORDER BY ush.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- PHASE 9: GRANT PERMISSIONS
-- ===============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_profile_complete(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_streak_history(UUID, DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_milestone_timeline(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_activity_history(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_stats_growth(UUID, DATE) TO authenticated, anon;

-- Grant select on view
GRANT SELECT ON public_shares_with_live_profiles TO authenticated, anon;

-- ===============================================
-- DEPLOYMENT VERIFICATION QUERIES
-- ===============================================

-- Check tables exist
DO $$
BEGIN
  RAISE NOTICE 'Verifying Gold Standard Profile System...';
  
  -- Check streak_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'streak_history') THEN
    RAISE NOTICE '✅ streak_history table created';
  END IF;
  
  -- Check user_stats_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats_history') THEN
    RAISE NOTICE '✅ user_stats_history table created';
  END IF;
  
  -- Check view
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'public_shares_with_live_profiles') THEN
    RAISE NOTICE '✅ public_shares_with_live_profiles view created';
  END IF;
  
  -- Check functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_profile_complete') THEN
    RAISE NOTICE '✅ get_user_profile_complete() function created';
  END IF;
  
  RAISE NOTICE '🏆 Gold Standard Profile System deployment complete!';
END $$;
