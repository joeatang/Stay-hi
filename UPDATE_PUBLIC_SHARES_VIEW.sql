-- =============================================================
-- UPDATE VIEW: Add pill, origin, visibility columns to view
-- =============================================================

-- Drop and recreate the view with new columns
DROP VIEW IF EXISTS public_shares_enriched CASCADE;

CREATE OR REPLACE VIEW public_shares_enriched AS
SELECT 
  ps.*,
  p.username,
  p.display_name,
  p.avatar_url
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id;

-- Grant access
GRANT SELECT ON public_shares_enriched TO authenticated, anon;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
