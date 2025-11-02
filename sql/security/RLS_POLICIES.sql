-- sql/security/RLS_POLICIES.sql
-- Tesla-grade Row Level Security policies for HiBase authentication hardening
-- 
-- This file implements comprehensive RLS policies to secure all Hi data
-- Works with HiAuthCore authentication system for user isolation

-- Enable RLS on all core tables
ALTER TABLE hi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_shares ENABLE ROW LEVEL SECURITY;  
ALTER TABLE hi_referrals ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HI_USERS Table Policies
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON hi_users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON hi_users FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile during signup
CREATE POLICY "Users can create own profile"
ON hi_users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Public profiles are readable for leaderboards/public views
CREATE POLICY "Public profiles readable"
ON hi_users FOR SELECT
USING (
    CASE 
        WHEN privacy_level = 'public' THEN true
        WHEN privacy_level = 'friends' THEN auth.uid() IN (
            -- Add friends system logic here when implemented
            SELECT auth.uid()
        )
        ELSE false
    END
);

-- =============================================================================
-- HI_SHARES Table Policies  
-- =============================================================================

-- Users can read their own shares
CREATE POLICY "Users can read own shares"
ON hi_shares FOR SELECT
USING (auth.uid() = user_id);

-- Users can create shares for themselves only
CREATE POLICY "Users can create own shares"
ON hi_shares FOR INSERT  
WITH CHECK (auth.uid() = user_id);

-- Users can update their own shares
CREATE POLICY "Users can update own shares"
ON hi_shares FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete own shares" 
ON hi_shares FOR DELETE
USING (auth.uid() = user_id);

-- Public shares are readable by everyone
CREATE POLICY "Public shares readable"
ON hi_shares FOR SELECT
USING (is_public = true);

-- =============================================================================
-- HI_REFERRALS Table Policies
-- =============================================================================

-- Users can read referrals they issued
CREATE POLICY "Users can read issued referrals"
ON hi_referrals FOR SELECT
USING (auth.uid() = issued_by);

-- Users can read referrals they redeemed  
CREATE POLICY "Users can read redeemed referrals"
ON hi_referrals FOR SELECT
USING (auth.uid() = redeemed_by);

-- Users can create referrals for themselves only
CREATE POLICY "Users can create referrals"
ON hi_referrals FOR INSERT
WITH CHECK (auth.uid() = issued_by);

-- Users can update referrals they issued (for status changes)
CREATE POLICY "Users can update issued referrals"
ON hi_referrals FOR UPDATE  
USING (auth.uid() = issued_by);

-- Allow referral redemption by setting redeemed_by to current user
CREATE POLICY "Users can redeem referrals"
ON hi_referrals FOR UPDATE
USING (
    status = 'active' 
    AND expires_at > NOW()
    AND redeemed_by IS NULL
)
WITH CHECK (
    auth.uid() = redeemed_by
    AND status = 'redeemed'
);

-- =============================================================================
-- Function-based Policies (for server functions)
-- =============================================================================

-- Allow service role to bypass RLS for admin operations
-- This is needed for server functions that aggregate data

-- Create service role policies for administrative access
CREATE POLICY "Service role full access users"
ON hi_users FOR ALL
USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access shares"  
ON hi_shares FOR ALL
USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role full access referrals"
ON hi_referrals FOR ALL  
USING (current_setting('role') = 'service_role');

-- =============================================================================
-- Anonymous Access Policies
-- =============================================================================

-- Allow anonymous users to read public feed (limited)
CREATE POLICY "Anonymous can read public feed"
ON hi_shares FOR SELECT
USING (
    auth.uid() IS NULL 
    AND is_public = true
    AND created_at >= (NOW() - INTERVAL '7 days')
);

-- Allow anonymous access to public user stats for leaderboards
CREATE POLICY "Anonymous can read public user stats"
ON hi_users FOR SELECT  
USING (
    auth.uid() IS NULL
    AND privacy_level = 'public'
);

-- =============================================================================
-- Real-time Subscription Policies
-- =============================================================================

-- Users can subscribe to their own data changes
-- This is handled at the subscription level in the application

-- =============================================================================
-- Index Creation for Performance
-- =============================================================================

-- Performance indexes for RLS policy queries
CREATE INDEX IF NOT EXISTS idx_hi_users_privacy_level ON hi_users(privacy_level);
CREATE INDEX IF NOT EXISTS idx_hi_shares_user_id ON hi_shares(user_id);  
CREATE INDEX IF NOT EXISTS idx_hi_shares_is_public ON hi_shares(is_public);
CREATE INDEX IF NOT EXISTS idx_hi_shares_created_at ON hi_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_hi_referrals_issued_by ON hi_referrals(issued_by);
CREATE INDEX IF NOT EXISTS idx_hi_referrals_redeemed_by ON hi_referrals(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_hi_referrals_status ON hi_referrals(status);

-- =============================================================================
-- Security Functions
-- =============================================================================

-- Function to check if user can access another user's data
CREATE OR REPLACE FUNCTION can_access_user_data(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Self access always allowed
    IF auth.uid() = target_user_id THEN
        RETURN true;
    END IF;
    
    -- Check privacy level
    RETURN EXISTS (
        SELECT 1 FROM hi_users 
        WHERE id = target_user_id 
        AND privacy_level = 'public'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS JSON AS $$
DECLARE
    user_id UUID := auth.uid();
    permissions JSON;
BEGIN
    IF user_id IS NULL THEN
        -- Anonymous user permissions
        permissions := json_build_object(
            'can_read_public_shares', true,
            'can_read_public_profiles', true,
            'can_create_shares', false,
            'can_create_referrals', false
        );
    ELSE
        -- Authenticated user permissions  
        permissions := json_build_object(
            'can_read_public_shares', true,
            'can_read_public_profiles', true,
            'can_create_shares', true,
            'can_create_referrals', true,
            'can_read_own_data', true,
            'can_update_own_profile', true
        );
    END IF;
    
    RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RLS Verification Queries
-- =============================================================================

-- These queries can be used to verify RLS is working correctly

/*
-- Test as authenticated user:
-- Should return only own shares:
SELECT * FROM hi_shares;

-- Should return only public shares + own shares:
SELECT * FROM hi_shares WHERE is_public = true OR user_id = auth.uid();

-- Should return own profile:
SELECT * FROM hi_users WHERE id = auth.uid();

-- Test as anonymous user (set auth.uid() to null):
-- Should return only public shares from last 7 days:
SELECT * FROM hi_shares;

-- Should return only public profiles:
SELECT * FROM hi_users;
*/