-- ============================================================================
-- EMERGENCY FIX: Enable Archive Insert for Authenticated Users
-- ============================================================================
-- This fixes the "Archive timeout" error during share submission
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop any conflicting policies (if they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own archives" ON hi_archives;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON hi_archives;
DROP POLICY IF EXISTS "Users can create archives" ON hi_archives;


-- ============================================================================
-- STEP 2: Create simple, fast INSERT policy
-- ============================================================================

CREATE POLICY "Users can insert their own archives"
ON hi_archives
FOR INSERT
TO authenticated
WITH CHECK (
    -- User can only insert their own archives
    auth.uid() = user_id
);


-- ============================================================================
-- STEP 3: Ensure table permissions are correct
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON hi_archives TO authenticated;
GRANT USAGE ON SEQUENCE hi_archives_id_seq TO authenticated; -- If using serial ID


-- ============================================================================
-- STEP 4: Verify policy was created
-- ============================================================================

SELECT 
    policyname,
    cmd,
    roles,
    with_check
FROM pg_policies
WHERE tablename = 'hi_archives'
    AND cmd = 'INSERT';

-- EXPECTED OUTPUT:
-- policyname                            | cmd    | roles           | with_check
-- "Users can insert their own archives" | INSERT | {authenticated} | (auth.uid() = user_id)


-- ============================================================================
-- STEP 5: Test insert as authenticated user
-- ============================================================================

BEGIN;

-- Simulate authenticated user context
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{
  "sub": "68d6ac30-742a-47b4-b1d7-0631bf7a2ec6",
  "role": "authenticated"
}'::json;

-- Try inserting
INSERT INTO hi_archives (
    user_id,
    journal,
    origin,
    type,
    created_at
)
VALUES (
    '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'::uuid,
    'EMERGENCY FIX TEST',
    'hi5',
    'self_hi5',
    NOW()
);

-- Check if it worked
SELECT 
    id,
    journal,
    origin,
    created_at
FROM hi_archives
WHERE journal = 'EMERGENCY FIX TEST';

ROLLBACK; -- Don't save test data


-- ============================================================================
-- TROUBLESHOOTING: If Still Failing
-- ============================================================================

-- If the test insert STILL times out or fails:

-- Option A: Check for blocking triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'hi_archives';

-- Option B: Check foreign key constraints
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE table_name = 'hi_archives'
    AND constraint_name LIKE '%fkey%';

-- Option C: Temporarily disable RLS to test (DO NOT LEAVE THIS IN PRODUCTION)
-- ALTER TABLE hi_archives DISABLE ROW LEVEL SECURITY;
-- (Try insert from frontend, then RE-ENABLE immediately)
-- ALTER TABLE hi_archives ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SUCCESS INDICATOR
-- ============================================================================

-- If this query returns a row, the policy is active:
SELECT 'Archive INSERT policy active' AS status
FROM pg_policies
WHERE tablename = 'hi_archives'
    AND cmd = 'INSERT'
    AND 'authenticated' = ANY(roles);
