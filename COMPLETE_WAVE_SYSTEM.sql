-- 🎯 GOLD STANDARD COMPLETE SOLUTION: Wave reactions system
-- Creates wave_reactions table + wave_count column + auto-sync triggers

-- ============================================
-- STEP 1: Create wave_reactions table
-- ============================================
CREATE TABLE IF NOT EXISTS wave_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID NOT NULL REFERENCES public_shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(share_id, user_id) -- One wave per user per share
);

CREATE INDEX IF NOT EXISTS idx_wave_reactions_share_id ON wave_reactions(share_id);
CREATE INDEX IF NOT EXISTS idx_wave_reactions_user_id ON wave_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wave_reactions_created_at ON wave_reactions(created_at DESC);

-- ============================================
-- STEP 2: Add wave_count column to public_shares
-- ============================================
ALTER TABLE public_shares
ADD COLUMN IF NOT EXISTS wave_count INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_public_shares_wave_count ON public_shares(wave_count);

-- ============================================
-- STEP 3: wave_back RPC function
-- ============================================
CREATE OR REPLACE FUNCTION wave_back(p_share_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_already_waved BOOLEAN := FALSE;
  v_wave_count INTEGER := 0;
BEGIN
  -- Check if user already waved
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM wave_reactions 
      WHERE share_id = p_share_id AND user_id = p_user_id
    ) INTO v_already_waved;
  END IF;

  -- If not already waved, add reaction
  IF NOT v_already_waved THEN
    INSERT INTO wave_reactions (share_id, user_id)
    VALUES (p_share_id, p_user_id)
    ON CONFLICT (share_id, user_id) DO NOTHING;
  END IF;

  -- Get current wave count
  SELECT COUNT(*) INTO v_wave_count
  FROM wave_reactions
  WHERE share_id = p_share_id;

  -- Update public_shares.wave_count
  UPDATE public_shares
  SET wave_count = v_wave_count
  WHERE id = p_share_id;

  -- Return result
  RETURN json_build_object(
    'wave_count', v_wave_count,
    'already_waved', v_already_waved
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Auto-sync triggers for wave_count
-- ============================================
CREATE OR REPLACE FUNCTION sync_wave_count()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'DELETE') THEN
    SELECT COUNT(*) INTO v_count
    FROM wave_reactions
    WHERE share_id = COALESCE(NEW.share_id, OLD.share_id);
    
    UPDATE public_shares
    SET wave_count = v_count
    WHERE id = COALESCE(NEW.share_id, OLD.share_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_wave_count ON wave_reactions;
CREATE TRIGGER trigger_sync_wave_count
AFTER INSERT OR DELETE ON wave_reactions
FOR EACH ROW
EXECUTE FUNCTION sync_wave_count();

-- ============================================
-- STEP 5: Backfill existing wave counts (if any legacy data exists)
-- ============================================
UPDATE public_shares
SET wave_count = 0
WHERE wave_count IS NULL;

-- ============================================
-- STEP 6: Set RLS policies for wave_reactions
-- ============================================
ALTER TABLE wave_reactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read wave reactions
CREATE POLICY "Wave reactions are viewable by everyone"
ON wave_reactions FOR SELECT
USING (true);

-- Allow authenticated users to wave
CREATE POLICY "Authenticated users can wave"
ON wave_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to un-wave their own waves
CREATE POLICY "Users can delete their own waves"
ON wave_reactions FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'wave_reactions table' as item,
  COUNT(*) as count
FROM wave_reactions
UNION ALL
SELECT 
  'public_shares with wave_count',
  COUNT(*)
FROM public_shares
WHERE wave_count IS NOT NULL;
