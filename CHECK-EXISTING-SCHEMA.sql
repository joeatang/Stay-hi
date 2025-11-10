-- Check what tables and columns actually exist
SELECT 'EXISTING TABLES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%stats%'
ORDER BY table_name;

-- Check global_stats table structure if it exists
SELECT 'GLOBAL_STATS COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'global_stats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current data in global_stats if it exists
SELECT 'GLOBAL_STATS DATA:' as info;
SELECT * FROM global_stats LIMIT 5;

-- Check what functions already exist
SELECT 'EXISTING FUNCTIONS:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_global_stats', 'increment_hi_wave', 'increment_total_hi')
ORDER BY routine_name;