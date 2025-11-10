-- ===============================================
-- 🚨 CRITICAL FIX: Missing increment_total_hi() Function
-- ===============================================
-- ROOT CAUSE: Total His counter stuck at 86 because increment_total_hi() doesn't exist
-- This function is required for ALL share submissions to increment the global counter

-- ===============================================
-- DEPLOY increment_total_hi() FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS BIGINT  
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Insert new entry to public_shares table (this is what get_global_stats() counts)
  -- This ensures synchronization between reading and writing operations
  INSERT INTO public_shares (user_id, content, created_at)
  VALUES (
    NULL,  -- Anonymous share for global counter
    'Global Hi counter increment',
    NOW()
  );
  
  -- Get updated count from the same source get_global_stats() uses
  SELECT COUNT(*) INTO new_count FROM public_shares;
  
  RETURN new_count;
END;
$$;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon, authenticated;

-- ===============================================
-- TEST THE FUNCTION
-- ===============================================

-- Test increment function
SELECT 'Testing increment_total_hi() function:' as test_name;
SELECT increment_total_hi() as new_total_his_count;

-- Verify the result matches get_global_stats()
SELECT 'Verification - get_global_stats() after increment:' as verification;
SELECT * FROM get_global_stats();