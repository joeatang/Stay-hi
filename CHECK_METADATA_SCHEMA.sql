-- 🔍 WOZ SURGICAL AUDIT: Check if metadata column exists in public_shares

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'public_shares'
ORDER BY ordinal_position;

-- Sample existing data to see what's stored
SELECT 
  id,
  text,
  current_emoji,
  desired_emoji,
  current_name,
  desired_name,
  metadata,  -- Does this column exist?
  created_at
FROM public_shares
LIMIT 5;
