-- 🧪 SURGICAL TEST SUITE for Database Functions
-- Run this to verify everything works before deployment

-- Test 1: Check current stats
SELECT 'TEST 1 - Current Stats:' as test_name, * FROM get_global_stats();

-- Test 2: Test medallion tap increment (should add 1 record)
SELECT 'TEST 2 - Increment Test:' as test_name, increment_hi_wave() as new_count;

-- Test 3: Verify the count increased by 1
SELECT 'TEST 3 - Verify Increase:' as test_name, * FROM get_global_stats();

-- Test 4: Check actual table data
SELECT 
  'TEST 4 - Table Data:' as test_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN content LIKE '%Medallion tap%' THEN 1 END) as medallion_taps,
  COUNT(CASE WHEN is_anonymous = true THEN 1 END) as anonymous_taps
FROM public_shares;

-- Test 5: Test anonymous permissions (simulate anonymous user)
SET LOCAL role 'anon';
SELECT 'TEST 5 - Anonymous Access:' as test_name, hi_waves, total_his FROM get_global_stats();
RESET ROLE;

-- ✅ If all tests pass, database is ready for frontend deployment!