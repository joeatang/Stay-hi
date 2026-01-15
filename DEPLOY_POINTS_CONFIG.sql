-- ============================================================================
-- HI POINTS SYSTEM - PHASE 1: TIER MULTIPLIER CONFIG
-- ============================================================================
-- Purpose: Store tier multipliers for point calculations
-- Paid tiers earn points, free tier cannot
-- Higher tiers earn more points per action
-- 
-- Multipliers:
--   free       = 0.00x (cannot earn)
--   bronze     = 1.00x (base rate)
--   silver     = 1.25x (25% bonus)
--   gold       = 1.50x (50% bonus)
--   premium    = 2.00x (double points)
--   collective = 2.50x (max rewards)
-- ============================================================================

-- Create tier multiplier config table
CREATE TABLE IF NOT EXISTS public.hi_points_config (
  tier text PRIMARY KEY,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.00,
  is_paid boolean NOT NULL DEFAULT false,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.hi_points_config IS 'Tier multipliers for Hi Points system. Paid tiers earn points, free cannot.';
COMMENT ON COLUMN public.hi_points_config.multiplier IS 'Point multiplier: 0=cannot earn, 1.0=base rate, higher=bonus';
COMMENT ON COLUMN public.hi_points_config.is_paid IS 'Whether this tier can earn points';

-- Insert tier configurations (upsert to be idempotent)
INSERT INTO public.hi_points_config (tier, multiplier, is_paid, display_name) VALUES
  ('free',       0.00, false, 'Hi Explorer'),
  ('bronze',     1.00, true,  'Hi Pathfinder'),
  ('silver',     1.25, true,  'Hi Trailblazer'),
  ('gold',       1.50, true,  'Hi Champion'),
  ('premium',    2.00, true,  'Hi Pioneer'),
  ('collective', 2.50, true,  'Hi Collective')
ON CONFLICT (tier) DO UPDATE SET
  multiplier = EXCLUDED.multiplier,
  is_paid = EXCLUDED.is_paid,
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- Enable RLS
ALTER TABLE public.hi_points_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config (needed for frontend display)
CREATE POLICY IF NOT EXISTS "hi_points_config_select_all" 
  ON public.hi_points_config 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Only service_role can modify (admin-only changes)
CREATE POLICY IF NOT EXISTS "hi_points_config_all_service" 
  ON public.hi_points_config 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_hi_points_config_is_paid 
  ON public.hi_points_config(is_paid) 
  WHERE is_paid = true;

-- ============================================================================
-- VERIFICATION QUERIES (run after deployment)
-- ============================================================================
-- SELECT * FROM hi_points_config ORDER BY multiplier;
-- Expected: 6 rows, free=0.00, bronze=1.00, silver=1.25, gold=1.50, premium=2.00, collective=2.50

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS public.hi_points_config CASCADE;
