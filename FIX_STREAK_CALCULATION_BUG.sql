-- ============================================================================
-- 🔥 FIX STREAK CALCULATION BUG - AFFECTS ALL USERS
-- ============================================================================
-- Issue: Streak calculation CTE returns 1 day when should be 12+ days
-- Root Cause: streak_group WHERE clause comparing wrong values
-- Example: User has 12 consecutive days but shows 1
-- Solution: Simpler, more reliable consecutive day counting
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_stats_from_public_shares(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  moment_count INTEGER;
  wave_count INTEGER;
  start_count INTEGER;
  active_days INTEGER;
  current_streak_days INTEGER;
BEGIN
  -- Count actual public_shares (HI MOMENTS)
  SELECT COUNT(*) 
  INTO moment_count 
  FROM public_shares 
  WHERE user_id = user_uuid;
  
  -- Count waves received on user's shares
  SELECT COALESCE(SUM(ps.wave_count), 0)
  INTO wave_count
  FROM public_shares ps
  WHERE ps.user_id = user_uuid;
  
  -- Count stars/reactions received on user's shares
  SELECT COUNT(*)
  INTO start_count
  FROM share_reactions sr
  JOIN public_shares ps ON sr.share_id = ps.id
  WHERE ps.user_id = user_uuid;
  
  -- Count active days (days with at least one share OR check-in)
  SELECT COUNT(DISTINCT activity_date)
  INTO active_days
  FROM (
    SELECT DATE(created_at) as activity_date FROM public_shares WHERE user_id = user_uuid
    UNION
    SELECT day as activity_date FROM hi_points_daily_checkins WHERE user_id = user_uuid
  ) all_activity;
  
  -- 🔥 FIXED: Calculate current streak (consecutive days from most recent)
  -- Simple, bulletproof logic: count backwards from most recent date until gap found
  WITH all_activity_dates AS (
    SELECT DISTINCT DATE(created_at) as activity_date 
    FROM public_shares 
    WHERE user_id = user_uuid
    UNION
    SELECT DISTINCT day as activity_date 
    FROM hi_points_daily_checkins 
    WHERE user_id = user_uuid
  ),
  dates_with_gaps AS (
    SELECT 
      activity_date,
      activity_date - LAG(activity_date) OVER (ORDER BY activity_date DESC) as gap_days
    FROM all_activity_dates
  )
  -- Count rows from top until we hit a gap > 1 day (or NULL for first row)
  SELECT COUNT(*)
  INTO current_streak_days
  FROM (
    SELECT 
      activity_date,
      gap_days,
      SUM(CASE WHEN gap_days IS NULL OR gap_days = -1 THEN 0 ELSE 1 END) 
        OVER (ORDER BY activity_date DESC) as group_id
    FROM dates_with_gaps
  ) grouped
  WHERE group_id = 0;
  
  -- 🎯 STRICT STREAK MECHANIC: No activity yesterday/today = reset to 0
  -- This is intentional - keeps streaks meaningful and encourages daily consistency
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT DATE(created_at) as activity_date FROM public_shares WHERE user_id = user_uuid
      UNION
      SELECT day as activity_date FROM hi_points_daily_checkins WHERE user_id = user_uuid
    ) recent_activity
    WHERE activity_date >= CURRENT_DATE - INTERVAL '1 day'
  ) THEN
    current_streak_days := 0;
  END IF;
  
  -- Update or insert stats
  INSERT INTO user_stats (
    user_id, 
    total_hi_moments, 
    current_streak, 
    longest_streak,
    total_waves, 
    total_starts, 
    days_active, 
    last_hi_date, 
    updated_at
  ) VALUES (
    user_uuid, 
    moment_count, 
    COALESCE(current_streak_days, 0),
    COALESCE(current_streak_days, 0), -- First time, current = longest
    wave_count, 
    start_count,
    active_days, 
    (SELECT MAX(activity_date) FROM (
      SELECT DATE(created_at) as activity_date FROM public_shares WHERE user_id = user_uuid
      UNION
      SELECT day as activity_date FROM hi_points_daily_checkins WHERE user_id = user_uuid
    ) last_activity),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hi_moments = moment_count,
    current_streak = COALESCE(current_streak_days, 0),
    longest_streak = GREATEST(user_stats.longest_streak, COALESCE(current_streak_days, 0)),
    total_waves = wave_count,
    total_starts = start_count,
    days_active = active_days,
    last_hi_date = (SELECT MAX(activity_date) FROM (
      SELECT DATE(created_at) as activity_date FROM public_shares WHERE user_id = user_uuid
      UNION
      SELECT day as activity_date FROM hi_points_daily_checkins WHERE user_id = user_uuid
    ) last_activity),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- GLOBAL FIX: Recalculate ALL users with corrected logic
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  processed_count INTEGER := 0;
  total_users INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM (
    SELECT user_id FROM public_shares WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM hi_points_daily_checkins WHERE user_id IS NOT NULL
  ) all_users;
  
  RAISE NOTICE '🔄 RE-FIXING streaks with corrected logic for % users...', total_users;
  
  FOR user_record IN 
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public_shares WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM hi_points_daily_checkins WHERE user_id IS NOT NULL
    ) all_users
  LOOP
    PERFORM update_user_stats_from_public_shares(user_record.user_id);
    processed_count := processed_count + 1;
    
    IF processed_count % 10 = 0 THEN
      RAISE NOTICE '✅ Processed %/%', processed_count, total_users;
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 COMPLETE: % users recalculated', processed_count;
END $$;

-- Verify YOUR streak (should be 12 now)
SELECT current_streak, longest_streak 
FROM user_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
