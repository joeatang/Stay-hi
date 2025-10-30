-- ===============================================
-- 🛡️ TESLA-GRADE SECURITY AUDIT & FORTRESS 
-- ===============================================
-- Comprehensive security assessment for Stay Hi production deployment

-- ===============================================
-- 1. ROW LEVEL SECURITY (RLS) AUDIT
-- ===============================================

-- Check existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Audit potentially exposed tables without RLS
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT IN (
  SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
)
AND table_type = 'BASE TABLE';

-- ===============================================
-- 2. FUNCTION SECURITY AUDIT  
-- ===============================================

-- Check all RPC functions and their security definer status
SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  array_to_string(p.proacl, ', ') as permissions,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
ORDER BY p.proname;

-- ===============================================
-- 3. SQL INJECTION PREVENTION AUDIT
-- ===============================================

-- Check for dynamic SQL in functions (potential injection points)
SELECT 
  p.proname,
  p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc ~* '(execute|format|quote_ident|quote_literal)'
ORDER BY p.proname;

-- ===============================================
-- 4. AUTHENTICATION & AUTHORIZATION AUDIT
-- ===============================================

-- Check auth schema access
SELECT table_name, privilege_type, grantee 
FROM information_schema.table_privileges 
WHERE table_schema = 'auth'
ORDER BY table_name, grantee;

-- Check for overly permissive grants
SELECT 
  schemaname,
  tablename,
  grantor,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee IN ('anon', 'authenticated', 'public')
AND table_schema = 'public'
ORDER BY tablename, privilege_type;

-- ===============================================
-- 5. DATA EXPOSURE AUDIT
-- ===============================================

-- Check for tables that might expose PII without proper protection
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
  column_name ~* '(email|phone|address|ssn|credit|password|token|secret|key|private)'
  OR data_type IN ('text', 'varchar', 'character varying')
)
ORDER BY table_name, column_name;

-- ===============================================
-- 6. RATE LIMITING & DOS PROTECTION CHECKS
-- ===============================================

-- Check for functions that need rate limiting (increment, insert, update functions)
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.proname ~* '(increment|insert|create|update|delete)' THEN 'HIGH_RISK'
    WHEN p.proname ~* '(get|select|read|fetch)' THEN 'MEDIUM_RISK'
    ELSE 'LOW_RISK'
  END as dos_risk_level
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
ORDER BY dos_risk_level DESC, p.proname;

-- ===============================================
-- 7. STORAGE BUCKET SECURITY AUDIT
-- ===============================================

-- Check storage bucket policies (requires storage schema access)
SELECT 
  id,
  name,
  public
FROM storage.buckets;

-- ===============================================
-- 8. SECURITY RECOMMENDATIONS
-- ===============================================

-- Generate security hardening recommendations
SELECT 
  'RECOMMENDATION' as type,
  'Implement rate limiting for increment functions' as recommendation,
  'HIGH' as priority
UNION ALL
SELECT 
  'RECOMMENDATION',
  'Add input validation to all user-facing RPC functions',
  'HIGH'
UNION ALL
SELECT 
  'RECOMMENDATION', 
  'Implement request logging for security monitoring',
  'MEDIUM'
UNION ALL
SELECT 
  'RECOMMENDATION',
  'Add CAPTCHA protection for anonymous operations',
  'MEDIUM'
UNION ALL
SELECT 
  'RECOMMENDATION',
  'Implement session timeout and rotation',
  'HIGH'
ORDER BY priority DESC, recommendation;