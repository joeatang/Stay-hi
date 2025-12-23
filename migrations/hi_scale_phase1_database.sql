-- ========================================
-- HI SCALE FEATURE: DATABASE MIGRATION
-- Phase 1 of 6
-- ========================================
-- 
-- PURPOSE: Add optional intensity rating (1-5) to shares
-- SAFETY: Column is nullable, backwards compatible
-- IMPACT: Zero impact on existing data
-- ROLLBACK: ALTER TABLE public_shares DROP COLUMN hi_intensity;
--
-- ========================================

-- Add hi_intensity column to public_shares
ALTER TABLE public_shares 
ADD COLUMN IF NOT EXISTS hi_intensity INTEGER 
CHECK (hi_intensity IS NULL OR (hi_intensity >= 1 AND hi_intensity <= 5));

-- Add documentation comment
COMMENT ON COLUMN public_shares.hi_intensity IS 
'Hi Scale rating (1-5): 1-2=Opportunity, 3=Neutral, 4-5=Hi Energy. NULL if not selected.';

-- Add index for future analytics (optional)
CREATE INDEX IF NOT EXISTS idx_public_shares_intensity 
ON public_shares(hi_intensity) 
WHERE hi_intensity IS NOT NULL;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- 1. Verify column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'public_shares' 
AND column_name = 'hi_intensity';

-- Expected result:
-- column_name   | data_type | is_nullable | column_default
-- hi_intensity  | integer   | YES         | NULL


-- 2. Verify constraint exists
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public_shares'::regclass
AND conname LIKE '%intensity%';

-- Expected result:
-- constraint_name              | definition
-- public_shares_hi_intensity_check | CHECK ((hi_intensity IS NULL OR (hi_intensity >= 1 AND hi_intensity <= 5)))


-- 3. Test valid inserts (all should succeed)
-- Test NULL (default for existing behavior)
INSERT INTO public_shares (content, user_id, hi_intensity) 
VALUES ('Test share without intensity', (SELECT id FROM auth.users LIMIT 1), NULL);

-- Test valid values 1-5
INSERT INTO public_shares (content, user_id, hi_intensity) 
VALUES ('Test Low Opportunity', (SELECT id FROM auth.users LIMIT 1), 1);

INSERT INTO public_shares (content, user_id, hi_intensity) 
VALUES ('Test Neutral', (SELECT id FROM auth.users LIMIT 1), 3);

INSERT INTO public_shares (content, user_id, hi_intensity) 
VALUES ('Test Hi Energy', (SELECT id FROM auth.users LIMIT 1), 5);


-- 4. Test invalid inserts (all should FAIL)
-- This should fail (value 0 not allowed)
INSERT INTO public_shares (content, user_id, hi_intensity) 
VALUES ('Should fail - 0', (SELECT id FROM auth.users LIMIT 1), 0);
-- Expected: ERROR: new row violates check constraint

-- This should fail (value 6 not allowed)
INSERT INTO public_shares (content, user_id, hi_intensity) 
VALUES ('Should fail - 6', (SELECT id FROM auth.users LIMIT 1), 6);
-- Expected: ERROR: new row violates check constraint


-- 5. Verify existing shares unaffected
SELECT 
  COUNT(*) AS total_shares,
  COUNT(hi_intensity) AS shares_with_intensity,
  COUNT(*) - COUNT(hi_intensity) AS shares_without_intensity
FROM public_shares;

-- Expected after migration:
-- total_shares | shares_with_intensity | shares_without_intensity
-- ~567         | 0                     | ~567
-- (all existing shares have NULL intensity)


-- 6. Verify index created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'public_shares'
AND indexname LIKE '%intensity%';

-- Expected result:
-- indexname                      | indexdef
-- idx_public_shares_intensity    | CREATE INDEX idx_public_shares_intensity ON public_shares USING btree (hi_intensity) WHERE (hi_intensity IS NOT NULL)


-- ========================================
-- CLEANUP TEST DATA (after verification)
-- ========================================

-- Delete test shares (run this after verifying migration)
DELETE FROM public_shares 
WHERE content LIKE 'Test %' 
AND created_at > NOW() - INTERVAL '5 minutes';

-- ========================================
-- MIGRATION STATUS: ✅ COMPLETE
-- ========================================
-- 
-- Next step: Phase 2 - Build HiScale component
--
-- ========================================
