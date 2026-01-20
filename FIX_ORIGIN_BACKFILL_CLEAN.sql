-- =========================================================================
-- Fix Missing Origins in public_shares
-- Based on actual schema diagnostic results
-- =========================================================================
-- Problem: 495 shares have origin='unknown' (65% of total)
-- Solution: Backfill using pill, location, and content pattern matching
-- =========================================================================

-- Step 1: Backfill Hi Island shares (look for pill='hiisland' or 'island')
UPDATE public_shares
SET origin = 'hi-island'
WHERE (origin = 'unknown' OR origin IS NULL OR origin = '')
  AND (pill ILIKE '%island%' OR pill = 'hiisland');

-- Step 2: Backfill Hi Gym shares (look for emotional journey patterns)
UPDATE public_shares
SET origin = 'higym'
WHERE (origin = 'unknown' OR origin IS NULL OR origin = '')
  AND (
    pill ILIKE '%higym%'
    OR pill ILIKE '%gym%'
    OR pill ILIKE '%muscle%'
    OR current_emoji IN ('💪', '🏋️', '⚡', '🧘', '🤸')
    OR desired_emoji IN ('💪', '🏋️', '⚡', '🧘', '🤸', '✨', '🌟')
    OR text ILIKE '%felt%want%'
    OR text ILIKE '%emotional%journey%'
  );

-- Step 3: Backfill Dashboard shares (look for pill='hi5' or 'dashboard')
UPDATE public_shares
SET origin = 'dashboard'
WHERE (origin = 'unknown' OR origin IS NULL OR origin = '')
  AND (pill = 'hi5' OR pill = 'dashboard');

-- Step 4: Backfill Pulse shares (look for pill='pulse')
UPDATE public_shares
SET origin = 'pulse'
WHERE (origin = 'unknown' OR origin IS NULL OR origin = '')
  AND pill = 'pulse';

-- Step 5: Set remaining unknowns to 'hi5' (generic default)
UPDATE public_shares
SET origin = 'hi5'
WHERE (origin = 'unknown' OR origin IS NULL OR origin = '');

-- =========================================================================
-- Verification
-- =========================================================================

-- Show new distribution
SELECT 
  '✅ AFTER FIX: Origin Distribution' as section,
  origin,
  COUNT(*) as count
FROM public_shares
GROUP BY origin
ORDER BY count DESC;

-- Show Hi Gym shares specifically
SELECT 
  '✅ AFTER FIX: Hi Gym Shares' as section,
  COUNT(*) as total_higym_shares,
  COUNT(*) FILTER (WHERE pill ILIKE '%higym%' OR pill ILIKE '%gym%') as with_gym_pill
FROM public_shares
WHERE origin = 'higym';

-- Show sample of fixed shares
SELECT 
  '✅ AFTER FIX: Sample Fixed Shares' as section,
  id,
  origin,
  pill,
  LEFT(text, 50) as text_preview
FROM public_shares
WHERE origin IN ('hi-island', 'higym', 'dashboard', 'pulse', 'hi5')
ORDER BY created_at DESC
LIMIT 10;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '
  ✅ BACKFILL COMPLETE!
  
  What was fixed:
  1. Identified shares by pill patterns (hiisland, higym, hi5, etc.)
  2. Matched Hi Gym shares by emoji patterns (💪, 🏋️, etc.)
  3. Set remaining unknowns to generic "hi5" default
  
  Next steps:
  1. Check verification queries above
  2. Test Hi Gym share creation (should work - RPC is correct)
  3. Verify Hi Gym filter on Hi Island shows all shares
  ';
END $$;
