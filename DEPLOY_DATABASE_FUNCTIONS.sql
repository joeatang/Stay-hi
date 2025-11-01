-- 🚀 SURGICAL DATABASE DEPLOYMENT SCRIPT
-- Ensures all RPC functions exist in production database

-- 🎯 SURGICAL: Primary get_global_stats function (reads data)
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
  -- 🎯 SURGICAL MAPPING: Global Waves = Medallion Taps from public_shares
  SELECT COALESCE(COUNT(*), 0) INTO medallion_taps
  FROM public_shares 
  WHERE share_type = 'hi_wave' OR share_type IS NULL OR share_type = '';
  
  -- 🎯 SURGICAL MAPPING: Global Hi5 = Share Sheet Entries from public_shares  
  SELECT COALESCE(COUNT(*), 0) INTO share_sheet_entries
  FROM public_shares 
  WHERE share_type = 'share_sheet' OR share_type = 'hi5' OR share_type = 'share';
  
  -- If no share sheet entries exist yet, use medallion taps as fallback for total_his
  IF share_sheet_entries = 0 THEN
    share_sheet_entries := medallion_taps;
  END IF;
  
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
    medallion_taps as hi_waves,           -- Global Waves = medallion taps 1:1
    share_sheet_entries as total_his,     -- Global Hi5 = share sheet entries 1:1  
    active_24h as active_users_24h,
    total_users_count as total_users,
    NOW() as updated_at;
    
END $$;

-- 🎯 SURGICAL: Primary increment_hi_wave function (writes data)
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
  
  -- 🎯 SURGICAL: Insert medallion tap with explicit share_type = 'hi_wave'
  INSERT INTO public_shares (user_id, share_type, content, is_anonymous)
  VALUES (
    user_uuid, 
    'hi_wave',                           -- Explicit medallion tap type
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

-- Show current data
SELECT 
  'Current public_shares data:' as info,
  share_type, 
  COUNT(*) as count 
FROM public_shares 
GROUP BY share_type 
ORDER BY count DESC;