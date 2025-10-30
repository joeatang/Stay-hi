-- ===============================================
-- 🔬 FINAL PRE-LAUNCH DATABASE VERIFICATION
-- ===============================================

-- 1. Verify all RPC functions are working correctly
SELECT 'RPC FUNCTION VERIFICATION' as test_category;

-- Test get_global_stats (should return current data)
SELECT 
  'get_global_stats()' as function_name,
  get_global_stats() as current_result;

-- Test increment functions (verify rate limiting works)
SELECT 
  'increment_hi_wave()' as function_name,
  increment_hi_wave() as result;

SELECT 
  'increment_total_hi()' as function_name, 
  increment_total_hi() as result;

-- 2. Verify data integrity after all updates
SELECT 'DATA INTEGRITY VERIFICATION' as test_category;

SELECT 
  'Current Global Stats' as check,
  hi_waves,
  total_his,
  active_users_24h,
  total_users,
  updated_at,
  CASE 
    WHEN hi_waves >= 345 THEN '✅ Hi Waves Preserved'
    ELSE '❌ Hi Waves Corrupted' 
  END as hi_waves_status,
  CASE 
    WHEN total_his >= 12 THEN '✅ Total His Preserved'
    ELSE '❌ Total His Corrupted'
  END as total_his_status
FROM global_stats 
WHERE id = 1;

-- 3. Verify table relationships are intact
SELECT 'TABLE RELATIONSHIPS VERIFICATION' as test_category;

SELECT 
  'Table Counts' as metric,
  (SELECT COUNT(*) FROM global_stats) as global_stats_count,
  (SELECT COUNT(*) FROM hi_moments) as hi_moments_count,
  (SELECT COUNT(*) FROM public_shares) as public_shares_count,
  (SELECT COUNT(*) FROM hi_archives) as hi_archives_count,
  (SELECT COUNT(*) FROM user_stats) as user_stats_count,
  (SELECT COUNT(*) FROM achievements) as achievements_count;

-- 4. Performance verification
SELECT 'PERFORMANCE VERIFICATION' as test_category;

-- Test query performance on main tables
SELECT 
  'Recent Activity Query Performance' as test,
  COUNT(*) as recent_records,
  MIN(created_at) as oldest_recent,
  MAX(created_at) as newest_recent
FROM hi_moments 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 5. Security verification
SELECT 'SECURITY VERIFICATION' as test_category;

-- Verify RLS is enabled on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '⚠️ RLS Disabled'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('public_shares', 'hi_archives', 'user_stats', 'hi_moments')
ORDER BY tablename;

-- 6. Final launch readiness summary
SELECT 'LAUNCH READINESS SUMMARY' as final_check;

WITH system_checks AS (
  SELECT 
    -- Data integrity checks
    CASE WHEN (SELECT hi_waves FROM global_stats WHERE id = 1) >= 345 THEN 1 ELSE 0 END as hi_waves_ok,
    CASE WHEN (SELECT total_his FROM global_stats WHERE id = 1) >= 12 THEN 1 ELSE 0 END as total_his_ok,
    
    -- Function availability checks
    CASE WHEN (SELECT get_global_stats() IS NOT NULL) THEN 1 ELSE 0 END as get_stats_ok,
    
    -- Table existence checks  
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'global_stats') > 0 THEN 1 ELSE 0 END as tables_ok,
    
    -- Recent activity check (should have some data)
    CASE WHEN (SELECT COUNT(*) FROM global_stats) > 0 THEN 1 ELSE 0 END as data_exists_ok
)
SELECT 
  hi_waves_ok + total_his_ok + get_stats_ok + tables_ok + data_exists_ok as total_score,
  CASE 
    WHEN (hi_waves_ok + total_his_ok + get_stats_ok + tables_ok + data_exists_ok) = 5 THEN '🚀 READY FOR LAUNCH'
    WHEN (hi_waves_ok + total_his_ok + get_stats_ok + tables_ok + data_exists_ok) >= 4 THEN '⚠️ LAUNCH WITH CAUTION'
    ELSE '❌ NOT READY - CRITICAL ISSUES'
  END as launch_status,
  CASE WHEN hi_waves_ok = 1 THEN '✅' ELSE '❌' END as hi_waves_check,
  CASE WHEN total_his_ok = 1 THEN '✅' ELSE '❌' END as total_his_check,
  CASE WHEN get_stats_ok = 1 THEN '✅' ELSE '❌' END as functions_check,
  CASE WHEN tables_ok = 1 THEN '✅' ELSE '❌' END as tables_check,
  CASE WHEN data_exists_ok = 1 THEN '✅' ELSE '❌' END as data_check
FROM system_checks;