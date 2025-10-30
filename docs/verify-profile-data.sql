-- ============================================================
-- Verify Profile Data is Ready for JOIN
-- ============================================================

-- 1. Check how many shares have user_id now
SELECT 
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id,
  COUNT(*) FILTER (WHERE user_id IS NULL) as without_user_id,
  COUNT(*) as total
FROM public_shares
WHERE is_public = true;

-- 2. Test the actual JOIN that the app uses
SELECT 
  ps.id,
  ps.user_id,
  ps.text,
  ps.created_at,
  p.username,
  p.display_name,
  p.avatar_url
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id
WHERE ps.is_public = true
ORDER BY ps.created_at DESC
LIMIT 10;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
