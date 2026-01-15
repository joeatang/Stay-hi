-- ============================================================================
-- HI POINTS SYSTEM - PHASE 2: DAILY ACTIVITY TRACKING
-- ============================================================================
-- Purpose: Track per-user daily activity for rate limiting
-- Prevents spam by capping points earned per action type per day
-- 
-- Daily Caps:
--   Shares:    10/day (max 100 base points)
--   Reactions: 50/day (max 50 base points)
--   Taps:      1000/day accumulating (max 10 base points)
-- ============================================================================

-- Create daily activity tracking table
CREATE TABLE IF NOT EXISTS public.hi_points_daily_activity (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Activity counters (for rate limiting)
  share_count int NOT NULL DEFAULT 0,           -- Shares today (cap: 10)
  reaction_count int NOT NULL DEFAULT 0,        -- Reactions today (cap: 50)
  tap_accumulator int NOT NULL DEFAULT 0,       -- Taps accumulating toward next point
  tap_batches_awarded int NOT NULL DEFAULT 0,   -- Tap point batches earned today (cap: 10)
  
  -- Points earned today (for audit/display)
  share_points_earned int NOT NULL DEFAULT 0,
  reaction_points_earned int NOT NULL DEFAULT 0,
  tap_points_earned int NOT NULL DEFAULT 0,
  checkin_points_earned int NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_id, day)
);

-- Add comments for documentation
COMMENT ON TABLE public.hi_points_daily_activity IS 'Per-user daily activity tracking for points rate limiting';
COMMENT ON COLUMN public.hi_points_daily_activity.share_count IS 'Number of shares today (max 10 earn points)';
COMMENT ON COLUMN public.hi_points_daily_activity.reaction_count IS 'Number of reactions today (max 50 earn points)';
COMMENT ON COLUMN public.hi_points_daily_activity.tap_accumulator IS 'Taps accumulating toward next point (100 taps = 1 point)';
COMMENT ON COLUMN public.hi_points_daily_activity.tap_batches_awarded IS 'Tap point batches earned today (max 10)';

-- Enable RLS
ALTER TABLE public.hi_points_daily_activity ENABLE ROW LEVEL SECURITY;

-- Users can read their own activity
CREATE POLICY IF NOT EXISTS "hi_points_daily_activity_select_self" 
  ON public.hi_points_daily_activity 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Service role can manage all records (for RPCs)
CREATE POLICY IF NOT EXISTS "hi_points_daily_activity_all_service" 
  ON public.hi_points_daily_activity 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_hi_points_daily_activity_user_day 
  ON public.hi_points_daily_activity(user_id, day DESC);

CREATE INDEX IF NOT EXISTS idx_hi_points_daily_activity_day 
  ON public.hi_points_daily_activity(day);

-- ============================================================================
-- HELPER FUNCTION: Get or create today's activity record
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_daily_activity(p_user_id uuid)
RETURNS public.hi_points_daily_activity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_activity hi_points_daily_activity;
BEGIN
  -- Try to get existing record
  SELECT * INTO v_activity
  FROM hi_points_daily_activity
  WHERE user_id = p_user_id AND day = v_today;
  
  -- If not found, create new record
  IF NOT FOUND THEN
    INSERT INTO hi_points_daily_activity (user_id, day)
    VALUES (p_user_id, v_today)
    RETURNING * INTO v_activity;
  END IF;
  
  RETURN v_activity;
END;
$$;

-- Grant execute to authenticated users (called by other RPCs)
REVOKE ALL ON FUNCTION public.get_or_create_daily_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_activity(uuid) TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'hi_points_daily_activity' ORDER BY ordinal_position;
-- Expected: 12 columns

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.get_or_create_daily_activity(uuid);
-- DROP TABLE IF EXISTS public.hi_points_daily_activity CASCADE;
