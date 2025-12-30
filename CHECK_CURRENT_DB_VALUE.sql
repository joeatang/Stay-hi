-- Check current database value RIGHT NOW
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check actual count in public_shares
SELECT COUNT(*) as actual_share_count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check if trigger is working
SELECT 
  proname as trigger_function,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'sync_moment_count';
