-- ===============================================
-- 🎯 HI MILESTONE DETECTION LOGIC - PHASE 2
-- ===============================================
-- Tesla-grade RPC functions to detect and award milestones
-- Integrates with existing handleMedallionTap() and trackShareSubmission()

-- ===============================================
-- STEP 1: MILESTONE AWARD FUNCTION (CORE LOGIC)
-- ===============================================

CREATE OR REPLACE FUNCTION award_milestone(
  p_user_id UUID,
  p_milestone_type TEXT,
  p_current_value INTEGER,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  milestone_def RECORD;
  user_access JSON;
  trial_info JSON;
  points_to_award INTEGER := 0;
  tier_multiplier DECIMAL(3,2) := 1.0;
  milestone_awarded BOOLEAN := false;
  result_json JSON;
BEGIN
  -- Get user's milestone access permissions
  SELECT get_user_milestone_access(p_user_id) INTO user_access;
  
  -- Check if user can earn this milestone type
  IF NOT (user_access->'milestoneAccess'->>'canEarnPoints')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'no_earning_permission',
      'message', 'User cannot earn points in current tier'
    );
  END IF;
  
  -- Get eligible milestones for this type and value
  FOR milestone_def IN 
    SELECT * FROM hi_milestone_definitions 
    WHERE milestone_type = p_milestone_type 
      AND threshold_value <= p_current_value
      AND is_active = true
      AND (trial_accessible = true OR user_access->'membership'->>'tier' NOT IN ('anonymous', '24hr', '7d', '14d'))
    ORDER BY threshold_value DESC
    LIMIT 1
  LOOP
    -- Check if milestone already earned
    IF EXISTS (
      SELECT 1 FROM hi_milestone_events 
      WHERE user_id = p_user_id 
        AND milestone_key = milestone_def.milestone_key
    ) THEN
      CONTINUE; -- Already earned this milestone
    END IF;
    
    -- Calculate points with tier multiplier
    points_to_award := milestone_def.base_points;
    
    -- Apply tier-based multiplier
    CASE user_access->'membership'->>'tier'
      WHEN 'anonymous', '24hr' THEN tier_multiplier := 0;
      WHEN '7d', '14d' THEN tier_multiplier := 1.0;
      WHEN '30d', '60d', '90d' THEN tier_multiplier := 1.25;
      ELSE tier_multiplier := 1.5; -- Full members get 50% bonus
    END CASE;
    
    points_to_award := FLOOR(points_to_award * tier_multiplier);
    
    -- Check daily points limit
    DECLARE
      daily_points INTEGER;
      max_daily_points INTEGER;
    BEGIN
      SELECT daily_points_earned INTO daily_points 
      FROM user_stats 
      WHERE user_id = p_user_id;
      
      max_daily_points := (user_access->'milestoneAccess'->>'maxPointsPerDay')::integer;
      
      IF daily_points + points_to_award > max_daily_points THEN
        points_to_award := GREATEST(0, max_daily_points - daily_points);
      END IF;
    END;
    
    -- Award the milestone
    INSERT INTO hi_milestone_events (
      user_id,
      milestone_type,
      milestone_key,
      milestone_name,
      points_awarded,
      base_points,
      tier_multiplier,
      membership_tier,
      trial_tier,
      milestone_value,
      metadata
    ) VALUES (
      p_user_id,
      milestone_def.milestone_type,
      milestone_def.milestone_key,
      milestone_def.milestone_name,
      points_to_award,
      milestone_def.base_points,
      tier_multiplier,
      user_access->'membership'->>'tier',
      user_access->'milestoneAccess'->>'trialTier',
      p_current_value,
      p_metadata
    );
    
    -- Update user stats
    UPDATE user_stats SET
      hi_points = hi_points + points_to_award,
      daily_points_earned = daily_points_earned + points_to_award,
      total_milestones = total_milestones + 1,
      last_milestone_at = NOW(),
      milestones_earned = milestones_earned || jsonb_build_object(
        milestone_def.milestone_key, jsonb_build_object(
          'name', milestone_def.milestone_name,
          'points', points_to_award,
          'achieved_at', NOW()
        )
      )
    WHERE user_id = p_user_id;
    
    milestone_awarded := true;
    
    -- Build result
    result_json := jsonb_build_object(
      'success', true,
      'milestone', jsonb_build_object(
        'key', milestone_def.milestone_key,
        'name', milestone_def.milestone_name,
        'type', milestone_def.milestone_type,
        'emoji', milestone_def.emoji,
        'color', milestone_def.color,
        'description', milestone_def.description,
        'threshold', milestone_def.threshold_value,
        'celebrationLevel', milestone_def.celebration_level
      ),
      'points', jsonb_build_object(
        'awarded', points_to_award,
        'base', milestone_def.base_points,
        'multiplier', tier_multiplier
      ),
      'user', jsonb_build_object(
        'currentValue', p_current_value,
        'tier', user_access->'membership'->>'tier',
        'notificationStyle', user_access->'milestoneAccess'->>'notifications'
      )
    );
    
    EXIT; -- Only award one milestone per call
  END LOOP;
  
  -- If no milestone awarded
  IF NOT milestone_awarded THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'no_milestone_eligible',
      'currentValue', p_current_value
    );
  END IF;
  
  RETURN result_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 2: WAVE MILESTONE DETECTION (MEDALLION TAPS)
