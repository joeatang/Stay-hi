-- ===============================================
-- 🔍 TRIPLE CHECK: What's the ACTUAL data?
-- ===============================================

-- 1. How many public_shares do you ACTUALLY have?
SELECT 
  'public_shares count' as check_type,
  COUNT(*) as actual_count,
  'This is SOURCE OF TRUTH' as note
FROM public_shares 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 2. What does user_stats say?
SELECT 
  'user_stats value' as check_type,
  total_hi_moments as what_profile_shows,
  updated_at as last_modified,
  'This is what profile reads' as note
FROM user_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 3. Is the trigger actually installed?
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    ELSE '⚠️ UNKNOWN'
  END as status,
  proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'public_shares' 
  AND proname LIKE '%sync%moment%';

-- 4. Check if last_wave_at column even EXISTS
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_stats'
  AND column_name IN ('total_hi_moments', 'total_waves', 'last_wave_at', 'updated_at')
ORDER BY column_name;

-- 5. Sample your recent public_shares to verify they're real
SELECT 
  id,
  created_at,
  content,
  'Recent shares (source of truth)' as note
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 5;
