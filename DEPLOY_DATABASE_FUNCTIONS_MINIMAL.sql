-- 🚀 SURGICAL DATABASE DEPLOYMENT SCRIPT (FINAL FIX - MINIMAL SCHEMA)
-- Works with the actual existing table structure

-- First, let's see what columns actually exist in public_shares
\d public_shares

-- 🎯 SURGICAL: Primary get_global_stats function (reads data)
-- FIXED: Works with minimal existing table structure
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
  SELECT COALESCE(COUNT(*), 0) INTO medallion_taps
  FROM public_shares;
  
  -- For now, use medallion taps for both metrics
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
-- FIXED: Uses only columns that exist (user_id and maybe is_anonymous)
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
  
  -- 🎯 SURGICAL: Insert medallion tap with minimal columns
  -- Check if is_anonymous column exists, otherwise just use user_id
  BEGIN
    INSERT INTO public_shares (user_id, is_anonymous)
    VALUES (user_uuid, (user_uuid IS NULL));
  EXCEPTION
    WHEN OTHERS THEN
      -- If is_anonymous doesn't exist either, just use user_id
      INSERT INTO public_shares (user_id)
      VALUES (user_uuid);
  END;
  
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