-- ============================================================================
-- DEPLOY TO SUPABASE: Copy this entire script to Supabase Dashboard > SQL Editor
-- ============================================================================

-- Step 1: Create hi_events table for medallion taps
CREATE TABLE IF NOT EXISTS public.hi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  event_type text NOT NULL CHECK (event_type IN ('medallion_tap')),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Step 2: Create hi_shares table for Hi5 submissions  
CREATE TABLE IF NOT EXISTS public.hi_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  share_type text NOT NULL DEFAULT 'hi5',
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Step 3: Enable RLS
ALTER TABLE public.hi_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hi_shares ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
DROP POLICY IF EXISTS insert_anyone_medallion_tap ON public.hi_events;
CREATE POLICY insert_anyone_medallion_tap 
  ON public.hi_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (event_type = 'medallion_tap');

DROP POLICY IF EXISTS select_anyone_stats ON public.hi_events;
CREATE POLICY select_anyone_stats 
  ON public.hi_events
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS insert_shares ON public.hi_shares;
CREATE POLICY insert_shares 
  ON public.hi_shares
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (share_type = 'hi5');

DROP POLICY IF EXISTS select_shares ON public.hi_shares;
CREATE POLICY select_shares 
  ON public.hi_shares
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Step 5: Create Hi Waves function
CREATE OR REPLACE FUNCTION get_hi_waves()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wave_count bigint;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO wave_count
  FROM public.hi_events
  WHERE event_type = 'medallion_tap';
  
  RETURN jsonb_build_object('data', wave_count);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('data', 0, 'error', SQLERRM);
END;
$$;

-- Step 6: Create Total Hi5s function
CREATE OR REPLACE FUNCTION get_total_hi5s()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hi5_count bigint;
BEGIN
  -- Try hi_shares first
  SELECT COALESCE(COUNT(*), 0) INTO hi5_count
  FROM public.hi_shares
  WHERE share_type = 'hi5';
  
  -- Fallback to legacy if hi_shares is empty
  IF hi5_count = 0 THEN
    SELECT COALESCE(total_his, 13) INTO hi5_count
    FROM public.global_stats
    LIMIT 1;
  END IF;
  
  RETURN jsonb_build_object('data', hi5_count);
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback
    RETURN jsonb_build_object('data', 13, 'error', SQLERRM);
END;
$$;

-- Step 7: Create medallion tap insertion function
CREATE OR REPLACE FUNCTION insert_medallion_tap(tap_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count bigint;
BEGIN
  -- Insert medallion tap
  INSERT INTO public.hi_events (user_id, event_type, metadata)
  VALUES (tap_user_id, 'medallion_tap', jsonb_build_object('source', 'hi_medallion'));
  
  -- Return new count
  SELECT COALESCE(COUNT(*), 0) INTO new_count
  FROM public.hi_events
  WHERE event_type = 'medallion_tap';
  
  RETURN jsonb_build_object('data', new_count);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('data', 1, 'error', SQLERRM);
END;
$$;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION get_hi_waves() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_total_hi5s() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_medallion_tap(uuid) TO anon, authenticated;

-- Step 9: Test functions
SELECT 'TESTING get_hi_waves:' as test, get_hi_waves() as result;
SELECT 'TESTING get_total_hi5s:' as test, get_total_hi5s() as result;

-- Success message
SELECT '✅ DATABASE FUNCTIONS DEPLOYED SUCCESSFULLY!' as status;