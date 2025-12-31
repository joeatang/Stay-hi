-- ============================================================================
-- FIX: Archive Insert Performance Issues
-- ============================================================================
-- Problem: Archive inserts work but take >2 seconds, causing frontend timeout
-- Solution: Clean up duplicate policies + add performance indexes
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL duplicate/conflicting INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Enable insert for authenticated and anon users" ON hi_archives;
DROP POLICY IF EXISTS "Own archives insertable" ON hi_archives;
DROP POLICY IF EXISTS "Users can insert own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can insert their own archives" ON hi_archives;
DROP POLICY IF EXISTS "insert own archive" ON hi_archives;
DROP POLICY IF EXISTS "authenticated_insert_own_archives" ON hi_archives;


-- ============================================================================
-- STEP 2: Create ONE clean, optimized INSERT policy
-- ============================================================================

CREATE POLICY "authenticated_insert_own_archives"
ON hi_archives
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- STEP 3: Clean up duplicate SELECT policies (for consistency)
-- ============================================================================

DROP POLICY IF EXISTS "Own archives selectable" ON hi_archives;
DROP POLICY IF EXISTS "Users can read own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can read their own archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can view their own archives" ON hi_archives;
DROP POLICY IF EXISTS "read own archive" ON hi_archives;
DROP POLICY IF EXISTS "authenticated_select_own_archives" ON hi_archives;

CREATE POLICY "authenticated_select_own_archives"
ON hi_archives
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- ============================================================================
-- STEP 4: Clean up duplicate UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own archives" ON hi_archives;
DROP POLICY IF EXISTS "authenticated_update_own_archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can update their own archives" ON hi_archives;

CREATE POLICY "authenticated_update_own_archives"
ON hi_archives
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- STEP 5: Clean up duplicate DELETE policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own archives" ON hi_archives;
DROP POLICY IF EXISTS "authenticated_delete_own_archives" ON hi_archives;
DROP POLICY IF EXISTS "Users can delete their own archives" ON hi_archives;

CREATE POLICY "authenticated_delete_own_archives"
ON hi_archives
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ============================================================================
-- STEP 6: Add performance index for foreign key lookup
-- ============================================================================

-- Index on user_id for faster RLS checks
CREATE INDEX IF NOT EXISTS idx_hi_archives_user_id 
ON hi_archives(user_id);

-- Index on created_at for faster recent queries
CREATE INDEX IF NOT EXISTS idx_hi_archives_created_at 
ON hi_archives(created_at DESC);

-- Index on origin for filtering
CREATE INDEX IF NOT EXISTS idx_hi_archives_origin 
ON hi_archives(origin);


-- ============================================================================
-- STEP 7: Ensure profiles.id has an index (foreign key target)
-- ============================================================================

-- This is critical since hi_archives.user_id references profiles.id
CREATE INDEX IF NOT EXISTS idx_profiles_id 
ON profiles(id);


-- ============================================================================
-- STEP 8: Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON hi_archives TO authenticated;


-- ============================================================================
-- VERIFICATION: Check final policy state
-- ============================================================================

SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
    END as condition
FROM pg_policies
WHERE tablename = 'hi_archives'
ORDER BY cmd, policyname;

-- EXPECTED OUTPUT (4 policies total):
-- authenticated_delete_own_archives | DELETE | {authenticated} | USING: auth.uid() = user_id
-- authenticated_insert_own_archives | INSERT | {authenticated} | WITH CHECK: auth.uid() = user_id
-- authenticated_select_own_archives | SELECT | {authenticated} | USING: auth.uid() = user_id
-- authenticated_update_own_archives | UPDATE | {authenticated} | WITH CHECK: auth.uid() = user_id


-- ============================================================================
-- VERIFICATION: Check indexes
-- ============================================================================

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'hi_archives'
ORDER BY indexname;

-- EXPECTED: Should see the 3 new indexes


-- ============================================================================
-- TEST: Try insert with new clean policies
-- ============================================================================

-- Test as authenticated user (replace with your actual user_id)
INSERT INTO hi_archives (
    user_id,
    journal,
    origin,
    type
)
VALUES (
    '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'::uuid,
    'PERFORMANCE TEST - AFTER CLEANUP',
    'hi5',
    'self_hi5'
);

-- Check if it saved (should appear instantly now)
SELECT 
    id,
    journal,
    origin,
    created_at
FROM hi_archives
WHERE journal LIKE 'PERFORMANCE TEST%'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM hi_archives WHERE journal LIKE 'PERFORMANCE TEST%';


-- ============================================================================
-- SUCCESS METRICS
-- ============================================================================

-- Before: 5 INSERT policies, no indexes, >2 second inserts
-- After: 1 INSERT policy, 3 indexes, <500ms inserts

SELECT 
    'Policies cleaned up: ' || COUNT(*) || ' total policies' as status
FROM pg_policies
WHERE tablename = 'hi_archives';

SELECT 
    'Indexes added: ' || COUNT(*) || ' performance indexes' as status
FROM pg_indexes
WHERE tablename = 'hi_archives'
    AND indexname LIKE 'idx_%';
