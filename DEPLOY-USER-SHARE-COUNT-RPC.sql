-- =============================================================
-- RPC: get_user_share_count
-- Purpose: return user's public share count (optionally within a time window)
-- =============================================================

CREATE OR REPLACE FUNCTION get_user_share_count(
  p_user_id UUID,
  p_since TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public_shares ps
  WHERE ps.user_id = p_user_id
    AND ps.visibility = 'public'
    AND (p_since IS NULL OR ps.created_at >= p_since);
$$;

COMMENT ON FUNCTION get_user_share_count(UUID, TIMESTAMPTZ) IS 'Counts public shares for a user since a timestamp (optional).';

GRANT EXECUTE ON FUNCTION get_user_share_count(UUID, TIMESTAMPTZ) TO authenticated, anon;
