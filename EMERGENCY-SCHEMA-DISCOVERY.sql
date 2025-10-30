-- ===============================================
-- 🚨 EMERGENCY SCHEMA DISCOVERY - TESLA GRADE
-- ===============================================
-- Find out what your ACTUAL database looks like before proceeding

-- ===============================================
-- STEP 1: DISCOVER ACTUAL TABLE STRUCTURES
-- ===============================================

-- Check what tables exist with "hi" or "share" in the name
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name ILIKE '%hi%' 
  OR table_name ILIKE '%share%'
  OR table_name ILIKE '%moment%'
  OR table_name ILIKE '%global%'
  OR table_name ILIKE '%stat%'
)
ORDER BY table_name;

-- ===============================================
-- STEP 2: ANALYZE public_shares TABLE STRUCTURE
-- ===============================================

-- Get actual column structure of public_shares table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'public_shares'
ORDER BY ordinal_position;

-- ===============================================
-- STEP 3: ANALYZE OTHER RELEVANT TABLES
-- ===============================================

-- Check hi_moments table structure (if it exists)
SELECT 
  'hi_moments columns:' as table_info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hi_moments'
ORDER BY ordinal_position;

-- Check any other hi-related tables
SELECT 
  'hi_archives columns:' as table_info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hi_archives'
ORDER BY ordinal_position;

-- ===============================================
-- STEP 4: CHECK EXISTING FUNCTIONS
-- ===============================================

-- What RPC functions currently exist?
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
  routine_name ILIKE '%global%'
  OR routine_name ILIKE '%stat%'
  OR routine_name ILIKE '%hi%'
  OR routine_name ILIKE '%increment%'
)
ORDER BY routine_name;

-- ===============================================
-- STEP 5: CHECK SAMPLE DATA (SAFE READ-ONLY)
-- ===============================================

-- Look at actual data in public_shares (first 3 rows)
SELECT 'public_shares sample data:' as info;
SELECT * FROM public_shares LIMIT 3;

-- Look at actual data in hi_moments if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_moments') THEN
    PERFORM 'Checking hi_moments data...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END
$$;

-- ===============================================
-- STEP 6: CHECK FOR EXISTING global_stats
-- ===============================================

-- Check if global_stats table exists and what it contains
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_stats') THEN
    RAISE NOTICE 'global_stats table EXISTS';
    -- Show its structure
    PERFORM 'global_stats structure check';
  ELSE
    RAISE NOTICE 'global_stats table does NOT exist';
  END IF;
END
$$;

SELECT 
  'global_stats columns:' as table_info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'global_stats'
ORDER BY ordinal_position;

-- Show current data in global_stats (if it exists)
SELECT 'current global_stats data:' as info;
SELECT * FROM global_stats;

-- ===============================================
-- RESULTS SUMMARY
-- ===============================================

SELECT '🔍 SCHEMA DISCOVERY COMPLETE' as status;