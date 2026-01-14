-- ========================================
-- 🆓 FREE TIER MEMBERSHIP CREATION RPC
-- ========================================
-- Purpose: Create membership for users signing up without invite code
-- Safe to run multiple times (idempotent)
-- Run in: Supabase SQL Editor
-- ========================================

-- Drop existing function if it exists (idempotent)
DROP FUNCTION IF EXISTS create_free_membership(UUID);

-- Create the RPC function
CREATE OR REPLACE FUNCTION create_free_membership(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_tier TEXT;
BEGIN
  -- Check if user already has a membership (don't overwrite paid tiers)
  SELECT tier INTO v_existing_tier
  FROM user_memberships
  WHERE user_id = p_user_id;
  
  IF v_existing_tier IS NOT NULL THEN
    -- User already has membership, return existing tier
    RETURN jsonb_build_object(
      'success', true,
      'tier', v_existing_tier,
      'message', 'Existing membership preserved'
    );
  END IF;
  
  -- Create free tier membership
  INSERT INTO user_memberships (
    user_id,
    tier,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    'free',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Extra safety: idempotent
  
  RETURN jsonb_build_object(
    'success', true,
    'tier', 'free',
    'message', 'Free membership created'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_free_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_free_membership(UUID) TO service_role;

-- ========================================
-- ✅ VERIFICATION
-- ========================================
-- Check function exists:

SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'create_free_membership';

-- ========================================
-- 🧪 TEST (run as authenticated user)
-- ========================================
-- SELECT * FROM create_free_membership(auth.uid());
-- Expected: { "success": true, "tier": "free", "message": "Free membership created" }

-- ========================================
-- 📋 USAGE IN signup-init.js
-- ========================================
-- For free signups (no invite code):
--
-- const { data, error } = await supabaseClient.rpc('create_free_membership', {
--   p_user_id: userId
-- });
--
-- if (data?.success) {
--   console.log('✅ Free membership created:', data.tier);
-- }
