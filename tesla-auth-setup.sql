-- TESLA-GRADE DATABASE SETUP
-- Complete schema for the new authentication system
-- Run this to prepare your database for the new auth system

-- Create magic_links table for email authentication
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- Add unique constraint on user_id to ensure one active link per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_magic_links_user_id_unique ON magic_links(user_id) 
WHERE used_at IS NULL;

-- Sample invite codes for testing
INSERT INTO invitation_codes (id, code, created_by, max_uses, is_active, expires_at, description) VALUES
    (gen_random_uuid(), 'STAYHI-BETA-30D-A7X9K2', (SELECT id FROM auth.users WHERE email = 'joeatang7@gmail.com' LIMIT 1), 10, true, NOW() + INTERVAL '30 days', '30-day BETA access'),
    (gen_random_uuid(), 'STAYHI-VIP-90D-B8Y1L3', (SELECT id FROM auth.users WHERE email = 'joeatang7@gmail.com' LIMIT 1), 5, true, NOW() + INTERVAL '90 days', '90-day VIP access'),
    (gen_random_uuid(), 'STAYHI-FRIEND-7D-C9Z2M4', (SELECT id FROM auth.users WHERE email = 'joeatang7@gmail.com' LIMIT 1), 50, true, NOW() + INTERVAL '90 days', '7-day FRIEND trial'),
    (gen_random_uuid(), 'STAYHI-STAN-365D-D1A3N5', (SELECT id FROM auth.users WHERE email = 'joeatang7@gmail.com' LIMIT 1), 100, true, NOW() + INTERVAL '365 days', '365-day STAN membership')
ON CONFLICT (code) DO NOTHING;

-- Ensure joeatang7@gmail.com has admin access
INSERT INTO auth.users (id, email, created_at) VALUES 
    (gen_random_uuid(), 'joeatang7@gmail.com', NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_memberships (id, user_id, membership_tier, status, trial_days_remaining, created_at, last_updated)
SELECT 
    gen_random_uuid(),
    u.id,
    'ADMIN',
    'active',
    999,
    NOW(),
    NOW()
FROM auth.users u 
WHERE u.email = 'joeatang7@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    membership_tier = 'ADMIN',
    status = 'active',
    trial_days_remaining = 999,
    last_updated = NOW();

-- Clean up old magic links (optional housekeeping)
DELETE FROM magic_links WHERE expires_at < NOW() - INTERVAL '1 day';

-- Add some sample beta testers for invite code validation
INSERT INTO beta_testers (id, email, access_level, features_enabled, invite_quota, created_at) VALUES
    (gen_random_uuid(), 'joeatang7@gmail.com', 'admin', ARRAY['all'], 999, NOW()),
    (gen_random_uuid(), 'beta1@example.com', 'premium', ARRAY['messaging', 'premium_features'], 10, NOW()),
    (gen_random_uuid(), 'beta2@example.com', 'standard', ARRAY['messaging'], 5, NOW())
ON CONFLICT (email) DO NOTHING;

COMMIT;