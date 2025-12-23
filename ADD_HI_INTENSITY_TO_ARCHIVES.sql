-- ============================================
-- Hi Scale: Add hi_intensity column to hi_archives
-- ============================================
-- This adds the missing hi_intensity column to hi_archives table
-- (we previously only added it to public_shares)

-- Add hi_intensity column to hi_archives
ALTER TABLE hi_archives
ADD COLUMN IF NOT EXISTS hi_intensity INTEGER DEFAULT NULL;

-- Add check constraint (1-5 or NULL)
ALTER TABLE hi_archives
ADD CONSTRAINT check_hi_intensity_range 
CHECK (hi_intensity IS NULL OR (hi_intensity >= 1 AND hi_intensity <= 5));

-- Add comment
COMMENT ON COLUMN hi_archives.hi_intensity IS 'Hi Scale intensity rating (1-5): 1=Low 2=Medium-Low 3=Balanced 4=Medium-High 5=High';

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_hi_archives_hi_intensity 
ON hi_archives(hi_intensity) 
WHERE hi_intensity IS NOT NULL;

-- Verify
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hi_archives' 
  AND column_name = 'hi_intensity';
