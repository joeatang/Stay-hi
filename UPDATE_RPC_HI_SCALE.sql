-- =============================================================
-- UPDATE RPC: create_public_share - Add Hi Scale Support
-- Purpose: Add hi_intensity parameter to RPC function
-- Date: 2024-12-22
-- =============================================================

CREATE OR REPLACE FUNCTION create_public_share(
  p_content TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'unknown',
  p_pill TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_current_emoji TEXT DEFAULT '👋',
  p_desired_emoji TEXT DEFAULT '✨',
  p_hi_intensity INTEGER DEFAULT NULL  -- 🎯 Hi Scale: Optional intensity (1-5)
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
  
  -- Validate hi_intensity if provided (must be 1-5 or NULL)
  IF p_hi_intensity IS NOT NULL AND (p_hi_intensity < 1 OR p_hi_intensity > 5) THEN
    RAISE EXCEPTION 'hi_intensity must be between 1 and 5 or NULL';
  END IF;
  
  -- Insert share (bypasses PostgREST cache)
  INSERT INTO public_shares (
    user_id,
    content,
    visibility,
    origin,
    pill,
    location,
    current_emoji,
    desired_emoji,
    hi_intensity  -- 🎯 Hi Scale field
  )
  VALUES (
    v_user_id,
    p_content,
    p_visibility,
    p_origin,
    p_pill,
    p_location,
    p_current_emoji,
    p_desired_emoji,
    p_hi_intensity  -- 🎯 Hi Scale value
  )
  RETURNING id INTO v_share_id;
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'id', v_share_id,
    'user_id', v_user_id,
    'hi_intensity', p_hi_intensity
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_public_share IS 'Creates a public share with optional Hi Scale intensity (1-5)';

-- Verify function updated
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE proname = 'create_public_share';
