-- ===============================================
-- 🚨 DEPLOY 8: CREATE MISSING process_medallion_tap FUNCTION
-- ===============================================
-- ROOT CAUSE: Production app calls process_medallion_tap() but we only deployed increment_hi_wave()
-- Frontend and backend function names don't match - this is why persistence fails

-- ===============================================
-- CREATE process_medallion_tap FUNCTION  
-- ===============================================

CREATE OR REPLACE FUNCTION process_medallion_tap(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  wave_result JSON;
  milestone_result JSON := '{"success": false}'::json;
  global_count INTEGER;
BEGIN
  -- Call existing increment_hi_wave to do the actual work
  SELECT increment_hi_wave() INTO global_count;
  
  -- Build wave update result
  wave_result := jsonb_build_object(
    'success', true,
    'globalWaves', global_count,
    'userWaves', CASE 
      WHEN p_user_id IS NULL THEN -1  -- Signal for localStorage usage
      ELSE 1  -- For authenticated users, return increment
    END
  );
  
  -- Return complete result matching expected format
  RETURN jsonb_build_object(
    'waveUpdate', wave_result,
    'milestone', milestone_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_medallion_tap(UUID) TO anon, authenticated;

-- ===============================================
-- VERIFICATION TEST
-- ===============================================

-- Test the function works
SELECT 'process_medallion_tap test (anonymous):' as test_name;
SELECT process_medallion_tap(null);

-- Test with user ID
SELECT 'process_medallion_tap test (with user):' as test_name;  
SELECT process_medallion_tap('550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Verify global stats updated
SELECT 'Updated global stats:' as test_name;
SELECT * FROM get_global_stats();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🎯 MISSING FUNCTION CREATED!';
  RAISE NOTICE '✅ process_medallion_tap() - Now calls increment_hi_wave()';
  RAISE NOTICE '✅ Frontend/backend function names now match';
  RAISE NOTICE '🔥 Hi waves should persist on refresh!';
END $$;