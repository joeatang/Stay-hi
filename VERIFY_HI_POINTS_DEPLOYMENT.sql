-- ===================================================================
-- HI POINTS DEPLOYMENT VERIFICATION
-- Run this in Supabase SQL Editor to verify everything deployed correctly
-- ===================================================================

-- TEST 1: Check if all tables exist
SELECT 
  '✅ TABLE CHECK' as test,
  table_name,
  CASE 
    WHEN table_name IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins')
ORDER BY table_name;

-- TEST 2: Check table columns
SELECT 
  '✅ COLUMN CHECK' as test,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins')
ORDER BY table_name, ordinal_position;

-- TEST 3: Check RLS is enabled
SELECT 
  '✅ RLS CHECK' as test,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins');

-- TEST 4: Check RLS policies exist
SELECT 
  '✅ POLICY CHECK' as test,
  tablename,
  policyname,
  cmd as policy_type,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins')
ORDER BY tablename, policyname;

-- TEST 5: Check functions exist
SELECT 
  '✅ FUNCTION CHECK' as test,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('hi_award_points', 'award_daily_checkin')
ORDER BY routine_name;

-- TEST 6: Check indexes exist
SELECT 
  '✅ INDEX CHECK' as test,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins')
ORDER BY tablename, indexname;

-- TEST 7: Check foreign key constraints
SELECT 
  '✅ FOREIGN KEY CHECK' as test,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('hi_points', 'hi_points_ledger', 'hi_points_daily_checkins')
ORDER BY tc.table_name;

-- TEST 8: Verify function signature (can't test execution in SQL Editor)
SELECT 
  '✅ FUNCTION SIGNATURE CHECK' as test,
  routine_name,
  string_agg(parameter_name || ' ' || p.data_type, ', ') as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
  AND r.routine_name IN ('hi_award_points', 'award_daily_checkin')
GROUP BY routine_name
ORDER BY routine_name;

-- TEST 9: Check if any users have points yet
SELECT 
  '✅ USAGE CHECK' as test,
  COUNT(*) as total_users_with_points,
  SUM(balance) as total_points_awarded
FROM public.hi_points;

-- TEST 10: Check recent point transactions (any user)
SELECT 
  '✅ RECENT ACTIVITY CHECK' as test,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN delta > 0 THEN 1 ELSE 0 END) as points_awarded,
  SUM(CASE WHEN delta < 0 THEN 1 ELSE 0 END) as points_spent
FROM public.hi_points_ledger;

-- ===================================================================
-- EXPECTED RESULTS SUMMARY:
-- ===================================================================
-- ✅ 3 tables should exist
-- ✅ hi_points: 3 columns (user_id, balance, updated_at)
-- ✅ hi_points_ledger: 6 columns (id, user_id, delta, reason, context, ts)
-- ✅ hi_points_daily_checkins: 3 columns (user_id, day, ts)
-- ✅ All 3 tables have RLS enabled (rowsecurity = true)
-- ✅ 6 policies total (2 per table)
-- ✅ 2 functions exist (hi_award_points, award_daily_checkin)
-- ✅ 1 index on hi_points_ledger
-- ✅ Foreign keys reference auth.users(id)
-- ✅ award_daily_checkin() returns { awarded: true, delta: 5, balance: 5 }
-- ===================================================================
