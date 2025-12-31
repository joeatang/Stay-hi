-- ===============================================
-- 🔍 FINAL VERIFICATION: Does last_wave_at exist?
-- ===============================================

-- Check ALL columns in user_stats
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- Check if there are errors in Postgres logs (if accessible)
-- This would show if update_user_waves is failing
