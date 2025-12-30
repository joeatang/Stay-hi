-- 🎯 FORWARD FIX: Event-driven stats that never break streaks
-- Remove bad triggers, add good ones

-- ============================================================================
-- STEP 1: Remove ALL the triggers we created (they recalculate streaks wrong)
-- ============================================================================

DROP TRIGGER IF EXISTS update_stats_on_public_share ON public_shares;
DROP TRIGGER IF EXISTS update_stats_on_wave ON wave_reactions;
DROP TRIGGER IF EXISTS update_stats_on_start ON share_reactions;
DROP TRIGGER IF EXISTS update_stats_on_checkin ON hi_points_daily_checkins;
DROP FUNCTION IF EXISTS update_user_stats_from_public_shares(UUID);
DROP FUNCTION IF EXISTS trigger_update_stats_on_share();
DROP FUNCTION IF EXISTS trigger_update_stats_on_reaction();
DROP FUNCTION IF EXISTS trigger_update_stats_on_checkin();

-- ============================================================================
-- STEP 2: Create SAFE trigger that ONLY updates moments/waves (never streaks)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_moment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Just update the moment count, nothing else
  UPDATE user_stats
  SET 
    total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE user_id = NEW.user_id),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_moments_on_share
  AFTER INSERT ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION sync_moment_count();

-- ============================================================================
-- STEP 3: Sync wave counts when reactions happen
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_wave_count_on_public_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  share_owner UUID;
BEGIN
  -- Get the share owner
  SELECT user_id INTO share_owner FROM public_shares WHERE id = NEW.share_id;
  
  -- Update their wave count
  UPDATE user_stats
  SET 
    total_waves = (SELECT COALESCE(SUM(wave_count), 0) FROM public_shares WHERE user_id = share_owner),
    updated_at = NOW()
  WHERE user_id = share_owner;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_waves_on_reaction
  AFTER INSERT OR UPDATE ON wave_reactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_wave_count_on_public_share();

-- ============================================================================
-- STEP 4: One-time sync of current counts (doesn't touch streaks)
-- ============================================================================

UPDATE user_stats
SET 
  total_hi_moments = (SELECT COUNT(*) FROM public_shares WHERE public_shares.user_id = user_stats.user_id),
  total_waves = (SELECT COALESCE(SUM(wave_count), 0) FROM public_shares WHERE public_shares.user_id = user_stats.user_id),
  updated_at = NOW()
WHERE user_id IN (SELECT DISTINCT user_id FROM public_shares);

-- ============================================================================
-- STEP 5: Verify (check YOUR stats)
-- ============================================================================

SELECT 
  user_id,
  total_hi_moments, -- Should be 52
  current_streak,   -- Whatever it is now (unchanged)
  longest_streak,   -- Whatever it is now (unchanged)
  total_waves,      -- Should be 14
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ============================================================================
-- RESULT: 
-- ✅ Moments/waves count correctly going forward
-- ✅ Streaks managed by app (event-driven, works correctly)
-- ✅ No more recalculation bugs
-- ============================================================================
