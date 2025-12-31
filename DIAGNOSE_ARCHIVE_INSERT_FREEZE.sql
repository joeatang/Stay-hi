-- ============================================================================
-- DIAGNOSE: Why Archive Insert Freezes/Times Out
-- ============================================================================
-- Run these queries in Supabase SQL Editor to find the blocking issue
-- ============================================================================

-- ============================================================================
-- CHECK 1: RLS Policies on hi_archives (MOST LIKELY CULPRIT)
-- ============================================================================
-- If no INSERT policy exists, authenticated users can't write to hi_archives

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd, -- Should include 'INSERT' for writes
    qual, -- Conditions for policy
    with_check
FROM pg_policies
WHERE tablename = 'hi_archives'
ORDER BY cmd, policyname;

-- EXPECTED:
-- ✅ Should see a policy with cmd='INSERT' and roles containing 'authenticated'
-- ❌ If NO INSERT policy exists → USER CAN'T WRITE TO TABLE


-- ============================================================================
-- CHECK 2: Table Ownership & RLS Status
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity -- Should be TRUE if RLS is enabled
FROM pg_tables
WHERE tablename = 'hi_archives';

-- EXPECTED:
-- rowsecurity: true (RLS is active)
-- tableowner: postgres (or your service role)


-- ============================================================================
-- CHECK 3: Triggers on hi_archives (Could cause hangs)
-- ============================================================================

SELECT 
    trigger_name,
    event_manipulation, -- INSERT/UPDATE/DELETE
    action_statement, -- The function being called
    action_timing -- BEFORE/AFTER
FROM information_schema.triggers
WHERE event_object_table = 'hi_archives'
ORDER BY event_manipulation, action_timing;

-- EXPECTED:
-- Should be EMPTY or only have fast, non-blocking triggers
-- ❌ If you see triggers calling RPCs or complex functions → COULD BE BLOCKING


-- ============================================================================
-- CHECK 4: Required Columns & Constraints
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'hi_archives'
ORDER BY ordinal_position;

-- EXPECTED:
-- user_id: NOT NULL (should have value)
-- journal: nullable (content field)
-- origin: nullable
-- type: nullable
-- created_at: has DEFAULT


-- ============================================================================
-- CHECK 5: Foreign Key Constraints (Could block if auth.users slow)
-- ============================================================================

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'hi_archives';

-- EXPECTED:
-- user_id → auth.users(id) (this is fine)
-- If foreign key check is slow → could cause timeout


-- ============================================================================
-- CHECK 6: Test Insert (As Authenticated User)
-- ============================================================================
-- This simulates what your frontend is trying to do

BEGIN;
-- Set the user context (replace with your actual user_id from logs)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{
  "sub": "68d6ac30-742a-47b4-b1d7-0631bf7a2ec6",
  "role": "authenticated"
}'::json;

-- Try the insert that's failing in frontend
INSERT INTO hi_archives (
    user_id,
    journal,
    origin,
    type,
    created_at
)
VALUES (
    '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'::uuid,
    'TEST FROM DIAGNOSTIC',
    'hi5',
    'self_hi5',
    NOW()
);

-- If this SUCCEEDS → RLS policy is OK
-- If this FAILS with "policy violation" → RLS policy is BLOCKING INSERT
-- If this HANGS → There's a trigger or constraint slowing things down

ROLLBACK; -- Don't actually save test data


-- ============================================================================
-- CHECK 7: Recent Activity on hi_archives
-- ============================================================================
-- See if other inserts are working

SELECT 
    user_id,
    origin,
    type,
    created_at
FROM hi_archives
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- EXPECTED:
-- If you see recent entries → Table is writable
-- If EMPTY → No one can write to this table


-- ============================================================================
-- EMERGENCY FIX 1: Add Missing RLS INSERT Policy (if needed)
-- ============================================================================
-- ONLY RUN THIS IF CHECK 1 shows NO INSERT policy

-- DROP POLICY IF EXISTS "Users can insert their own archives" ON hi_archives;

-- CREATE POLICY "Users can insert their own archives"
-- ON hi_archives
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (auth.uid() = user_id);

-- GRANT INSERT ON hi_archives TO authenticated;


-- ============================================================================
-- EMERGENCY FIX 2: Simplify/Remove Blocking Triggers (if found)
-- ============================================================================
-- ONLY RUN THIS IF CHECK 3 shows blocking triggers

-- Example: If you have a trigger that's hanging
-- DROP TRIGGER IF EXISTS trigger_name ON hi_archives;


-- ============================================================================
-- VERIFICATION: Test Insert Again (After Fix)
-- ============================================================================
-- Run CHECK 6 again to verify the fix works
