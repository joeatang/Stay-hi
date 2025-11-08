-- ===============================================
-- 🎯 HI OS COMPLIANT DATABASE PERMISSIONS 
-- ===============================================
-- Aligns with hi-access-tiers.js Level 0: Anonymous Explorer

-- ✅ ANONYMOUS ALLOWED: View-only stats and medallion engagement
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_medallion_tap(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_waves(UUID, INTEGER) TO anon, authenticated;

-- ❌ MEMBERS ONLY: Share creation and profile features  
GRANT EXECUTE ON FUNCTION update_user_shares(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_share_submission(UUID, TEXT) TO authenticated;

-- ❌ MEMBERS ONLY: Milestone functions (require user accounts)
GRANT EXECUTE ON FUNCTION check_wave_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_share_milestone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_milestone(UUID, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_milestones(UUID) TO authenticated;

-- ===============================================
-- HI OS COMPLIANCE VERIFICATION
-- ===============================================
-- Level 0: Anonymous Explorer can:
-- ✅ Tap medallions (unlimited_readonly engagement)
-- ✅ View community stats (view_only dashboard)
-- ✅ Track personal waves (readonly personal engagement)
--
-- Level 0: Anonymous Explorer blocked from:  
-- ❌ Share creation (shareCreation: false)
-- ❌ Profile access (profileAccess: false)
-- ❌ Milestones (requires authenticated user identity)
-- ❌ Hi Muscle access (hiMuscleAccess: false)