-- 🚨 CRITICAL FIX: Create hi_shares table for metrics separation
-- Run this FIRST in Supabase SQL Editor before running METRICS_SEPARATION_DEPLOY.sql

CREATE TABLE IF NOT EXISTS public.hi_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Hi Share', 
  content TEXT,
  share_type TEXT DEFAULT 'hi5' CHECK (share_type IN ('hi5', 'hi_wave', 'share_sheet')),
  is_public BOOLEAN DEFAULT true,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Essential indexes
CREATE INDEX IF NOT EXISTS idx_hi_shares_user ON public.hi_shares(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hi_shares_type ON public.hi_shares(share_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.hi_shares ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow share creation" ON public.hi_shares FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Share visibility policy" ON public.hi_shares FOR SELECT TO authenticated, anon USING (is_public = true OR user_id = auth.uid() OR auth.uid() IS NULL);

-- Test data
INSERT INTO public.hi_shares (user_id, title, content, share_type, is_public)
VALUES (NULL, 'Hi Community!', 'Stay Hi test share', 'hi5', true) ON CONFLICT DO NOTHING;

-- Verification
SELECT 'hi_shares table ready' as status, COUNT(*) as records FROM public.hi_shares;