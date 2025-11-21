-- ========================================
-- 🔍 DIAGNOSTIC: Check what admin_roles schema actually exists in Supabase
-- ========================================

-- 1. Check if admin_roles table exists and show all columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_roles'
ORDER BY ordinal_position;

-- 2. Check if there are any rows in admin_roles
SELECT 
  count(*) as total_rows,
  count(DISTINCT user_id) as unique_users
FROM admin_roles;

-- 3. Check specific user (joeatang7@gmail.com)
SELECT 
  ar.*,
  au.email
FROM admin_roles ar
LEFT JOIN auth.users au ON ar.user_id = au.id
WHERE au.email = 'joeatang7@gmail.com';

-- 4. List all users in auth.users for reference
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
