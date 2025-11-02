-- 🎯 METRICS SEPARATION: Surgical Database Changes
-- Objective: Separate "Hi Waves" (medallion taps) from "Total Hi5" (share submissions)
-- Date: 2025-11-02

-- =================================================================
-- A) DATA MODEL: hi_events table for medallion taps
-- =================================================================

-- Create hi_events table for medallion tap tracking (idempotent)
CREATE TABLE IF NOT EXISTS public.hi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL, -- Nullable for anonymous taps
  event_type text NOT NULL CHECK (event_type IN ('medallion_tap')),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb -- Future extensibility
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hi_events_type_created 
  ON public.hi_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_events_user 
  ON public.hi_events(user_id) 
  WHERE user_id IS NOT NULL;

-- =================================================================
-- B) ROW LEVEL SECURITY
-- =================================================================

-- Enable RLS
ALTER TABLE public.hi_events ENABLE ROW LEVEL SECURITY;

-- Insert policy for medallion taps (authenticated + anonymous)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'hi_events' 
      AND policyname = 'insert_anyone_medallion_tap'
  ) THEN
    CREATE POLICY insert_anyone_medallion_tap 
      ON public.hi_events
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (event_type = 'medallion_tap');
  END IF;
END $$;

-- Select policy for stats reading
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'hi_events' 
      AND policyname = 'select_anyone_stats'
  ) THEN
    CREATE POLICY select_anyone_stats 
      ON public.hi_events
      FOR SELECT
      TO authenticated, anon
      USING (true); -- Public stats, no restriction
  END IF;
END $$;

-- =================================================================
-- C) SCHEMA DISCOVERY & ADAPTIVE VIEWS  
-- =================================================================

-- Helper function: Detect which shares table exists
CREATE OR REPLACE FUNCTION detect_shares_table()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for hi_shares (HiBase standard)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_shares' AND table_schema = 'public') THEN
    RETURN 'hi_shares';
  END IF;
  
  -- Check for public_shares (legacy)  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'public_shares' AND table_schema = 'public') THEN
    RETURN 'public_shares';
  END IF;
  
  -- Check for shares (alternative)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shares' AND table_schema = 'public') THEN
    RETURN 'shares';
  END IF;
  
  -- No shares table found
  RETURN NULL;
END;
$$;

-- =================================================================
-- D) ADAPTIVE SEPARATION VIEWS
-- =================================================================

-- View for Total Hi5 count (adapts to available shares table)
CREATE OR REPLACE VIEW public.v_total_hi5s AS
  SELECT COALESCE(
    CASE detect_shares_table()
      WHEN 'hi_shares' THEN (SELECT COUNT(*) FROM hi_shares WHERE type = 'Hi5')
      WHEN 'public_shares' THEN (SELECT COUNT(*) FROM public_shares WHERE share_type = 'Hi5' OR content LIKE '%Hi5%')
      WHEN 'shares' THEN (SELECT COUNT(*) FROM shares WHERE type = 'Hi5')
      ELSE 0
    END,
    0
  )::bigint AS total_hi5s;

-- View for Hi Waves count (from hi_events table, medallion_tap events)
CREATE OR REPLACE VIEW public.v_total_waves AS
  SELECT COALESCE(COUNT(*), 0)::bigint AS total_waves
  FROM public.hi_events
  WHERE event_type = 'medallion_tap';

-- =================================================================
-- E) HIBASE-COMPATIBLE FUNCTIONS 
-- =================================================================

-- Function: Get Hi Waves count with HiBase {data, error} format
CREATE OR REPLACE FUNCTION get_hi_waves()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wave_count bigint;
  result jsonb;
BEGIN
  -- Get current wave count
  SELECT total_waves INTO wave_count FROM v_total_waves;
  
  -- Return HiBase format
  result := jsonb_build_object(
    'data', wave_count,
    'error', null
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error in HiBase format
    RETURN jsonb_build_object(
      'data', null,
      'error', SQLERRM
    );
END;
$$;

-- Function: Get Total Hi5s count with HiBase {data, error} format
CREATE OR REPLACE FUNCTION get_total_hi5s()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hi5_count bigint;
  result jsonb;
BEGIN
  -- Get current Hi5 count
  SELECT total_hi5s INTO hi5_count FROM v_total_hi5s;
  
  -- Return HiBase format
  result := jsonb_build_object(
    'data', hi5_count,
    'error', null
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error in HiBase format
    RETURN jsonb_build_object(
      'data', null,
      'error', SQLERRM
    );
END;
$$;

-- Function: Insert medallion tap event
CREATE OR REPLACE FUNCTION insert_medallion_tap(
  tap_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count bigint;
  result jsonb;
BEGIN
  -- Insert medallion tap event
  INSERT INTO public.hi_events (user_id, event_type)
  VALUES (tap_user_id, 'medallion_tap');
  
  -- Get new total count
  SELECT total_waves INTO new_count FROM v_total_waves;
  
  -- Return new count in HiBase format
  result := jsonb_build_object(
    'data', new_count,
    'error', null
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error in HiBase format
    RETURN jsonb_build_object(
      'data', null,
      'error', SQLERRM
    );
END;
$$;

-- =================================================================
-- F) PERMISSIONS
-- =================================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_hi_waves() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_total_hi5s() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_medallion_tap(uuid) TO anon, authenticated;

-- Grant view permissions
GRANT SELECT ON public.v_total_hi5s TO anon, authenticated;
GRANT SELECT ON public.v_total_waves TO anon, authenticated;

-- =================================================================
-- G) VERIFICATION QUERIES  
-- =================================================================

-- Schema discovery verification
SELECT 
  'Schema Discovery' as test,
  detect_shares_table() as shares_table_found,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_events') as hi_events_exists;

-- =================================================================
-- H) DEPLOYMENT VERIFICATION
-- =================================================================

-- Test functions
SELECT 'Hi Waves Function Test' as test, get_hi_waves() as result;
SELECT 'Total Hi5s Function Test' as test, get_total_hi5s() as result;

-- Test views
SELECT 'Hi Waves View Test' as test, * FROM v_total_waves;
SELECT 'Total Hi5s View Test' as test, * FROM v_total_hi5s;

-- Show current counts
SELECT 
  'Current Metrics' as status,
  (SELECT total_waves FROM v_total_waves) as hi_waves,
  (SELECT total_hi5s FROM v_total_hi5s) as total_hi5s,
  now() as checked_at;

-- End of deployment
SELECT '✅ METRICS SEPARATION DEPLOYMENT COMPLETE' as status;