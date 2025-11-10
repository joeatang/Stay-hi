-- ===============================================
-- 🚨 DEPLOY 7: CRITICAL MISSING DATABASE FUNCTIONS (DROP & RECREATE)
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
-- STEP 2: CHECK AND FIX GLOBAL STATS TABLE
-- ===============================================

-- First, let's see what exists
DO $$
BEGIN
  -- Check if global_stats table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_stats') THEN
    RAISE NOTICE 'global_stats table exists - checking structure...';
  ELSE
    RAISE NOTICE 'global_stats table does not exist - will create it...';
    
    CREATE TABLE global_stats (
      id SERIAL PRIMARY KEY,
      hi_waves BIGINT DEFAULT 0,
      total_his BIGINT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
    VALUES (1, 0, 0, NOW());
    
    RAISE NOTICE 'Created global_stats table with initial data';
  END IF;
END $$;

-- Ensure we have the basic columns we need
DO $$
BEGIN
  -- Add hi_waves column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'global_stats' AND column_name = 'hi_waves') THEN
    ALTER TABLE global_stats ADD COLUMN hi_waves BIGINT DEFAULT 0;
    RAISE NOTICE 'Added hi_waves column';
  END IF;
  
  -- Add total_his column if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'global_stats' AND column_name = 'total_his') THEN
    ALTER TABLE global_stats ADD COLUMN total_his BIGINT DEFAULT 0;
    RAISE NOTICE 'Added total_his column';
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'global_stats' AND column_name = 'updated_at') THEN
    ALTER TABLE global_stats ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- Ensure we have at least one row
INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
SELECT 1, 0, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM global_stats WHERE id = 1);

-- ===============================================
-- STEP 3: CREATE get_global_stats() FUNCTION (NEW)
-- ===============================================

CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves BIGINT,
  total_his BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the latest stats (only the columns we know exist)
  RETURN QUERY
  SELECT 
    gs.hi_waves,
    gs.total_his,
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
      NOW() as updated_at;
  END IF;
END;
$$;

-- ===============================================
-- STEP 4: CREATE increment_hi_wave() FUNCTION (NEW)
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
  
  -- If no rows updated, insert one
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
    VALUES (1, 1, 0, NOW());
    new_count := 1;
  ELSE
    SELECT hi_waves INTO new_count FROM global_stats WHERE id = 1;
  END IF;
  
  RETURN new_count;
END;
$$;

-- ===============================================
-- STEP 5: CREATE increment_total_hi() FUNCTION (NEW)
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
  
  -- If no rows updated, insert one
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
    VALUES (1, 0, 1, NOW());
    new_count := 1;
  ELSE
    SELECT total_his INTO new_count FROM global_stats WHERE id = 1;
  END IF;
  
  RETURN new_count;
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