-- UNIFIED MEMBERSHIP SYSTEM DEPLOYMENT SCRIPT
-- Execute this manually in Supabase SQL Editor
-- This creates the foundation for our unified time-based membership system

-- 1. Create unified_memberships table
CREATE TABLE IF NOT EXISTS public.unified_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'anonymous',
    expires_at TIMESTAMP WITH TIME ZONE,
    invite_code TEXT UNIQUE,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_tier CHECK (
        tier IN ('anonymous', '24hr', '7d', '14d', '30d', '60d', '90d', 'member')
    )
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_memberships_user_id ON unified_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_memberships_tier ON unified_memberships(tier);
CREATE INDEX IF NOT EXISTS idx_unified_memberships_expires_at ON unified_memberships(expires_at);
CREATE INDEX IF NOT EXISTS idx_unified_memberships_invite_code ON unified_memberships(invite_code);

-- 3. Enable RLS
ALTER TABLE unified_memberships ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view own membership" ON unified_memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON unified_memberships
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policy for full access
CREATE POLICY "Admins can manage all memberships" ON unified_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- 5. Create get_unified_membership function
CREATE OR REPLACE FUNCTION get_unified_membership(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    membership_record unified_memberships%ROWTYPE;
    result JSON;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    -- If no user (anonymous), return anonymous status
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'tier', 'anonymous',
            'status', 'anonymous',
            'expires_at', NULL,
            'days_remaining', NULL,
            'can_access_calendar', false,
            'can_access_hi_muscle', false,
            'upgrade_available', true
        );
    END IF;
    
    -- Get the most recent active membership
    SELECT * INTO membership_record
    FROM unified_memberships 
    WHERE user_id = target_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY 
        CASE tier
            WHEN 'member' THEN 8
            WHEN '90d' THEN 7
            WHEN '60d' THEN 6
            WHEN '30d' THEN 5
            WHEN '14d' THEN 4
            WHEN '7d' THEN 3
            WHEN '24hr' THEN 2
            ELSE 1
        END DESC,
        created_at DESC
    LIMIT 1;
    
    -- If no active membership found, check if user exists
    IF membership_record.id IS NULL THEN
        -- Check if user exists in auth.users
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
            -- Registered user with no active membership
            RETURN json_build_object(
                'tier', 'registered',
                'status', 'no_membership',
                'expires_at', NULL,
                'days_remaining', NULL,
                'can_access_calendar', false,
                'can_access_hi_muscle', false,
                'upgrade_available', true,
                'signup_required', false
            );
        ELSE
            -- User not found
            RETURN json_build_object(
                'tier', 'anonymous',
                'status', 'anonymous',
                'expires_at', NULL,
                'days_remaining', NULL,
                'can_access_calendar', false,
                'can_access_hi_muscle', false,
                'upgrade_available', true,
                'signup_required', true
            );
        END IF;
    END IF;
    
    -- Calculate access permissions and status
    result := json_build_object(
        'id', membership_record.id,
        'tier', membership_record.tier,
        'expires_at', membership_record.expires_at,
        'activated_at', membership_record.activated_at,
        'metadata', membership_record.metadata
    );
    
    -- Add computed fields based on tier
    CASE membership_record.tier
        WHEN 'member' THEN
            result := result || json_build_object(
                'status', 'active',
                'days_remaining', NULL,
                'can_access_calendar', true,
                'can_access_hi_muscle', true,
                'upgrade_available', false,
                'is_lifetime', true
            );
        WHEN 'anonymous' THEN
            result := result || json_build_object(
                'status', 'anonymous',
                'days_remaining', NULL,
                'can_access_calendar', false,
                'can_access_hi_muscle', false,
                'upgrade_available', true
            );
        ELSE
            -- Time-based tiers (24hr, 7d, 14d, 30d, 60d, 90d)
            DECLARE
                days_left INTEGER;
                is_expired BOOLEAN;
            BEGIN
                days_left := EXTRACT(DAY FROM (membership_record.expires_at - NOW()));
                is_expired := membership_record.expires_at <= NOW();
                
                result := result || json_build_object(
                    'status', CASE WHEN is_expired THEN 'expired' ELSE 'active' END,
                    'days_remaining', CASE WHEN is_expired THEN 0 ELSE GREATEST(0, days_left) END,
                    'can_access_calendar', NOT is_expired,
                    'can_access_hi_muscle', true, -- Hi Muscle available for all paid tiers
                    'upgrade_available', true,
                    'is_lifetime', false
                );
            END;
    END CASE;
    
    RETURN result;
END;
$$;

