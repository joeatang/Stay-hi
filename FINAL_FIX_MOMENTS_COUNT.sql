-- 🚀 FINAL FIX: Update count to 53 and verify nothing can reset it

-- 1. Check if bad function came back somehow
SELECT proname FROM pg_proc WHERE proname = 'update_user_stats';

-- 2. Re-sync to correct count (53)
UPDATE user_stats
SET 
  total_hi_moments = (
    SELECT COUNT(*) 
    FROM public_shares 
    WHERE user_id = user_stats.user_id
  ),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 3. Verify it worked
SELECT 
  total_hi_moments,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6') as actual_count
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 4. Check what's in the sync trigger (should use public_shares)
SELECT prosrc FROM pg_proc WHERE proname = 'sync_moment_count';
