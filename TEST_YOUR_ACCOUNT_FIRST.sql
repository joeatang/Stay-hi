-- TEST on degenmentality@gmail.com FIRST before running full fix

-- Step 1: Get your user_id
SELECT id, email FROM auth.users WHERE email = 'degenmentality@gmail.com';

-- Step 2: Count your ACTUAL shares (should be 239+)
SELECT COUNT(*) as actual_shares FROM public_shares WHERE user_id = '<PASTE_USER_ID_HERE>';

-- Step 3: Check current user_stats (probably shows 1)
SELECT * FROM user_stats WHERE user_id = '<PASTE_USER_ID_HERE>';

-- Step 4: Count your waves and reactions
SELECT 
  (SELECT COALESCE(SUM(wave_count), 0) FROM public_shares WHERE user_id = '<PASTE_USER_ID_HERE>') as total_waves,
  (SELECT COUNT(*) FROM share_reactions sr JOIN public_shares ps ON sr.share_id = ps.id WHERE ps.user_id = '<PASTE_USER_ID_HERE>') as total_starts;
