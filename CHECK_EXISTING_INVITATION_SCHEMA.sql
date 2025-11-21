-- Check what invitation system components already exist

SELECT 'TABLES' as component_type, table_name as name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invitation_codes', 'user_memberships', 'membership_transactions')

UNION ALL

SELECT 'FUNCTIONS' as component_type, routine_name as name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('admin_generate_invite_code', 'admin_list_invite_codes', 'get_admin_dashboard_stats')

UNION ALL

SELECT 'POLICIES' as component_type, policyname as name
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('invitation_codes', 'user_memberships', 'membership_transactions')

ORDER BY component_type, name;
