-- ============================================================================
-- FIX: Profile Auto-Creation on Signup
-- ============================================================================
-- PROBLEM: New signups don't auto-create profiles table row
-- IMPACT: Profile page shows "loading..." until manual insert
-- SOLUTION: Database trigger that creates profile when auth.users row inserted
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
  -- Insert profile row with default values
  INSERT INTO public.profiles (
    user_id,
    email,
    username,
    full_name,
    avatar_url,
    bio,
    location,
    website,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,                                    -- user_id from auth.users
    NEW.email,                                 -- email from auth.users
    SPLIT_PART(NEW.email, '@', 1),            -- username = email prefix
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),  -- full_name from signup metadata
    NULL,                                      -- avatar_url (null until user uploads)
    '',                                        -- bio (empty until user fills)
    '',                                        -- location (empty until user fills)
    '',                                        -- website (empty until user fills)
    NOW(),                                     -- created_at
    NOW()                                      -- updated_at
  )
  ON CONFLICT (user_id) DO NOTHING;           -- Idempotent: skip if profile exists
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after deploying to verify trigger is active:
--
-- SELECT 
--   trigger_name,
--   event_manipulation,
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';
--
-- Expected output:
--   trigger_name: on_auth_user_created
--   event_manipulation: INSERT
--   event_object_table: users
--   action_statement: EXECUTE FUNCTION public.handle_new_user()
-- ============================================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Profile auto-creation trigger deployed successfully';
  RAISE NOTICE '📝 New signups will automatically create profiles table row';
  RAISE NOTICE '🔍 Verify with: SELECT * FROM information_schema.triggers WHERE trigger_name = ''on_auth_user_created'';';
END $$;
