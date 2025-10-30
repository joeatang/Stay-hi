-- ===================================================================
-- DIAGNOSTIC: Check if foreign keys actually exist
-- Run this to verify the constraints are in the database
-- ===================================================================

-- 1. Check all foreign keys on public_shares table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'public_shares'
ORDER BY tc.constraint_name;

-- Expected: public_shares_user_id_fkey | public_shares | user_id | profiles | id

-- 2. Check all foreign keys on hi_archives table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'hi_archives'
ORDER BY tc.constraint_name;

-- Expected: hi_archives_user_id_fkey | hi_archives | user_id | profiles | id

-- 3. Check if profiles table exists in public schema
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'public_shares', 'hi_archives')
ORDER BY table_name;

-- Expected:
-- hi_archives | public
-- profiles    | public
-- public_shares | public
