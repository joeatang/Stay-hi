-- ===============================================
-- 🔧 FIX TOTAL USERS COUNT - WOZ SOLUTION
-- ===============================================
-- Problem: global_stats.total_users is out of sync
-- Solution: Update it from profiles table and keep it in sync

-- 1. DIAGNOSTIC: Show current state
SELECT 
  'global_stats.total_users' as source,
  total_users as count
FROM global_stats
UNION ALL
SELECT 
  'COUNT(*) FROM profiles',
  COUNT(*)
FROM profiles
UNION ALL
SELECT 
  'COUNT(DISTINCT user_id) FROM public_shares',
  COUNT(DISTINCT user_id)
FROM public_shares
WHERE user_id IS NOT NULL;

-- 2. FIX: Update global_stats with REAL user count from profiles
UPDATE global_stats
SET 
  total_users = (SELECT COUNT(*) FROM profiles),
  updated_at = NOW();

-- 3. VERIFY: Check the fix
SELECT 'AFTER FIX' as status, total_users FROM global_stats;

-- 4. CREATE TRIGGER: Keep total_users in sync with profiles
CREATE OR REPLACE FUNCTION sync_total_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE global_stats
  SET 
    total_users = (SELECT COUNT(*) FROM profiles),
    updated_at = NOW()
  WHERE id = 1; -- Or use LIMIT 1 if id varies
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_sync_total_users ON profiles;

-- Create trigger on profiles table
CREATE TRIGGER trigger_sync_total_users
  AFTER INSERT OR DELETE ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION sync_total_users();

-- 5. ALSO fix the get_user_stats RPC to read from global_stats instead of counting public_shares
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  gs RECORD;
BEGIN
  -- Get global stats from global_stats table (SINGLE SOURCE OF TRUTH)
  SELECT * INTO gs FROM global_stats LIMIT 1;
  
  RETURN jsonb_build_object(
    'personalStats', jsonb_build_object(
      'totalWaves', 0,
      'totalShares', 0,
      'weeklyShares', 0,
      'currentStreak', 0,
      'hiPoints', 0,
      'totalMilestones', 0,
      'lastWaveAt', NULL,
      'lastShareAt', NULL
    ),
    'globalStats', jsonb_build_object(
      'hiWaves', COALESCE(gs.hi_waves, 0),
      'totalHis', COALESCE(gs.total_his, 0),
      'activeUsers24h', COALESCE(gs.active_users_24h, 0),
      'totalUsers', COALESCE(gs.total_users, 0)  -- FROM TABLE, NOT COMPUTED
    ),
    -- Also include flat keys for compatibility
    'waves', COALESCE(gs.hi_waves, 0),
    'total_his', COALESCE(gs.total_his, 0),
    'users', COALESCE(gs.total_users, 0)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon;

-- 6. FINAL VERIFICATION
SELECT '✅ FIX COMPLETE' as status;
SELECT * FROM global_stats;
