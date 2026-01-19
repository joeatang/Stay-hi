-- ============================================================================
-- 📊 BACKFILL HISTORICAL DATA - Analytics v2.0
-- ============================================================================
-- Migration: 008
-- Date: 2026-01-18
-- Purpose: Populate user_daily_snapshots with historical activity data
-- Source Tables: hi_points_daily_checkins, public_shares, hi_archives, hi_points_daily_activity
-- Safety: INSERT ... ON CONFLICT DO NOTHING (won't overwrite existing data)
-- ============================================================================

-- ============================================================================
-- BACKFILL FROM MULTIPLE SOURCES (ALL USERS)
-- ============================================================================

-- Explanation: Merge historical data from 4 tables into daily snapshots
-- This gives users their full Analytics v2.0 journey, not just data from today forward

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
  -- Check-ins (base timeline)
  (SELECT user_id, day FROM hi_points_daily_checkins) c
FULL OUTER JOIN
  -- Public shares (group by date)
  (SELECT 
     user_id, 
     DATE(created_at) as share_date,
     COUNT(*) as daily_shares
   FROM public_shares 
   GROUP BY user_id, DATE(created_at)
  ) s ON c.user_id = s.user_id AND c.day = s.share_date
FULL OUTER JOIN
  -- Hi archives (private journal entries)
  (SELECT 
     user_id,
     DATE(created_at) as archive_date,
     COUNT(*) as daily_archives
   FROM hi_archives
   GROUP BY user_id, DATE(created_at)
  ) a ON COALESCE(c.user_id, s.user_id) = a.user_id 
     AND COALESCE(c.day, s.share_date) = a.archive_date
FULL OUTER JOIN
  -- Points activity (medallion taps, reactions)
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

-- ============================================================================
-- VERIFICATION QUERY (Check backfill results)
-- ============================================================================

-- Count how many historical records were created
DO $$
DECLARE
  v_total_records INT;
  v_total_users INT;
  v_earliest_date DATE;
  v_latest_date DATE;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(DISTINCT user_id),
    MIN(snapshot_date),
    MAX(snapshot_date)
  INTO v_total_records, v_total_users, v_earliest_date, v_latest_date
  FROM user_daily_snapshots;
  
  RAISE NOTICE '✅ Migration 008: Historical data backfilled';
  RAISE NOTICE '   - Total snapshots: %', v_total_records;
  RAISE NOTICE '   - Users with data: %', v_total_users;
  RAISE NOTICE '   - Date range: % to %', v_earliest_date, v_latest_date;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Hard refresh Hi Pulse page (Cmd+Shift+R)';
  RAISE NOTICE '   2. Click "Your Journey" tab';
  RAISE NOTICE '   3. Should see historical activity (check-ins + shares)';
  RAISE NOTICE '   4. Add Hi Scale ratings going forward for emotional tracking';
END $$;
