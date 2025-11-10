-- ===============================================
-- 🚨 DEPLOY 7: CRITICAL MISSING DATABASE FUNCTIONS (TYPE-SAFE)
-- ===============================================
-- ROOT CAUSE: hi-database-first-stats.sql calls increment_hi_wave() and get_global_stats()
-- but these functions were never deployed to the database.
-- This is why Hi waves increment in frontend but reset to 0 on refresh.

-- ===============================================
-- STEP 1: DROP EXISTING FUNCTIONS (IF ANY)
-- ===============================================

-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS get_global_stats() CASCADE;
DROP FUNCTION IF EXISTS increment_hi_wave() CASCADE;
DROP FUNCTION IF EXISTS increment_total_hi() CASCADE;

-- ===============================================
-- STEP 2: CHECK ACTUAL TABLE STRUCTURE
-- ===============================================

-- Show what columns actually exist and their types
SELECT 'EXISTING TABLE STRUCTURE:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'global_stats' 
ORDER BY ordinal_position;

-- ===============================================
-- STEP 3: CREATE TYPE-SAFE get_global_stats() FUNCTION
-- ===============================================

-- Create function that matches actual column types (likely INTEGER not BIGINT)
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves INTEGER,
  total_his INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the latest stats using actual column types
  RETURN QUERY
  SELECT 
    gs.hi_waves::INTEGER,
    gs.total_his::INTEGER,
    gs.updated_at
  FROM global_stats gs
  ORDER BY gs.id DESC
  LIMIT 1;
  
  -- If no stats exist, return zeros
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::INTEGER as hi_waves,
      0::INTEGER as total_his, 
      NOW() as updated_at;
  END IF;
END;
$$;

-- ===============================================
-- STEP 4: CREATE TYPE-SAFE increment_hi_wave() FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION increment_hi_wave()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Simple update of the first (and only) row
  UPDATE global_stats 
  SET 
    hi_waves = hi_waves + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- If no rows updated, insert one
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
    VALUES (1, 1, 0, NOW())
    ON CONFLICT (id) DO UPDATE SET
      hi_waves = global_stats.hi_waves + 1,
      updated_at = NOW();
  END IF;
  
  -- Get the new count
  SELECT hi_waves INTO new_count FROM global_stats WHERE id = 1;
  RETURN COALESCE(new_count, 1);
END;
$$;

-- ===============================================
-- STEP 5: CREATE TYPE-SAFE increment_total_hi() FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Simple update of the first (and only) row
  UPDATE global_stats 
  SET 
    total_his = total_his + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- If no rows updated, insert one
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
    VALUES (1, 0, 1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      total_his = global_stats.total_his + 1,
      updated_at = NOW();
  END IF;
  
  -- Get the new count
  SELECT total_his INTO new_count FROM global_stats WHERE id = 1;
  RETURN COALESCE(new_count, 1);
END;
$$;

-- ===============================================
-- STEP 6: GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_hi_wave() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon, authenticated;

-- ===============================================
-- STEP 7: VERIFICATION TESTS
-- ===============================================

-- Show final table structure
SELECT 'FINAL TABLE STRUCTURE:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'global_stats' 
ORDER BY ordinal_position;

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