-- ===============================================

CREATE OR REPLACE FUNCTION check_wave_milestone(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  current_waves INTEGER;
  milestone_result JSON;
BEGIN
  -- Get current wave count from user_stats
  SELECT total_waves INTO current_waves 
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  IF current_waves IS NULL THEN
    current_waves := 0;
  END IF;
  
  -- Check for milestone award
  SELECT award_milestone(
    p_user_id, 
    'waves', 
    current_waves,
    jsonb_build_object('source', 'medallion_tap', 'timestamp', NOW())
  ) INTO milestone_result;
  
  RETURN milestone_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 3: SHARE MILESTONE DETECTION (HI MOMENTS)
-- ===============================================

CREATE OR REPLACE FUNCTION check_share_milestone(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  current_shares INTEGER;
  milestone_result JSON;
BEGIN
  -- Get current share count from user_stats
  SELECT total_hi_moments INTO current_shares 
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  IF current_shares IS NULL THEN
    current_shares := 0;
  END IF;
  
  -- Check for milestone award
  SELECT award_milestone(
    p_user_id, 
    'shares', 
    current_shares,
    jsonb_build_object('source', 'share_submission', 'timestamp', NOW())
  ) INTO milestone_result;
  
  RETURN milestone_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 4: STREAK MILESTONE DETECTION
-- ===============================================

CREATE OR REPLACE FUNCTION check_streak_milestone(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  current_streak INTEGER;
  milestone_result JSON;
BEGIN
  -- Get current streak from user_stats
  SELECT current_streak INTO current_streak 
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  IF current_streak IS NULL THEN
    current_streak := 0;
  END IF;
  
  -- Check for milestone award
  SELECT award_milestone(
    p_user_id, 
    'streaks', 
    current_streak,
    jsonb_build_object('source', 'streak_update', 'timestamp', NOW())
  ) INTO milestone_result;
  
  RETURN milestone_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 5: COMBINED MILESTONE CHECK (ALL TYPES)
-- ===============================================

CREATE OR REPLACE FUNCTION check_all_milestones(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  wave_result JSON;
  share_result JSON;
  streak_result JSON;
  milestones_awarded JSONB := '[]';
  total_points INTEGER := 0;
BEGIN
  -- Check wave milestones
  SELECT check_wave_milestone(p_user_id) INTO wave_result;
  IF (wave_result->>'success')::boolean THEN
    milestones_awarded := milestones_awarded || jsonb_build_array(wave_result);
    total_points := total_points + (wave_result->'points'->>'awarded')::integer;
  END IF;
  
  -- Check share milestones
  SELECT check_share_milestone(p_user_id) INTO share_result;
  IF (share_result->>'success')::boolean THEN
    milestones_awarded := milestones_awarded || jsonb_build_array(share_result);
    total_points := total_points + (share_result->'points'->>'awarded')::integer;
  END IF;
  
  -- Check streak milestones
  SELECT check_streak_milestone(p_user_id) INTO streak_result;
  IF (streak_result->>'success')::boolean THEN
    milestones_awarded := milestones_awarded || jsonb_build_array(streak_result);
    total_points := total_points + (streak_result->'points'->>'awarded')::integer;
  END IF;
  
  RETURN jsonb_build_object(
    'milestonesAwarded', milestones_awarded,
    'totalPointsEarned', total_points,
    'checkResults', jsonb_build_object(
      'waves', wave_result,
      'shares', share_result,
      'streaks', streak_result
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 6: DAILY POINTS RESET FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION reset_daily_points()
RETURNS INTEGER AS $$
DECLARE
  users_reset INTEGER := 0;
BEGIN
  -- Reset daily points for users where last reset was not today
  UPDATE user_stats 
  SET 
    daily_points_earned = 0,
    last_points_reset = CURRENT_DATE
  WHERE last_points_reset < CURRENT_DATE;
  
  GET DIAGNOSTICS users_reset = ROW_COUNT;
  
  RETURN users_reset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 7: USER MILESTONE SUMMARY
-- ===============================================

CREATE OR REPLACE FUNCTION get_user_milestones(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  user_stats_record RECORD;
  recent_milestones JSONB;
  available_milestones JSONB;
  user_access JSON;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats_record 
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  -- Get user access info
  SELECT get_user_milestone_access(p_user_id) INTO user_access;
  
  -- Get recent milestone achievements (last 10)
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', milestone_key,
      'name', milestone_name,
      'type', milestone_type,
      'points', points_awarded,
      'achievedAt', achieved_at,
      'value', milestone_value
    )
  ) INTO recent_milestones
  FROM (
    SELECT * FROM hi_milestone_events 
    WHERE user_id = p_user_id 
    ORDER BY achieved_at DESC 
    LIMIT 10
  ) recent;
  
  -- Get next available milestones
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', d.milestone_key,
      'name', d.milestone_name,
      'type', d.milestone_type,
      'threshold', d.threshold_value,
      'points', d.base_points,
      'emoji', d.emoji,
      'description', d.description,
      'progress', CASE d.milestone_type
        WHEN 'waves' THEN COALESCE(user_stats_record.total_waves, 0)
        WHEN 'shares' THEN COALESCE(user_stats_record.total_hi_moments, 0)
        WHEN 'streaks' THEN COALESCE(user_stats_record.current_streak, 0)
        ELSE 0
      END
    )
  ) INTO available_milestones
  FROM hi_milestone_definitions d
  WHERE d.is_active = true
    AND d.milestone_type = ANY((user_access->'milestoneAccess'->>'milestoneTypes')::text[])
    AND NOT EXISTS (
      SELECT 1 FROM hi_milestone_events e 
      WHERE e.user_id = p_user_id 
        AND e.milestone_key = d.milestone_key
    )
  ORDER BY d.milestone_type, d.threshold_value;
  
  RETURN jsonb_build_object(
    'userStats', jsonb_build_object(
      'hiPoints', COALESCE(user_stats_record.hi_points, 0),
      'totalMilestones', COALESCE(user_stats_record.total_milestones, 0),
      'dailyPointsEarned', COALESCE(user_stats_record.daily_points_earned, 0),
      'lastMilestoneAt', user_stats_record.last_milestone_at,
      'totalWaves', COALESCE(user_stats_record.total_waves, 0),
      'totalShares', COALESCE(user_stats_record.total_hi_moments, 0),
      'currentStreak', COALESCE(user_stats_record.current_streak, 0)
    ),
    'recentMilestones', COALESCE(recent_milestones, '[]'),
    'availableMilestones', COALESCE(available_milestones, '[]'),
    'access', user_access
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- STEP 8: GRANT PERMISSIONS
-- ===============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION award_milestone(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_wave_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_share_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_streak_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_all_milestones(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_milestones(UUID) TO authenticated;

-- Grant reset function to service role only
GRANT EXECUTE ON FUNCTION reset_daily_points() TO service_role;

-- ===============================================
-- STEP 9: FUNCTION COMMENTS
-- ===============================================

COMMENT ON FUNCTION award_milestone(UUID, TEXT, INTEGER, JSONB) IS 'Core milestone awarding logic with trial-aware permissions and daily limits';
COMMENT ON FUNCTION check_wave_milestone(UUID) IS 'Check and award wave milestones based on total medallion taps';
COMMENT ON FUNCTION check_share_milestone(UUID) IS 'Check and award share milestones based on total Hi moments';
COMMENT ON FUNCTION check_streak_milestone(UUID) IS 'Check and award streak milestones based on current streak';
COMMENT ON FUNCTION check_all_milestones(UUID) IS 'Check all milestone types for a user and return combined results';
COMMENT ON FUNCTION get_user_milestones(UUID) IS 'Get comprehensive milestone summary for user dashboard';
COMMENT ON FUNCTION reset_daily_points() IS 'Reset daily points counter for all users (run via cron)';

-- ===============================================
-- DEPLOYMENT VERIFICATION FOR PHASE 2
-- ===============================================

-- Test that all functions were created
SELECT 
  'VERIFICATION: Phase 2 RPC functions created' as check_type;
SELECT 
  routine_name,
  routine_type,
  '✅ FUNCTION_READY' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'award_milestone',
    'check_wave_milestone', 
    'check_share_milestone',
    'check_streak_milestone',
    'check_all_milestones',
    'get_user_milestones',
    'reset_daily_points'
  )
ORDER BY routine_name;