-- 6. Create activate_invite_code function
CREATE OR REPLACE FUNCTION activate_invite_code(p_invite_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    invite_record unified_memberships%ROWTYPE;
    expires_at TIMESTAMP WITH TIME ZONE;
    result JSON;
BEGIN
    current_user_id := auth.uid();
    
    -- Must be authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'authentication_required',
            'message', 'You must be logged in to activate invite codes'
        );
    END IF;
    
    -- Find the invite code
    SELECT * INTO invite_record
    FROM unified_memberships 
    WHERE invite_code = p_invite_code
    AND activated_at IS NULL;
    
    IF invite_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'invalid_code',
            'message', 'Invalid or already used invite code'
        );
    END IF;
    
    -- Calculate expiration based on tier
    CASE invite_record.tier
        WHEN 'member' THEN expires_at := NULL; -- Lifetime
        WHEN '90d' THEN expires_at := NOW() + INTERVAL '90 days';
        WHEN '60d' THEN expires_at := NOW() + INTERVAL '60 days';
        WHEN '30d' THEN expires_at := NOW() + INTERVAL '30 days';
        WHEN '14d' THEN expires_at := NOW() + INTERVAL '14 days';
        WHEN '7d' THEN expires_at := NOW() + INTERVAL '7 days';
        WHEN '24hr' THEN expires_at := NOW() + INTERVAL '24 hours';
        ELSE expires_at := NOW() + INTERVAL '7 days'; -- Default
    END CASE;
    
    -- Update the invite record to activate it
    UPDATE unified_memberships 
    SET 
        user_id = current_user_id,
        activated_at = NOW(),
        expires_at = expires_at,
        updated_at = NOW()
    WHERE id = invite_record.id;
    
    RETURN json_build_object(
        'success', true,
        'tier', invite_record.tier,
        'expires_at', expires_at,
        'message', 'Invite code activated successfully'
    );
END;
$$;

-- 7. Create admin function to generate invite codes
-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS generate_invite_code;
DROP FUNCTION IF EXISTS generate_invite_code(TEXT);
DROP FUNCTION IF EXISTS generate_invite_code(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION generate_invite_code(p_tier TEXT, p_quantity INTEGER DEFAULT 1)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
    invite_codes TEXT[];
    i INTEGER;
    new_code TEXT;
BEGIN
    current_user_id := auth.uid();
    
    -- Check if user is admin
    SELECT profiles.is_admin INTO is_admin
    FROM profiles 
    WHERE profiles.id = current_user_id;
    
    IF NOT COALESCE(is_admin, false) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'access_denied',
            'message', 'Admin access required'
        );
    END IF;
    
    -- Validate tier
    IF p_tier NOT IN ('24hr', '7d', '14d', '30d', '60d', '90d', 'member') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'invalid_tier',
            'message', 'Invalid membership tier'
        );
    END IF;
    
    -- Generate invite codes
    invite_codes := ARRAY[]::TEXT[];
    
    FOR i IN 1..p_quantity LOOP
        -- Generate unique code
        new_code := 'HI-' || p_tier || '-' || UPPER(substring(gen_random_uuid()::text from 1 for 8));
        
        -- Insert invite code record
        INSERT INTO unified_memberships (tier, invite_code, metadata)
        VALUES (
            p_tier, 
            new_code,
            json_build_object(
                'generated_by', current_user_id,
                'generated_at', NOW()
            )
        );
        
        invite_codes := array_append(invite_codes, new_code);
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'tier', p_tier,
        'quantity', p_quantity,
        'codes', invite_codes
    );
END;
$$;

-- 8. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_memberships_updated_at
    BEFORE UPDATE ON unified_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Migration function to sync existing memberships
CREATE OR REPLACE FUNCTION migrate_existing_memberships()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    migrated_count INTEGER := 0;
    existing_membership RECORD;
BEGIN
    -- Migrate from user_memberships table if it has data
    FOR existing_membership IN 
        SELECT DISTINCT user_id, tier, expires_at, created_at
        FROM user_memberships 
        WHERE user_id IS NOT NULL
    LOOP
        -- Insert if not already exists
        INSERT INTO unified_memberships (user_id, tier, expires_at, created_at)
        VALUES (
            existing_membership.user_id,
            existing_membership.tier,
            existing_membership.expires_at,
            existing_membership.created_at
        )
        ON CONFLICT DO NOTHING;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'migrated_count', migrated_count
    );
END;
$$;

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE ON unified_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION get_unified_membership TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_existing_memberships TO authenticated;

-- Success message
SELECT 'Unified Membership System deployed successfully! 🚀' as status;