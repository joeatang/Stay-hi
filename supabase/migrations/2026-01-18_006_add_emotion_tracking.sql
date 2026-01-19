-- ============================================================================
-- 📊 EMOTION TRACKING - ADD TO ANALYTICS v2.0
-- ============================================================================
-- Migration: 006
-- Date: 2026-01-18
-- Description: Add emotion tracking from Hi Gym to analytics system
-- Dependencies: Migration 003 (user_daily_snapshots table)
-- Preserves: All existing data and architecture
-- ============================================================================

-- Add emotion columns to user_daily_snapshots (non-breaking)
ALTER TABLE user_daily_snapshots 
  ADD COLUMN IF NOT EXISTS current_emotion TEXT,
  ADD COLUMN IF NOT EXISTS desired_emotion TEXT,
  ADD COLUMN IF NOT EXISTS emotion_reflection TEXT;

-- Create index for emotion queries (performance)
CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_emotions 
  ON user_daily_snapshots(user_id, current_emotion, desired_emotion) 
  WHERE current_emotion IS NOT NULL;

-- Update record_hi_scale_rating() to accept emotion data
CREATE OR REPLACE FUNCTION record_hi_scale_rating(
  p_rating SMALLINT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_current_emotion TEXT DEFAULT NULL,
  p_desired_emotion TEXT DEFAULT NULL,
  p_reflection TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  -- Validate rating if provided
  IF p_rating IS NOT NULL AND p_rating NOT BETWEEN 1 AND 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_rating');
  END IF;
  
  -- Upsert daily snapshot (preserves existing columns, only updates what's provided)
  INSERT INTO user_daily_snapshots (
    user_id, 
    snapshot_date, 
    hi_scale_rating, 
    hi_scale_note,
    current_emotion,
    desired_emotion,
    emotion_reflection,
    updated_at
  )
  VALUES (
    v_user_id, 
    v_today, 
    p_rating, 
    p_note,
    p_current_emotion,
    p_desired_emotion,
    p_reflection,
    NOW()
  )
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    hi_scale_rating = COALESCE(EXCLUDED.hi_scale_rating, user_daily_snapshots.hi_scale_rating),
    hi_scale_note = COALESCE(EXCLUDED.hi_scale_note, user_daily_snapshots.hi_scale_note),
    current_emotion = COALESCE(EXCLUDED.current_emotion, user_daily_snapshots.current_emotion),
    desired_emotion = COALESCE(EXCLUDED.desired_emotion, user_daily_snapshots.desired_emotion),
    emotion_reflection = COALESCE(EXCLUDED.emotion_reflection, user_daily_snapshots.emotion_reflection),
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'snapshot_date', v_today,
    'hi_scale_rating', p_rating,
    'current_emotion', p_current_emotion,
    'desired_emotion', p_desired_emotion
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION record_hi_scale_rating(SMALLINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Create new RPC to get emotion patterns over time
CREATE OR REPLACE FUNCTION get_user_emotion_patterns(p_days INT DEFAULT 30)
RETURNS TABLE (
  snapshot_date DATE,
  current_emotion TEXT,
  desired_emotion TEXT,
  hi_scale_rating SMALLINT,
  reflection TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    uds.snapshot_date,
    uds.current_emotion,
    uds.desired_emotion,
    uds.hi_scale_rating,
    uds.emotion_reflection
  FROM user_daily_snapshots uds
  WHERE uds.user_id = v_user_id
    AND uds.snapshot_date >= CURRENT_DATE - p_days
    AND uds.current_emotion IS NOT NULL
  ORDER BY uds.snapshot_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_emotion_patterns(INT) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 006: Emotion tracking added to Analytics v2.0';
  RAISE NOTICE '   - Added: current_emotion, desired_emotion, emotion_reflection columns';
  RAISE NOTICE '   - Updated: record_hi_scale_rating() RPC (backward compatible)';
  RAISE NOTICE '   - Created: get_user_emotion_patterns() RPC';
  RAISE NOTICE '   - All existing data preserved';
END $$;
