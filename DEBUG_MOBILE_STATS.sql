-- 🔍 DEBUG: Why aren't stats loading on mobile?

-- 1. Is RLS even enabled on user_stats?
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_stats' AND schemaname = 'public';

-- 2. What policies exist RIGHT NOW?
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_stats';

-- 3. Test the query AS IF you're the authenticated user
-- (This simulates what mobile browser does)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "68d6ac30-742a-47b4-b1d7-0631bf7a2ec6"}';

SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

RESET role;

-- 4. Check if service_role can see it (backend perspective)
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
