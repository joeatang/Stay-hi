-- =============================================================
-- FINAL FIX: Add missing columns to public_shares
-- =============================================================

-- Step 1: Add columns if they don't exist
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS pill TEXT;

-- Step 2: Make emoji columns nullable (if they exist)
DO $$ 
BEGIN
  ALTER TABLE public_shares ALTER COLUMN current_emoji DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public_shares ALTER COLUMN current_name DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public_shares ALTER COLUMN desired_emoji DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public_shares ALTER COLUMN desired_name DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Step 3: Drop existing function and create new one with full schema
DROP FUNCTION IF EXISTS create_public_share(TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_public_share(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_public_share(
  p_content TEXT,
  p_visibility TEXT DEFAULT 'public',
  p_origin TEXT DEFAULT 'unknown',
  p_pill TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_current_emoji TEXT DEFAULT '👋',
  p_desired_emoji TEXT DEFAULT '✨'
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
  -- For anonymous shares, respect null user_id. For public/private, use session.
  IF p_visibility = 'anonymous' THEN
    v_user_id := NULL;
  ELSE
    v_user_id := COALESCE(p_user_id, auth.uid());
  END IF;
  
  INSERT INTO public_shares (
    user_id,
    content,
    text,
    visibility,
    origin,
    pill,
    location,
    current_emoji,
    current_name,
    desired_emoji,
    desired_name
  )
  VALUES (
    v_user_id,
    p_content,
    p_content,  -- text = content (duplicate for legacy compatibility)
    p_visibility,
    p_origin,
    p_pill,
    p_location,
    p_current_emoji,
    CASE p_current_emoji
      WHEN '😊' THEN 'Joy'
      WHEN '🙏' THEN 'Appreciation'
      ELSE 'Hi'
    END,
    p_desired_emoji,
    CASE p_desired_emoji
      WHEN '😊' THEN 'Joy'
      WHEN '🙏' THEN 'Appreciation'
      ELSE 'Goal'
    END
  )
  RETURNING id INTO v_share_id;
  
  SELECT json_build_object(
    'success', true,
    'id', v_share_id
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_public_share TO authenticated, anon;

-- Step 4: Reload schema cache
NOTIFY pgrst, 'reload schema';
