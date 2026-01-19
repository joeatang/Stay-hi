-- ============================================================================
-- 📊 FIX: EMOTIONAL JOURNEY RPC - Remove activity_count column
-- ============================================================================
-- Migration: 007 FIX
-- Date: 2026-01-18
-- Bug: RPC referenced activity_count column that doesn't exist
-- Fix: Remove activity_count from RETURNS TABLE and SELECT
-- ============================================================================

-- Must DROP first because we're changing return type
DROP FUNCTION IF EXISTS get_user_emotional_journey(UUID, INT);

-- Fix RPC to only return columns that exist
CREATE OR REPLACE FUNCTION get_user_emotional_journey(
  p_user_id UUID DEFAULT NULL,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  snapshot_date DATE,
  hi_scale_rating SMALLINT,
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
    (uds.current_emotion IS NOT NULL) AS has_emotion
  FROM user_daily_snapshots uds
  WHERE uds.user_id = v_user_id
    AND uds.snapshot_date >= CURRENT_DATE - p_days
    AND uds.hi_scale_rating IS NOT NULL  -- Only days with a rating
  ORDER BY uds.snapshot_date ASC;  -- Oldest first for chart
END;
$$;

-- Grant execution to authenticated users (already exists but re-run for safety)
GRANT EXECUTE ON FUNCTION get_user_emotional_journey(UUID, INT) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007 FIX: Removed activity_count from RPC';
  RAISE NOTICE '   - Function now returns: snapshot_date, hi_scale_rating, has_emotion';
  RAISE NOTICE '   - Ready for chart rendering';
END $$;
