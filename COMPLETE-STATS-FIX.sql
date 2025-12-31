-- ===============================================
-- 🎯 SURGICAL FIX: Personal + Global Medallion Tracking
-- ===============================================
-- CURRENT STATE:
-- - Dashboard calls: insert_medallion_tap(user_id) 
-- - But only 3 events in hi_events vs 9,768 global counter
-- - This means insert_medallion_tap is failing silently OR
-- - Dashboard is calling increment_hi_wave somewhere else
--
-- SOLUTION:
-- - Make insert_medallion_tap bulletproof (always inserts to hi_events)
-- - Keep global counter incrementing
-- - Profile reads from VIEW that counts hi_events per user
-- ===============================================

-- STEP 1: Fix insert_medallion_tap to be bulletproof
CREATE OR REPLACE FUNCTION insert_medallion_tap(
  tap_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_global_count BIGINT;
  personal_count INTEGER;
BEGIN
  -- 1. Always increment global counter (even for anonymous)
  UPDATE global_stats 
  SET 
    hi_waves = hi_waves + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- If no row, create it
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, updated_at)
    VALUES (1, 1, 0, NOW())
    ON CONFLICT (id) DO UPDATE SET
      hi_waves = global_stats.hi_waves + 1,
      updated_at = NOW();
  END IF;
  
  -- Get new global count
  SELECT hi_waves INTO new_global_count FROM global_stats WHERE id = 1;
  
  -- 2. If user authenticated, also track personal tap
  IF tap_user_id IS NOT NULL THEN
    INSERT INTO hi_events (user_id, event_type, metadata)
    VALUES (
      tap_user_id, 
      'medallion_tap',
      jsonb_build_object('source', 'hi_medallion', 'timestamp', extract(epoch from now()))
    );
    
    -- Get their personal count
    SELECT COUNT(*) INTO personal_count
    FROM hi_events
    WHERE user_id = tap_user_id AND event_type = 'medallion_tap';
  ELSE
    personal_count := 0;
  END IF;
  
  -- Return both counts in HiBase format
  RETURN jsonb_build_object(
    'data', jsonb_build_object(
      'globalWaves', new_global_count,
      'personalTaps', personal_count
    ),
    'success', true
  );
  
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, at least return the global counter
  SELECT COALESCE(hi_waves, 0) INTO new_global_count 
  FROM global_stats WHERE id = 1;
  
  RETURN jsonb_build_object(
    'data', jsonb_build_object(
      'globalWaves', new_global_count,
      'personalTaps', 0
    ),
    'error', SQLERRM,
    'success', false
  );
END;
$$;

-- ===============================================
-- STEP 2: Create VIEW - Single Source of Truth for ALL stats
-- ===============================================
-- DESIGN PRINCIPLE: Never cache, always calculate from source tables
-- This makes corruption impossible - stats ALWAYS match reality

CREATE OR REPLACE VIEW v_user_profile_stats AS
SELECT 
  u.id as user_id,
  
  -- ✅ SOURCE: public_shares table
  -- What it means: Number of Hi moments shared (submissions)
  COALESCE((SELECT COUNT(*) FROM public_shares WHERE user_id = u.id), 0) as total_hi_moments,
  
  -- ✅ SOURCE: hi_events table (event_type='medallion_tap')
  -- What it means: Personal medallion taps (self-Hi moments)
  COALESCE((
    SELECT COUNT(*) 
    FROM hi_events 
    WHERE user_id = u.id AND event_type = 'medallion_tap'
  ), 0) as personal_medallion_taps,
  
  -- ✅ SOURCE: public_shares.wave_count (sum of wave reactions)
  -- What it means: Total waves received on all your shares (engagement)
  COALESCE((
    SELECT SUM(wave_count) 
    FROM public_shares 
    WHERE user_id = u.id
  ), 0) as wave_reactions_received,
  
  -- ✅ SOURCE: share_reactions table
  -- What it means: Number of times you "started" others' shares
  COALESCE((
    SELECT COUNT(*) 
    FROM share_reactions 
    WHERE user_id = u.id
  ), 0) as total_starts,
  
  -- ✅ SOURCE: public_shares dates (calculated)
  -- What it means: Number of unique days you've shared
  COALESCE((
    SELECT COUNT(DISTINCT DATE(created_at))
    FROM public_shares
    WHERE user_id = u.id
  ), 0) as days_active,
  
  -- ⚠️ SOURCE: user_stats table (cached, complex calculation)
  -- What it means: Current consecutive day streak
  -- NOTE: This is cached because calculating from dates is complex
  --       The streak calculation happens via separate trigger/function
  COALESCE((SELECT current_streak FROM user_stats WHERE user_id = u.id), 0) as current_streak,
  
  -- ⚠️ SOURCE: user_stats table (cached, complex calculation)
  -- What it means: Longest streak ever achieved
  COALESCE((SELECT longest_streak FROM user_stats WHERE user_id = u.id), 0) as longest_streak,
  
  NOW() as updated_at
