-- 🎯 FIX: Create trigger to auto-update wave_count in public_shares
-- This ensures the denormalized count stays in sync with wave_reactions table

-- Step 1: Create function to update wave_count
CREATE OR REPLACE FUNCTION update_wave_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When a wave is added or removed, recalculate the count
  IF (TG_OP = 'DELETE') THEN
    UPDATE public_shares
    SET wave_count = (
      SELECT COUNT(*)
      FROM wave_reactions
      WHERE share_id = OLD.share_id
    )
    WHERE id = OLD.share_id;
    RETURN OLD;
  ELSE
    UPDATE public_shares
    SET wave_count = (
      SELECT COUNT(*)
      FROM wave_reactions
      WHERE share_id = NEW.share_id
    )
    WHERE id = NEW.share_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on wave_reactions table
DROP TRIGGER IF EXISTS wave_reactions_update_count ON wave_reactions;
CREATE TRIGGER wave_reactions_update_count
  AFTER INSERT OR DELETE ON wave_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wave_count();

-- Step 3: Do the same for peace_count
CREATE OR REPLACE FUNCTION update_peace_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public_shares
    SET peace_count = (
      SELECT COUNT(*)
      FROM peace_reactions
      WHERE share_id = OLD.share_id
    )
    WHERE id = OLD.share_id;
    RETURN OLD;
  ELSE
    UPDATE public_shares
    SET peace_count = (
      SELECT COUNT(*)
      FROM peace_reactions
      WHERE share_id = NEW.share_id
    )
    WHERE id = NEW.share_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS peace_reactions_update_count ON peace_reactions;
CREATE TRIGGER peace_reactions_update_count
  AFTER INSERT OR DELETE ON peace_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_peace_count();

-- Step 4: Fix existing data (one-time sync)
-- This updates wave_count for all shares based on actual wave_reactions
UPDATE public_shares ps
SET wave_count = COALESCE(wr_counts.count, 0)
FROM (
  SELECT share_id, COUNT(*) as count
  FROM wave_reactions
  GROUP BY share_id
) wr_counts
WHERE ps.id = wr_counts.share_id;

-- Also update shares with NO waves to have wave_count = 0
UPDATE public_shares
SET wave_count = 0
WHERE wave_count IS NULL 
  OR id NOT IN (SELECT DISTINCT share_id FROM wave_reactions);

-- Step 5: Same for peace_count
UPDATE public_shares ps
SET peace_count = COALESCE(pr_counts.count, 0)
FROM (
  SELECT share_id, COUNT(*) as count
  FROM peace_reactions
  GROUP BY share_id
) pr_counts
WHERE ps.id = pr_counts.share_id;

UPDATE public_shares
SET peace_count = 0
WHERE peace_count IS NULL 
  OR id NOT IN (SELECT DISTINCT share_id FROM peace_reactions);

-- Step 6: Verification query
SELECT 
  'Fixed' as status,
  COUNT(*) as total_shares,
  SUM(CASE WHEN wave_count > 0 THEN 1 ELSE 0 END) as shares_with_waves,
  SUM(CASE WHEN peace_count > 0 THEN 1 ELSE 0 END) as shares_with_peace,
  SUM(wave_count) as total_waves,
  SUM(peace_count) as total_peace
FROM public_shares
WHERE is_public = true;

-- Step 7: Check the specific share from your screenshot
SELECT 
  id,
  left(id::text, 8) as short_id,
  wave_count,
  peace_count,
  (SELECT COUNT(*) FROM wave_reactions WHERE share_id = ps.id) as actual_waves,
  (SELECT COUNT(*) FROM peace_reactions WHERE share_id = ps.id) as actual_peace,
  created_at
FROM public_shares ps
WHERE id = '9e0a741a-3e1b-4750-aebd-c683f2824a86';
