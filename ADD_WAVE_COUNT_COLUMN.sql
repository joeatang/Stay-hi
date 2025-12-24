-- 🎯 GOLD STANDARD: Add wave_count column to public_shares
-- Ensures consistent reaction count display in feed

-- Step 1: Add wave_count column (defaults to 0)
ALTER TABLE public_shares
ADD COLUMN IF NOT EXISTS wave_count INTEGER DEFAULT 0 NOT NULL;

-- Step 2: Create index for performance (wave_count filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_public_shares_wave_count 
ON public_shares(wave_count);

-- Step 3: Backfill existing shares with actual wave counts
UPDATE public_shares ps
SET wave_count = (
  SELECT COUNT(*) 
  FROM wave_reactions wr 
  WHERE wr.share_id = ps.id
)
WHERE wave_count = 0;

-- Step 4: Create trigger to auto-update wave_count when reactions change
CREATE OR REPLACE FUNCTION update_wave_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public_shares 
    SET wave_count = wave_count + 1 
    WHERE id = NEW.share_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public_shares 
    SET wave_count = GREATEST(0, wave_count - 1) 
    WHERE id = OLD.share_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wave_count_sync ON wave_reactions;
CREATE TRIGGER wave_count_sync
AFTER INSERT OR DELETE ON wave_reactions
FOR EACH ROW
EXECUTE FUNCTION update_wave_count();

-- Step 5: Create matching trigger for peace_count (if not exists)
CREATE OR REPLACE FUNCTION update_peace_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public_shares 
    SET peace_count = COALESCE(peace_count, 0) + 1 
    WHERE id = NEW.share_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public_shares 
    SET peace_count = GREATEST(0, COALESCE(peace_count, 0) - 1) 
    WHERE id = OLD.share_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS peace_count_sync ON peace_reactions;
CREATE TRIGGER peace_count_sync
AFTER INSERT OR DELETE ON peace_reactions
FOR EACH ROW
EXECUTE FUNCTION update_peace_count();

-- Step 6: Ensure all existing shares have peace_count initialized
UPDATE public_shares
SET peace_count = (
  SELECT COUNT(*) 
  FROM peace_reactions pr 
  WHERE pr.share_id = public_shares.id
)
WHERE peace_count IS NULL;

-- Make peace_count NOT NULL with default
ALTER TABLE public_shares
ALTER COLUMN peace_count SET DEFAULT 0,
ALTER COLUMN peace_count SET NOT NULL;

-- Verification query
SELECT 
  COUNT(*) as total_shares,
  COUNT(*) FILTER (WHERE wave_count > 0) as shares_with_waves,
  COUNT(*) FILTER (WHERE peace_count > 0) as shares_with_peace,
  SUM(wave_count) as total_waves,
  SUM(peace_count) as total_peace
FROM public_shares;
