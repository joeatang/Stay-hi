-- 🏆 GOLD STANDARD DATABASE DEPLOYMENT - FIXED
-- MISSION: Create missing increment_total_hi() function and fix Total His counter
-- Copy this entire script and run in Supabase SQL Editor

-- � STEP 1: Check existing table structure (for debugging)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'public_shares' AND table_schema = 'public';

-- 🔧 STEP 2: Add total_his column if it doesn't exist
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS total_his integer DEFAULT 0;

-- 🔧 STEP 3: Initialize total_his to current value if it's 0 or NULL
-- First, let's see what records exist and their IDs
SELECT id, total_his FROM public_shares LIMIT 5;

-- Update all existing records to set total_his = 86 if it's currently 0 or NULL
UPDATE public_shares 
SET total_his = 86 
WHERE (total_his IS NULL OR total_his = 0);

-- 🔧 STEP 4: Create the increment function
CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_total integer;
BEGIN
  -- Strategy: Use the first available record or create a dedicated counter record
  -- Try to update existing record first
  UPDATE public_shares 
  SET total_his = COALESCE(total_his, 0) + 1 
  WHERE id = (SELECT id FROM public_shares LIMIT 1)
  RETURNING total_his INTO new_total;
  
  -- If no records exist, create a new one with a UUID
  IF new_total IS NULL THEN
    INSERT INTO public_shares (id, total_his) 
    VALUES (gen_random_uuid(), 87)
    RETURNING total_his INTO new_total;
  END IF;
  
  RETURN new_total;
END;
$$;

-- 🔧 STEP 5: Grant necessary permissions
GRANT SELECT, UPDATE ON public_shares TO authenticated;
GRANT SELECT, UPDATE ON public_shares TO anon;
GRANT EXECUTE ON FUNCTION increment_total_hi() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon;

-- ✅ STEP 6: Test the function
SELECT 'Current total_his:' as status, total_his 
FROM public_shares LIMIT 1;

SELECT 'Testing increment...' as status, increment_total_hi() as new_total;

SELECT 'After increment:' as status, total_his 
FROM public_shares LIMIT 1;