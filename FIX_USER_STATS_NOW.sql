-- 🔍 CHECK: What does the database actually have?
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  longest_streak,
  total_waves,
  total_starts,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 🔍 CHECK: How many shares do you actually have?
SELECT COUNT(*) as actual_share_count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- 🔍 CHECK: What are the triggers?
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync%';

-- 🚀 FIX: Re-sync the moment count NOW
UPDATE user_stats
SET 
  total_hi_moments = (
    SELECT COUNT(*) 
    FROM public_shares 
    WHERE user_id = user_stats.user_id
  ),
  updated_at = NOW()
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ✅ VERIFY: Check the fixed value
SELECT 
  user_id,
  total_hi_moments,
  current_streak,
  total_waves,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
