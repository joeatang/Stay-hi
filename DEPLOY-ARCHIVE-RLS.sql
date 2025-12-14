-- =============================================================
-- Hi Archives RLS policies
-- =============================================================

-- Enable RLS if not already
ALTER TABLE hi_archives ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own archives
CREATE POLICY "Own archives selectable" ON hi_archives
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert archives for themselves (direct inserts)
CREATE POLICY "Own archives insertable" ON hi_archives
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Note: SECURITY DEFINER RPCs bypass RLS checks; these policies
-- are for direct table access via PostgREST when needed.
