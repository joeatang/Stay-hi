-- ===============================================
-- 🎯 HI SHARE SUBMISSION TRACKING - COMPREHENSIVE
-- ===============================================
-- Handles ALL Hi share submissions across the ecosystem:
-- 1. Hi Dashboard: "Give yourself a Hi5" 
-- 2. Hi Island: "Drop a Hi5" 
-- 3. Hi Muscle: 4-step emotional journey share
-- 
-- ALL submission types count (public, private, anonymous)
-- Only track actual submissions, not just opens

-- ===============================================
-- UPDATED: COMPREHENSIVE SHARE SUBMISSION PROCESSING
-- ===============================================

-- Process ALL share submissions with milestone detection
CREATE OR REPLACE FUNCTION process_comprehensive_share_submission(
  p_user_id UUID DEFAULT auth.uid(),
  p_source TEXT DEFAULT 'dashboard',
  p_submission_type TEXT DEFAULT 'public', -- 'public', 'private', 'anonymous'
  p_page_origin TEXT DEFAULT 'hi-dashboard' -- 'hi-dashboard', 'hi-island', 'hi-muscle'
)
RETURNS JSON AS $$
DECLARE
  share_result JSON;
  milestone_result JSON;
  combined_result JSON;
  submission_metadata JSONB;
