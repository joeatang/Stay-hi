-- 🎯 BULLETPROOF FIX - Now that we found and fixed the reset bug
-- Set count to 53 and it should STAY at 53

-- STEP 1: Update your count to correct value
UPDATE user_stats
SET 
  total_hi_moments = (
    SELECT COUNT(*) 
    FROM public_shares
    WHERE user_id = user_stats.user_id
  ),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- STEP 2: Verify it worked
SELECT 
  'FIXED VALUE' as status,
  total_hi_moments as "Database Value",
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as "Actual Count",
  CASE 
    WHEN total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ CORRECT - Should stay at 53 now!'
    ELSE '❌ STILL WRONG'
  END as result
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 🎯 WHAT WE FIXED:
-- 
-- BUG FOUND: public/lib/hibase/streaks.js line 349
-- Was setting: total_hi_moments: 1 
-- Every time _insertStreak() was called (when you created Hi moments)
-- This overwrote the correct count with 1
--
-- FIX DEPLOYED: 
-- Removed total_hi_moments: 1 from the UPDATE statement
-- Now the trigger handles the count correctly
-- Count will increment properly and never reset to 1
