-- Check the most recent share to see what was actually saved
SELECT 
  id,
  text,
  location,
  current_emoji,
  desired_emoji,
  created_at,
  user_id
FROM public_shares 
WHERE user_id = '7878a4d0-0df3-4a43-a3e9-26449d44db5f'
ORDER BY created_at DESC 
LIMIT 3;

SELECT 
  id,
  journal,
  location,
  current_emoji,
  desired_emoji,
  created_at,
  user_id
FROM hi_archives
WHERE user_id = '7878a4d0-0df3-4a43-a3e9-26449d44db5f'
ORDER BY created_at DESC
LIMIT 3;
