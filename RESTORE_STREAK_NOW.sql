-- 🚨 IMMEDIATE FIX: Restore streak + make system safe

-- STEP 1: Manually restore YOUR streak to 4 (what you had)
UPDATE user_stats
SET 
  current_streak = 4,
  longest_streak = GREATEST(longest_streak, 4),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- STEP 2: Create SAFE function that NEVER destroys streaks
CREATE OR REPLACE FUNCTION update_user_stats_from_public_shares(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  moment_count INTEGER;
  wave_count INTEGER;
  start_count INTEGER;
  existing_streak INTEGER;
  existing_longest INTEGER;
BEGIN
  -- Get existing streaks FIRST (never destroy)
  SELECT current_streak, longest_streak 
  INTO existing_streak, existing_longest
  FROM user_stats WHERE user_id = user_uuid;
  
  -- Count moments
  SELECT COUNT(*) INTO moment_count 
  FROM public_shares WHERE user_id = user_uuid;
  
  -- Count waves
  SELECT COALESCE(SUM(wave_count), 0) INTO wave_count
  FROM public_shares WHERE user_id = user_uuid;
  
  -- Count reactions
  SELECT COUNT(*) INTO start_count
  FROM share_reactions sr
  JOIN public_shares ps ON sr.share_id = ps.id
  WHERE ps.user_id = user_uuid;
  
  -- Update stats (preserving streaks)
  INSERT INTO user_stats (
    user_id, total_hi_moments, current_streak, longest_streak,
    total_waves, total_starts, updated_at
  ) VALUES (
    user_uuid, moment_count, 
    COALESCE(existing_streak, 0), 
    COALESCE(existing_longest, 0),
    wave_count, start_count, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hi_moments = moment_count,
    total_waves = wave_count,
    total_starts = start_count,
    updated_at = NOW();
    -- NOTE: NOT updating streaks - they're managed separately
END;
$$;

-- STEP 3: Verify YOUR stats are correct
SELECT 
  user_id,
  total_hi_moments,
  current_streak, -- Should be 4
  longest_streak, -- Should be 7
  total_waves
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