BEGIN
  -- Build submission metadata
  submission_metadata := jsonb_build_object(
    'source', p_source,
    'submissionType', p_submission_type,
    'pageOrigin', p_page_origin,
    'timestamp', NOW()
  );
  
  -- Update user share count in database (ALL submissions count)
  SELECT update_user_shares(p_user_id, 1) INTO share_result;
  
  -- Check for share milestones (with comprehensive metadata)
  SELECT award_milestone(
    p_user_id, 
    'shares', 
    (share_result->>'userShares')::integer,
    submission_metadata
  ) INTO milestone_result;
  
  -- Log the comprehensive submission for analytics
  BEGIN
    INSERT INTO hi_trial_milestone_analytics (
      user_id,
      event_type,
      event_data,
      page_context,
      created_at
    ) VALUES (
      p_user_id,
      'share_submission',
      jsonb_build_object(
        'submissionType', p_submission_type,
        'pageOrigin', p_page_origin,
        'source', p_source,
        'userSharesTotal', (share_result->>'userShares')::integer,
        'milestoneAwarded', COALESCE((milestone_result->>'success')::boolean, false)
      ),
      p_page_origin,
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue if analytics insert fails
      NULL;
  END;
  
  -- Combine results
  combined_result := jsonb_build_object(
    'shareUpdate', share_result,
    'milestone', milestone_result,
    'submission', jsonb_build_object(
      'type', p_submission_type,
      'origin', p_page_origin,
      'source', p_source
    ),
    'timestamp', NOW()
  );
  
  RETURN combined_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- PAGE-SPECIFIC SHARE SUBMISSION FUNCTIONS
-- ===============================================

-- Hi Dashboard: "Give yourself a Hi5" submissions
CREATE OR REPLACE FUNCTION process_hi_dashboard_share(
  p_user_id UUID DEFAULT auth.uid(),
  p_submission_type TEXT DEFAULT 'public'
)
RETURNS JSON AS $$
BEGIN
  RETURN process_comprehensive_share_submission(
    p_user_id,
    'hi_dashboard_share',
    p_submission_type,
    'hi-dashboard'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hi Island: "Drop a Hi5" submissions
CREATE OR REPLACE FUNCTION process_hi_island_share(
  p_user_id UUID DEFAULT auth.uid(),
  p_submission_type TEXT DEFAULT 'public'
)
RETURNS JSON AS $$
BEGIN
  RETURN process_comprehensive_share_submission(
    p_user_id,
    'hi_island_drop',
    p_submission_type,
    'hi-island'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hi Muscle: 4-step emotional journey submissions
CREATE OR REPLACE FUNCTION process_hi_muscle_share(
  p_user_id UUID DEFAULT auth.uid(),
  p_submission_type TEXT DEFAULT 'public'
)
RETURNS JSON AS $$
BEGIN
  RETURN process_comprehensive_share_submission(
    p_user_id,
    'hi_muscle_journey',
    p_submission_type,
    'hi-muscle'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- LEGACY COMPATIBILITY FUNCTIONS
-- ===============================================

-- Update existing process_share_submission to use comprehensive version
CREATE OR REPLACE FUNCTION process_share_submission(
  p_user_id UUID DEFAULT auth.uid(),
  p_source TEXT DEFAULT 'dashboard'
)
RETURNS JSON AS $$
BEGIN
  -- Map legacy sources to new system
  CASE p_source
    WHEN 'hi-island', 'island' THEN
      RETURN process_hi_island_share(p_user_id, 'public');
    WHEN 'hi-muscle', 'muscle', 'gym' THEN
      RETURN process_hi_muscle_share(p_user_id, 'public');
    ELSE
      RETURN process_hi_dashboard_share(p_user_id, 'public');
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- ANALYTICS: COMPREHENSIVE SUBMISSION TRACKING
-- ===============================================

-- Get submission analytics by page and type
CREATE OR REPLACE FUNCTION get_submission_analytics(
  p_days INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE
  analytics_data JSONB := '{}';
BEGIN
  -- Get submission counts by page origin
  WITH submission_counts AS (
    SELECT 
      event_data->>'pageOrigin' as page_origin,
      event_data->>'submissionType' as submission_type,
      COUNT(*) as count
    FROM hi_trial_milestone_analytics
    WHERE event_type = 'share_submission'
      AND created_at > NOW() - (p_days || ' days')::interval
    GROUP BY event_data->>'pageOrigin', event_data->>'submissionType'
  )
  SELECT jsonb_object_agg(
    page_origin,
    jsonb_build_object(
      'public', COALESCE(SUM(CASE WHEN submission_type = 'public' THEN count ELSE 0 END), 0),
      'private', COALESCE(SUM(CASE WHEN submission_type = 'private' THEN count ELSE 0 END), 0),
      'anonymous', COALESCE(SUM(CASE WHEN submission_type = 'anonymous' THEN count ELSE 0 END), 0),
      'total', COALESCE(SUM(count), 0)
    )
  ) INTO analytics_data
  FROM submission_counts
  WHERE page_origin IS NOT NULL
  GROUP BY page_origin;
  
  RETURN jsonb_build_object(
    'submissionsByPage', COALESCE(analytics_data, '{}'),
    'periodDays', p_days,
    'generatedAt', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

GRANT EXECUTE ON FUNCTION process_comprehensive_share_submission(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_hi_dashboard_share(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_hi_island_share(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_hi_muscle_share(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_submission_analytics(INTEGER) TO authenticated;

-- ===============================================
-- FUNCTION COMMENTS
-- ===============================================

COMMENT ON FUNCTION process_comprehensive_share_submission(UUID, TEXT, TEXT, TEXT) IS 'Process any Hi share submission with comprehensive tracking and milestone detection';
COMMENT ON FUNCTION process_hi_dashboard_share(UUID, TEXT) IS 'Process Hi Dashboard "Give yourself a Hi5" submissions';
COMMENT ON FUNCTION process_hi_island_share(UUID, TEXT) IS 'Process Hi Island "Drop a Hi5" submissions';  
COMMENT ON FUNCTION process_hi_muscle_share(UUID, TEXT) IS 'Process Hi Muscle 4-step emotional journey submissions';
COMMENT ON FUNCTION get_submission_analytics(INTEGER) IS 'Get comprehensive submission analytics across all pages and types';

-- ===============================================
-- DEPLOYMENT VERIFICATION
-- ===============================================

SELECT 'VERIFICATION: Comprehensive share submission tracking deployed' as check_type;
SELECT 
  routine_name,
  'Comprehensive share tracking' as description,
  '✅ READY' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'process_comprehensive_share_submission',
    'process_hi_dashboard_share',
    'process_hi_island_share', 
    'process_hi_muscle_share',
    'get_submission_analytics'
  )
ORDER BY routine_name;