-- =============================================================
-- Server-side logic layer for feed pills and map normalization
-- Gold Standard: push logic to the DB for consistency across clients
-- =============================================================

-- View: public_shares_enriched
-- Computes consistent display fields and pills based on existing schema.
CREATE OR REPLACE VIEW public_shares_enriched AS
SELECT
  ps.id,
  ps.user_id,
  COALESCE(ps.content, ps.text) AS content,
  ps.created_at,
  ps.location,
  -- Visibility normalization
  CASE 
    WHEN ps.is_public = TRUE AND ps.is_anonymous = TRUE THEN 'anonymous'
    WHEN ps.is_public = TRUE THEN 'public'
    ELSE 'private'
  END AS visibility,
  -- Origin normalization (runtime does not have origin/type columns)
  'hi-island' AS origin,
  -- Basic pills: infer from content hashtag; default to hi5
  CASE 
    WHEN LOWER(COALESCE(ps.content, ps.text, '')) LIKE '%#higym%' THEN 'higym'
    ELSE 'hi5'
  END AS pill,
  -- Profile join (if available) for display
  pr.username,
  pr.display_name,
  pr.avatar_url
FROM public_shares ps
LEFT JOIN profiles pr ON pr.id = ps.user_id;

COMMENT ON VIEW public_shares_enriched IS 'Normalized public shares with consistent visibility, origin, pill, and profile fields.';

-- View: public_shares_map
-- Normalizes map data. If you later store lat/lng, adapt here; for now, keep location string.
CREATE OR REPLACE VIEW public_shares_map AS
SELECT
  ps.id,
  ps.user_id,
  COALESCE(ps.content, ps.text) AS content,
  ps.created_at,
  ps.location,
  CASE 
    WHEN ps.is_public = TRUE AND ps.is_anonymous = TRUE THEN 'anonymous'
    WHEN ps.is_public = TRUE THEN 'public'
    ELSE 'private'
  END AS visibility,
  'hi-island' AS origin
FROM public_shares ps;

COMMENT ON VIEW public_shares_map IS 'Normalized map-friendly public shares view with consistent visibility and origin.';

-- Optional: RPC to fetch tier-aware map data
-- Filters out items per tier. Example rule:
-- - free: only public non-anonymous; paid: include anonymous; highest: include broader radius later.
CREATE OR REPLACE FUNCTION get_public_shares_map_tier(
  p_tier TEXT
)
RETURNS SETOF public_shares_map
LANGUAGE sql
AS $$
  SELECT * FROM public_shares_map
  WHERE (
    CASE LOWER(COALESCE(p_tier, 'free'))
      WHEN 'free' THEN visibility = 'public' AND origin = 'hi-island'
      WHEN 'bronze' THEN visibility IN ('public','anonymous')
      ELSE visibility IN ('public','anonymous')
    END
  );
$$;

COMMENT ON FUNCTION get_public_shares_map_tier(TEXT) IS 'Tier-aware map feed selection using normalized view.';

GRANT SELECT ON public_shares_enriched TO authenticated, anon;
GRANT SELECT ON public_shares_map TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_public_shares_map_tier(TEXT) TO authenticated, anon;
