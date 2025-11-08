-- 🚨 EMERGENCY FIX: Create Missing Shares Table Foundation
-- Purpose: Create basic shares table required for metrics separation deployment
-- Context: Database completely missing shares table infrastructure

-- =================================================================
-- CRITICAL: CREATE BASIC SHARES TABLE FOR HiBase COMPATIBILITY
-- =================================================================

-- Create minimal hi_shares table (HiBase standard)
CREATE TABLE IF NOT EXISTS public.hi_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Share Content
  title TEXT NOT NULL DEFAULT 'Hi Share',
  content TEXT,
  share_type TEXT DEFAULT 'hi5' CHECK (share_type IN ('hi5', 'hi_wave', 'share_sheet')),
  
  -- Privacy & State
  is_public BOOLEAN DEFAULT true,
  is_anonymous BOOLEAN DEFAULT false,
  
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_hi_shares_user ON public.hi_shares(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_shares_type ON public.hi_shares(share_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_shares_public ON public.hi_shares(is_public) WHERE is_public = true;

-- =================================================================
-- ROW LEVEL SECURITY FOR SHARES TABLE
-- =================================================================

-- Enable RLS
ALTER TABLE public.hi_shares ENABLE ROW LEVEL SECURITY;

-- Insert policy - allow authenticated users and anonymous
CREATE POLICY "Allow share creation"
  ON public.hi_shares
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Select policy - public shares visible to all, private to owner
CREATE POLICY "Share visibility policy"
  ON public.hi_shares
  FOR SELECT
  TO authenticated, anon
  USING (
    is_public = true 
    OR user_id = auth.uid()
    OR auth.uid() IS NULL  -- Anonymous access for public shares
  );

-- Update policy - users can update own shares
CREATE POLICY "Users can update own shares"
  ON public.hi_shares
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Delete policy - users can delete own shares
CREATE POLICY "Users can delete own shares"
  ON public.hi_shares
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =================================================================
-- TEST DATA FOR VALIDATION
-- =================================================================

-- Insert test share to validate table structure
INSERT INTO public.hi_shares (user_id, title, content, share_type, is_public)
VALUES (
  NULL,  -- Anonymous share for testing
  'Hi Community!',
  'Welcome to Stay Hi - spreading positive vibes globally!',
  'hi5',
  true
) ON CONFLICT DO NOTHING;

-- =================================================================
-- VALIDATION QUERIES
-- =================================================================

-- Verify table exists and is accessible
SELECT 'hi_shares table created successfully' as status, COUNT(*) as test_records 
FROM public.hi_shares;

-- Verify RLS policies are active
SELECT 'RLS enabled:' as check_type, relrowsecurity as enabled 
FROM pg_class 
WHERE relname = 'hi_shares';

-- Show table structure
SELECT 'Table structure:' as info;
\d public.hi_shares;