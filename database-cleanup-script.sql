-- 🧹 DATABASE SCHEMA CLEANUP SCRIPT
-- Phase 2: Clean architecture preparation for tier system
-- Execute in Supabase SQL Editor

-- =========================================
-- STEP 1: PRE-CLEANUP VALIDATION
-- =========================================

-- Verify current production tables exist and have data
SELECT 
  'public_shares' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM public_shares
UNION ALL
SELECT 
  'hi_archives' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM hi_archives
UNION ALL
SELECT 
  'global_community_stats' as table_name,
  COUNT(*) as record_count,
  MAX(updated_at) as latest_record
FROM global_community_stats;

-- Check if legacy tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name IN ('hi_shares_geo', 'hi_shares')
  AND table_schema = 'public';

-- =========================================
-- STEP 2: CREATE BACKUP BEFORE CLEANUP
-- =========================================

-- Backup hi_shares_geo if it exists (safety measure)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_shares_geo') THEN
    EXECUTE 'CREATE TABLE hi_shares_geo_backup_' || to_char(now(), 'YYYY_MM_DD') || ' AS SELECT * FROM hi_shares_geo';
    RAISE NOTICE 'Created backup of hi_shares_geo table';
  ELSE
    RAISE NOTICE 'hi_shares_geo table does not exist - no backup needed';
  END IF;
END $$;

-- Create cleanup audit log
CREATE TABLE IF NOT EXISTS database_cleanup_log (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  details JSONB
);

INSERT INTO database_cleanup_log (action, details) 
VALUES ('cleanup_started', '{"phase": "2", "date": "2025-11-10"}');

-- =========================================
-- STEP 3: REMOVE UNUSED TABLES  
-- =========================================

-- Remove hi_shares_geo (confirmed unused in production)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_shares_geo') THEN
    DROP TABLE hi_shares_geo CASCADE;
    INSERT INTO database_cleanup_log (action, table_name, details) 
    VALUES ('table_removed', 'hi_shares_geo', '{"reason": "unused_in_production"}');
    RAISE NOTICE 'Removed unused hi_shares_geo table';
  ELSE
    RAISE NOTICE 'hi_shares_geo table already does not exist';
  END IF;
END $$;

-- Check for other conflicting hi_shares variants and log them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_shares' AND table_schema = 'public') THEN
    -- Don't auto-remove hi_shares - may have data, needs manual review
    INSERT INTO database_cleanup_log (action, table_name, details) 
    VALUES ('table_found', 'hi_shares', '{"status": "needs_manual_review", "action": "check_for_data"}');
    RAISE NOTICE 'Found hi_shares table - needs manual review for data before removal';
  END IF;
END $$;

-- =========================================
-- STEP 4: OPTIMIZE PRODUCTION TABLES
-- =========================================

-- Optimize public_shares for feed performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_shares_created_at 
ON public_shares(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_shares_user_visibility 
ON public_shares(user_id, visibility);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_shares_visibility_created 
ON public_shares(visibility, created_at DESC)
WHERE visibility IN ('public', 'anonymous');

-- Optimize hi_archives for user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hi_archives_user_created 
ON hi_archives(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hi_archives_user_type 
ON hi_archives(user_id, share_type);

-- Optimize global_community_stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_stats_updated 
ON global_community_stats(updated_at DESC);

-- Log optimization completion
INSERT INTO database_cleanup_log (action, details) 
VALUES ('indexes_optimized', '{"tables": ["public_shares", "hi_archives", "global_community_stats"]}');

-- =========================================
-- STEP 5: ANALYZE PERFORMANCE IMPROVEMENTS
-- =========================================

-- Update table statistics for query planner
ANALYZE public_shares;
ANALYZE hi_archives;  
ANALYZE global_community_stats;

-- Test query performance (should be faster with new indexes)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT ps.*, p.username, p.display_name, p.avatar_url
FROM public_shares ps
LEFT JOIN profiles p ON ps.user_id = p.id
WHERE ps.visibility = 'public'
ORDER BY ps.created_at DESC
LIMIT 20;

-- =========================================
-- STEP 6: FINAL VALIDATION
-- =========================================

-- Verify all production tables still work
SELECT 
  'Production tables validation' as test_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM public_shares) > 0 
     AND (SELECT COUNT(*) FROM hi_archives) >= 0
     AND (SELECT COUNT(*) FROM global_community_stats) > 0
    THEN 'PASSED'
    ELSE 'FAILED'
  END as result;

-- Log cleanup completion
INSERT INTO database_cleanup_log (action, details) 
VALUES ('cleanup_completed', '{"status": "success", "timestamp": "' || now() || '"}');

-- Show cleanup results
SELECT * FROM database_cleanup_log ORDER BY timestamp DESC;

-- =========================================
-- NEXT PHASE PREPARATION
-- =========================================

-- Prepare for tier system integration by ensuring clean foundation
SELECT 
  'Database ready for tier system' as status,
  'Phase 3: Access tier tables can now be added' as next_phase;