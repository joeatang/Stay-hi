-- ============================================================================
-- 🔥 EMERGENCY FIX: Anonymous shares broken by streak fix
-- ============================================================================
-- Error: "null value in column user_id of relation user_stats violates not-null constraint"
-- Root cause: create_public_share RPC tries to update user_stats for anonymous users
-- Solution: Skip user_stats update when user_id is null (anonymous)
-- ============================================================================

-- Find the create_public_share function and update it
-- This query will show you the current function definition:
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'create_public_share';

-- The fix: Wrap user_stats update in IF user_id IS NOT NULL check
-- You need to locate the line that does user_stats update and wrap it like:

/*
IF p_user_id IS NOT NULL THEN
  -- Update user_stats (only for authenticated users)
  INSERT INTO user_stats (user_id, ...) 
  VALUES (p_user_id, ...)
  ON CONFLICT (user_id) DO UPDATE ...;
END IF;
*/

-- RUN THIS QUERY FIRST to see the current function, then I'll create the fix
