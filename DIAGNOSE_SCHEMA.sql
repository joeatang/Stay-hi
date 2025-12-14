-- =============================================================
-- DIAGNOSTIC: Get actual public_shares schema
-- Run this first to see what we're working with
-- =============================================================

-- 1. Check all columns and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'public_shares'
ORDER BY ordinal_position;

-- 2. Check NOT NULL constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'public_shares';

-- 3. Sample one row to see actual data
SELECT * FROM public_shares LIMIT 1;
