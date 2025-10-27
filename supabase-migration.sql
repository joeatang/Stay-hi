-- 🚀 TESLA-GRADE ENHANCEMENT: Add origin and type columns to public_shares table
-- Run this in your Supabase SQL Editor

-- Add origin column (quick/guided)
ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS origin VARCHAR(20) DEFAULT 'quick';

-- Add type column (for future extensibility)
ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'self_hi5';

-- Add index for efficient filtering by origin
CREATE INDEX IF NOT EXISTS idx_public_shares_origin ON public.public_shares(origin);

-- Add index for type (future-proofing)
CREATE INDEX IF NOT EXISTS idx_public_shares_type ON public.public_shares(type);

-- Optional: Add constraint to ensure valid origin values
ALTER TABLE public.public_shares 
ADD CONSTRAINT IF NOT EXISTS check_origin_values 
CHECK (origin IN ('quick', 'guided'));

-- Optional: Add constraint to ensure valid type values
ALTER TABLE public.public_shares 
ADD CONSTRAINT IF NOT EXISTS check_type_values 
CHECK (type IN ('self_hi5', 'friend_hi5', 'group_hi5'));

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'public_shares' 
AND table_schema = 'public'
ORDER BY ordinal_position;