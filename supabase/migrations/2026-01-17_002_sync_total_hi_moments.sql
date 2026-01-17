-- ===============================================
-- MIGRATION: 2026-01-17_002_sync_total_hi_moments
-- ===============================================
-- Description: Sync total_hi_moments in user_stats from actual public_shares counts
-- Author: GitHub Copilot
-- Date: 2026-01-17
-- 
-- ISSUE: Personal shares count showing "1" instead of actual count
-- ROOT CAUSE: user_stats.total_hi_moments not synced with public_shares
-- 
-- This migration:
-- 1. Updates ALL users' total_hi_moments to match public_shares count
-- 2. Ensures future accuracy via existing sync_moment_count trigger
--
-- RUN THIS IN SUPABASE SQL EDITOR

-- STEP 1: Sync total_hi_moments for ALL users
UPDATE user_stats us
SET total_hi_moments = (
  SELECT COUNT(*) FROM public_shares ps 
  WHERE ps.user_id = us.user_id
);

-- STEP 2: Verify specific user (Joe's account)
SELECT 
  us.user_id,
  us.total_hi_moments as synced_value,
  (SELECT COUNT(*) FROM public_shares ps WHERE ps.user_id = us.user_id) as actual_count,
  us.current_streak
FROM user_stats us
WHERE us.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- STEP 3: Verify a few other users
SELECT 
  us.user_id,
  us.total_hi_moments,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = us.user_id) as actual_shares
FROM user_stats us
ORDER BY us.total_hi_moments DESC
LIMIT 10;

-- Expected: total_hi_moments should now match actual_shares for all users
