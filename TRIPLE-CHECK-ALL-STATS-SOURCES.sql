-- ===============================================
-- 🔍 TRIPLE CHECK: Source of truth for ALL profile stats
-- ===============================================

-- Profile shows these stats:
-- 1. Hi Moments (total_hi_moments)
-- 2. Current Streak (current_streak)
-- 3. Longest Streak (longest_streak)
-- 4. Total Waves (total_waves)
-- 5. Total Starts (total_starts)
-- 6. Days Active (days_active)

-- ===============================================
-- CHECK 1: What columns exist in public_shares?
-- ===============================================
SELECT 
  'public_shares columns' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'public_shares'
ORDER BY ordinal_position;

-- ===============================================
-- CHECK 2: Where do waves come from? (medallion vs reactions)
-- ===============================================

-- Medallion taps in hi_events
SELECT 
  'Medallion taps (hi_events)' as source,
  COUNT(*) as your_medallion_taps
FROM hi_events
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
  AND event_type = 'medallion_tap';

-- Wave reactions on your shares
SELECT 
  'Wave reactions (wave_reactions)' as source,
  COUNT(*) as waves_received_on_your_shares
FROM wave_reactions wr
JOIN public_shares ps ON wr.share_id = ps.id
WHERE ps.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- What does user_stats.total_waves currently show?
SELECT 
  'user_stats.total_waves' as source,
  total_waves as cached_value
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ===============================================
-- CHECK 3: Where do streaks come from?
-- ===============================================

-- Can we calculate current streak from public_shares dates?
SELECT 
  'public_shares dates' as check_type,
  DATE(created_at) as share_date,
  COUNT(*) as shares_that_day
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
GROUP BY DATE(created_at)
ORDER BY share_date DESC
LIMIT 10;

-- ===============================================
-- CHECK 4: Where do "starts" come from?
-- ===============================================

-- Check if share_reactions table exists
SELECT 
  'share_reactions existence' as check_type,
  COUNT(*) as your_starts
FROM share_reactions
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- ===============================================
-- CHECK 5: Can we calculate days_active from public_shares?
-- ===============================================
SELECT 
  'Days active' as stat,
  COUNT(DISTINCT DATE(created_at)) as days_with_shares
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
