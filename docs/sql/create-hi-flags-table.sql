-- Hi Flags Feature Flag System Table
-- Run this in Supabase SQL Editor to create the hi_flags table

-- Create the hi_flags table
CREATE TABLE IF NOT EXISTS hi_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  target_percentage INTEGER DEFAULT 100 CHECK (target_percentage BETWEEN 0 AND 100),
  user_groups TEXT[], -- For targeted rollouts
  environment TEXT DEFAULT 'all' -- 'dev', 'preview', 'prod', 'all'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hi_flags_enabled ON hi_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_hi_flags_environment ON hi_flags(environment);

-- Insert default flags from HiFlags fallback configuration
INSERT INTO hi_flags (flag_name, enabled, description) VALUES
  ('referrals_enabled', false, 'Enable referral code system and social sharing rewards'),
  ('token_rewire_mode', false, 'Enable design token system with CSS variable replacement'),
  ('hi_map_animation', true, 'Enable animated map interactions and location markers'),
  ('premium_ux_effects', true, 'Enable glassmorphism effects and premium visual enhancements'),
  ('monitoring_analytics', true, 'Enable HiMonitor analytics and error tracking'),
  ('offline_mode', false, 'Enable service worker offline functionality'),
  ('beta_features', false, 'Enable experimental features for beta users')
ON CONFLICT (flag_name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  description = EXCLUDED.description,
  last_updated = NOW();

-- Enable RLS (Row Level Security) if needed
ALTER TABLE hi_flags ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to everyone (flags are not sensitive)
CREATE POLICY IF NOT EXISTS "Allow read access to hi_flags" ON hi_flags
  FOR SELECT USING (true);

-- Create policy to allow insert/update only for authenticated users
CREATE POLICY IF NOT EXISTS "Allow insert/update for authenticated users" ON hi_flags
  FOR ALL USING (auth.role() = 'authenticated');