-- 🔍 DATABASE SCHEMA AUDIT: Complete results in one query
-- Purpose: Understand real database schema before deployment
-- Run this in Supabase SQL Editor to see ALL results

-- =================================================================
-- COMPREHENSIVE SCHEMA AUDIT - ALL RESULTS VISIBLE
-- =================================================================

WITH table_audit AS (
  -- Check which tables exist
  SELECT 
    'TABLES' as section,
    1 as sort_order,
    table_name as name,
    'EXISTS' as status,
    table_schema as details
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('hi_shares', 'public_shares', 'shares', 'hi_events', 'hi_moments')
),

column_audit AS (
  -- Get all column details
  SELECT 
    'COLUMNS' as section,
    2 as sort_order,
    table_name || '.' || column_name as name,
    data_type as status,
    'nullable:' || is_nullable || ' default:' || COALESCE(column_default, 'none') as details
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name IN ('hi_shares', 'public_shares', 'shares', 'hi_events', 'hi_moments')
),

record_counts AS (
  -- Count records (using dynamic SQL simulation)
  SELECT 
    'RECORDS' as section,
    3 as sort_order,
    'hi_shares' as name,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_shares' AND table_schema = 'public') 
      THEN 'TABLE_EXISTS' 
      ELSE 'NO_TABLE' 
    END as status,
    'Ready for counting' as details
  UNION ALL
  SELECT 
    'RECORDS' as section,
    3 as sort_order,
    'public_shares' as name,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'public_shares' AND table_schema = 'public') 
      THEN 'TABLE_EXISTS' 
      ELSE 'NO_TABLE' 
    END as status,
    'Ready for counting' as details
)

-- Combine all audit results
SELECT 
  section,
  name,
  status,
  details
FROM (
  SELECT * FROM table_audit
  UNION ALL
  SELECT * FROM column_audit  
  UNION ALL
  SELECT * FROM record_counts
) combined
ORDER BY sort_order, section, name;

-- =================================================================
-- SECOND QUERY: Get actual record counts (run this separately)
-- =================================================================

-- Count records in existing tables
SELECT 
  'hi_shares' as table_name,
  (SELECT COUNT(*) FROM hi_shares) as record_count
UNION ALL
SELECT 
  'public_shares' as table_name,
  (SELECT COUNT(*) FROM public_shares) as record_count;