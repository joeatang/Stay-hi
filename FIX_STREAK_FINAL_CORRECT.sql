-- 🔧 CORRECT FIX: Streak calculation with CORRECT column names
-- Columns: hi_points_daily_checkins.day (not checkin_date)

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
  
  -- Calculate current streak (consecutive days with shares OR check-ins)
  WITH all_activity_dates AS (
    SELECT DISTINCT DATE(created_at) as activity_date 
    FROM public_shares 
    WHERE user_id = user_uuid
    UNION
    SELECT DISTINCT day as activity_date 
    FROM hi_points_daily_checkins 
    WHERE user_id = user_uuid
  ),
  ordered_dates AS (
    SELECT activity_date
    FROM all_activity_dates
    ORDER BY activity_date DESC
  ),
  streak_calc AS (
    SELECT 
      activity_date,
      ROW_NUMBER() OVER (ORDER BY activity_date DESC) as row_num,
      activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC) - 1) * INTERVAL '1 day' as streak_group
    FROM ordered_dates
  )
  SELECT COUNT(*)
  INTO current_streak_days
  FROM streak_calc
  WHERE streak_group = (SELECT MAX(activity_date) FROM ordered_dates);
  
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
    COALESCE(current_streak_days, 0),
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

-- Trigger for check-ins
CREATE OR REPLACE FUNCTION trigger_update_stats_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_user_stats_from_public_shares(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_stats_from_public_shares(OLD.user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_stats_on_checkin ON hi_points_daily_checkins;
CREATE TRIGGER update_stats_on_checkin
  AFTER INSERT OR DELETE ON hi_points_daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stats_on_checkin();

-- Recalculate all users
DO $$
DECLARE
  user_record RECORD;
  processed_count INTEGER := 0;
BEGIN
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
      RAISE NOTICE 'Processed % users', processed_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Recalculated stats for % users', processed_count;
END $$;

-- Verify YOUR stats
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  longest_streak,
  total_waves,
  total_starts,
  days_active
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
