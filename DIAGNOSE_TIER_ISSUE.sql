-- =====================================================================
-- DIAGNOSIS: Why is tier showing as undefined for some users?
-- Issue: Joeatang shows "Hi Pathfinder" but others show "Member"
-- =====================================================================

-- TEST 1: Check if get_community_profile function exists and returns tier
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_community_profile';

-- TEST 2: Test the function with Joeatang (WORKS)
SELECT * FROM get_community_profile('68d6ac30-742a-47b4-b1d7-0631bf7a2ec6');

-- TEST 3: Test the function with faith user (BROKEN)
SELECT * FROM get_community_profile('34330482-7370-4abd-a25d-69f8eaf19003');

-- TEST 4: Check user_memberships table for both users
SELECT 
  um.user_id,
  p.username,
  um.tier,
  um.status,
  um.created_at
FROM user_memberships um
LEFT JOIN profiles p ON p.id = um.user_id
WHERE um.user_id IN (
  '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6',  -- Joeatang
  '34330482-7370-4abd-a25d-69f8eaf19003'   -- faith
);

-- TEST 5: Check if faith user has a profile
SELECT id, username, display_name, created_at 
FROM profiles 
WHERE id = '34330482-7370-4abd-a25d-69f8eaf19003';

-- TEST 6: Check ALL users and their memberships
SELECT 
  p.id,
  p.username,
  p.display_name,
  um.tier,
  um.status,
  CASE 
    WHEN um.tier IS NULL THEN 'NO MEMBERSHIP RECORD'
    ELSE 'HAS MEMBERSHIP'
  END as membership_status
FROM profiles p
LEFT JOIN user_memberships um ON um.user_id = p.id
ORDER BY p.created_at DESC
LIMIT 10;
