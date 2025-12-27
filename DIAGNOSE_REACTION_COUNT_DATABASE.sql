-- 🔍 DIAGNOSTIC: Check if reaction counts are exposed in database queries
-- Run this in Supabase SQL Editor to see what the frontend actually receives

-- ===== PART 1: Check if public_shares table has the columns =====
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_shares'
  AND column_name IN ('wave_count', 'peace_count')
ORDER BY column_name;

-- Expected: 2 rows showing INTEGER columns with DEFAULT 0
-- If empty: Columns don't exist! Need to run migration.


-- ===== PART 2: Check if the VIEW exposes these columns =====
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'public_shares_enriched'
  AND column_name IN ('wave_count', 'peace_count')
ORDER BY column_name;

-- Expected: 2 rows if view passes through the columns
-- If empty: View doesn't expose counts! Need to recreate view.


-- ===== PART 3: Check actual data in a recent share =====
SELECT 
  id,
  content,
  wave_count,
  peace_count,
  created_at
FROM public_shares
ORDER BY created_at DESC
LIMIT 5;

-- Expected: See actual wave_count/peace_count values (or 0)
-- If column error: Columns don't exist in table


-- ===== PART 4: Check what the VIEW returns =====
SELECT 
  id,
  content,
  wave_count,
  peace_count,
  username,
  display_name,
  created_at
FROM public_shares_enriched
ORDER BY created_at DESC
LIMIT 5;

-- Expected: See counts + profile data
-- If column error: View doesn't expose wave_count/peace_count
-- This is what the frontend receives!


-- ===== PART 5: Check if there are any actual reactions =====
SELECT 
  share_id,
  COUNT(*) as wave_count,
  COUNT(DISTINCT user_id) as unique_wavers
FROM wave_reactions
GROUP BY share_id
ORDER BY wave_count DESC
LIMIT 10;

-- Expected: See shares with wave counts
-- Compare these share_ids with public_shares.wave_count values


-- ===== DIAGNOSTIC SUMMARY =====
-- Run all 5 queries above. If:
-- 
-- 1. Part 1 empty → Columns don't exist, run: ADD_WAVE_PEACE_COUNT_COLUMNS.sql
-- 2. Part 2 empty → View doesn't expose counts, run: FIX_PUBLIC_SHARES_ENRICHED_VIEW.sql  
-- 3. Part 3 shows NULL → Columns exist but data not synced, check triggers
-- 4. Part 4 shows NULL → View exists but not passing through columns correctly
-- 5. Part 5 empty → No reactions exist yet (expected for new system)
--
-- MOST LIKELY ISSUE: Part 2 returns empty (view doesn't expose columns)
-- SOLUTION: Run FIX_PUBLIC_SHARES_ENRICHED_VIEW.sql to recreate the view
