-- 🔍 STATS DIAGNOSTIC V2 - Fresh Start
-- Run these queries ONE AT A TIME in Supabase SQL Editor
-- Copy each query separately and click "Run" button

-- ================================================================================
-- QUERY 1: What tables exist in the database?
-- ================================================================================
-- INSTRUCTION: Copy lines 9-12, paste in SQL Editor, click "Run"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ================================================================================
-- QUERY 2: What columns exist in user_stats table?
-- ================================================================================
-- INSTRUCTION: Copy lines 18-22, paste in SQL Editor, click "Run"
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================================
-- QUERY 3: Show ALL data for your user in user_stats
-- ================================================================================
-- INSTRUCTION: Copy lines 28-31, paste in SQL Editor, click "Run"
SELECT *
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY updated_at DESC;

-- ================================================================================
-- QUERY 4: How many user_stats rows exist for your user?
-- ================================================================================
-- INSTRUCTION: Copy lines 37-40, paste in SQL Editor, click "Run"
SELECT COUNT(*) as total_rows
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ================================================================================
-- QUERY 5: Check if hi_points table exists (different names)
-- ================================================================================
-- INSTRUCTION: Copy lines 46-50, paste in SQL Editor, click "Run"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%point%'
ORDER BY table_name;

-- ================================================================================
-- QUERY 6: Show recent public_shares from your user
-- ================================================================================
-- INSTRUCTION: Copy lines 56-60, paste in SQL Editor, click "Run"
SELECT id, user_id, created_at, content
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 10;
