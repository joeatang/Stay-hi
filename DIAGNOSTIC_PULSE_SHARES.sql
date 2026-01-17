-- ===============================================
-- DIAGNOSTIC: Why Pulse Shares Not Showing
-- ===============================================
-- Run this in Supabase SQL Editor to diagnose
-- the issue with pulse shares not appearing on Hi Island

-- STEP 1: Check if ANY shares exist with origin containing 'pulse'
SELECT 
  '📊 PULSE SHARES COUNT' as check_name,
  COUNT(*) as total_pulse_shares
FROM public_shares 
WHERE origin ILIKE '%pulse%' OR type ILIKE '%pulse%';

-- STEP 2: Check recent shares from Joe's account
SELECT 
  '📋 JOE''S RECENT SHARES' as check_name,
  id,
  origin,
  type,
  pill,
  visibility,
  LEFT(text, 50) as text_preview,
  created_at
FROM public_shares 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY created_at DESC
LIMIT 10;

-- STEP 3: Check what origins exist in the database
SELECT 
  '🏷️ ALL UNIQUE ORIGINS' as check_name,
  origin,
  COUNT(*) as share_count
FROM public_shares 
GROUP BY origin 
ORDER BY share_count DESC
LIMIT 20;

-- STEP 4: Check if create_public_share RPC exists and has p_origin
SELECT 
  '⚙️ RPC PARAMETERS' as check_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_public_share'
  AND n.nspname = 'public';

-- STEP 5: Check user_stats for Joe's total_hi_moments
SELECT 
  '📈 JOE''S USER_STATS' as check_name,
  user_id,
  total_hi_moments,
  total_waves,
  current_streak,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = us.user_id) as actual_share_count
FROM user_stats us
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- STEP 6: FIX total_hi_moments (run only if check 5 shows mismatch)
-- UPDATE user_stats
-- SET total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = user_stats.user_id)
-- WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- STEP 7: FIX ALL users' total_hi_moments (run if needed)
-- UPDATE user_stats us
-- SET total_hi_moments = (SELECT COUNT(*) FROM public_shares ps WHERE ps.user_id = us.user_id);
