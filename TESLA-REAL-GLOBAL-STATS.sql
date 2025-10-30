-- ===============================================
-- 🌍 TESLA-GRADE REAL DATA GLOBAL STATS
-- ===============================================
-- Uses existing Supabase tables to aggregate REAL community data
-- NO fake starting values - builds from actual user activity

-- Drop any existing fake global_stats table
DROP TABLE IF EXISTS global_stats CASCADE;

-- Create RPC function that aggregates REAL data from existing tables
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  total_his BIGINT,
  hi_waves BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  real_his BIGINT := 0;
  real_waves BIGINT := 0;
BEGIN
  -- 🎯 COUNT REAL HI MOMENTS from existing tables
  -- Check if hi_moments table exists and has data
  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO real_his 
    FROM hi_moments;
  EXCEPTION
    WHEN undefined_table THEN
      real_his := 0;
  END;
  
  -- If no hi_moments, try daily_hi_moments
  IF real_his = 0 THEN
    BEGIN
      SELECT COALESCE(COUNT(*), 0) INTO real_his 
      FROM daily_hi_moments;
    EXCEPTION
      WHEN undefined_table THEN
        real_his := 0;
    END;
  END IF;
  
  -- 🌊 COUNT REAL WAVES from existing tables
  -- Check if public_shares table exists and has data
  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO real_waves 
    FROM public_shares;
  EXCEPTION
    WHEN undefined_table THEN
      real_waves := 0;
  END;
  
  -- If no public_shares, try other sharing tables
  IF real_waves = 0 THEN
    BEGIN
      SELECT COALESCE(COUNT(*), 0) INTO real_waves 
      FROM island_activities;
    EXCEPTION
      WHEN undefined_table THEN
        real_waves := 0;
    END;
  END IF;
  
  -- Return REAL aggregated data
  RETURN QUERY
  SELECT 
    real_his as total_his,
    real_waves as hi_waves,
    NOW() as updated_at;
END;
$$;

-- Create function to increment Hi count (called when user creates Hi)
CREATE OR REPLACE FUNCTION increment_total_hi(user_uuid UUID DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Insert into hi_moments or daily_hi_moments table
  -- This creates REAL data, not just a counter
  BEGIN
    INSERT INTO hi_moments (user_id, emotion_category, emotion_name, description, created_at)
    VALUES (
      COALESCE(user_uuid, auth.uid()),
      'positive',
      'Hi-5',
      'Hi moment created',
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Try daily_hi_moments if hi_moments doesn't exist
      BEGIN
        INSERT INTO daily_hi_moments (user_id, moment_type, title, description, created_at)
        VALUES (
          COALESCE(user_uuid, auth.uid()),
          'hi5',
          'Self Hi-5',
          'Hi moment created',
          NOW()
        );
      EXCEPTION
        WHEN undefined_table THEN
          -- Log warning but don't fail
          RAISE NOTICE 'No Hi moments table found, increment skipped';
      END;
  END;
  
  -- Return current count from get_global_stats
  SELECT total_his INTO new_count FROM get_global_stats();
  RETURN new_count;
END;
$$;

-- Create function to increment wave count (called when user shares)
CREATE OR REPLACE FUNCTION increment_hi_wave(user_uuid UUID DEFAULT NULL, share_data JSONB DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  -- Insert into public_shares table to create REAL wave data
  BEGIN
    INSERT INTO public_shares (user_id, content, share_type, is_anonymous, created_at, metadata)
    VALUES (
      COALESCE(user_uuid, auth.uid()),
      COALESCE(share_data->>'text', 'Hi Wave! 👋'),
      'hi_wave',
      COALESCE((share_data->>'isAnonymous')::boolean, false),
      NOW(),
      share_data
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Try island_activities if public_shares doesn't exist
      BEGIN
        INSERT INTO island_activities (user_id, activity_type, notes, created_at)
        VALUES (
          COALESCE(user_uuid, auth.uid()),
          'hi_wave',
          COALESCE(share_data->>'text', 'Hi Wave! 👋'),
          NOW()
        );
      EXCEPTION
        WHEN undefined_table THEN
          RAISE NOTICE 'No sharing table found, wave increment skipped';
      END;
  END;
  
  -- Return current count from get_global_stats
  SELECT hi_waves INTO new_count FROM get_global_stats();
  RETURN new_count;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_total_hi(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hi_wave(UUID, JSONB) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_global_stats() IS 'Returns REAL global statistics aggregated from actual user data tables';
COMMENT ON FUNCTION increment_total_hi(UUID) IS 'Increments Hi count by inserting real data into Hi moments table';
COMMENT ON FUNCTION increment_hi_wave(UUID, JSONB) IS 'Increments wave count by inserting real sharing data';

-- ===============================================
-- 🔍 DIAGNOSTIC QUERIES (Run these to verify)
-- ===============================================

-- Test the function
-- SELECT * FROM get_global_stats();

-- Check what tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%hi%' OR table_name LIKE '%share%' OR table_name LIKE '%moment%';

-- Verify real data counts
-- SELECT 'hi_moments' as table_name, COUNT(*) as count FROM hi_moments
-- UNION ALL
-- SELECT 'public_shares', COUNT(*) FROM public_shares
-- UNION ALL  
-- SELECT 'daily_hi_moments', COUNT(*) FROM daily_hi_moments;