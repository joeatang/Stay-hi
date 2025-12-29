-- 🔍 DEEP DIAGNOSTIC - Find the real issue
-- Run these ONE AT A TIME

-- QUERY 1: Find YOUR user_id by email
-- Copy line 6

SELECT id, email, created_at FROM auth.users WHERE email = 'degenmentality@gmail.com';


-- QUERY 2: Check profiles table for that user
-- Copy line 12 (REPLACE <USER_ID> with result from Query 1)

SELECT * FROM profiles WHERE id = '<USER_ID>';


-- QUERY 3: How many public_shares do you actually have?
-- Copy line 18 (REPLACE <USER_ID>)

SELECT COUNT(*) as total_shares FROM public_shares WHERE user_id = '<USER_ID>';


-- QUERY 4: Show your actual shares (recent 20)
-- Copy line 24 (REPLACE <USER_ID>)

SELECT id, user_id, created_at, content, location FROM public_shares WHERE user_id = '<USER_ID>' ORDER BY created_at DESC LIMIT 20;


-- QUERY 5: Check your actual stats in user_stats
-- Copy line 30 (REPLACE <USER_ID>)

SELECT * FROM user_stats WHERE user_id = '<USER_ID>';


-- QUERY 6: Check ALL points-related tables for your account
-- Copy line 36 (REPLACE <USER_ID>)

SELECT 'hi_points' as table_name, * FROM hi_points WHERE user_id = '<USER_ID>';


-- QUERY 7: Check points ledger (transaction history)
-- Copy line 42 (REPLACE <USER_ID>)

SELECT * FROM hi_points_ledger WHERE user_id = '<USER_ID>' ORDER BY created_at DESC LIMIT 10;


-- QUERY 8: Check daily checkins
-- Copy line 48 (REPLACE <USER_ID>)

SELECT * FROM hi_points_daily_checkins WHERE user_id = '<USER_ID>' ORDER BY checkin_date DESC LIMIT 5;
