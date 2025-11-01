-- 🧪 HI DEV SURGICAL MAPPING TEST
-- Tests the 1:1 relationship: Global Waves = medallion taps, Global Hi5 = share entries

-- First, let's see what data we currently have
SELECT 
  'Current Data Analysis' as test_section,
  share_type, 
  COUNT(*) as record_count,
  CASE 
    WHEN share_type = 'hi_wave' OR share_type IS NULL OR share_type = '' 
    THEN 'MEDALLION TAPS (Global Waves)'
    WHEN share_type = 'share_sheet' OR share_type = 'hi5' OR share_type = 'share'
    THEN 'SHARE SHEET (Global Hi5)'
    ELSE 'OTHER'
  END as mapping_category
FROM public_shares 
GROUP BY share_type
ORDER BY record_count DESC;

-- Test the surgical get_global_stats function
SELECT 
  'Surgical Stats Test' as test_section,
  hi_waves as "Global Waves (Medallion Taps)",
  total_his as "Global Hi5 (Share Entries)", 
  total_users,
  updated_at
FROM get_global_stats();

-- Update existing records to have proper share_type for medallion taps
UPDATE public_shares 
SET share_type = 'hi_wave' 
WHERE share_type IS NULL OR share_type = '';

-- Verify the update worked  
SELECT 
  'After Update Analysis' as test_section,
  share_type,
  COUNT(*) as record_count
FROM public_shares
GROUP BY share_type
ORDER BY record_count DESC;

-- Final surgical stats test
SELECT 
  'Final Surgical Test' as test_section,
  hi_waves as "Global Waves (Medallion Taps)",
  total_his as "Global Hi5 (Share Entries)",
  total_users,
  updated_at  
FROM get_global_stats();

-- Test increment_hi_wave function (medallion tap)
SELECT increment_hi_wave() as "New Global Waves Count After Medallion Tap";

-- Test increment_share_sheet function (if share sheet exists)
-- SELECT increment_share_sheet() as "New Global Hi5 Count After Share";

-- Final verification
SELECT 
  'Post-Increment Verification' as test_section,
  hi_waves as "Final Global Waves",
  total_his as "Final Global Hi5"
FROM get_global_stats();