-- 🚨 ROOT CAUSE FIX: Stats not updating because trigger watches wrong table
-- Problem: Trigger watches hi_moments, but users create shares in public_shares

-- ============================================================================
-- STEP 1: Create function that counts from PUBLIC_SHARES (not hi_moments)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_stats_from_public_shares(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  moment_count INTEGER;
  wave_count INTEGER;
  start_count INTEGER;
  active_days INTEGER;
  current_streak_days INTEGER;
BEGIN
  -- Count actual public_shares (HI MOMENTS)
  SELECT COUNT(*) 
  INTO moment_count 
  FROM public_shares 
  WHERE user_id = user_uuid;
  
  -- Count waves received on user's shares
  SELECT COALESCE(SUM(ps.wave_count), 0)
  INTO wave_count
  FROM public_shares ps
  WHERE ps.user_id = user_uuid;
  
  -- Count stars/reactions received on user's shares
  SELECT COUNT(*)
  INTO start_count
  FROM share_reactions sr
  JOIN public_shares ps ON sr.share_id = ps.id
  WHERE ps.user_id = user_uuid;
  
  -- Count active days (days with at least one share)
  SELECT COUNT(DISTINCT DATE(created_at))
  INTO active_days
  FROM public_shares
  WHERE user_id = user_uuid;
  
  -- Calculate current streak (days in a row with shares)
  WITH daily_shares AS (
    SELECT DATE(created_at) as share_date
    FROM public_shares
    WHERE user_id = user_uuid
    ORDER BY DATE(created_at) DESC
  ),
  streak_calc AS (
    SELECT 
      share_date,
      ROW_NUMBER() OVER (ORDER BY share_date DESC) as row_num,
      share_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY share_date DESC) - 1) as streak_group
    FROM daily_shares
  )
  SELECT COUNT(*)
  INTO current_streak_days
  FROM streak_calc
  WHERE streak_group = (SELECT MAX(share_date) FROM daily_shares);
  
  -- If no streak or last share wasn't today/yesterday, streak = 0
  IF NOT EXISTS (
    SELECT 1 FROM public_shares 
    WHERE user_id = user_uuid 
    AND DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day'
  ) THEN
    current_streak_days := 0;
  END IF;
  
  -- Update or insert stats
  INSERT INTO user_stats (
    user_id, 
    total_hi_moments, 
    current_streak, 
    longest_streak,
    total_waves, 
    total_starts, 
    days_active, 
    last_hi_date, 
    updated_at
  ) VALUES (
    user_uuid, 
    moment_count, 
    COALESCE(current_streak_days, 0),
    COALESCE(current_streak_days, 0), -- First time, current = longest
    wave_count, 
    start_count,
    active_days, 
    (SELECT MAX(DATE(created_at)) FROM public_shares WHERE user_id = user_uuid),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hi_moments = moment_count,
    current_streak = COALESCE(current_streak_days, 0),
    longest_streak = GREATEST(user_stats.longest_streak, COALESCE(current_streak_days, 0)),
    total_waves = wave_count,
    total_starts = start_count,
    days_active = active_days,
    last_hi_date = (SELECT MAX(DATE(created_at)) FROM public_shares WHERE user_id = user_uuid),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- STEP 2: Create trigger function for public_shares
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_stats_on_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_user_stats_from_public_shares(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_stats_from_public_shares(OLD.user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================================
-- STEP 3: Drop old trigger, create new one on public_shares
-- ============================================================================

DROP TRIGGER IF EXISTS update_stats_on_hi_moment ON hi_moments;
DROP TRIGGER IF EXISTS update_stats_on_public_share ON public_shares;

CREATE TRIGGER update_stats_on_public_share
  AFTER INSERT OR DELETE ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stats_on_share();

-- ============================================================================
-- STEP 4: Create trigger for waves/reactions
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_stats_on_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  share_owner_id UUID;
BEGIN
  -- Get the user who owns the share
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO share_owner_id FROM public_shares WHERE id = NEW.share_id;
    PERFORM update_user_stats_from_public_shares(share_owner_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT user_id INTO share_owner_id FROM public_shares WHERE id = OLD.share_id;
    PERFORM update_user_stats_from_public_shares(share_owner_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_stats_on_wave ON wave_reactions;
CREATE TRIGGER update_stats_on_wave
  AFTER INSERT OR DELETE ON wave_reactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stats_on_reaction();

DROP TRIGGER IF EXISTS update_stats_on_start ON share_reactions;
CREATE TRIGGER update_stats_on_start
  AFTER INSERT OR DELETE ON share_reactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stats_on_reaction();

-- ============================================================================
-- STEP 5: Recalculate stats for ALL existing users
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public_shares WHERE user_id IS NOT NULL
  LOOP
    PERFORM update_user_stats_from_public_shares(user_record.user_id);
    processed_count := processed_count + 1;
    
    -- Log progress every 10 users
    IF processed_count % 10 = 0 THEN
      RAISE NOTICE 'Processed % users', processed_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Recalculated stats for % users', processed_count;
END $$;

-- ============================================================================
-- STEP 6: Verify results
-- ============================================================================

SELECT 
  'After Fix' as status,
  COUNT(DISTINCT us.user_id) as users_with_stats,
  COUNT(DISTINCT ps.user_id) as users_with_shares
FROM user_stats us
FULL OUTER JOIN public_shares ps ON us.user_id = ps.user_id;

-- Show sample of recalculated stats
SELECT 
  us.user_id,
  us.total_hi_moments,
  us.current_streak,
  us.total_waves,
  us.total_starts,
  (SELECT COUNT(*) FROM public_shares WHERE user_id = us.user_id) as actual_shares
FROM user_stats us
ORDER BY us.total_hi_moments DESC
LIMIT 10;
