-- ===============================================
-- 🔍 TRIPLE CHECK: Is medallion tap tracking broken?
-- ===============================================

-- You said you tapped 60+ times, but hi_events shows 0
-- Let's verify what's happening

-- CHECK 1: Does hi_events table exist and have ANY medallion taps?
SELECT 
  'Global medallion taps' as check,
  COUNT(*) as total_medallion_taps_all_users
FROM hi_events
WHERE event_type = 'medallion_tap';

-- CHECK 2: What other event types exist?
SELECT 
  event_type,
  COUNT(*) as count
FROM hi_events
GROUP BY event_type
ORDER BY count DESC;

-- CHECK 3: Do you have ANY events in hi_events?
SELECT 
  'Your events' as check,
  event_type,
  COUNT(*) as count
FROM hi_events
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6'
GROUP BY event_type;

-- CHECK 4: What does global_stats show for hi_waves?
SELECT 
  hi_waves as global_medallion_taps,
  total_his as global_shares,
  'Global community stats' as source
FROM global_stats
WHERE id = 1;

-- CHECK 5: If medallion taps aren't tracked per user, where IS the global counter incrementing from?
-- Maybe it's incrementing global_stats but NOT inserting into hi_events?

-- Let's see the actual insert_medallion_tap or increment_hi_wave function
SELECT 
  proname as function_name,
  prosrc as code
FROM pg_proc
WHERE proname IN ('insert_medallion_tap', 'increment_hi_wave')
ORDER BY proname;
