-- Fix trial dates for existing users created via invite codes
UPDATE user_memberships
SET 
  trial_start = created_at,
  trial_end = created_at + (trial_days_total || ' days')::INTERVAL,
  updated_at = NOW()
WHERE trial_start IS NULL 
  AND trial_days_total IS NOT NULL
  AND invitation_code IS NOT NULL;

-- Verify the fix
SELECT 
  um.id,
  um.tier,
  um.status,
  um.trial_start,
  um.trial_end,
  um.trial_days_total,
  um.invitation_code,
  u.email
FROM user_memberships um
JOIN auth.users u ON u.id = um.user_id
WHERE um.invitation_code IS NOT NULL
ORDER BY um.created_at DESC;
