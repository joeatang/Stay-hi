-- TESLA-GRADE HI MEDALLION DATABASE FUNCTIONS
-- Dual tracking: Global waves + User-specific waves
-- Deployment Date: 2025-11-02

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS insert_medallion_tap_dual(uuid);

-- Create dual tracking function for medallion taps
CREATE OR REPLACE FUNCTION insert_medallion_tap_dual(tap_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  global_wave_count integer;
  user_wave_count integer := NULL;
BEGIN
  -- STEP 1: Insert into hi_events table for global tracking
  INSERT INTO hi_events (
    event_type,
    user_id,
    metadata,
    created_at
  ) VALUES (
    'medallion_tap',
    tap_user_id,
    jsonb_build_object(
      'source', 'hi_medallion',
      'action', 'tap',
      'tracking_type', 'dual'
    ),
    NOW()
  );
  
  -- STEP 2: Get updated global Hi Waves count
  SELECT COUNT(*) INTO global_wave_count
  FROM hi_events 
  WHERE event_type = 'medallion_tap';
  
  -- STEP 3: If user provided, update/increment their personal wave count
  IF tap_user_id IS NOT NULL THEN
    -- Use INSERT ... ON CONFLICT to handle both new and existing users
    INSERT INTO hi_user_waves (user_id, wave_count, updated_at)
    VALUES (tap_user_id, 1, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      wave_count = hi_user_waves.wave_count + 1,
      updated_at = NOW()
    RETURNING wave_count INTO user_wave_count;
  END IF;
  
  -- STEP 4: Return dual tracking results
  RETURN jsonb_build_object(
    'data', jsonb_build_object(
      'global_waves', global_wave_count,
      'user_waves', user_wave_count
    ),
    'success', true,
    'timestamp', extract(epoch from NOW())
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error in standardized format
  RETURN jsonb_build_object(
    'data', NULL,
    'error', SQLERRM,
    'success', false
  );
END;
$$;

-- Create user-specific Hi Waves getter
CREATE OR REPLACE FUNCTION get_user_hi_waves(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wave_count integer := 0;
BEGIN
  -- Get user's personal wave count
  SELECT COALESCE(hw.wave_count, 0) INTO wave_count
  FROM hi_user_waves hw
  WHERE hw.user_id = get_user_hi_waves.user_id;
  
  RETURN jsonb_build_object(
    'data', wave_count,
    'success', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'data', NULL,
    'error', SQLERRM,
    'success', false
  );
END;
$$;

-- Create hi_user_waves table if it doesn't exist
CREATE TABLE IF NOT EXISTS hi_user_waves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wave_count integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_hi_user_waves_user_id ON hi_user_waves(user_id);
CREATE INDEX IF NOT EXISTS idx_hi_user_waves_updated_at ON hi_user_waves(updated_at);

-- Add RLS policies for hi_user_waves table
ALTER TABLE hi_user_waves ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own wave count
CREATE POLICY "Users can read own wave count" ON hi_user_waves
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System functions can manage wave counts
CREATE POLICY "System can manage wave counts" ON hi_user_waves
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON hi_user_waves TO authenticated;
GRANT EXECUTE ON FUNCTION insert_medallion_tap_dual TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_hi_waves TO authenticated;

-- Update existing get_hi_waves function for better performance
CREATE OR REPLACE FUNCTION get_hi_waves()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wave_count integer;
BEGIN
  -- Count medallion tap events efficiently
  SELECT COUNT(*) INTO wave_count
  FROM hi_events 
  WHERE event_type = 'medallion_tap';
  
  RETURN jsonb_build_object(
    'data', wave_count,
    'success', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'data', NULL,
    'error', SQLERRM,
    'success', false
  );
END;
$$;