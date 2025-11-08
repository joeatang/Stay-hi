-- ===============================================
-- 🚨 HI OS COMPLIANCE: PERMISSION CLEANUP
-- ===============================================
-- Explicitly revoke anonymous access from member-only functions

-- REVOKE anonymous access from milestone functions (HI OS Level 0 violation)
REVOKE EXECUTE ON FUNCTION check_wave_milestone(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION check_share_milestone(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION check_streak_milestone(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION check_all_milestones(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION award_milestone(UUID, TEXT, INTEGER, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_milestones(UUID) FROM anon;

-- REVOKE anonymous access from share functions (shareCreation: false per HI OS)
REVOKE EXECUTE ON FUNCTION process_share_submission(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION update_user_shares(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION process_comprehensive_share_submission(UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION process_hi_dashboard_share(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION process_hi_island_share(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION process_hi_muscle_share(UUID, TEXT) FROM anon;

-- ===============================================
-- ✅ RE-GRANT HI OS COMPLIANT PERMISSIONS
-- ===============================================

-- ✅ ANONYMOUS ALLOWED: Level 0 Anonymous Explorer functions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_medallion_tap(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_waves(UUID, INTEGER) TO anon, authenticated;

-- ✅ MEMBERS ONLY: All restricted functions  
GRANT EXECUTE ON FUNCTION process_share_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_shares(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_wave_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_share_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_streak_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_all_milestones(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_milestone(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_milestones(UUID) TO authenticated;

-- ✅ ANALYTICS: View-only for both (communityStats: 'view_only' for anonymous)
GRANT EXECUTE ON FUNCTION get_submission_analytics(INTEGER) TO anon, authenticated;

-- ===============================================
-- 🎯 VERIFICATION QUERIES
-- ===============================================

-- Test that anonymous users are now blocked from milestones
SELECT 'check_wave_milestone() anon access (should be BLOCKED):' as test,
  CASE 
    WHEN has_function_privilege('anon', 'check_wave_milestone(uuid)', 'execute') 
    THEN '❌ STILL ALLOWED (HI OS Violation)' 
    ELSE '✅ BLOCKED (HI OS Compliant)' 
  END as status;

-- Test that anonymous users are blocked from shares  
SELECT 'process_share_submission() anon access (should be BLOCKED):' as test,
  CASE 
    WHEN has_function_privilege('anon', 'process_share_submission(uuid, text)', 'execute') 
    THEN '❌ STILL ALLOWED (HI OS Violation)' 
    ELSE '✅ BLOCKED (HI OS Compliant)' 
  END as status;

-- Test that anonymous users still have stats access
SELECT 'get_user_stats() anon access (should be ALLOWED):' as test,
  CASE 
    WHEN has_function_privilege('anon', 'get_user_stats(uuid)', 'execute') 
    THEN '✅ ALLOWED (HI OS Compliant)' 
    ELSE '❌ BLOCKED (HI OS Violation)' 
  END as status;