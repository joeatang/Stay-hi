-- =============================================================
-- 🧹 CLEANUP: Fix Falsely Attributed Anonymous Shares
-- =============================================================
-- Issue: Due to RPC COALESCE bug, 7 anonymous shares got real user_ids
-- Fix: Set user_id to NULL for all anonymous shares (as intended)
-- Safe: This only affects public_shares, not hi_archives (private)
-- =============================================================

-- First, preview what will be updated
SELECT 
  id,
  user_id,
  LEFT(COALESCE(text, content, ''), 40) as text_preview,
  visibility,
  origin,
  created_at
FROM public_shares
WHERE visibility = 'anonymous'
  AND user_id IS NOT NULL
ORDER BY created_at DESC;

-- =============================================================
-- 🔧 RUN THIS TO FIX:
-- =============================================================

UPDATE public_shares
SET user_id = NULL
WHERE visibility = 'anonymous'
  AND user_id IS NOT NULL;

-- Verify the fix
SELECT 
  'Cleanup complete!' as status,
  COUNT(*) as remaining_falsely_attributed
FROM public_shares
WHERE visibility = 'anonymous'
  AND user_id IS NOT NULL;

-- Expected result: remaining_falsely_attributed = 0
