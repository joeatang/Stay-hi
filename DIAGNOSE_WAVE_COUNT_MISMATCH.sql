-- 🔍 DIAGNOSTIC: Check if wave_count in public_shares matches actual wave_reactions

-- Step 1: Check wave_count column in public_shares table
SELECT 
  id,
  left(id::text, 8) as share_id_short,
  wave_count as stored_wave_count,
  peace_count as stored_peace_count,
  created_at
FROM public_shares
WHERE wave_count > 0 OR peace_count > 0
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check actual wave_reactions count
SELECT 
  share_id,
  left(share_id::text, 8) as share_id_short,
  COUNT(*) as actual_wave_count
FROM wave_reactions
GROUP BY share_id
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Step 3: Compare stored vs actual (find mismatches)
SELECT 
  ps.id,
  left(ps.id::text, 8) as share_id_short,
  COALESCE(ps.wave_count, 0) as stored_count,
  COALESCE(wr.actual_count, 0) as actual_count,
  CASE 
    WHEN COALESCE(ps.wave_count, 0) != COALESCE(wr.actual_count, 0) THEN '❌ MISMATCH'
    ELSE '✅ Match'
  END as status
FROM public_shares ps
LEFT JOIN (
  SELECT share_id, COUNT(*) as actual_count
  FROM wave_reactions
  GROUP BY share_id
) wr ON ps.id = wr.share_id
WHERE ps.is_public = true
  AND (ps.wave_count > 0 OR wr.actual_count > 0)
ORDER BY ps.created_at DESC
LIMIT 20;

-- Step 4: Check the share you clicked (if you know the ID)
-- Replace '9e0a741a-3e1b-4750-aebd-c683f2824a86' with the actual share ID from console
SELECT 
  ps.id,
  ps.wave_count as stored_in_public_shares,
  COUNT(wr.id) as actual_in_wave_reactions,
  array_agg(wr.user_id) FILTER (WHERE wr.user_id IS NOT NULL) as user_ids_who_waved,
  array_agg(wr.created_at ORDER BY wr.created_at) as wave_timestamps
FROM public_shares ps
LEFT JOIN wave_reactions wr ON ps.id = wr.share_id
WHERE ps.id = '9e0a741a-3e1b-4750-aebd-c683f2824a86'
GROUP BY ps.id, ps.wave_count;

-- Step 5: Check if wave_count column exists and has correct default
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'public_shares'
  AND column_name IN ('wave_count', 'peace_count');
