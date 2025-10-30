-- ============================================================
-- Fix Foreign Keys to Point to public.profiles Instead of auth.users
-- ============================================================

-- 1. Drop existing foreign keys (they point to auth.users)
ALTER TABLE public.public_shares
DROP CONSTRAINT public_shares_user_id_fkey;

ALTER TABLE public.hi_archives
DROP CONSTRAINT hi_archives_user_id_fkey;

-- 2. Create new foreign keys pointing to public.profiles
ALTER TABLE public.public_shares
ADD CONSTRAINT public_shares_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.hi_archives
ADD CONSTRAINT hi_archives_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 3. Verify the new foreign keys
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as full_definition
FROM pg_constraint
WHERE conname IN ('public_shares_user_id_fkey', 'hi_archives_user_id_fkey')
ORDER BY conname;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
