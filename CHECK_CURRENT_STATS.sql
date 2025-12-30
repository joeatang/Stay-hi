-- Check actual database values for your user
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  longest_streak,
  total_waves,
  points_balance,
  total_starts,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Also check recent activity
SELECT COUNT(*) as share_count 
FROM public_shares 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

SELECT SUM(wave_count) as total_wave_count
FROM wave_reactions wr
JOIN public_shares ps ON ps.id = wr.share_id
WHERE ps.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
