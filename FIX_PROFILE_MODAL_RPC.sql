-- =====================================================================
-- FIX: Profile Modal RPC Function
-- Issue: Username clicks on Hi Island show "Failed to load profile"
-- Cause: get_community_profile() RPC function doesn't exist in database
-- Solution: Create the RPC function for limited community profile access
-- =====================================================================

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_community_profile(UUID);

-- Create secure function for basic community profile info
-- This returns public display info (username, display_name, avatar, bio, tier)
-- NO private data like location, detailed stats, moments, etc.
CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  tier TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return basic display info including bio and tier (community-safe public data)
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    COALESCE(um.tier, 'free') as tier
  FROM profiles p
  LEFT JOIN user_memberships um ON um.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_community_profile(UUID) TO authenticated, anon;

-- =====================================================================
-- VERIFICATION QUERY - Run this to test it works
-- =====================================================================
-- SELECT * FROM get_community_profile('YOUR_USER_ID_HERE');
-- Example: SELECT * FROM get_community_profile('68d6ac30-742a-47b4-b1d7-0631bf7a2ec6');
