-- =========================================================================
-- DIAGNOSTIC ONLY: Check actual database schema without making changes
-- Run this FIRST to understand your schema
-- =========================================================================

-- Step 1: Check public_shares table structure
SELECT 
  '1️⃣ PUBLIC_SHARES SCHEMA' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'public_shares' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check first 5 rows to see what data looks like
SELECT 
  '2️⃣ PUBLIC_SHARES SAMPLE' as section,
  id,
  user_id,
  text,
  content,
  origin,
  pill,
  created_at
FROM public_shares
LIMIT 5;

-- Step 3: Count shares by origin
SELECT 
  '3️⃣ SHARES BY ORIGIN' as section,
  origin,
  COUNT(*) as count
FROM public_shares
GROUP BY origin
ORDER BY count DESC;

-- Step 4: Check if create_public_share RPC exists
SELECT 
  '4️⃣ RPC FUNCTIONS' as section,
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('create_public_share', 'get_user_share_count')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 5: Check Hi Gym shares specifically
SELECT 
  '5️⃣ HI GYM SHARES' as section,
  COUNT(*) as total_higym_shares,
  COUNT(*) FILTER (WHERE origin = 'higym') as with_correct_origin,
  COUNT(*) FILTER (WHERE origin IS NULL OR origin = '' OR origin = 'unknown') as with_missing_origin
FROM public_shares
WHERE text ILIKE '%💪%' OR text ILIKE '%gymnasium%' OR text ILIKE '%workout%' OR pill ILIKE '%higym%'
  OR current_emoji IN ('💪', '🏋️', '⚡') OR desired_emoji IN ('💪', '🏋️', '⚡');

-- Step 6: List available tables
SELECT 
  '6️⃣ AVAILABLE TABLES' as section,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
