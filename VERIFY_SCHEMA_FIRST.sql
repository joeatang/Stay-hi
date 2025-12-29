-- VERIFY EXACT SCHEMA before running fix

-- 1. What columns does user_stats ACTUALLY have?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. What columns does public_shares have?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'public_shares' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Do these tables exist?
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_stats', 'public_shares', 'hi_moments', 'wave_reactions', 'share_reactions')
ORDER BY table_name;
