-- Show exact foreign key definitions
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as full_definition
FROM pg_constraint
WHERE conname IN ('public_shares_user_id_fkey', 'hi_archives_user_id_fkey')
ORDER BY conname;
