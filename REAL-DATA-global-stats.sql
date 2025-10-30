-- ===============================================
-- 🌍 REAL DATA GLOBAL STATS - TESLA GRADE
-- ===============================================
-- Uses your EXISTING tables instead of creating duplicates

-- Create the RPC function that reads from your real tables
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
  total_archives BIGINT;
  total_shares BIGINT;
  active_24h INTEGER;
  total_users_count BIGINT;
BEGIN
  -- Count total Hi moments from hi_archives table
  SELECT COUNT(*) INTO total_archives FROM hi_archives;
  
  -- Count total public shares from public_shares table  
  SELECT COUNT(*) INTO total_shares FROM public_shares;
  
  -- Count active users in last 24 hours from auth.sessions
  SELECT COUNT(DISTINCT user_id) INTO active_24h 
  FROM auth.sessions 
  WHERE updated_at > NOW() - INTERVAL '24 hours';
  
  -- Count total registered users
  SELECT COUNT(*) INTO total_users_count FROM auth.users;
  
  -- Return real calculated stats
  RETURN QUERY
  SELECT 
    COALESCE(total_shares, 0)::BIGINT as hi_waves,        -- Public shares = waves
    COALESCE(total_archives, 0)::BIGINT as total_his,     -- All Hi moments 
    COALESCE(active_24h, 0)::INTEGER as active_users_24h, -- Recent active users
    COALESCE(total_users_count, 0)::BIGINT as total_users, -- All registered users
    NOW() as updated_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;

-- Optional: Create increment functions that update real tables
CREATE OR REPLACE FUNCTION increment_hi_wave()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- This would be called when a public share is created
  -- But your app already handles this via insertPublicShare()
  -- So this just returns current count
  SELECT COUNT(*) INTO new_count FROM public_shares;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS BIGINT  
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- This would be called when a Hi moment is created
  -- But your app already handles this via insertArchive()
  -- So this just returns current count
  SELECT COUNT(*) INTO new_count FROM hi_archives;
  RETURN new_count;
END;
$$;

-- Grant permissions for increment functions
GRANT EXECUTE ON FUNCTION increment_hi_wave() TO anon, authenticated;  
GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon, authenticated;

-- Comments
COMMENT ON FUNCTION get_global_stats() IS 'Returns REAL statistics from existing hi_archives, public_shares, and auth tables';
COMMENT ON FUNCTION increment_hi_wave() IS 'Returns current count from public_shares table';
COMMENT ON FUNCTION increment_total_hi() IS 'Returns current count from hi_archives table';