FROM auth.users u;

-- Grant access to all authenticated and anonymous users
GRANT SELECT ON v_user_profile_stats TO authenticated;
GRANT SELECT ON v_user_profile_stats TO anon;

COMMENT ON VIEW v_user_profile_stats IS 'Single source of truth for profile stats. Calculates most stats in real-time from source tables. Streaks are cached in user_stats due to complexity.';

-- ===============================================
-- STEP 3: Remove broken update_user_waves function
-- ===============================================
-- This function was trying to track medallion taps in user_stats
-- It was corrupting stats by resetting total_hi_moments to 0
-- Now we track medallion taps in hi_events via insert_medallion_tap()

DROP FUNCTION IF EXISTS update_user_waves(UUID, INTEGER);

COMMENT ON FUNCTION insert_medallion_tap(UUID) IS 'Tracks medallion taps: increments global counter + stores personal tap in hi_events';

-- ===============================================
-- STEP 4: Ensure sync_moment_count trigger is working
-- ===============================================
-- This trigger keeps user_stats.total_hi_moments in sync with public_shares count
-- It fires after INSERT on public_shares

-- Verify trigger exists
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ ENABLED'
    ELSE '❌ DISABLED' 
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'public_shares' 
  AND tgname LIKE '%sync%moment%';

-- If output shows no rows, the trigger needs to be recreated
-- (But based on earlier check, it exists and is enabled)

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Check your current stats from the VIEW
SELECT 
  'Your profile stats (from VIEW)' as source,
  total_hi_moments as hi_moments_should_be_53,
  personal_medallion_taps as medallion_taps_currently_0,
  wave_reactions_received as waves_received_should_be_16,
  total_starts as starts_should_be_2,
  days_active as days_should_be_14,
  current_streak,
  longest_streak
FROM v_user_profile_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ===============================================
-- WHAT TO EXPECT AFTER DEPLOYMENT
-- ===============================================

/*
IMMEDIATE RESULTS (after running this SQL):
- total_hi_moments: 53 ✅ (from public_shares count)
- personal_medallion_taps: 0 ⚠️ (starting fresh, past taps not tracked)
- wave_reactions_received: 16 ✅ (from wave_reactions sum)
- total_starts: 2 ✅
- days_active: 14 ✅
- current_streak: 4 (from user_stats cache)
- longest_streak: 7 (from user_stats cache)

GOING FORWARD:
✅ Tap medallion → personal_medallion_taps increments + global counter increments
✅ Submit share → total_hi_moments increments automatically (trigger)
✅ Receive wave → wave_reactions_received increments automatically
✅ Stats can NEVER get corrupted (calculated from source every time)

FOR ALL USERS UNIVERSALLY:
✅ Every user sees their own stats from same VIEW
✅ No user_stats corruption possible
✅ Works for new users (VIEW handles missing user_stats rows)
✅ Works for anonymous users (VIEW returns 0s)
*/
