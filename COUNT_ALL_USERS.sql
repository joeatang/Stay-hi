-- Count total users with shares
SELECT COUNT(DISTINCT user_id) as total_users_with_shares 
FROM public_shares 
WHERE user_id IS NOT NULL;

-- Count users in auth
SELECT COUNT(*) as total_registered_users 
FROM auth.users;

-- Show ALL users with stats (not just top 10)
SELECT 
  us.user_id,
  us.total_hi_moments,
  us.current_streak,
  us.total_waves,
  us.total_starts
FROM user_stats us
WHERE us.total_hi_moments > 0
ORDER BY us.total_hi_moments DESC;
