-- Test the actual database function that DashboardStats.js calls
SELECT 'Testing get_user_stats(null) - what structure does it return?';

-- Test what get_user_stats returns
SELECT get_user_stats(null);

-- Test specifically the globalStats section
SELECT 'Testing globalStats extraction:';
SELECT get_user_stats(null) -> 'globalStats' as global_stats_section;

-- Check specific fields that DashboardStats.js looks for
SELECT 'Testing specific field access:';
SELECT 
  get_user_stats(null) -> 'globalStats' -> 'hiWaves' as hi_waves,
  get_user_stats(null) -> 'globalStats' -> 'totalHis' as total_his,
  get_user_stats(null) -> 'globalStats' -> 'totalUsers' as total_users;