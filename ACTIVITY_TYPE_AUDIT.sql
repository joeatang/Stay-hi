-- 🔍 CRITICAL AUDIT: What activities ACTUALLY increment what stats?
-- User clarification: Global waves (medallion), wave backs (reactions), peace sends, check-ins, hi moments (shares)

-- =====================================================
-- PART 1: GLOBAL WAVES (Medallion Taps)
-- =====================================================

-- Check hi_events table for medallion_tap tracking
SELECT 'hi_events' as source, COUNT(*) as medallion_taps
FROM hi_events
WHERE event_type = 'medallion_tap'
AND user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check if global_stats.hi_waves column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'global_stats'
AND column_name IN ('hi_waves', 'total_his', 'total_users');

-- Get current global_stats values
SELECT hi_waves as global_medallion_taps, total_his as global_shares
FROM global_stats
LIMIT 1;

-- =====================================================
-- PART 2: WAVE BACKS (Reactions to shares)
-- =====================================================

-- Check wave_reactions table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'wave_reactions'
ORDER BY ordinal_position;

-- Count wave backs USER HAS GIVEN
SELECT 'wave_reactions_given' as type, COUNT(*) as count
FROM wave_reactions
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Count wave backs USER HAS RECEIVED on their shares
SELECT 'wave_reactions_received' as type, COUNT(*) as count
FROM wave_reactions wr
JOIN public_shares ps ON wr.share_id = ps.id
WHERE ps.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check if public_shares.wave_count is synced
SELECT id, wave_count, 
  (SELECT COUNT(*) FROM wave_reactions WHERE share_id = ps.id) as actual_wave_reactions
FROM public_shares ps
WHERE ps.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
AND wave_count > 0
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- PART 3: PEACE SENDS (Send Peace reactions)
-- =====================================================

-- Check if share_reactions table exists (for peace sends)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'share_reactions'
ORDER BY ordinal_position;

-- Count peace sends USER HAS GIVEN
SELECT 'peace_sends_given' as type, COUNT(*) as count
FROM share_reactions
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
AND reaction_type = 'peace';

-- Count peace sends USER HAS RECEIVED
SELECT 'peace_sends_received' as type, COUNT(*) as count
FROM share_reactions sr
JOIN public_shares ps ON sr.share_id = ps.id
WHERE ps.user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
AND sr.reaction_type = 'peace';

-- =====================================================
-- PART 4: CHECK-INS (Daily check-ins for points)
-- =====================================================

-- Get all check-ins for user
SELECT day, ts, created_at
FROM hi_points_daily_checkins
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
ORDER BY day DESC
LIMIT 10;

-- =====================================================
-- PART 5: HI MOMENTS (Shares from 3 modals)
-- =====================================================

-- Count user's shares (hi moments)
SELECT COUNT(*) as total_hi_moments
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- Check share distribution by visibility/type
SELECT visibility, COUNT(*) as count
FROM public_shares
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
GROUP BY visibility;

-- =====================================================
-- PART 6: user_stats TABLE - What does it track?
-- =====================================================

-- Get user's current stats
SELECT 
  total_hi_moments,
  current_streak,
  longest_streak,
  total_waves,  -- QUESTION: Is this medallion taps OR wave_reactions received?
  total_starts,
  days_active,
  last_hi_date,
  updated_at
FROM user_stats
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';

-- =====================================================
-- PART 7: CRITICAL QUESTION - What updates total_waves?
-- =====================================================

-- Check if triggers exist that update user_stats.total_waves
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%wave%' OR trigger_name LIKE '%stat%');

-- Check functions that update user_stats
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND (routine_name LIKE '%wave%' OR routine_name LIKE '%user_stat%')
ORDER BY routine_name;

