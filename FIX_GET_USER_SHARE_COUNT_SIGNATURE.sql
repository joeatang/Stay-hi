-- ===============================================
-- 🎯 FIX: Update get_user_share_count signature
-- ===============================================
-- ISSUE: Current RPC expects (p_user_id uuid, p_since timestamp)
--        Frontend calls with ({ period: 'month' })
--        This causes: "invalid input syntax for type uuid: 'month'"
--
-- SOLUTION: Replace with correct signature that takes period TEXT
-- ===============================================

-- Drop old version
DROP FUNCTION IF EXISTS get_user_share_count(uuid, timestamp with time zone);

-- Create correct version (matches frontend expectations)
CREATE OR REPLACE FUNCTION get_user_share_count(period TEXT DEFAULT 'month')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_start_date TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated',
      'count', 0
    );
  END IF;
  
  -- Calculate start date based on period
  IF period = 'day' THEN
    v_start_date := date_trunc('day', NOW());
  ELSIF period = 'week' THEN
    v_start_date := date_trunc('week', NOW());
  ELSIF period = 'month' THEN
    v_start_date := date_trunc('month', NOW());
  ELSIF period = 'year' THEN
    v_start_date := date_trunc('year', NOW());
  ELSE
    -- Default to month if unknown period
    v_start_date := date_trunc('month', NOW());
  END IF;
  
  -- Count shares since start date
  SELECT COUNT(*) INTO v_count
  FROM public_shares
  WHERE user_id = v_user_id 
    AND created_at >= v_start_date;
  
  RETURN json_build_object(
    'success', true,
    'count', v_count,
    'period', period,
    'start_date', v_start_date
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_share_count TO authenticated, anon;

-- Test it
SELECT get_user_share_count('month');

-- ===============================================
-- VERIFICATION
-- ===============================================
-- Check signature is correct
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_share_count'
  AND n.nspname = 'public';

-- Should show: period text DEFAULT 'month'::text
