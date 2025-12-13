-- ============================================================================
-- 🏆 PROFILE AUTO-CREATION TRIGGER (Gold Standard)
-- ============================================================================
-- PURPOSE: Auto-create profile record when user signs up
-- IMPACT: Eliminates placeholder data, profile page shows real user info
-- SCHEMA: Matches production-schema.sql profiles table
-- ============================================================================

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile row with default values matching production schema
  INSERT INTO public.profiles (
    id,                -- Primary key = auth.users.id
    username,          -- Default to email prefix
    display_name,      -- From signup metadata (if provided)
    avatar_url,        -- NULL until user uploads
    bio,               -- Empty until user fills
    location,          -- Empty until user fills
    website,           -- Empty until user fills
    created_at,        -- Timestamp of signup
    updated_at         -- Timestamp of signup
  )
  VALUES (
    NEW.id,                                                    -- user_id from auth.users
    SPLIT_PART(NEW.email, '@', 1),                            -- username = email prefix (e.g., 'degenmentality' from 'degenmentality@gmail.com')
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),   -- display_name from signup metadata (empty if not provided)
    NULL,                                                      -- avatar_url (null until user uploads)
    '',                                                        -- bio (empty until user fills)
    '',                                                        -- location (empty until user fills)
    '',                                                        -- website (empty until user fills)
    NOW(),                                                     -- created_at
    NOW()                                                      -- updated_at
  )
  ON CONFLICT (id) DO NOTHING;           -- Idempotent: skip if profile exists
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ✅ VERIFICATION QUERY
-- ============================================================================

-- Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- ============================================================================
-- 🧪 TEST THE TRIGGER (Manual Test)
-- ============================================================================

-- 1. Create a test user via Supabase Dashboard → Authentication → Add User
-- 2. Check if profile was auto-created:
-- SELECT * FROM profiles WHERE id = '<your-test-user-id>';

-- Expected result:
-- id:           <test-user-id>
-- username:     'testuser' (from email 'testuser@example.com')
-- display_name: '' (empty until filled)
-- avatar_url:   NULL
-- bio:          ''
-- location:     ''
-- website:      ''
-- created_at:   <timestamp>
-- updated_at:   <timestamp>

-- ============================================================================
-- 📝 DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run this SQL in Supabase Dashboard → SQL Editor
-- 2. For existing users WITHOUT profiles, run:
--    INSERT INTO profiles (id, username, created_at, updated_at)
--    SELECT id, SPLIT_PART(email, '@', 1), created_at, updated_at
--    FROM auth.users
--    WHERE id NOT IN (SELECT id FROM profiles);

-- 3. Test by creating a new user account
-- 4. Verify profile appears immediately in profiles table
-- 5. Check profile page shows username instead of placeholder

-- ============================================================================
-- 🎯 INTEGRATION WITH TIER SYSTEM
-- ============================================================================

-- This trigger works alongside the tier system:
-- 1. User signs up → auth.users row created
-- 2. Trigger fires → profiles row created (with username from email)
-- 3. user_memberships row created (separately, tier = 'free' by default)
-- 4. Profile page loads → shows real username + tier badge ("🧭 Hi Pathfinder" for bronze)

-- The profile-main.js now calls HiBrandTiers.updateTierPill() to show correct tier
-- The trigger ensures username and display_name are ready when profile loads
