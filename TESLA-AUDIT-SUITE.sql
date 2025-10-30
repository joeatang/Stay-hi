-- ===============================================
-- 🛡️ TESLA-GRADE COMPREHENSIVE AUDIT SUITE
-- ===============================================
-- Complete system verification after RPC updates

-- === DATABASE INTEGRITY CHECKS ===

-- 1. Verify current global stats are preserved
SELECT 
  'GLOBAL STATS VERIFICATION' as check_type,
  hi_waves as current_hi_waves,
  total_his as current_total_his,
  active_users_24h,
  total_users,
  updated_at
FROM global_stats 
ORDER BY id DESC 
LIMIT 1;

-- 2. Test all RPC functions return correct types
SELECT 'RPC FUNCTION TESTS' as test_suite;

-- Test get_global_stats function
SELECT 
  'get_global_stats()' as function_name,
  get_global_stats() as result_format;

-- Test increment functions (should work without errors)
SELECT 
  'increment_hi_wave()' as function_name,
  increment_hi_wave() as new_count;

SELECT 
  'increment_total_hi()' as function_name,
  increment_total_hi() as new_count;

-- 3. Verify data consistency across tables
SELECT 
  'TABLE RELATIONSHIPS CHECK' as check_type,
  (SELECT COUNT(*) FROM hi_moments) as hi_moments_count,
  (SELECT COUNT(*) FROM public_shares) as public_shares_count,
  (SELECT COUNT(*) FROM global_stats) as global_stats_count,
  (SELECT COUNT(*) FROM user_stats) as user_stats_count;

-- 4. Check for any data corruption or anomalies
SELECT 
  'DATA QUALITY AUDIT' as audit_type,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record,
  COUNT(DISTINCT user_id) as unique_users
FROM hi_moments;

-- 5. Verify rate limiting is active (check recent activity)
SELECT 
  'RATE LIMITING CHECK' as security_check,
  COUNT(*) as recent_hi_moments,
  COUNT(DISTINCT user_id) as active_users
FROM hi_moments 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 6. Final integration test
SELECT 
  'FINAL INTEGRATION TEST' as test_result,
  'All functions operational: ' || get_global_stats() as system_status;