-- 🔍 VERIFY ACTUAL DATABASE VALUES RIGHT NOW
-- Check what the database actually shows for user's account

SELECT 
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

-- Also check public_shares count (should match total_hi_moments)
SELECT 
  COUNT(*) as actual_share_count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check wave_count sum (should match total_waves)
SELECT 
  COALESCE(SUM(wave_count), 0) as actual_wave_sum
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
