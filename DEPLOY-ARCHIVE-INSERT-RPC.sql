-- =============================================================
-- Hi Archives Minimal Insert RPC (SECURITY DEFINER)
-- Purpose: Resolve client/runtime schema drift by inserting only
--          valid columns, setting defaults server-side.
--
-- Usage: select create_archive_entry(p_journal := 'text');
-- Returns: JSON { success, id }
-- =============================================================

CREATE OR REPLACE FUNCTION create_archive_entry(
  p_journal TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no auth.uid()';
  END IF;

  -- Preferred insert: write user text into content/text if columns exist
  BEGIN
    INSERT INTO hi_archives (
      user_id,
      journal,
      content,
      text,
      current_emoji,
      current_name,
      desired_emoji,
      desired_name,
      location
    ) VALUES (
      v_user_id,
      COALESCE(p_journal, ''),
      COALESCE(p_journal, ''),
      COALESCE(p_journal, ''),
      COALESCE('👋', '👋'),
      COALESCE('Hi', 'Hi'),
      COALESCE('✨', '✨'),
      COALESCE('Goal', 'Goal'),
      NULL
    ) RETURNING id INTO v_id;
  EXCEPTION
    WHEN undefined_column THEN
      -- Fallback: environments missing content/text columns
      INSERT INTO hi_archives (
        user_id,
        journal,
        current_emoji,
        current_name,
        desired_emoji,
        desired_name,
        location
      ) VALUES (
        v_user_id,
        COALESCE(p_journal, ''),
        COALESCE('👋', '👋'),
        COALESCE('Hi', 'Hi'),
        COALESCE('✨', '✨'),
        COALESCE('Goal', 'Goal'),
        NULL
      ) RETURNING id INTO v_id;
  END;

  RETURN json_build_object('success', TRUE, 'id', v_id);
EXCEPTION
  WHEN undefined_column THEN
    -- Final minimal fallback for runtimes missing emoji/name too
    INSERT INTO hi_archives (
      user_id,
      journal
    ) VALUES (
      v_user_id,
      COALESCE(p_journal, '')
    ) RETURNING id INTO v_id;
    RETURN json_build_object('success', TRUE, 'id', v_id, 'fallback', TRUE);
  WHEN OTHERS THEN
    RAISE EXCEPTION 'create_archive_entry failed: %', SQLERRM;
END;
$$;

-- Suggested RLS (ensure table RLS enabled separately)
-- Allows inserts via SECURITY DEFINER function regardless of client
COMMENT ON FUNCTION create_archive_entry IS 'Insert archive using server-side defaults; resolves schema drift safely.';

-- Expose RPC to clients
GRANT EXECUTE ON FUNCTION create_archive_entry(TEXT) TO authenticated, anon;

-- Ensure predictable path resolution for function
ALTER FUNCTION create_archive_entry(TEXT) SET search_path = public;
