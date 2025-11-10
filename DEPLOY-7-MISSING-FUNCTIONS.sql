-- ===============================================
-- 🚨 DEPLOY 7: CRITICAL MISSING DATABASE FUNCTIONS
-- ===============================================
-- ROOT CAUSE: hi-database-first-stats.sql calls increment_hi_wave() and get_global_stats()
-- but these functions were never deployed to the database.
-- This is why Hi waves increment in frontend but reset to 0 on refresh.

-- ===============================================
-- STEP 1: CREATE GLOBAL STATS TABLE (IF NOT EXISTS)
-- ===============================================

CREATE TABLE IF NOT EXISTS global_stats (
  id SERIAL PRIMARY KEY,
  hi_waves BIGINT DEFAULT 0,
  total_his BIGINT DEFAULT 0,
  active_users_24h INTEGER DEFAULT 0,
  total_users BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial row if table is empty
INSERT INTO global_stats (id, hi_waves, total_his, active_users_24h, total_users, updated_at)
SELECT 1, 0, 0, 0, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM global_stats WHERE id = 1);

-- ===============================================
-- STEP 2: CREATE get_global_stats() FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves BIGINT,
  total_his BIGINT,
  active_users_24h INTEGER,
  total_users BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the latest stats
  RETURN QUERY
  SELECT 
    gs.hi_waves,
    gs.total_his,
    gs.active_users_24h,
    gs.total_users,
    gs.updated_at
  FROM global_stats gs
  ORDER BY gs.id DESC
  LIMIT 1;
  
  -- If no stats exist, return zeros
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::BIGINT as hi_waves,
      0::BIGINT as total_his, 
      0::INTEGER as active_users_24h,
      0::BIGINT as total_users,
      NOW() as updated_at;
  END IF;
END;
$$;

-- ===============================================
-- STEP 3: CREATE increment_hi_wave() FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION increment_hi_wave()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Simple update of the first (and only) row
  UPDATE global_stats 
  SET 
    hi_waves = hi_waves + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- If no rows updated (shouldn't happen), insert one
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, active_users_24h, total_users, updated_at)
    VALUES (1, 1, 0, 0, 0, NOW());
  END IF;
  
  SELECT hi_waves INTO new_count FROM global_stats WHERE id = 1;
  RETURN new_count;
END;
$$;

-- ===============================================
-- STEP 4: CREATE increment_total_hi() FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS BIGINT  
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Simple update of the first (and only) row
  UPDATE global_stats 
  SET 
    total_his = total_his + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- If no rows updated (shouldn't happen), insert one
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, active_users_24h, total_users, updated_at)
    VALUES (1, 0, 1, 0, 0, NOW());
  END IF;
  
  SELECT total_his INTO new_count FROM global_stats WHERE id = 1;
  RETURN new_count;
END;
$$;

-- ===============================================
-- STEP 5: GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_hi_wave() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon, authenticated;

-- ===============================================
-- STEP 6: VERIFICATION TESTS
-- ===============================================

-- Test get_global_stats works
SELECT 'get_global_stats() test:' as test_name;
SELECT * FROM get_global_stats();

-- Test increment_hi_wave works
SELECT 'increment_hi_wave() test:' as test_name;
SELECT increment_hi_wave() as new_count;

-- Verify the increment actually worked
SELECT 'Post-increment verification:' as test_name;
SELECT hi_waves FROM global_stats WHERE id = 1;

-- Test increment_total_hi works
SELECT 'increment_total_hi() test:' as test_name;
SELECT increment_total_hi() as new_count;

-- Final verification
SELECT 'FINAL STATE:' as test_name;
SELECT * FROM global_stats WHERE id = 1;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🎯 CRITICAL MISSING FUNCTIONS DEPLOYED!';
  RAISE NOTICE '✅ get_global_stats() - Now reads from global_stats table';
  RAISE NOTICE '✅ increment_hi_wave() - Now writes to global_stats table';
  RAISE NOTICE '✅ increment_total_hi() - Now writes to global_stats table';
  RAISE NOTICE '🔥 Hi waves should now persist across page refreshes!';
END $$;