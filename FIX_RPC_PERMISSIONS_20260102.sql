-- FIX RPC PERMISSIONS - January 2, 2026
-- Function exists but PostgREST returns 404 = missing grants

-- Grant execute to both roles
GRANT EXECUTE ON FUNCTION public.get_user_share_count(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_share_count(text) TO authenticated;

-- Reload PostgREST schema cache so it picks up the grants
NOTIFY pgrst, 'reload schema';

-- Verify grants were applied
SELECT 
    p.proname AS function_name,
    pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END AS anon_can_execute,
    CASE 
        WHEN pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_share_count'
  AND n.nspname = 'public';
