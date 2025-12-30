-- 🔥 REMOVE: Functions that query wrong tables or overwrite stats incorrectly

-- 1. Drop the BAD update_user_stats that queries hi_moments (old table)
DROP FUNCTION IF EXISTS update_user_stats(UUID);

-- 2. Check if hi_moments table even exists (it shouldn't)
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'hi_moments' THEN '⚠️ OLD TABLE EXISTS (should be dropped)'
    WHEN table_name = 'public_shares' THEN '✅ CORRECT TABLE'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('hi_moments', 'public_shares');

-- 3. Verify sync_moment_count is still working correctly
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_moments_on_share';

-- 4. Re-sync your stats NOW using the correct table (public_shares)
UPDATE user_stats
SET 
  total_hi_moments = (
    SELECT COUNT(*) 
    FROM public_shares 
    WHERE user_id = user_stats.user_id
  ),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 5. Verify the fix
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 6. Count actual shares to confirm
SELECT COUNT(*) as actual_share_count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ============================================================================
-- RESULT: This will:
-- ✅ Remove the function querying the wrong table
-- ✅ Keep sync_moment_count (which uses correct table)
-- ✅ Re-sync your count to 53 (or whatever the correct value is)
-- ✅ Prevent future overwrites
-- ============================================================================
