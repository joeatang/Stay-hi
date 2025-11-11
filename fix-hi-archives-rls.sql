-- Fix RLS policy for hi_archives table to allow anonymous users
-- Current issue: Anonymous users can't insert into hi_archives due to RLS policy

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert their own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can read their own archives" ON hi_archives;

-- Create new policies that allow anonymous users
CREATE POLICY "Users can insert their own archives" ON hi_archives 
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() IS NULL AND user_id IS NULL)
);

CREATE POLICY "Users can read their own archives" ON hi_archives
FOR SELECT USING (
  auth.uid() = user_id OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Enable RLS
ALTER TABLE hi_archives ENABLE ROW LEVEL SECURITY;