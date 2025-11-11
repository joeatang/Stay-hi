-- 🏗️ PRODUCTION DATABASE SCHEMA - AUTHORITATIVE VERSION
-- Tesla-Grade Hi OS Social Platform
-- Version: 2.0 (Post-Cleanup)
-- Date: November 10, 2025

-- =========================================
-- CORE PRODUCTION TABLES
-- =========================================

-- Primary feed system for public/anonymous shares
CREATE TABLE IF NOT EXISTS public_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'anonymous', 'private')),
  share_type TEXT DEFAULT 'hi5' CHECK (share_type IN ('hi5', 'moment', 'reflection')),
  location_data JSONB,
  metadata JSONB,
  total_his INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Personal archives for all user shares (private storage)
CREATE TABLE IF NOT EXISTS hi_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  share_type TEXT DEFAULT 'hi5' CHECK (share_type IN ('hi5', 'moment', 'reflection', 'private')),
  visibility TEXT NOT NULL DEFAULT 'private',
  original_share_id UUID, -- Reference to public_shares if applicable
  location_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Global community statistics (real-time metrics)
CREATE TABLE IF NOT EXISTS global_community_stats (
  id SERIAL PRIMARY KEY,
  total_waves BIGINT DEFAULT 0,
  total_his BIGINT DEFAULT 0, 
  total_users BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,
  active_users_24h BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- User profiles (Supabase Auth integration)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================
-- PERFORMANCE INDEXES (Tesla-Grade Optimization)
-- =========================================

-- Public shares feed queries (most critical)
CREATE INDEX IF NOT EXISTS idx_public_shares_created_at ON public_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_shares_visibility_created ON public_shares(visibility, created_at DESC) WHERE visibility IN ('public', 'anonymous');
CREATE INDEX IF NOT EXISTS idx_public_shares_user_visibility ON public_shares(user_id, visibility);

-- Personal archives queries
CREATE INDEX IF NOT EXISTS idx_hi_archives_user_created ON hi_archives(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_archives_user_type ON hi_archives(user_id, share_type);

-- Community stats queries
CREATE INDEX IF NOT EXISTS idx_global_stats_updated ON global_community_stats(updated_at DESC);

-- Profile queries  
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- =========================================
-- ROW LEVEL SECURITY (Production Security)
-- =========================================

-- Enable RLS on all tables
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public shares policies (anonymous + authenticated read)
CREATE POLICY "Public shares are viewable by everyone" ON public_shares
  FOR SELECT USING (visibility IN ('public', 'anonymous'));

CREATE POLICY "Users can insert their own public shares" ON public_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public shares" ON public_shares
  FOR UPDATE USING (auth.uid() = user_id);

-- Personal archives policies (user-only access)
CREATE POLICY "Users can view their own archives" ON hi_archives
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own archives" ON hi_archives
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own archives" ON hi_archives
  FOR UPDATE USING (auth.uid() = user_id);

-- Profile policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =========================================
-- DATABASE FUNCTIONS (Core Functionality)
-- =========================================

-- Increment Hi counter (community engagement)
CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE global_community_stats 
  SET 
    total_his = total_his + 1,
    updated_at = now()
  WHERE id = 1;
  
  -- Create row if doesn't exist
  INSERT INTO global_community_stats (id, total_his, updated_at)
  SELECT 1, 1, now()
  WHERE NOT EXISTS (SELECT 1 FROM global_community_stats WHERE id = 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Hi counting
DROP TRIGGER IF EXISTS trigger_increment_hi ON public_shares;
CREATE TRIGGER trigger_increment_hi
  AFTER INSERT ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION increment_total_hi();

-- Update user count function
CREATE OR REPLACE FUNCTION update_user_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE global_community_stats
  SET 
    total_users = (SELECT COUNT(*) FROM profiles),
    updated_at = now()
  WHERE id = 1;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user count updates
DROP TRIGGER IF EXISTS trigger_update_user_count ON profiles;
CREATE TRIGGER trigger_update_user_count
  AFTER INSERT OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_count();

-- =========================================
-- TIER SYSTEM PREPARATION (Phase 3 Ready)
-- =========================================

-- Access tier tables will be added in Phase 3
-- Foundation is clean and ready for:
-- - hi_access_codes (temporal access codes)
-- - hi_members (enhanced user data)
-- - hi_access_logs (usage tracking)

-- =========================================
-- PRODUCTION VALIDATION
-- =========================================

-- Verify schema integrity
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('public_shares', 'hi_archives', 'global_community_stats', 'profiles')
ORDER BY tablename;

-- Initialize community stats if empty
INSERT INTO global_community_stats (id, total_waves, total_his, total_users, updated_at)
SELECT 1, 0, 0, 0, now()
WHERE NOT EXISTS (SELECT 1 FROM global_community_stats WHERE id = 1);

-- Success confirmation
SELECT 
  'Production schema deployed successfully' as status,
  'Ready for Phase 3: Access tier system' as next_phase,
  now() as timestamp;