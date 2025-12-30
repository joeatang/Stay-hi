-- 🔍 DEBUG: Check if user_stats row exists at all
SELECT 
  'USER_STATS ROW' as query_type,
  user_id,
  total_hi_moments,
  current_streak,
  longest_streak,
  total_waves,
  days_active,
  last_hi_date,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- If empty, check if user exists in ANY table
SELECT 
  'AUTH USER EXISTS' as query_type,
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check public_shares count
SELECT 
  'PUBLIC_SHARES COUNT' as query_type,
  COUNT(*) as share_count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check wave_count sum (you got 15)
SELECT 
  'WAVE_COUNT SUM' as query_type,
  COALESCE(SUM(wave_count), 0) as wave_sum
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- CRITICAL: Check if user_stats row EXISTS AT ALL
SELECT 
  'USER_STATS EXISTS?' as query_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_stats WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6')
    THEN '✅ YES - Row exists'
    ELSE '❌ NO - Missing user_stats row!'
  END as result;
