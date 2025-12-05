-- 🚨 EMERGENCY: Add content column to match code expectations
-- Run this in Supabase SQL Editor NOW

-- Add content column to public_shares
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add content column to hi_archives  
ALTER TABLE hi_archives
ADD COLUMN IF NOT EXISTS content TEXT;

-- Migrate data from existing columns (if any)
-- Try to copy from 'text', 'share_text', 'journal', or 'message' columns

-- For public_shares - check what column actually has the data
DO $$
BEGIN
  -- Try to copy from 'text' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_shares' AND column_name = 'text') THEN
    UPDATE public_shares SET content = text WHERE content IS NULL AND text IS NOT NULL;
  END IF;
  
  -- Try to copy from 'share_text' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_shares' AND column_name = 'share_text') THEN
    UPDATE public_shares SET content = share_text WHERE content IS NULL AND share_text IS NOT NULL;
  END IF;
END $$;

-- For hi_archives - check what column actually has the data
DO $$
BEGIN
  -- Try to copy from 'journal' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_archives' AND column_name = 'journal') THEN
    UPDATE hi_archives SET content = journal WHERE content IS NULL AND journal IS NOT NULL;
  END IF;
  
  -- Try to copy from 'text' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hi_archives' AND column_name = 'text') THEN
    UPDATE hi_archives SET content = text WHERE content IS NULL AND text IS NOT NULL;
  END IF;
END $$;

-- Make content NOT NULL after migration (comment out if you have null data)
-- ALTER TABLE public_shares ALTER COLUMN content SET NOT NULL;
-- ALTER TABLE hi_archives ALTER COLUMN content SET NOT NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT 'public_shares columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'public_shares' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'hi_archives columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hi_archives' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
