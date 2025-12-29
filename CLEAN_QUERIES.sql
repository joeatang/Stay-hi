-- ============================================================
-- CLEAN SQL QUERIES - Copy ONLY the SELECT statements
-- NO comments, NO asterisks - just pure SQL
-- ============================================================

-- QUERY 2: Show user_stats columns
-- Copy lines 9-10 ONLY (SELECT and FROM lines)

SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_stats' AND table_schema = 'public' ORDER BY ordinal_position;


-- QUERY 3: Get YOUR stats data
-- Copy lines 16-17 ONLY

SELECT * FROM user_stats WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6' ORDER BY updated_at DESC;


-- QUERY 4: Count your rows
-- Copy line 23 ONLY

SELECT COUNT(*) as total_rows FROM user_stats WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';


-- QUERY 5: Find points tables
-- Copy line 29 ONLY

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%point%' ORDER BY table_name;


-- QUERY 6: Your recent shares
-- Copy line 35 ONLY

SELECT id, user_id, created_at, content FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6' ORDER BY created_at DESC LIMIT 10;


-- QUERY 7: Check hi_points table
-- Copy line 41 ONLY

SELECT * FROM hi_points WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
