-- 🎯 GOLD STANDARD: Fix public_shares_enriched view to include wave_count
-- This ensures the feed query always gets reaction counts

-- Drop and recreate the view with wave_count + peace_count
DROP VIEW IF EXISTS public_shares_enriched CASCADE;

CREATE OR REPLACE VIEW public_shares_enriched AS
SELECT 
  ps.*,  -- Includes wave_count and peace_count (added by COMPLETE_WAVE_SYSTEM.sql)
  p.username,
  p.display_name,
  p.avatar_url
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id
WHERE ps.is_public = true;

-- Grant read access to everyone
GRANT SELECT ON public_shares_enriched TO anon, authenticated;

-- Verification query
SELECT 
  COUNT(*) as total_shares,
  COUNT(wave_count) FILTER (WHERE wave_count IS NOT NULL) as shares_with_wave_count,
  COUNT(peace_count) FILTER (WHERE peace_count IS NOT NULL) as shares_with_peace_count,
  SUM(wave_count) as total_waves,
  SUM(peace_count) as total_peace_reactions
FROM public_shares_enriched
LIMIT 1;
