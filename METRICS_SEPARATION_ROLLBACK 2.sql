-- 🔄 METRICS SEPARATION ROLLBACK PLAN
-- Purpose: Emergency rollback if metrics separation causes issues
-- Usage: Run in Supabase SQL Editor if rollback needed

-- =====================================================================
-- OPTION 1: SOFT ROLLBACK (Keep tables, point views to legacy sources)
-- =====================================================================

-- Point views back to legacy data sources  
CREATE OR REPLACE VIEW public.v_total_waves AS
  SELECT COALESCE(COUNT(*), 0)::bigint AS total_waves
  FROM public.public_shares; -- Legacy source

CREATE OR REPLACE VIEW public.v_total_hi5s AS
  SELECT COALESCE(COUNT(*), 0)::bigint AS total_hi5s  
  FROM public.hi_moments; -- Legacy source
  
-- Update functions to return legacy data
CREATE OR REPLACE FUNCTION get_hi_waves()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return legacy wave count
  RETURN jsonb_build_object(
    'data', (SELECT COUNT(*) FROM public_shares),
    'error', null
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_total_hi5s()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
BEGIN
  -- Return legacy Hi5 count
  RETURN jsonb_build_object(
    'data', (SELECT COUNT(*) FROM hi_moments),
    'error', null
  );
END;
$$;

-- =====================================================================
-- OPTION 2: HARD ROLLBACK (Remove all new objects)
-- =====================================================================

-- Drop functions
DROP FUNCTION IF EXISTS insert_medallion_tap(uuid);
DROP FUNCTION IF EXISTS get_hi_waves();  
DROP FUNCTION IF EXISTS get_total_hi5s();

-- Drop views
DROP VIEW IF EXISTS public.v_total_waves;
DROP VIEW IF EXISTS public.v_total_hi5s;

-- Drop table (WARNING: This loses all medallion tap data!)
DROP TABLE IF EXISTS public.hi_events CASCADE;

-- =====================================================================
-- FEATURE FLAG ROLLBACK (Recommended approach)
-- =====================================================================

-- Instead of SQL changes, prefer disabling via feature flag:
-- 1. Set metrics_separation_enabled = false in HiFlags
-- 2. Dashboard will automatically fall back to legacy system
-- 3. No data loss, instant rollback

-- =====================================================================
-- VERIFICATION AFTER ROLLBACK
-- =====================================================================

-- Check that legacy system is working:
SELECT 'Legacy Test' as test, * FROM get_global_stats();

-- Confirm new objects are gone (for hard rollback):
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'hi_events';
SELECT schemaname, viewname FROM pg_views WHERE viewname IN ('v_total_waves', 'v_total_hi5s');

SELECT '🔄 ROLLBACK COMPLETE - Legacy system restored' as status;