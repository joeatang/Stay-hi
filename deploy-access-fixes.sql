-- ===============================================
-- 🎯 HI DATABASE-FIRST STATS - TESLA PERSISTENCE 
-- ===============================================
-- Ensures all user stats persist to database, never localStorage
-- Integrates with milestone system for complete data integrity

-- ===============================================
-- STEP 1: USER STATS UPDATE FUNCTIONS
-- ===============================================

-- Update user wave count (medallion taps) in database
CREATE OR REPLACE FUNCTION update_user_waves(
  p_user_id UUID DEFAULT auth.uid(),
  p_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  current_waves INTEGER := 0;
  new_waves INTEGER := 0;
  global_count BIGINT;
BEGIN
  -- 🎯 FIX: Handle anonymous users (NULL p_user_id)
  IF p_user_id IS NOT NULL THEN
    -- Get current user wave count for authenticated users
    SELECT COALESCE(total_waves, 0) INTO current_waves 
    FROM user_stats 
    WHERE user_id = p_user_id;
    
    -- Calculate new count
    new_waves := current_waves + p_increment;
    
    -- Update user_stats with new wave count
    INSERT INTO user_stats (
      user_id, 
      total_waves, 
      last_wave_at,
      updated_at
    ) VALUES (
      p_user_id, 
      new_waves, 
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_waves = new_waves,
      last_wave_at = NOW(),
      updated_at = NOW();
  ELSE
    -- For anonymous users, don't create user_stats record
    -- Just increment global counter
    current_waves := 0;
    new_waves := p_increment;
  END IF;
  
  -- Increment global wave counter
  SELECT increment_hi_wave() INTO global_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'userWaves', new_waves,
    'globalWaves', global_count,
    'increment', p_increment
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user share count (Hi moments) in database
CREATE OR REPLACE FUNCTION update_user_shares(
  p_user_id UUID DEFAULT auth.uid(),
  p_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  current_shares INTEGER := 0;
  new_shares INTEGER := 0;
  current_weekly INTEGER := 0;
  new_weekly INTEGER := 0;
  global_count BIGINT;
BEGIN
  -- Get current user share counts
  SELECT 
    COALESCE(total_hi_moments, 0),
    COALESCE(weekly_hi_moments, 0)
  INTO current_shares, current_weekly
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  -- Calculate new counts
  new_shares := current_shares + p_increment;
  new_weekly := current_weekly + p_increment; -- TODO: Add weekly logic
  
  -- Update user_stats with new share count
  INSERT INTO user_stats (
    user_id, 
    total_hi_moments, 
    weekly_hi_moments,
    last_hi_moment_at,
    updated_at
  ) VALUES (
    p_user_id, 
    new_shares, 
    new_weekly,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_hi_moments = new_shares,
    weekly_hi_moments = new_weekly,
    last_hi_moment_at = NOW(),
    updated_at = NOW();
  
  -- Increment global Hi counter (if function exists)
  BEGIN
    SELECT increment_total_hi() INTO global_count;
  EXCEPTION
    WHEN OTHERS THEN
      global_count := 0;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'userShares', new_shares,
    'userWeeklyShares', new_weekly,
    'globalHis', global_count,
    'increment', p_increment
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 2: GET USER STATS FROM DATABASE
-- ===============================================

-- Get complete user stats from database (no localStorage)
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  global_stats RECORD;
BEGIN
  -- Get user stats
  SELECT * INTO user_record 
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  -- Get global stats
  SELECT * INTO global_stats 
  FROM get_global_stats();
  
  -- If no user stats exist, return defaults
  IF user_record IS NULL THEN
    RETURN jsonb_build_object(
      'personalStats', jsonb_build_object(
        'totalWaves', 0,
        'totalShares', 0,
        'weeklyShares', 0,
        'currentStreak', 0,
        'hiPoints', 0,
        'totalMilestones', 0,
        'lastWaveAt', NULL,
        'lastShareAt', NULL
      ),
      'globalStats', jsonb_build_object(
        'hiWaves', COALESCE(global_stats.hi_waves, 0),
        'totalHis', COALESCE(global_stats.total_his, 0),
        'activeUsers24h', COALESCE(global_stats.active_users_24h, 0),
        'totalUsers', COALESCE(global_stats.total_users, 0)
      )
    );
  END IF;
  
  -- Return full user stats
  RETURN jsonb_build_object(
    'personalStats', jsonb_build_object(
      'totalWaves', COALESCE(user_record.total_waves, 0),
      'totalShares', COALESCE(user_record.total_hi_moments, 0),
      'weeklyShares', COALESCE(user_record.weekly_hi_moments, 0),
      'currentStreak', COALESCE(user_record.current_streak, 0),
      'hiPoints', COALESCE(user_record.hi_points, 0),
      'totalMilestones', COALESCE(user_record.total_milestones, 0),
      'lastWaveAt', user_record.last_wave_at,
      'lastShareAt', user_record.last_hi_moment_at
    ),
    'globalStats', jsonb_build_object(
      'hiWaves', COALESCE(global_stats.hi_waves, 0),
      'totalHis', COALESCE(global_stats.total_his, 0),
      'activeUsers24h', COALESCE(global_stats.active_users_24h, 0),
      'totalUsers', COALESCE(global_stats.total_users, 0)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 3: COMBINED MEDALLION TAP WITH MILESTONE CHECK
-- ===============================================

-- Process medallion tap with database update + milestone check
CREATE OR REPLACE FUNCTION process_medallion_tap(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  wave_result JSON;
  milestone_result JSON;
  combined_result JSON;
BEGIN
  -- Update user wave count in database
  SELECT update_user_waves(p_user_id, 1) INTO wave_result;
  
  -- Check for wave milestones
  SELECT check_wave_milestone(p_user_id) INTO milestone_result;
  
  -- Combine results
  combined_result := jsonb_build_object(
    'waveUpdate', wave_result,
    'milestone', milestone_result,
    'timestamp', NOW()
  );
  
  RETURN combined_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 4: COMBINED SHARE SUBMISSION WITH MILESTONE CHECK
-- ===============================================

-- Process share submission with database update + milestone check
CREATE OR REPLACE FUNCTION process_share_submission(
  p_user_id UUID DEFAULT auth.uid(),
  p_source TEXT DEFAULT 'dashboard'
)
RETURNS JSON AS $$
DECLARE
  share_result JSON;
  milestone_result JSON;
  combined_result JSON;
BEGIN
  -- Update user share count in database
  SELECT update_user_shares(p_user_id, 1) INTO share_result;
  
  -- Check for share milestones
  SELECT check_share_milestone(p_user_id) INTO milestone_result;
  
  -- Combine results
  combined_result := jsonb_build_object(
    'shareUpdate', share_result,
    'milestone', milestone_result,
    'source', p_source,
    'timestamp', NOW()
  );
  
  RETURN combined_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 5: GRANT PERMISSIONS
-- ===============================================

-- 🎯 CRITICAL FIX: Grant access to BOTH anonymous AND authenticated users
GRANT EXECUTE ON FUNCTION update_user_waves(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_shares(UUID, INTEGER) TO anon, authenticated;  
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_medallion_tap(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_share_submission(UUID, TEXT) TO anon, authenticated;

-- ===============================================
-- STEP 6: FUNCTION COMMENTS
-- ===============================================

COMMENT ON FUNCTION update_user_waves(UUID, INTEGER) IS 'Update user wave count in database with global counter sync';
COMMENT ON FUNCTION update_user_shares(UUID, INTEGER) IS 'Update user share count in database with global counter sync';
COMMENT ON FUNCTION get_user_stats(UUID) IS 'Get complete user stats from database (no localStorage dependency)';
COMMENT ON FUNCTION process_medallion_tap(UUID) IS 'Process medallion tap with database update and milestone check';
COMMENT ON FUNCTION process_share_submission(UUID, TEXT) IS 'Process share submission with database update and milestone check';

-- ===============================================
-- DEPLOYMENT VERIFICATION
-- ===============================================

SELECT 'VERIFICATION: Database-first stats functions created' as check_type;
SELECT 
  routine_name,
  'Database-first stats system' as description,
  '✅ READY' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'update_user_waves',
    'update_user_shares', 
    'get_user_stats',
    'process_medallion_tap',
    'process_share_submission'
  )
ORDER BY routine_name;