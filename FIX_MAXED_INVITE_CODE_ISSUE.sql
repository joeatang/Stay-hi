-- FIX: Generate Fresh Invite Codes for Blocked Signup Users
-- Issue: Users tried code 886664B0 which hit max_uses
-- Created: 2026-01-18

-- Option 1: Check current status of problematic code
SELECT 
  code,
  max_uses,
  current_uses,
  is_active,
  valid_until,
  grants_tier,
  created_by
FROM invitation_codes
WHERE code = '886664B0';

-- Option 2: Increase max_uses on existing code (if it's a special referral code)
-- UPDATE invitation_codes 
-- SET max_uses = max_uses + 10
-- WHERE code = '886664B0'
-- RETURNING code, max_uses, current_uses;

-- Option 3: Generate 2 fresh Bronze codes for affected users
-- (Run this to create immediate solution)
INSERT INTO invitation_codes (
  code,
  max_uses,
  is_active,
  valid_until,
  grants_tier,
  trial_days,
  created_by,
  notes
) VALUES 
  (
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)), -- Random 8-char code
    5,
    true,
    NOW() + INTERVAL '30 days',
    'bronze',
    90,
    (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com' LIMIT 1),
    'Generated for blocked signup users (code 886664B0 maxed out) - 2026-01-18'
  ),
  (
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    5,
    true,
    NOW() + INTERVAL '30 days',
    'bronze',
    90,
    (SELECT id FROM auth.users WHERE email = 'degenmentality@gmail.com' LIMIT 1),
    'Generated for blocked signup users (code 886664B0 maxed out) - 2026-01-18'
  )
RETURNING code, max_uses, grants_tier, valid_until, notes;

-- Share these codes with italo505@aol.com and the other affected user
