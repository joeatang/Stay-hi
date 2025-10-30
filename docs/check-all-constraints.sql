-- ============================================================
-- Check ALL constraints on public_shares and hi_archives
-- ============================================================

-- Check public_shares constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.public_shares'::regclass
ORDER BY conname;

-- Check hi_archives constraints  
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.hi_archives'::regclass
ORDER BY conname;

-- Alternative: Check using pg_catalog
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_catalog = kcu.constraint_catalog
    AND tc.constraint_schema = kcu.constraint_schema
    AND tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_catalog = ccu.constraint_catalog
    AND tc.constraint_schema = ccu.constraint_schema
    AND tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('public_shares', 'hi_archives')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
