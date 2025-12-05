-- 🔄 RELOAD SUPABASE SCHEMA CACHE
-- Run this in Supabase SQL Editor to refresh PostgREST schema cache
-- Issue: PostgREST doesn't recognize 'content' column even though it exists
-- Solution: Notify PostgREST to reload its schema cache

-- Method 1: Simple schema reload notification
NOTIFY pgrst, 'reload schema';

-- Method 2: If above doesn't work, restart PostgREST via dashboard:
-- Settings → API → Restart All

-- Verify columns exist after reload:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'public_shares' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hi_archives' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
