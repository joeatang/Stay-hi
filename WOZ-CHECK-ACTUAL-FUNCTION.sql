-- ===============================================
-- 🔍 WOZ-STYLE ROOT CAUSE: What function is ACTUALLY deployed?
-- ===============================================

-- Get the ACTUAL function code running in production
SELECT 
  proname as function_name,
  prosrc as actual_code_deployed
FROM pg_proc 
WHERE proname = 'update_user_waves';

-- ===============================================
-- 🔍 WOZ QUESTION: What happened at 08:56:50?
-- ===============================================

-- Check what the trigger ACTUALLY does when it fires
SELECT 
  proname as trigger_function,
  prosrc as trigger_code
FROM pg_proc 
WHERE proname = 'sync_moment_count';

-- What would happen if we manually triggered it now?
-- This should set your hi_moments to 53 from public_shares count
SELECT 
  'BEFORE manual trigger' as test,
  total_hi_moments,
  total_waves
FROM user_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Manually fire the trigger logic
UPDATE user_stats
SET 
  total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

SELECT 
  'AFTER manual trigger' as test,
  total_hi_moments,
  total_waves
FROM user_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
