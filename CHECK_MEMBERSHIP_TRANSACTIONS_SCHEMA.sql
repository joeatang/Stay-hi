-- Check actual schema of membership_transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'membership_transactions' 
ORDER BY ordinal_position;
