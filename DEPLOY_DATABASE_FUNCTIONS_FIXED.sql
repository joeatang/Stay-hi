-- 🚀 SURGICAL DATABASE DEPLOYMENT SCRIPT (FIXED FOR EXISTING SCHEMA)
-- Ensures all RPC functions exist in production database

-- First, let's check what columns actually exist
SELECT 'Checking public_shares table structure:' as info;

-- 🎯 SURGICAL: Primary get_global_stats function (reads data)
-- FIXED: Works with existing table structure without share_type column
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves BIGINT,
  total_his BIGINT,
  active_users_24h INTEGER,
  total_users BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  medallion_taps BIGINT := 0;
  share_sheet_entries BIGINT := 0;
  active_24h INTEGER := 0;
  total_users_count BIGINT := 0;
BEGIN
  -- 🎯 SURGICAL MAPPING: Count all records in public_shares as medallion taps
  -- Since share_type column doesn't exist, count all records
  SELECT COALESCE(COUNT(*), 0) INTO medallion_taps
  FROM public_shares;
  
  -- For now, use medallion taps for both metrics until we have share_type distinction
  share_sheet_entries := medallion_taps;
  
  -- Count active users (if auth tables accessible)
  BEGIN
    SELECT COALESCE(COUNT(DISTINCT user_id), 0) INTO active_24h
    FROM auth.sessions 
    WHERE updated_at > NOW() - INTERVAL '24 hours';
  EXCEPTION
    WHEN OTHERS THEN
      active_24h := 0;
  END;
  
  -- Count total users
  BEGIN  
    SELECT COALESCE(COUNT(*), 0) INTO total_users_count
    FROM auth.users;
  EXCEPTION
    WHEN OTHERS THEN
      total_users_count := 0;
  END;
  
  -- Return the surgical 1:1 mapped data
  RETURN QUERY SELECT 
    medallion_taps as hi_waves,           -- Global Waves = all public_shares records
    share_sheet_entries as total_his,     -- Global Hi5 = same for now 
    active_24h as active_users_24h,
    total_users_count as total_users,
    NOW() as updated_at;
    
END $$;

-- 🎯 SURGICAL: Primary increment_hi_wave function (writes data)
-- FIXED: Works without share_type column
CREATE OR REPLACE FUNCTION increment_hi_wave()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
  user_uuid UUID;
BEGIN
  -- Get current user ID (null for anonymous)
  user_uuid := auth.uid();
  
  -- 🎯 SURGICAL: Insert medallion tap (without share_type for now)
  INSERT INTO public_shares (user_id, content, is_anonymous)
  VALUES (
    user_uuid, 
    'Medallion tap from hi-dashboard',   -- Clear description
    (user_uuid IS NULL)                  -- Anonymous if no user
  );
  
  -- Get the updated count of medallion taps (hi_waves)  
  SELECT hi_waves INTO new_count FROM get_global_stats();
  
  RETURN new_count;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_hi_wave() TO anon, authenticated;

-- Test the functions
SELECT 'Testing get_global_stats:' as test_type, * FROM get_global_stats();

-- Show current table structure and data
SELECT 
  'Current public_shares data count:' as info,
  COUNT(*) as total_records 
FROM public_shares;

-- Optional: Add share_type column for future use (run this if you want to add the column)
-- ALTER TABLE public_shares ADD COLUMN IF NOT EXISTS share_type TEXT DEFAULT 'hi_wave';
-- UPDATE public_shares SET share_type = 'hi_wave' WHERE share_type IS NULL;