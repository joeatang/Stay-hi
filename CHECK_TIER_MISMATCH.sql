-- 🔍 QUICK TIER CHECK - Run this in Supabase SQL Editor
-- Shows your tier values in both tables side-by-side

-- Your user ID (update this if needed)
-- You can find it by running: SELECT auth.uid();

WITH user_id_var AS (
  SELECT auth.uid() as uid
)

SELECT 
  'hi_members' as source_table,
  hm.user_id,
  hm.membership_tier as tier_value,
  hm.access_tier,
  hm.is_admin,
  hm.created_at
FROM hi_members hm, user_id_var
WHERE hm.user_id = user_id_var.uid

UNION ALL

SELECT 
  'user_memberships' as source_table,
  um.user_id,
  um.tier as tier_value,
  NULL as access_tier,
  NULL as is_admin,
  um.created_at
FROM user_memberships um, user_id_var
WHERE um.user_id = user_id_var.uid
ORDER BY source_table;

-- Expected result for joeatang:
-- Should show TWO rows (one from each table)
-- Both should have tier_value = 'collective'
-- If they differ, that's the mismatch!

-- If you see ONLY ONE row, the other table is missing your entry

---

-- 🔧 BONUS: Check what RPC would return
-- This simulates what get_unified_membership() does

SELECT 
  tier,
  status,
  trial_start,
  trial_end,
  trial_days_total,
  invitation_code,
  created_at
FROM user_memberships
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;

-- This is what the RPC reads and returns as { tier: "???" }
-- Should show tier = 'collective'
-- If it shows 'premium' or nothing, that's the bug!
