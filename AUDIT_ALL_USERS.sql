-- 🚨 AUDIT: What did we destroy for ALL users?

-- Show all users' current stats (what they have NOW after our "fix")
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  longest_streak,
  last_hi_date,
  updated_at
FROM user_stats
ORDER BY updated_at DESC;

-- If updated_at is all recent (today), we destroyed everyone's streaks
-- The longest_streak might still preserve their old streak

-- RECOMMENDATION: ROLLBACK SOLUTION
-- 1. Stop all stat recalculations immediately
-- 2. Restore current_streak to match longest_streak for all users (conservative)  
-- 3. Build proper streak tracking that includes ALL activity sources
-- 4. Test on ONE user before deploying to all 12

-- Safe restore (set current = longest for everyone)
-- UPDATE user_stats
-- SET current_streak = longest_streak,
--     updated_at = NOW()
-- WHERE current_streak < longest_streak;
