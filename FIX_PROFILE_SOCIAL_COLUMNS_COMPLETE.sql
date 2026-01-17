-- =====================================================================
-- COMPLETE FIX: Profile Modal + Social Links
-- Run this ONCE in Supabase SQL Editor
-- 
-- This script:
-- 1. Adds social link columns to profiles table (if missing)
-- 2. Updates get_own_profile() to work with or without those columns
-- =====================================================================

-- STEP 1: Add social link columns to profiles table (safe - won't error if exist)
DO $$
BEGIN
    -- Add twitter_handle if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'twitter_handle'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN twitter_handle TEXT;
        RAISE NOTICE 'Added twitter_handle column';
    ELSE
        RAISE NOTICE 'twitter_handle already exists';
    END IF;

    -- Add instagram_handle if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'instagram_handle'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN instagram_handle TEXT;
        RAISE NOTICE 'Added instagram_handle column';
    ELSE
        RAISE NOTICE 'instagram_handle already exists';
    END IF;

    -- Add linkedin_url if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'linkedin_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN linkedin_url TEXT;
        RAISE NOTICE 'Added linkedin_url column';
    ELSE
        RAISE NOTICE 'linkedin_url already exists';
    END IF;

    -- Add website_url if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'website_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN website_url TEXT;
        RAISE NOTICE 'Added website_url column';
    ELSE
        RAISE NOTICE 'website_url already exists';
    END IF;
END $$;

-- STEP 2: Drop and recreate get_own_profile with all columns
DROP FUNCTION IF EXISTS get_own_profile();

CREATE OR REPLACE FUNCTION get_own_profile()
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  tier TEXT,
  active_today BOOLEAN,
  total_waves INT,
  hi_moments INT,
  current_streak INT,
  longest_streak INT,
  member_since TIMESTAMPTZ,
  points_balance BIGINT,
  twitter_handle TEXT,
  instagram_handle TEXT,
  linkedin_url TEXT,
  website_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.location,
    COALESCE(um.tier, 'free') as tier,
    CASE 
      WHEN p.updated_at > NOW() - INTERVAL '24 hours' THEN true
      WHEN EXISTS (
        SELECT 1 FROM public_shares ps 
        WHERE ps.user_id = current_user_id 
        AND ps.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM wave_reactions wr 
        WHERE wr.user_id = current_user_id 
        AND wr.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM peace_reactions pr 
        WHERE pr.user_id = current_user_id 
        AND pr.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM hi_points_ledger hpl 
        WHERE hpl.user_id = current_user_id 
        AND hpl.ts > NOW() - INTERVAL '24 hours'
        AND hpl.reason LIKE '%daily%'
        LIMIT 1
      ) THEN true
      ELSE false
    END as active_today,
    COALESCE(us.total_waves, 0) as total_waves,
    COALESCE(us.total_hi_moments, 0) as hi_moments,
    COALESCE(us.current_streak, 0) as current_streak,
    COALESCE(us.longest_streak, 0) as longest_streak,
    p.created_at as member_since,
    COALESCE(hp.balance, 0) as points_balance,
    p.twitter_handle,
    p.instagram_handle,
    p.linkedin_url,
    p.website_url
  FROM profiles p
  LEFT JOIN user_stats us ON us.user_id = p.id
  LEFT JOIN user_memberships um ON um.user_id = p.id
  LEFT JOIN hi_points hp ON hp.user_id = p.id
  WHERE p.id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_own_profile() TO authenticated;

-- STEP 3: Verify
SELECT 
  '✅ COMPLETE: Profiles table has social columns, get_own_profile() updated' as status,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('twitter_handle', 'instagram_handle', 'linkedin_url', 'website_url')) as social_columns_count;
