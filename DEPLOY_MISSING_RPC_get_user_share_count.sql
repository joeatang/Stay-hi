-- =========================================
-- DEPLOY: Missing get_user_share_count RPC
-- =========================================
-- Issue: HiShareSheet calls get_user_share_count but function not in production
-- Source: sql/migrations/tier_enforcement_share_validation.sql
-- Deploy: Copy to Supabase SQL Editor and run

-- Function to get user's share count for a given period
CREATE OR REPLACE FUNCTION get_user_share_count(period TEXT DEFAULT 'month')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_current_month TEXT;
BEGIN
  -- Get current month
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Count shares in current period
  IF period = 'month' THEN
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND month_year = v_current_month;
  ELSIF period = 'day' THEN
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND created_at >= DATE_TRUNC('day', NOW());
  ELSIF period = 'week' THEN
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid()
      AND created_at >= DATE_TRUNC('week', NOW());
  ELSE
    -- Default to all time
    SELECT COUNT(*) INTO v_count
    FROM user_share_tracking
    WHERE user_id = auth.uid();
  END IF;
  
  RETURN jsonb_build_object(
    'count', COALESCE(v_count, 0),
    'period', period,
    'user_id', auth.uid()
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_share_count(TEXT) TO authenticated;

-- Verify deployment
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_share_count') THEN
    RAISE NOTICE '✅ get_user_share_count() deployed successfully';
  ELSE
    RAISE WARNING '❌ get_user_share_count() deployment failed';
  END IF;
END $$;
