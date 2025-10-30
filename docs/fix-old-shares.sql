-- ============================================================
-- Backfill Old Public Shares with Correct User ID
-- ============================================================

-- Step 1: Find YOUR user_id (the one that HAS a profile)
SELECT 
  id as user_id,
  username,
  display_name
FROM profiles
LIMIT 5;

-- Step 2: After getting YOUR user_id, update old shares
-- Based on your archives, your user_id is: 7878a4d0-0df3-4a43-a3e9-26449d44db5f
UPDATE public_shares 
SET user_id = '7878a4d0-0df3-4a43-a3e9-26449d44db5f'
WHERE user_id IS NULL;

-- Step 2.5: Reload PostgREST schema cache to recognize the data
NOTIFY pgrst, 'reload schema';

-- Step 3: Verify the update worked
SELECT 
  id,
  user_id,
  text,
  created_at
FROM public_shares
WHERE is_public = true
ORDER BY created_at DESC
LIMIT 10;
