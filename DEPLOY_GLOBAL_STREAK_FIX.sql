-- ============================================================================
-- 🔥 GLOBAL STREAK FIX - PRODUCTION DEPLOYMENT
-- ============================================================================
-- Issue: ALL users' streaks are incorrect (not counting shares + check-ins)
-- Root Cause: Streak calculation function exists but may not include check-ins
-- Solution: Deploy correct function + recalculate ALL users globally
-- Impact: Fixes Wendy + everyone else's streaks
-- Safety: Preserves existing longest_streak (never decreases)
-- ============================================================================

-- STEP 1: Deploy correct streak calculation function
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
  
  -- 🔥 CRITICAL: Calculate current streak (consecutive days with shares OR check-ins)
  -- FIXED: Uses LAG() to detect gaps between consecutive dates
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
  
  -- If no activity today or yesterday, streak = 0
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

-- STEP 2: Create/Replace triggers for automatic updates
CREATE OR REPLACE FUNCTION trigger_update_stats_on_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 🔥 FIX: Only update stats for authenticated users (skip anonymous)
    IF NEW.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(NEW.user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 🔥 FIX: Only update stats for authenticated users (skip anonymous)
    IF OLD.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_update_stats_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check-ins always have user_id, but be safe
    IF NEW.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(NEW.user_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM update_user_stats_from_public_shares(OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS update_stats_on_public_share ON public_shares;
DROP TRIGGER IF EXISTS update_stats_on_checkin ON hi_points_daily_checkins;

-- Create new triggers
CREATE TRIGGER update_stats_on_public_share
  AFTER INSERT OR DELETE ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stats_on_share();

CREATE TRIGGER update_stats_on_checkin
  AFTER INSERT OR DELETE ON hi_points_daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stats_on_checkin();

-- ============================================================================
-- STEP 3: GLOBAL RECALCULATION - ALL USERS
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  processed_count INTEGER := 0;
  total_users INTEGER;
BEGIN
  -- Count total users to process
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM (
    SELECT user_id FROM public_shares WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM hi_points_daily_checkins WHERE user_id IS NOT NULL
  ) all_users;
  
  RAISE NOTICE '🔄 Starting global streak recalculation for % users...', total_users;
  
  -- Process each user
  FOR user_record IN 
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public_shares WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM hi_points_daily_checkins WHERE user_id IS NOT NULL
    ) all_users
  LOOP
    PERFORM update_user_stats_from_public_shares(user_record.user_id);
    processed_count := processed_count + 1;
    
    -- Log progress every 50 users
    IF processed_count % 50 = 0 THEN
      RAISE NOTICE '✅ Processed %/% users (%.0f%%)', 
        processed_count, 
        total_users, 
        (processed_count::float / total_users::float * 100);
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 COMPLETE: Recalculated streaks for % users globally', processed_count;
END $$;

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Check Wendy's streak (should be 4 now)
SELECT 
  u.email,
  p.display_name,
  us.current_streak,
  us.longest_streak,
  us.last_hi_date,
  us.total_hi_moments,
  us.days_active,
  us.updated_at
FROM user_stats us
JOIN auth.users u ON us.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email ILIKE '%wendy%' 
   OR p.display_name ILIKE '%wendy%' 
   OR p.username ILIKE '%wendy%';

-- Check a few other users to verify
SELECT 
  COUNT(*) as total_users,
  AVG(current_streak) as avg_streak,
  MAX(current_streak) as max_streak,
  COUNT(CASE WHEN current_streak > 0 THEN 1 END) as users_with_streaks
FROM user_stats;

-- Show recent updates
SELECT 
  COUNT(*) as recently_updated,
  MIN(updated_at) as oldest_update,
  MAX(updated_at) as newest_update
FROM user_stats
WHERE updated_at > NOW() - INTERVAL '5 minutes';

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
/*
Wendy's streak should now show: 4 days
All users' streaks should be accurate based on:
  - Shares (public_shares.created_at)
  - Check-ins (hi_points_daily_checkins.day)

Triggers are now in place for automatic future updates.
*/
