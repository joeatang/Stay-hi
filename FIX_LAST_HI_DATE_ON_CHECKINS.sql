-- FIX_LAST_HI_DATE_ON_CHECKINS.sql
-- 
-- PROBLEM: lastHiDate only updates on share creation, not on check-ins
-- IMPACT: 7-day pill shows incorrect days (works backwards from stale lastHiDate)
-- SOLUTION: Update last_hi_date when user checks in
--
-- SAFE: Only updates if check-in date is newer than current last_hi_date

-- Create or replace the check-in trigger function
CREATE OR REPLACE FUNCTION update_last_hi_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_stats with most recent activity date
  INSERT INTO user_stats (user_id, last_hi_date, updated_at)
  VALUES (NEW.user_id, NEW.day, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    -- Only update if check-in date is newer
    last_hi_date = CASE
      WHEN user_stats.last_hi_date IS NULL THEN NEW.day
      WHEN NEW.day > user_stats.last_hi_date THEN NEW.day
      ELSE user_stats.last_hi_date
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_last_hi_on_checkin ON hi_points_daily_checkins;

-- Create trigger on check-in table
CREATE TRIGGER sync_last_hi_on_checkin
AFTER INSERT ON hi_points_daily_checkins
FOR EACH ROW
EXECUTE FUNCTION update_last_hi_on_checkin();

-- VERIFICATION: Check that trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_last_hi_on_checkin';

-- TEST QUERY: Verify lastHiDate matches recent activity
SELECT 
  us.user_id,
  us.current_streak,
  us.last_hi_date,
  (SELECT MAX(day) FROM hi_points_daily_checkins WHERE user_id = us.user_id) as last_checkin,
  (SELECT MAX(DATE(created_at)) FROM public_shares WHERE user_id = us.user_id) as last_share,
  GREATEST(
    COALESCE((SELECT MAX(day) FROM hi_points_daily_checkins WHERE user_id = us.user_id), '1970-01-01'),
    COALESCE((SELECT MAX(DATE(created_at)) FROM public_shares WHERE user_id = us.user_id), '1970-01-01')
  ) as expected_last_hi_date,
  CASE 
    WHEN us.last_hi_date = GREATEST(
      COALESCE((SELECT MAX(day) FROM hi_points_daily_checkins WHERE user_id = us.user_id), '1970-01-01'),
      COALESCE((SELECT MAX(DATE(created_at)) FROM public_shares WHERE user_id = us.user_id), '1970-01-01')
    ) THEN '✅ CORRECT'
    ELSE '❌ OUT OF SYNC'
  END as status
FROM user_stats us
WHERE us.current_streak > 0
LIMIT 10;
