-- ============================================================================
-- VERIFY: Archive Performance Fix Deployment
-- ============================================================================
-- Run these queries to confirm the fix worked
-- ============================================================================

-- ============================================================================
-- CHECK 1: Verify only 4 clean policies exist (1 per operation)
-- ============================================================================

SELECT 
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'hi_archives'
GROUP BY cmd
ORDER BY cmd;

-- EXPECTED OUTPUT:
-- DELETE | 1 | authenticated_delete_own_archives
-- INSERT | 1 | authenticated_insert_own_archives
-- SELECT | 1 | authenticated_select_own_archives
-- UPDATE | 1 | authenticated_update_own_archives


-- ============================================================================
-- CHECK 2: Verify all 5 indexes exist
-- ============================================================================

SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE tablename IN ('hi_archives', 'profiles')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- EXPECTED OUTPUT:
-- idx_hi_archives_created_at | hi_archives
-- idx_hi_archives_origin     | hi_archives
-- idx_hi_archives_user_id    | hi_archives
-- idx_profiles_id            | profiles
-- (plus any existing indexes)


-- ============================================================================
-- CHECK 3: Performance Test - Measure INSERT speed
-- ============================================================================

-- Start timing
\timing on

-- Insert test record
INSERT INTO hi_archives (
    user_id,
    journal,
    origin,
    type
)
VALUES (
    '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'::uuid,
    'SPEED TEST ' || NOW()::TEXT,
    'hi5',
    'self_hi5'
);

-- Timing should show: Time: <500ms (was >2000ms before)

-- Clean up test record
DELETE FROM hi_archives WHERE journal LIKE 'SPEED TEST%';

-- Stop timing
\timing off


-- ============================================================================
-- CHECK 4: Verify recent archives are still accessible
-- ============================================================================

SELECT 
    COUNT(*) as total_archives,
    MAX(created_at) as most_recent_archive,
    NOW() - MAX(created_at) as seconds_since_last
FROM hi_archives
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- EXPECTED: Should see your existing archives


-- ============================================================================
-- SUCCESS INDICATORS
-- ============================================================================

-- ✅ Policies: Exactly 4 policies (1 per operation)
-- ✅ Indexes: At least 4 new indexes
-- ✅ INSERT speed: <500ms (was >2000ms)
-- ✅ Archives: All existing data still accessible

SELECT 
    'FIX STATUS: ' || 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'hi_archives') = 4 
        AND (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'hi_archives' AND indexname LIKE 'idx_%') >= 3
        THEN '✅ COMPLETE - Ready to test frontend'
        ELSE '⚠️ INCOMPLETE - Check queries above'
    END as deployment_status;
