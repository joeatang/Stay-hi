-- Check if public_shares table has the emotion columns the RPC needs
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'public_shares'
AND column_name IN ('text', 'current_emoji', 'desired_emoji', 'hi_intensity')
ORDER BY column_name;
