-- Check the actual user_stats table structure
SELECT 'user_stats table columns:' as check_type;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'user_stats'
ORDER BY ordinal_position;