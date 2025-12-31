-- ===============================================
-- 🚨 EMERGENCY FIX: Remove non-existent column
-- ===============================================
-- ROOT CAUSE: update_user_waves() tries to INSERT/UPDATE last_wave_at column
-- PROBLEM: Column doesn't exist in schema!
-- RESULT: Row gets recreated with default values, wiping total_hi_moments

CREATE OR REPLACE FUNCTION update_user_waves(
  p_user_id UUID DEFAULT auth.uid(),
  p_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  current_waves INTEGER := 0;
  new_waves INTEGER := 0;
  global_count BIGINT;
BEGIN
  -- Handle anonymous users
  IF p_user_id IS NOT NULL THEN
    -- Get current user wave count for authenticated users
    SELECT COALESCE(total_waves, 0) INTO current_waves 
    FROM user_stats 
    WHERE user_id = p_user_id;
    
    -- Calculate new count
    new_waves := current_waves + p_increment;
    
    -- 🎯 FIX: Only touch total_waves column, preserve everything else
    -- Don't use last_wave_at (doesn't exist!)
    INSERT INTO user_stats (
      user_id, 
      total_waves,
      updated_at
    ) VALUES (
      p_user_id, 
      new_waves,
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_waves = EXCLUDED.total_waves,
      updated_at = EXCLUDED.updated_at;
  ELSE
    -- For anonymous users, don't create user_stats record
    -- Just increment global counter
    current_waves := 0;
    new_waves := p_increment;
  END IF;
  
  -- Increment global wave counter
  SELECT increment_hi_wave() INTO global_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'userWaves', new_waves,
    'globalWaves', global_count,
    'increment', p_increment
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- VERIFICATION: Check your stats after deploy
-- ===============================================
-- Should show total_hi_moments = 53 (from public_shares)
-- Should increment total_waves without touching hi_moments
SELECT 
  total_hi_moments as hi_moments_should_be_53,
  total_waves,
  updated_at
FROM user_stats 
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
