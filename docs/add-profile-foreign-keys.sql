-- ===================================================================
-- ADD FOREIGN KEY RELATIONSHIPS FOR PROFILE INTEGRATION
-- Run this in Supabase SQL Editor to enable profile joins
-- ===================================================================

-- NOTE: If public_shares_user_id_fkey already exists, skip step 1
-- Run step 2 only if needed

-- 1. Add foreign key to public_shares → profiles (may already exist)
-- Uncomment if needed:
-- ALTER TABLE public.public_shares
--   ADD CONSTRAINT public_shares_user_id_fkey 
--   FOREIGN KEY (user_id) 
--   REFERENCES public.profiles(id)
--   ON DELETE CASCADE;

-- 2. Add foreign key to hi_archives → profiles  
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
  AND tc.table_name IN ('public_shares', 'hi_archives')
ORDER BY tc.table_name;

-- Expected output:
-- public_shares_user_id_fkey | public_shares | user_id | profiles | id
-- hi_archives_user_id_fkey   | hi_archives   | user_id | profiles | id
