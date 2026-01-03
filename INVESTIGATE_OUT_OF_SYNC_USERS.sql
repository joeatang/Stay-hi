-- INVESTIGATE_OUT_OF_SYNC_USERS.sql
-- Deep dive into the 2 users showing ❌ OUT OF SYNC

-- User 1: c4dfba41-ffa8-418e-a340-4e8767afbe29 (streak=1, last_hi_date=2025-12-17, no check-ins/shares found)
-- User 2: 725454f7-4068-4627-b8b8-7f16d7eaeef4 (streak=1, last_hi_date=2026-01-03, no check-ins/shares found)

-- HYPOTHESIS: These users may have activity in other tables we're not checking

-- Check 1: Look for ANY activity in hi_archives (all types of submissions)
SELECT 
  'hi_archives' as source,
  user_id,
  COUNT(*) as activity_count,
  MAX(created_at) as most_recent_activity,
  DATE(MAX(created_at)) as most_recent_date
FROM hi_archives
WHERE user_id IN (
  'c4dfba41-ffa8-418e-a340-4e8767afbe29',
  '725454f7-4068-4627-b8b8-7f16d7eaeef4'
)
GROUP BY user_id;

-- Check 2: Look in public_shares with more detail
SELECT 
  'public_shares' as source,
  user_id,
  COUNT(*) as share_count,
  MAX(created_at) as most_recent_share,
  DATE(MAX(created_at)) as most_recent_date,
  array_agg(DISTINCT activity_type) as activity_types
FROM public_shares
WHERE user_id IN (
  'c4dfba41-ffa8-418e-a340-4e8767afbe29',
  '725454f7-4068-4627-b8b8-7f16d7eaeef4'
)
GROUP BY user_id;

-- Check 3: Look in hi_points_daily_checkins with more detail
SELECT 
  'hi_points_daily_checkins' as source,
  user_id,
  COUNT(*) as checkin_count,
  MAX(day) as most_recent_checkin,
  array_agg(day ORDER BY day DESC) as recent_days
FROM hi_points_daily_checkins
WHERE user_id IN (
  'c4dfba41-ffa8-418e-a340-4e8767afbe29',
  '725454f7-4068-4627-b8b8-7f16d7eaeef4'
)
GROUP BY user_id;

-- Check 4: Look at their full user_stats record
SELECT 
  user_id,
  current_streak,
  longest_streak,
  last_hi_date,
  total_his,
  moment_count,
  created_at,
  updated_at
FROM user_stats
WHERE user_id IN (
  'c4dfba41-ffa8-418e-a340-4e8767afbe29',
  '725454f7-4068-4627-b8b8-7f16d7eaeef4'
);

-- Check 5: See if they have profile data (might reveal account creation date)
SELECT 
  id as user_id,
  email,
  created_at as account_created,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE id IN (
  'c4dfba41-ffa8-418e-a340-4e8767afbe29',
  '725454f7-4068-4627-b8b8-7f16d7eaeef4'
);

-- 🎯 EXPECTED FINDINGS:
-- If hi_archives has data: These users submitted content that wasn't tracked as public shares
-- If no data anywhere: Manually created streaks or data migration artifacts
-- If created_at is old: Historical data from before current tracking system

-- 🔧 REMEDIATION OPTIONS:
-- Option 1: If hi_archives has activity → Update last_hi_date to match
-- Option 2: If no activity → Reset streak to 0 (data integrity)
-- Option 3: If historical → Document as legacy data, leave unchanged
