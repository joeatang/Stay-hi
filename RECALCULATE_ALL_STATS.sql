-- 🔧 RECALCULATE ALL USER STATS FROM ACTUAL DATA
-- This will fix stats for ALL users based on their real public_shares

-- Step 1: Check current situation
SELECT 
  COUNT(DISTINCT user_id) as users_with_stats 
FROM user_stats;

SELECT 
  COUNT(DISTINCT user_id) as users_with_shares 
FROM public_shares;

-- Step 2: Show users with mismatched stats
SELECT 
  ps.user_id,
  COUNT(ps.id) as actual_shares,
  COALESCE(us.total_hi_moments, 0) as recorded_moments,
  COUNT(ps.id) - COALESCE(us.total_hi_moments, 0) as difference
FROM public_shares ps
LEFT JOIN user_stats us ON ps.user_id = us.user_id
GROUP BY ps.user_id, us.total_hi_moments
HAVING COUNT(ps.id) != COALESCE(us.total_hi_moments, 0)
ORDER BY difference DESC
LIMIT 20;

-- Step 3: Recalculate stats for ALL users (DO NOT RUN YET - REVIEW FIRST)
-- INSERT INTO user_stats (user_id, total_hi_moments, total_waves, total_starts, current_streak, updated_at)
-- SELECT 
--   ps.user_id,
--   COUNT(DISTINCT ps.id) as total_hi_moments,
--   COALESCE(SUM((
--     SELECT COUNT(*) FROM wave_reactions wr WHERE wr.share_id = ps.id
--   )), 0) as total_waves,
--   COALESCE(SUM((
--     SELECT COUNT(*) FROM share_reactions sr WHERE sr.share_id = ps.id
--   )), 0) as total_starts,
--   0 as current_streak, -- Streak needs separate calculation
--   NOW() as updated_at
-- FROM public_shares ps
-- GROUP BY ps.user_id
-- ON CONFLICT (user_id) 
-- DO UPDATE SET 
--   total_hi_moments = EXCLUDED.total_hi_moments,
--   total_waves = EXCLUDED.total_waves,
--   total_starts = EXCLUDED.total_starts,
--   updated_at = NOW();
