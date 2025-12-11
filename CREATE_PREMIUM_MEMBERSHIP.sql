-- ===================================================================
-- 🎯 CREATE PREMIUM MEMBERSHIP FOR USER
-- Run this in Supabase SQL Editor to grant Premium (Hi Pioneer) access
-- ===================================================================

-- USER ID from console: 7878a4d0-0df3-4a43-a3e9-26449d44db5f

-- Step 1: Check if membership already exists
SELECT 
  user_id,
  tier,
  status,
  created_at,
  expires_at
FROM memberships 
WHERE user_id = '7878a4d0-0df3-4a43-a3e9-26449d44db5f';

-- Step 2: Create Premium membership if it doesn't exist
-- (This is an UPSERT - will insert if not exists, update if exists)
INSERT INTO memberships (
  user_id,
  tier,
  status,
  created_at,
  expires_at,
  trial_start,
  trial_end,
  auto_renew,
  payment_method
)
VALUES (
  '7878a4d0-0df3-4a43-a3e9-26449d44db5f',  -- Your user ID
  'premium',                                 -- Hi Pioneer tier
  'active',                                  -- Active status
  NOW(),                                     -- Created now
  NOW() + INTERVAL '1 year',                 -- Expires in 1 year
  NOW(),                                     -- Trial started now
  NOW() + INTERVAL '30 days',                -- 30-day trial
  FALSE,                                     -- No auto-renew for dev
  'manual'                                   -- Manual payment (dev account)
)
ON CONFLICT (user_id) 
DO UPDATE SET
  tier = 'premium',
  status = 'active',
  expires_at = NOW() + INTERVAL '1 year',
  trial_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- Step 3: Verify membership was created
SELECT 
  user_id,
  tier,
  status,
  created_at,
  expires_at,
  trial_end,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400 AS days_remaining
FROM memberships 
WHERE user_id = '7878a4d0-0df3-4a43-a3e9-26449d44db5f';

-- Step 4: Test the membership lookup function
SELECT * FROM get_unified_membership() 
WHERE user_id = '7878a4d0-0df3-4a43-a3e9-26449d44db5f';

-- EXPECTED RESULT:
-- ✅ tier: 'premium'
-- ✅ status: 'active'  
-- ✅ days_remaining: 365
-- ✅ features: { shareCreation: 'unlimited', hiMedallionInteractions: 'unlimited', ... }

-- ===================================================================
-- ALTERNATIVE: If memberships table doesn't exist yet, create it first
-- ===================================================================

-- CREATE TABLE IF NOT EXISTS memberships (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
--   tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'bronze', 'silver', 'gold', 'premium', 'collective')),
--   status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'expired', 'cancelled')),
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW(),
--   expires_at TIMESTAMPTZ,
--   trial_start TIMESTAMPTZ,
--   trial_end TIMESTAMPTZ,
--   auto_renew BOOLEAN DEFAULT FALSE,
--   payment_method TEXT
-- );

-- -- Enable RLS
-- ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- -- RLS Policies
-- CREATE POLICY "Users can view own membership" 
--   ON memberships FOR SELECT 
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own membership" 
--   ON memberships FOR INSERT 
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update own membership" 
--   ON memberships FOR UPDATE 
--   USING (auth.uid() = user_id);
