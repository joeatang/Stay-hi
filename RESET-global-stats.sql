-- ===============================================
-- 🔥 COMPLETE RESET & REBUILD - TESLA GRADE
-- ===============================================
-- This will completely reset and rebuild everything properly

-- Step 1: Drop everything cleanly
DROP TABLE IF EXISTS global_stats CASCADE;
DROP FUNCTION IF EXISTS get_global_stats() CASCADE;
DROP FUNCTION IF EXISTS increment_hi_wave() CASCADE;
DROP FUNCTION IF EXISTS increment_total_hi() CASCADE;
DROP FUNCTION IF EXISTS update_active_users_count() CASCADE;

-- Step 2: Create fresh table
CREATE TABLE global_stats (
  id SERIAL PRIMARY KEY,
  hi_waves BIGINT DEFAULT 0,
  total_his BIGINT DEFAULT 0,
  active_users_24h INTEGER DEFAULT 0,
  total_users BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Insert starting data
INSERT INTO global_stats (hi_waves, total_his, active_users_24h, total_users, updated_at)
VALUES (15640, 892, 23, 1247, NOW());

-- Step 4: Create RPC function
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
  hi_waves BIGINT,
  total_his BIGINT,
  active_users_24h INTEGER,
  total_users BIGINT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.hi_waves,
    gs.total_his,
    gs.active_users_24h,
    gs.total_users,
    gs.updated_at
  FROM global_stats gs
  ORDER BY gs.id DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::BIGINT as hi_waves,
      0::BIGINT as total_his, 
      0::INTEGER as active_users_24h,
      0::BIGINT as total_users,
      NOW() as updated_at;
  END IF;
END;
$$;

-- Step 5: Create increment functions
CREATE OR REPLACE FUNCTION increment_hi_wave()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE global_stats 
  SET 
    hi_waves = hi_waves + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, active_users_24h, total_users, updated_at)
    VALUES (1, 1, 0, 0, 0, NOW());
  END IF;
  
  SELECT hi_waves INTO new_count FROM global_stats WHERE id = 1;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS BIGINT  
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE global_stats 
  SET 
    total_his = total_his + 1,
    updated_at = NOW()
  WHERE id = 1;
  
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, active_users_24h, total_users, updated_at)
    VALUES (1, 0, 1, 0, 0, NOW());
  END IF;
  
  SELECT total_his INTO new_count FROM global_stats WHERE id = 1;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION update_active_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
DECLARE
  active_count INTEGER;
  total_count BIGINT;
BEGIN
  SELECT COALESCE(COUNT(DISTINCT user_id), 0) INTO active_count
  FROM auth.sessions 
  WHERE updated_at > NOW() - INTERVAL '24 hours';
  
  SELECT COALESCE(COUNT(*), 0) INTO total_count FROM auth.users;
  
  UPDATE global_stats 
  SET 
    active_users_24h = active_count,
    total_users = total_count,
    updated_at = NOW()
  WHERE id = 1;
  
  IF NOT FOUND THEN
    INSERT INTO global_stats (id, hi_waves, total_his, active_users_24h, total_users, updated_at)
    VALUES (1, 0, 0, active_count, total_count, NOW());
  END IF;
  
  RETURN active_count;
END;
$$;

-- Step 6: Set permissions
GRANT EXECUTE ON FUNCTION get_global_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_hi_wave() TO anon, authenticated;  
GRANT EXECUTE ON FUNCTION increment_total_hi() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_active_users_count() TO authenticated;

-- Step 7: Enable RLS
ALTER TABLE global_stats ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies
CREATE POLICY "Global stats are publicly readable" ON global_stats
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Only authenticated users can update stats" ON global_stats
  FOR ALL TO authenticated
  USING (true);

-- Done!
COMMENT ON FUNCTION get_global_stats() IS 'Returns current global statistics for the Stay Hi community';