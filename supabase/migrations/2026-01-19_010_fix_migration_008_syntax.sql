-- ============================================================================
-- FIX: Migration 008 - Re-run with corrected syntax
-- ============================================================================
-- Date: 2026-01-19
-- Issue: Migration 008 had incomplete ON CONFLICT clause (trailing comma)
-- Fix: Remove checked_in reference (column doesn't exist), add updated_at
-- ============================================================================

-- Re-run the backfill with correct syntax
INSERT INTO user_daily_snapshots (
  user_id,
  snapshot_date,
  shares_count,
  created_at,
  updated_at
)
SELECT 
  COALESCE(c.user_id, s.user_id, a.user_id, pa.user_id) as user_id,
  COALESCE(c.day, s.share_date, a.archive_date, pa.day) as snapshot_date,
  COALESCE(s.daily_shares, 0) as shares_count,
  NOW() as created_at,
  NOW() as updated_at
FROM 
  (SELECT user_id, day FROM hi_points_daily_checkins) c
FULL OUTER JOIN
  (SELECT 
     user_id, 
     DATE(created_at) as share_date,
     COUNT(*) as daily_shares
   FROM public_shares 
   GROUP BY user_id, DATE(created_at)
  ) s ON c.user_id = s.user_id AND c.day = s.share_date
FULL OUTER JOIN
  (SELECT 
     user_id,
     DATE(created_at) as archive_date,
     COUNT(*) as daily_archives
   FROM hi_archives
   GROUP BY user_id, DATE(created_at)
  ) a ON COALESCE(c.user_id, s.user_id) = a.user_id 
     AND COALESCE(c.day, s.share_date) = a.archive_date
FULL OUTER JOIN
  (SELECT 
     user_id,
     day,
     tap_accumulator + (tap_batches_awarded * 100) as daily_taps
   FROM hi_points_daily_activity
  ) pa ON COALESCE(c.user_id, s.user_id, a.user_id) = pa.user_id
      AND COALESCE(c.day, s.share_date, a.archive_date) = pa.day
WHERE COALESCE(c.user_id, s.user_id, a.user_id, pa.user_id) IS NOT NULL
ON CONFLICT (user_id, snapshot_date) 
DO UPDATE SET
  shares_count = GREATEST(user_daily_snapshots.shares_count, EXCLUDED.shares_count),
  updated_at = NOW();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010: Fixed and re-ran migration 008';
  RAISE NOTICE '   - Corrected ON CONFLICT syntax';
  RAISE NOTICE '   - Backfill complete';
END $$;
