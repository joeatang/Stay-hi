-- ⚡ TESLA-GRADE COMMUNITY-SAFE SECURITY FORTRESS
-- 🚨 CRITICAL: This maintains Hi Island community feed while protecting private data
-- 🔒 PURPOSE: Strategic sharing with bulletproof privacy for profiles
-- 💡 SOLUTION: Public shares allowed, private profiles protected

-- =============================================================================
-- STEP 1: DROP DANGEROUS PROFILE-RELATED PUBLIC POLICIES ONLY
-- =============================================================================

-- Remove public profile viewing (MAJOR SECURITY HOLE) - KEEP PUBLIC_SHARES
DROP POLICY IF EXISTS "Anyone can view public profiles" ON profiles;

-- Remove public stats viewing (PRIVACY VIOLATION)
DROP POLICY IF EXISTS "Anyone can view public profile stats" ON user_stats;

-- Remove public moments viewing (PERSONAL DATA LEAK)
DROP POLICY IF EXISTS "Anyone can view public moments" ON hi_moments;

-- Remove public achievements viewing (USER DATA EXPOSURE)
DROP POLICY IF EXISTS "Anyone can view public profile achievements" ON user_achievements;

-- =============================================================================
-- STEP 2: REMOVE PRIVACY VULNERABILITY COLUMNS
-- =============================================================================

-- Remove is_public from profiles - major security hole
ALTER TABLE profiles DROP COLUMN IF EXISTS is_public;

-- Remove is_public from hi_moments - personal data leak
ALTER TABLE hi_moments DROP COLUMN IF EXISTS is_public;

-- =============================================================================
-- STEP 3: TESLA-GRADE PROFILE SECURITY (FORTRESS LEVEL)
-- =============================================================================

-- PROFILES: Strict privacy - only own profile access
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
CREATE POLICY "Tesla_profiles_fortress" ON profiles
  FOR ALL 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- USER_STATS: Private stats only
DROP POLICY IF EXISTS "Users can manage own stats" ON user_stats;
CREATE POLICY "Tesla_stats_fortress" ON user_stats
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- HI_MOMENTS: Private moments only
DROP POLICY IF EXISTS "Users can manage own moments" ON hi_moments;
CREATE POLICY "Tesla_moments_fortress" ON hi_moments
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER_ACHIEVEMENTS: Private achievements only
DROP POLICY IF EXISTS "Users can manage own achievements" ON user_achievements;
CREATE POLICY "Tesla_achievements_fortress" ON user_achievements
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DAILY_HI_MOMENTS: Private moments only
DROP POLICY IF EXISTS "Users can manage own daily moments" ON daily_hi_moments;
CREATE POLICY "Tesla_daily_moments_fortress" ON daily_hi_moments
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ISLAND_ACTIVITIES: Private activities only
DROP POLICY IF EXISTS "Users can manage own activities" ON island_activities;
CREATE POLICY "Tesla_island_activities_fortress" ON island_activities
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MUSCLE_ACTIVITIES: Private workouts only
DROP POLICY IF EXISTS "Users can manage own workouts" ON muscle_activities;
CREATE POLICY "Tesla_muscle_activities_fortress" ON muscle_activities
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ACTIVITY_SESSIONS: Private sessions only
DROP POLICY IF EXISTS "Users can manage own sessions" ON activity_sessions;
CREATE POLICY "Tesla_activity_sessions_fortress" ON activity_sessions
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER_STREAKS: Private streaks only
DROP POLICY IF EXISTS "Users can manage own streaks" ON user_streaks;
CREATE POLICY "Tesla_user_streaks_fortress" ON user_streaks
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- STEP 4: COMMUNITY SHARING - SECURE BUT FUNCTIONAL
-- =============================================================================

-- PUBLIC_SHARES: Maintain Hi Island community feed functionality
-- Users can create their own shares, everyone can read community content
DROP POLICY IF EXISTS "Users can insert own shares" ON public_shares;
DROP POLICY IF EXISTS "Public read access for shares" ON public_shares;
DROP POLICY IF EXISTS "Users can update own shares" ON public_shares;
DROP POLICY IF EXISTS "Users can delete own shares" ON public_shares;

-- Tesla-grade community sharing policies
CREATE POLICY "Tesla_shares_create_own" ON public_shares
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tesla_shares_read_community" ON public_shares
  FOR SELECT 
  USING (true); -- Everyone can read community shares

CREATE POLICY "Tesla_shares_update_own" ON public_shares
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tesla_shares_delete_own" ON public_shares
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 5: SECURE AVATAR STORAGE (COMMUNITY-SAFE)
-- =============================================================================

-- Drop existing avatar policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Tesla-grade avatar security: Own folder management
CREATE POLICY "Tesla_avatar_upload_own" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Tesla_avatar_update_own" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Tesla_avatar_delete_own" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- STRATEGIC: Allow avatar viewing for community shares (but not profile access)
CREATE POLICY "Tesla_avatar_view_community" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'avatars'); -- Avatar images visible for community feed

-- =============================================================================
-- STEP 6: CREATE LIMITED PROFILE VIEW FOR COMMUNITY FEATURES
-- =============================================================================

-- Create a secure view for community profile info (username/avatar only)
CREATE OR REPLACE VIEW community_profiles AS 
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  created_at
FROM profiles;

-- Secure the view with RLS
ALTER VIEW community_profiles SET (security_invoker = true);

-- Enable RLS on the view
-- Note: Views inherit RLS from base tables

-- Community profile access policy (read-only, limited data)
CREATE POLICY "Tesla_community_profile_view" ON profiles
  FOR SELECT
  USING (true); -- Allow read of basic profile info for community features

-- But ensure no direct profile table writes from others
DROP POLICY IF EXISTS "Tesla_community_profile_view" ON profiles;

-- Instead, create a function for safe profile access
CREATE OR REPLACE FUNCTION get_community_profile(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only return basic public info for community features
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE p.id = target_user_id;
END;
$$;

-- =============================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

-- Ensure RLS is enabled on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_hi_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE island_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 8: AUDIT LOG
-- =============================================================================

-- Log this security fix
INSERT INTO admin_access_logs (
  user_id, 
  action, 
  resource, 
  details, 
  ip_address, 
  user_agent,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'COMMUNITY_SAFE_SECURITY_FORTRESS',
  'ALL_TABLES_COMMUNITY_PRESERVED',
  'Eliminated profile privacy vulnerabilities while preserving Hi Island community feed. Public shares maintained for community. Profile access locked to owners only. Avatar viewing enabled for community features.',
  '127.0.0.1',
  'Tesla Community-Safe Security Fortress v1.0',
  NOW()
);

-- SUCCESS MESSAGE
SELECT 
  '🛡️ TESLA COMMUNITY-SAFE SECURITY FORTRESS DEPLOYED' as status,
  '🔒 PRIVATE DATA PROTECTED, COMMUNITY PRESERVED' as security,
  '⚡ HI ISLAND FEED FUNCTIONAL, PROFILES SECURE' as functionality,
  NOW() as deployed_at;