-- 🎯 WOZNIAK-GRADE DATABASE CONSISTENCY TEST
-- Test get_user_stats function returns consistent data on multiple calls

SELECT 'WOZNIAK TEST: get_user_stats consistency check' as test_name;

-- Call 1: Anonymous user stats
SELECT 'Call 1:' as call_number;
SELECT get_user_stats(null);

-- Call 2: Same anonymous user stats (should be identical)
SELECT 'Call 2:' as call_number;
SELECT get_user_stats(null);

-- Call 3: Same anonymous user stats (should be identical)
SELECT 'Call 3:' as call_number;
SELECT get_user_stats(null);

-- Test specific field extraction consistency
SELECT 'Field extraction test:' as test_type;
SELECT 
  get_user_stats(null) -> 'globalStats' -> 'hiWaves' as hi_waves_1,
  get_user_stats(null) -> 'globalStats' -> 'totalHis' as total_his_1,
  get_user_stats(null) -> 'globalStats' -> 'totalUsers' as total_users_1;

-- Verify the database function is deterministic
SELECT 'Database function determinism check:' as test_type;
DO $$
DECLARE
  result1 JSON;
  result2 JSON;
  result3 JSON;
  waves1 INTEGER;
  waves2 INTEGER;
  waves3 INTEGER;
  totalHis1 INTEGER;
  totalHis2 INTEGER;
  totalHis3 INTEGER;
BEGIN
  -- Get three calls to the function
  SELECT get_user_stats(null) INTO result1;
  SELECT get_user_stats(null) INTO result2;
  SELECT get_user_stats(null) INTO result3;
  
  -- Extract values
  waves1 := (result1 -> 'globalStats' ->> 'hiWaves')::INTEGER;
  waves2 := (result2 -> 'globalStats' ->> 'hiWaves')::INTEGER;
  waves3 := (result3 -> 'globalStats' ->> 'hiWaves')::INTEGER;
  
  totalHis1 := (result1 -> 'globalStats' ->> 'totalHis')::INTEGER;
  totalHis2 := (result2 -> 'globalStats' ->> 'totalHis')::INTEGER;
  totalHis3 := (result3 -> 'globalStats' ->> 'totalHis')::INTEGER;
  
  RAISE NOTICE 'Hi Waves: Call 1: %, Call 2: %, Call 3: %', waves1, waves2, waves3;
  RAISE NOTICE 'Total His: Call 1: %, Call 2: %, Call 3: %', totalHis1, totalHis2, totalHis3;
  
  -- Check consistency
  IF waves1 = waves2 AND waves2 = waves3 AND totalHis1 = totalHis2 AND totalHis2 = totalHis3 THEN
    RAISE NOTICE '✅ WOZNIAK APPROVED: Database function is consistent across calls';
  ELSE
    RAISE NOTICE '❌ WOZNIAK VIOLATION: Database function returns different values on multiple calls!';
  END IF;
END $$;

SELECT 'WOZNIAK TEST COMPLETE' as status;