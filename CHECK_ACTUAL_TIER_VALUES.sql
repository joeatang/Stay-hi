-- Check what tier values exist in invitation_codes table
SELECT 
  'ACTUAL TIER VALUES IN invitation_codes' as check,
  grants_tier,
  COUNT(*) as code_count,
  MAX(created_at) as most_recent_code
FROM invitation_codes
GROUP BY grants_tier
ORDER BY most_recent_code DESC;

-- Check specific code user used (if you remember it)
SELECT 
  code,
  grants_tier,
  trial_days,
  created_at,
  current_uses,
  max_uses
FROM invitation_codes
ORDER BY created_at DESC
LIMIT 10;
