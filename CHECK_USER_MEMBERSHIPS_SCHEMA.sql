-- Check user_memberships schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_memberships' 
ORDER BY ordinal_position;
