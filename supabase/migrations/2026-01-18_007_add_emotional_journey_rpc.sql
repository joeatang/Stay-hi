-- ============================================================================
-- 📊 EMOTIONAL JOURNEY RPC - Analytics v2.0
-- ============================================================================
-- Migration: 007
-- Date: 2026-01-18
-- Description: Add RPC to get Hi Scale ratings over time (for chart)
-- Dependencies: Migration 003 (user_daily_snapshots table)
-- ============================================================================

-- Create RPC to get emotional journey (Hi Scale ratings over time)
CREATE OR REPLACE FUNCTION get_user_emotional_journey(
  p_user_id UUID DEFAULT NULL,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  snapshot_date DATE,
  hi_scale_rating SMALLINT,
  activity_count INT,
  has_emotion BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    uds.snapshot_date,
    uds.hi_scale_rating,
    uds.activity_count,
    (uds.current_emotion IS NOT NULL) AS has_emotion
  FROM user_daily_snapshots uds
  WHERE uds.user_id = v_user_id
    AND uds.snapshot_date >= CURRENT_DATE - p_days
    AND uds.hi_scale_rating IS NOT NULL  -- Only days with a rating
  ORDER BY uds.snapshot_date ASC;  -- Oldest first for chart
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emotional_journey(UUID, INT) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007: Emotional journey RPC added';
  RAISE NOTICE '   - Created: get_user_emotional_journey() RPC';
  RAISE NOTICE '   - Returns: Hi Scale ratings over time for chart';
END $$;
