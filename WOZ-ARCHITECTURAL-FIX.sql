-- ===============================================
-- 🎯 WOZ'S ARCHITECTURAL FIX: Calculate ALL stats from source
-- ===============================================
-- DISCOVERY: user_stats is a BROKEN CACHE, not source of truth
-- DISCOVERY: Medallion taps DON'T write to hi_events (0 count)
-- DISCOVERY: "Total Waves" = wave reactions received, NOT medallion taps
-- SOLUTION: VIEW calculates EVERYTHING from source tables in real-time

-- ===============================================
-- STEP 1: Make profile read from ACTUAL SOURCES
-- ===============================================

-- Create VIEW that calculates stats from source tables
CREATE OR REPLACE VIEW v_user_profile_stats AS
SELECT 
  u.id as user_id,
  -- Hi moments: COUNT from public_shares (source of truth)
  COALESCE((SELECT COUNT(*) FROM public_shares WHERE user_id = u.id), 0) as total_hi_moments,
  
  -- Total Waves: SUM wave_count from user's shares (wave reactions received)
  COALESCE((
    SELECT SUM(wave_count) 
    FROM public_shares 
    WHERE user_id = u.id
  ), 0) as total_waves,
  
  -- Total Starts: COUNT from share_reactions
  COALESCE((
    SELECT COUNT(*) 
    FROM share_reactions 
    WHERE user_id = u.id
  ), 0) as total_starts,
  
  -- Days Active: COUNT distinct share dates
  COALESCE((
    SELECT COUNT(DISTINCT DATE(created_at))
    FROM public_shares
    WHERE user_id = u.id
  ), 0) as days_active,
  
  -- Current Streak: Use cached value from user_stats (complex calculation)
  COALESCE((SELECT current_streak FROM user_stats WHERE user_id = u.id), 0) as current_streak,
  
  -- Longest Streak: Use cached value from user_stats (complex calculation)
  COALESCE((SELECT longest_streak FROM user_stats WHERE user_id = u.id), 0) as longest_streak,
  
  NOW() as updated_at
FROM auth.users u;

-- Grant access
GRANT SELECT ON v_user_profile_stats TO authenticated;
GRANT SELECT ON v_user_profile_stats TO anon;

-- ===============================================
-- STEP 2: STOP medallion taps from writing to user_stats
-- ===============================================

-- Medallion taps should ONLY increment global counter
-- They should NOT write to user_stats.total_waves (that's for wave reactions)
CREATE OR REPLACE FUNCTION update_user_waves(
  p_user_id UUID DEFAULT auth.uid(),
  p_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  global_count BIGINT;
BEGIN
  -- 🎯 WOZ FIX: Medallion taps do NOT write to user_stats anymore
  -- user_stats.total_waves is calculated from wave_reactions in the VIEW
  
  -- Just increment global counter
  SELECT increment_hi_wave() INTO global_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'userWaves', -1,  -- Signal: Not stored in DB, use VIEW
    'globalWaves', global_count,
    'increment', p_increment
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 3: Make sync_moment_count trigger bulletproof
-- ===============================================

CREATE OR REPLACE FUNCTION sync_moment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Upsert to handle users who don't have stats row yet
  INSERT INTO user_stats (
    user_id,
    total_hi_moments,
    updated_at
  ) VALUES (
    NEW.user_id,
    (SELECT COUNT(*) FROM public_shares WHERE user_id = NEW.user_id),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = NEW.user_id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- ===============================================
-- VERIFICATION
-- ===============================================

-- Check your stats right now
SELECT * FROM v_user_profile_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- This should show hi_moments = 53 (from public_shares count, not cached value)
