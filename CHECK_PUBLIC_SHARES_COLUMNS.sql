-- Check the actual column names in public_shares table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'public_shares'
ORDER BY ordinal_position;
