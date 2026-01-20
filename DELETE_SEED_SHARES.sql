-- Delete seed/test data from public_shares table
-- These are demo shares created by the map initialization system
-- that should NOT appear in the General Shares feed

-- Delete Sydney, Tokyo, London, SF, NYC seed shares
DELETE FROM public_shares
WHERE (
  -- Sydney surf session
  (text = 'Morning surf session at Bondi Beach - nature''s therapy session!' 
   AND location ILIKE '%Sydney%')
  OR
  -- Tokyo cherry blossoms  
  (text = 'Cherry blossoms remind me that beauty is temporary and precious.' 
   AND location ILIKE '%Tokyo%')
  OR
  -- London tea time
  (text = 'Tea time in Hyde Park - finding peace in the simple moments.'
   AND location ILIKE '%London%')
  OR
  -- San Francisco sunset
  (text = 'Just witnessed the most incredible sunset over the Golden Gate Bridge!'
   AND location ILIKE '%San Francisco%')
  OR
  -- NYC grateful
  (text ILIKE '%Grateful for this beautiful city and all the connections it brings%'
   AND location ILIKE '%New York%')
);

-- Verify deletion
SELECT COUNT(*) AS remaining_seed_shares
FROM public_shares
WHERE text IN (
  'Morning surf session at Bondi Beach - nature''s therapy session!',
  'Cherry blossoms remind me that beauty is temporary and precious.',
  'Tea time in Hyde Park - finding peace in the simple moments.',
  'Just witnessed the most incredible sunset over the Golden Gate Bridge!'
)
OR text ILIKE '%Grateful for this beautiful city and all the connections it brings%';

-- Show remaining shares to confirm only real user shares exist
SELECT 
  id,
  content AS text,
  location,
  created_at,
  user_id
FROM public_shares
WHERE is_public = true
ORDER BY created_at DESC
LIMIT 20;
