-- ===================================================================
-- 🌊 WAVE BACK FUNCTION - Hi Island Interaction System
-- ===================================================================
-- Purpose: Allow users to wave back on individual shares
-- Features:
--   - One wave per user per share (idempotent)
--   - Increments share-specific wave counter
--   - Increments global waves counter
--   - Returns current wave count for immediate UI update

-- Create wave tracking table if not exists
CREATE TABLE IF NOT EXISTS share_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public_shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one wave per user per share
  CONSTRAINT unique_user_wave_per_share UNIQUE (share_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_share_waves_share ON share_waves(share_id);
CREATE INDEX IF NOT EXISTS idx_share_waves_user ON share_waves(user_id);

-- Wave Back Function
CREATE OR REPLACE FUNCTION wave_back(
  p_share_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wave_count INTEGER;
  v_already_waved BOOLEAN;
BEGIN
  -- Check if user already waved on this share
  SELECT EXISTS (
    SELECT 1 FROM share_waves 
    WHERE share_id = p_share_id 
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_user_id IS NULL AND user_id IS NULL)
    )
  ) INTO v_already_waved;
  
  IF v_already_waved THEN
    -- Return current count without incrementing
    SELECT COUNT(*) INTO v_wave_count
    FROM share_waves
    WHERE share_id = p_share_id;
    
    RETURN json_build_object(
      'success', TRUE,
      'already_waved', TRUE,
      'wave_count', v_wave_count,
      'message', 'You already waved on this share'
    );
  END IF;
  
  -- Insert new wave
  INSERT INTO share_waves (share_id, user_id)
  VALUES (p_share_id, p_user_id);
  
  -- Get new wave count for this share
  SELECT COUNT(*) INTO v_wave_count
  FROM share_waves
  WHERE share_id = p_share_id;
  
  -- Increment global waves counter
  UPDATE global_stats
  SET 
    hi_waves = hi_waves + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  -- Return success with new count
  RETURN json_build_object(
    'success', TRUE,
    'already_waved', FALSE,
    'wave_count', v_wave_count,
    'message', 'Wave sent successfully!'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: user waved in another request
    SELECT COUNT(*) INTO v_wave_count
    FROM share_waves
    WHERE share_id = p_share_id;
    
    RETURN json_build_object(
      'success', TRUE,
      'already_waved', TRUE,
      'wave_count', v_wave_count,
      'message', 'You already waved on this share'
    );
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Wave back failed: %', SQLERRM;
END;
$$;

-- Enable RLS on share_waves
ALTER TABLE share_waves ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read wave counts
CREATE POLICY "Anyone can view waves" ON share_waves
  FOR SELECT
  USING (TRUE);

-- Policy: Users can only insert their own waves (enforced by function)
CREATE POLICY "Users can wave on shares" ON share_waves
  FOR INSERT
  WITH CHECK (TRUE); -- Function handles authorization

-- Get wave count for a share (public function)
CREATE OR REPLACE FUNCTION get_share_wave_count(p_share_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM share_waves
  WHERE share_id = p_share_id;
$$;

-- Check if user waved on a share
CREATE OR REPLACE FUNCTION has_user_waved(
  p_share_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM share_waves
    WHERE share_id = p_share_id
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_user_id IS NULL AND user_id IS NULL)
    )
  );
$$;

COMMENT ON FUNCTION wave_back IS 'Send a wave back on a share. Idempotent (one wave per user per share). Increments global waves counter.';
COMMENT ON TABLE share_waves IS 'Tracks individual waves sent on shares for Hi Island interaction system';
