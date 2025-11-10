-- AUDIT: Check what tables actually exist in Supabase before making assumptions
SELECT 'Tables that exist:' as audit_step;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('hi_events', 'public_shares', 'user_stats')
ORDER BY table_name;

-- Check if hi_events exists and has data
SELECT 'hi_events table check:' as audit_step;
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_events') as table_exists,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'hi_events') 
    THEN (SELECT COUNT(*) FROM hi_events)
    ELSE 0
  END as record_count;

-- Check public_shares table
SELECT 'public_shares table check:' as audit_step;
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'public_shares') as table_exists,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'public_shares') 
    THEN (SELECT COUNT(*) FROM public_shares)
    ELSE 0
  END as record_count;