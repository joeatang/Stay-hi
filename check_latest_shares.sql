-- Check last 2 shares for hi_intensity data
SELECT 
  id,
  user_id,
  moment_text,
  hi_intensity,
  current_emoji,
  desired_emoji,
  share_origin,
  created_at
FROM public_shares
ORDER BY created_at DESC
LIMIT 2;
