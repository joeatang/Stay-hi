-- =============================================================
-- RPC: create_public_share
-- Purpose: Bypass PostgREST schema cache issues by inserting via RPC
-- =============================================================

CREATE OR REPLACE FUNCTION create_public_share(
  p_content TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'unknown',
  p_pill TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_share_id UUID;
  v_result JSON;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Insert share (bypasses PostgREST cache)
  INSERT INTO public_shares (
    user_id,
    content,
    visibility,
    origin,
    pill,
    location
  )
  VALUES (
    v_user_id,
    p_content,
    p_visibility,
    p_origin,
    p_pill,
    p_location
  )
  RETURNING id INTO v_share_id;
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'id', v_share_id,
    'user_id', v_user_id
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_public_share IS 'Creates a public share bypassing PostgREST schema cache';

-- Grant access
GRANT EXECUTE ON FUNCTION create_public_share TO authenticated, anon;
