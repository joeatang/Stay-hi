-- =============================================================
-- UPDATE VIEW: public_shares_enriched - Add Hi Scale Support
-- Purpose: Include hi_intensity column in enriched view
-- Date: 2024-12-22
-- =============================================================

-- Drop and recreate the view with Hi Scale support
DROP VIEW IF EXISTS public_shares_enriched CASCADE;

CREATE OR REPLACE VIEW public_shares_enriched AS
SELECT 
  ps.*,  -- 🎯 This includes hi_intensity column
  p.username,
  p.display_name,
  p.avatar_url
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id;

COMMENT ON VIEW public_shares_enriched IS 'Enriched public shares with profile data and Hi Scale intensity (ps.* includes all columns including hi_intensity)';

-- Grant access
GRANT SELECT ON public_shares_enriched TO authenticated, anon;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- 🎯 Verify hi_intensity is included in the view
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'public_shares_enriched'
  AND column_name = 'hi_intensity';

-- Expected result: Should return hi_intensity column
-- If it returns nothing, the column may not exist in public_shares base table
