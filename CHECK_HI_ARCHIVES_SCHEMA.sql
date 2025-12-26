-- 🔍 Check actual hi_archives schema in production
-- Run this in Supabase SQL Editor to see real column names

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hi_archives'
ORDER BY ordinal_position;

-- Also check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'hi_archives'
) as table_exists;
