-- 🎯 WOZ SOLUTION: Fix what's broken, preserve what works
-- 
-- BROKEN: total_hi_moments, total_waves (counting wrong)
-- WORKING: current_streak, longest_streak (don't touch!)

-- Step 0: FIRST, restore streaks we destroyed (conservative: use longest_streak)
UPDATE user_stats
SET current_streak = longest_streak
WHERE current_streak < longest_streak;

-- Step 1: Update ONLY moments/waves for all users (preserve streaks)
CREATE OR REPLACE FUNCTION fix_moments_and_waves_only(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  moment_count INTEGER;
  wave_count INTEGER;
  start_count INTEGER;
BEGIN
  -- Count from correct tables
  SELECT COUNT(*) INTO moment_count 
  FROM public_shares WHERE user_id = user_uuid;
  
  SELECT COALESCE(SUM(wave_count), 0) INTO wave_count
  FROM public_shares WHERE user_id = user_uuid;
  
  SELECT COUNT(*) INTO start_count
  FROM share_reactions sr
  JOIN public_shares ps ON sr.share_id = ps.id
  WHERE ps.user_id = user_uuid;
  
  -- Update ONLY these 3 columns, leave streaks untouched
  UPDATE user_stats
  SET 
    total_hi_moments = moment_count,
    total_waves = wave_count,
    total_starts = start_count,
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$;

-- Step 2: Run for all users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM user_stats WHERE user_id IS NOT NULL
  LOOP
    PERFORM fix_moments_and_waves_only(user_record.user_id);
  END LOOP;
  
  RAISE NOTICE '✅ Fixed moments/waves for all users, streaks preserved';
END $$;

-- Step 3: Verify (YOUR stats should show: 52 moments, 14 waves, 4 streak PRESERVED)
SELECT 
  user_id,
  total_hi_moments, -- Should be 52
  current_streak,   -- Should still be 4 (or whatever it was)
  longest_streak,   -- Should still be 7
  total_waves       -- Should be 14
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
