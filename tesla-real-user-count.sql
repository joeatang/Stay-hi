-- TESLA GRADE: Real User Count Function
-- Counts authenticated users + unique anonymous locations
-- Replaces hardcoded 1,000 user count with accurate data

-- Function to get accurate user count
CREATE OR REPLACE FUNCTION get_real_user_count()
RETURNS INTEGER AS $$
DECLARE
  authenticated_users INTEGER := 0;
  anonymous_users INTEGER := 0;
  total_users INTEGER := 0;
BEGIN
  -- Count authenticated users from auth.users
  SELECT COUNT(DISTINCT id) INTO authenticated_users 
  FROM auth.users 
  WHERE confirmed_at IS NOT NULL;
  
  -- Count unique anonymous users by location (proxy for unique anonymous users)
  SELECT COUNT(DISTINCT location) INTO anonymous_users
  FROM public_shares 
  WHERE user_id IS NULL 
  AND location IS NOT NULL 
  AND location != '';
  
  -- Total = authenticated + estimated anonymous
  total_users := authenticated_users + anonymous_users;
  
  -- Ensure minimum of 1 user (current user)
  IF total_users < 1 THEN
    total_users := 1;
  END IF;
  
  RETURN total_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_real_user_count() TO anon, authenticated;

-- Test the function
SELECT get_real_user_count() as real_user_count;

-- Verify the data sources
SELECT 
  'Authenticated Users' as source,
  COUNT(DISTINCT id) as count
FROM auth.users 
WHERE confirmed_at IS NOT NULL

UNION ALL

SELECT 
  'Anonymous Locations' as source,
  COUNT(DISTINCT location) as count
FROM public_shares 
WHERE user_id IS NULL 
AND location IS NOT NULL 
AND location != ''

UNION ALL

SELECT 
  'Total (Function Result)' as source,
  get_real_user_count() as count;