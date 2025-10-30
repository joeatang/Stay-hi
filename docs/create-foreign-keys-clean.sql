-- ============================================================
-- Add Foreign Key Constraints to Link Tables with Profiles
-- ============================================================
-- This enables PostgREST to JOIN profiles data automatically

-- 1. Add foreign key to public_shares table
ALTER TABLE public.public_shares
ADD CONSTRAINT public_shares_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 2. Add foreign key to hi_archives table
ALTER TABLE public.hi_archives
ADD CONSTRAINT hi_archives_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 3. Verify the constraints were created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('public_shares', 'hi_archives')
ORDER BY tc.table_name, tc.constraint_name;
