-- Quick check: What does database have RIGHT NOW?
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves,
  updated_at,
  NOW() as current_time
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- What's the actual share count?
SELECT COUNT(*) as actual_shares
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
