-- 🔍 CHECK: What RLS policies exist on user_stats?
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_stats';

-- 🚨 FIX: Add RLS policy so users can read their own stats
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read own stats" ON user_stats;

-- Create new policy: Users can SELECT their own row
CREATE POLICY "Users can read own stats"
ON user_stats
FOR SELECT
USING (auth.uid() = user_id);

-- Also allow INSERT for new users
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;

CREATE POLICY "Users can insert own stats"
ON user_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow UPDATE for own stats
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

CREATE POLICY "Users can update own stats"
ON user_stats
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ VERIFY: Check policies were created
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as policy_check
FROM pg_policies 
WHERE tablename = 'user_stats'
ORDER BY cmd;

-- 🧪 TEST: Try to query as your user
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
