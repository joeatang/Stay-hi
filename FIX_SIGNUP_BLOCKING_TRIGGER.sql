-- ===============================================
-- 🚨 EMERGENCY FIX: Signup-Blocking Trigger
-- ===============================================
-- PROBLEM: relation "global_stats" does not exist error
-- CAUSE: A trigger on profiles is trying to access global_stats
--        When it fails, it rolls back the ENTIRE transaction
--        including the auth.users INSERT = signup fails
-- 
-- SOLUTION: Drop the problematic trigger, recreate with 
--           bulletproof error handling that NEVER blocks signups
-- ===============================================

-- Step 1: Check what triggers exist on profiles table
-- Run this SELECT first to see what we're dealing with:
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- Step 2: Drop the problematic trigger (if it exists)
DROP TRIGGER IF EXISTS on_new_profile_increment_stats ON profiles;

-- Step 3: Drop the old function (if it exists)  
DROP FUNCTION IF EXISTS increment_total_users_on_signup();

-- Step 4: Create bulletproof function that NEVER fails
-- Uses EXCEPTION handling to swallow any errors
CREATE OR REPLACE FUNCTION increment_total_users_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to increment total_users
  -- If ANYTHING fails, we just log and continue
  -- NEVER block a signup for stats!
  BEGIN
    UPDATE public.global_stats 
    SET total_users = COALESCE(total_users, 0) + 1,
        updated_at = NOW()
    WHERE id = 1;
  EXCEPTION WHEN OTHERS THEN
    -- Swallow error - stats are nice-to-have, signups are critical
    RAISE LOG 'increment_total_users failed (non-fatal): %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Step 5: Recreate the trigger with the bulletproof function
CREATE TRIGGER on_new_profile_increment_stats
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION increment_total_users_on_signup();

-- Step 6: Verify the trigger is created
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name = 'on_new_profile_increment_stats';

-- ===============================================
-- 🧪 TEST: After deploying, try signup again!
-- The invite code 198BC73B should work now.
-- ===============================================
