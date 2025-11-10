-- Test what get_user_stats actually returns right now
SELECT 'Testing get_user_stats(null) - what does it actually return?';
SELECT get_user_stats(null);

-- Test what get_global_stats returns
SELECT 'Testing get_global_stats() - what columns does it return?';
SELECT * FROM get_global_stats();

-- Check if get_user_stats function even exists
SELECT 'Does get_user_stats function exist?';
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_stats';

-- Check what happens when we call a function that doesn't exist
SELECT 'Test: Does calling get_user_stats cause an error?';
DO $$
BEGIN
  PERFORM get_user_stats(null);
  RAISE NOTICE 'get_user_stats(null) executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'get_user_stats(null) failed with error: %', SQLERRM;
END $$;