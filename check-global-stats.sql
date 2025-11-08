-- Check if we have actual global Hi count data
SELECT 
  'Database Global Stats' as source,
  COALESCE((
    SELECT SUM(
      COALESCE(user_stats.total_shares, 0) + 
      COALESCE(user_stats.dashboard_shares, 0) + 
      COALESCE(user_stats.island_shares, 0) + 
      COALESCE(user_stats.muscle_shares, 0)
    )
    FROM user_stats 
    WHERE user_stats.user_id IS NOT NULL
  ), 0) as total_his,
  
  COALESCE((
    SELECT SUM(COALESCE(user_stats.total_waves, 0))
    FROM user_stats 
    WHERE user_stats.user_id IS NOT NULL  
  ), 0) as total_waves,
  
  COALESCE((
    SELECT COUNT(DISTINCT user_stats.user_id)
    FROM user_stats 
    WHERE user_stats.user_id IS NOT NULL
  ), 0) as total_users;

-- Also check what get_user_stats returns for a test user
SELECT 'get_user_stats function test' as test_type;
