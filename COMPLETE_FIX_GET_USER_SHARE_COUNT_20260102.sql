-- ============================================
-- COMPLETE FIX: get_user_share_count RPC
-- Fixes Hi Island freeze when clicking "Drop a Hi"
-- Date: January 2, 2026 @ 20:15 PST
-- ============================================

-- STEP 1: Drop existing function if any (clean slate)
DROP FUNCTION IF EXISTS public.get_user_share_count(TEXT);
DROP FUNCTION IF EXISTS public.get_user_share_count(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_user_share_count();

-- STEP 2: Create the correct function
-- This function counts user shares in a given period (day/week/month/year)
-- Uses auth.uid() internally - NO user_id parameter needed
CREATE OR REPLACE FUNCTION public.get_user_share_count(period TEXT DEFAULT 'month')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_start_date TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get authenticated user ID from JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated',
      'count', 0
    );
  END IF;
  
  -- Calculate start date based on period
  IF period = 'day' THEN
    v_start_date := date_trunc('day', NOW());
  ELSIF period = 'week' THEN
    v_start_date := date_trunc('week', NOW());
  ELSIF period = 'month' THEN
    v_start_date := date_trunc('month', NOW());
  ELSIF period = 'year' THEN
    v_start_date := date_trunc('year', NOW());
  ELSE
    -- Default to month if invalid period
    v_start_date := date_trunc('month', NOW());
  END IF;
  
  -- Count shares since start date
  SELECT COUNT(*)
  INTO v_count
  FROM public_shares
  WHERE user_id = v_user_id
    AND created_at >= v_start_date;
  
  RETURN json_build_object(
    'success', true,
    'count', v_count,
    'period', period,
    'start_date', v_start_date
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'count', 0
  );
END;
$$;

-- STEP 3: Grant permissions to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_user_share_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_share_count(TEXT) TO anon;

-- STEP 4: Add function comment
COMMENT ON FUNCTION public.get_user_share_count IS 'Counts user shares within a time period for tier enforcement. Uses auth.uid() internally.';

-- STEP 5: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 6: Verification query
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_share_count') THEN
    RAISE NOTICE '✅ Function get_user_share_count() exists';
  ELSE
    RAISE WARNING '❌ Function NOT found';
  END IF;
  
  IF pg_catalog.has_function_privilege('authenticated', 'public.get_user_share_count(text)', 'EXECUTE') THEN
    RAISE NOTICE '✅ authenticated role can execute';
  ELSE
    RAISE WARNING '❌ authenticated role CANNOT execute';
  END IF;
  
  IF pg_catalog.has_function_privilege('anon', 'public.get_user_share_count(text)', 'EXECUTE') THEN
    RAISE NOTICE '✅ anon role can execute';
  ELSE
    RAISE WARNING '❌ anon role CANNOT execute';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'JAVASCRIPT USAGE:';
  RAISE NOTICE 'const { data } = await supabase.rpc(''get_user_share_count'', { period: ''month'' });';
  RAISE NOTICE 'Returns: { success: true, count: 5, period: ''month'', start_date: ''2026-01-01'' }';
  RAISE NOTICE '========================================';
END;
$$;
