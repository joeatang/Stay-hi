-- ============================================================================
-- DATA INTEGRITY CHECK — Triple Verification
-- ============================================================================
-- Run this in Supabase SQL Editor to verify all user data is intact
-- ============================================================================

SELECT jsonb_build_object(
  'global_stats', (SELECT row_to_json(g) FROM global_stats g LIMIT 1),
  
  'user_stats_summary', (
    SELECT jsonb_build_object(
      'users_with_streaks', COUNT(*),
      'total_streaks_sum', SUM(current_streak),
      'avg_streak', ROUND(AVG(current_streak)::NUMERIC, 1)
    )
    FROM user_stats WHERE current_streak > 0
  ),
  
  'hi_index_snapshots', (
    SELECT jsonb_build_object(
      'total_snapshots', COUNT(*),
      'unique_users', COUNT(DISTINCT scope),
      'most_recent', MAX(snapshot_date),
      'oldest', MIN(snapshot_date)
    )
    FROM hi_index_snapshots
  ),
  
  'your_data', (
    SELECT jsonb_build_object(
      'current_streak', us.current_streak,
      'longest_streak', us.longest_streak,
      'last_hi_date', us.last_hi_date,
      'tier', um.tier,
      'status', um.status
    )
    FROM user_stats us
    LEFT JOIN user_memberships um ON um.user_id = us.user_id
    WHERE us.user_id = auth.uid()
  ),
  
  'recent_shares_7d', (
    SELECT jsonb_build_object(
      'total_shares', COUNT(*),
      'unique_sharers', COUNT(DISTINCT user_id)
    )
    FROM public_shares
    WHERE created_at >= NOW() - INTERVAL '7 days'
  )
) as "✅ DATA INTEGRITY REPORT";
