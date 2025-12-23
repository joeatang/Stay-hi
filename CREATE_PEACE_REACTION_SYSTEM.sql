-- =============================================================
-- Peace Reaction System - Database Setup
-- Purpose: Add "Send Peace" reaction alongside Wave reactions
-- Date: 2024-12-23
-- =============================================================

-- 1. Add peace_count column to public_shares table
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS peace_count INTEGER DEFAULT 0;

-- 2. Create peace_reactions table (similar to wave_backs)
CREATE TABLE IF NOT EXISTS public.peace_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID NOT NULL REFERENCES public_shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(share_id, user_id) -- One peace per user per share
);

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_peace_reactions_share_id ON public.peace_reactions(share_id);
CREATE INDEX IF NOT EXISTS idx_peace_reactions_user_id ON public.peace_reactions(user_id);

-- 4. Create send_peace RPC function (mirrors wave_back)
CREATE OR REPLACE FUNCTION send_peace(
  p_share_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_peace_count INTEGER := 0;
  v_already_sent_peace BOOLEAN := FALSE;
BEGIN
  -- Check if user already sent peace to this share
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.peace_reactions 
      WHERE share_id = p_share_id AND user_id = p_user_id
    ) INTO v_already_sent_peace;
  END IF;

  -- Insert peace reaction (ignore if duplicate due to UNIQUE constraint)
  IF NOT v_already_sent_peace THEN
    INSERT INTO public.peace_reactions (share_id, user_id)
    VALUES (p_share_id, p_user_id)
    ON CONFLICT (share_id, user_id) DO NOTHING;
  END IF;

  -- Update peace count on the share
  UPDATE public_shares
  SET peace_count = (
    SELECT COUNT(*) FROM public.peace_reactions 
    WHERE share_id = p_share_id
  )
  WHERE id = p_share_id;

  -- Get final peace count
  SELECT peace_count INTO v_peace_count
  FROM public_shares
  WHERE id = p_share_id;

  -- Return JSON response
  RETURN json_build_object(
    'peace_count', COALESCE(v_peace_count, 0),
    'already_sent_peace', v_already_sent_peace
  );
END;
$$;

-- 5. Create get_share_peace_count helper function
CREATE OR REPLACE FUNCTION get_share_peace_count(p_share_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  SELECT peace_count INTO v_count
  FROM public_shares
  WHERE id = p_share_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 6. Create has_user_sent_peace helper function
CREATE OR REPLACE FUNCTION has_user_sent_peace(
  p_share_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.peace_reactions
    WHERE share_id = p_share_id AND user_id = p_user_id
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- 7. Grant necessary permissions
GRANT SELECT, INSERT ON public.peace_reactions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_peace TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_share_peace_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_user_sent_peace TO authenticated, anon;

-- Verify setup
SELECT 
  'peace_count column' AS feature,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_shares' AND column_name = 'peace_count'
  ) AS exists;

SELECT 
  'peace_reactions table' AS feature,
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'peace_reactions'
  ) AS exists;

SELECT 
  'send_peace function' AS feature,
  EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'send_peace'
  ) AS exists;
