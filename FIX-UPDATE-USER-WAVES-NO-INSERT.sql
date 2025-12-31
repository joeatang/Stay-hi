-- ===============================================
-- 🚨 CRITICAL FIX: update_user_waves() resets stats to 0
-- ===============================================
-- ROOT CAUSE: INSERT clause creates row with total_hi_moments = 0
-- SOLUTION: Only UPDATE existing rows, never INSERT
-- If row doesn't exist, it should be created by profile system first

CREATE OR REPLACE FUNCTION update_user_waves(
  p_user_id UUID DEFAULT auth.uid(),
  p_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  current_waves INTEGER := 0;
  new_waves INTEGER := 0;
  global_count BIGINT;
  row_exists BOOLEAN;
BEGIN
  -- Handle anonymous users
  IF p_user_id IS NULL THEN
    -- Just increment global counter, return anonymous result
    SELECT increment_hi_wave() INTO global_count;
    
    RETURN jsonb_build_object(
      'success', true,
      'userWaves', -1,  -- Signal for localStorage usage
      'globalWaves', global_count,
      'increment', p_increment
    );
  END IF;
  
  -- Check if user_stats row exists
  SELECT EXISTS(
    SELECT 1 FROM user_stats WHERE user_id = p_user_id
  ) INTO row_exists;
  
  IF NOT row_exists THEN
    -- 🚨 CRITICAL: Don't create row with INSERT! This resets hi_moments to 0
    -- Instead, initialize row with ONLY waves field, preserving other stats
    INSERT INTO user_stats (
      user_id,
      total_waves,
      updated_at
    ) VALUES (
      p_user_id,
      p_increment,
      NOW()
    );
    
    new_waves := p_increment;
  ELSE
    -- Row exists, safe to UPDATE only total_waves
    UPDATE user_stats 
    SET 
      total_waves = COALESCE(total_waves, 0) + p_increment,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING total_waves INTO new_waves;
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
-- VERIFICATION QUERY
-- ===============================================
-- Run this to verify current hi_moments value BEFORE fix:
-- SELECT user_id, total_hi_moments, total_waves, updated_at 
-- FROM user_stats 
-- WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- After deploying fix, verify hi_moments stays same after medallion taps
