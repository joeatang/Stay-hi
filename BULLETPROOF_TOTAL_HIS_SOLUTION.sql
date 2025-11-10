-- 🚀 BULLETPROOF SOLUTION: Dedicated Global Stats Table
-- This will 100% fix the Total His counter forever

-- 🔧 Create dedicated global_stats table
CREATE TABLE IF NOT EXISTS global_stats (
  stat_name text PRIMARY KEY,
  stat_value bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- 🔧 Initialize Total His counter
INSERT INTO global_stats (stat_name, stat_value) 
VALUES ('total_his', 86) 
ON CONFLICT (stat_name) DO NOTHING;

-- 🔧 Create bulletproof increment function
CREATE OR REPLACE FUNCTION increment_total_hi()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_total bigint;
BEGIN
  -- Atomic increment with UPSERT guarantee
  INSERT INTO global_stats (stat_name, stat_value, updated_at) 
  VALUES ('total_his', 87, now())
  ON CONFLICT (stat_name) 
  DO UPDATE SET 
    stat_value = global_stats.stat_value + 1,
    updated_at = now()
  RETURNING stat_value INTO new_total;
  
  RETURN new_total;
END;
$$;

-- 🔧 Create get function for reading
CREATE OR REPLACE FUNCTION get_total_his()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_total bigint;
BEGIN
  SELECT stat_value INTO current_total 
  FROM global_stats 
  WHERE stat_name = 'total_his';
  
  -- Return 86 if no record exists yet
  RETURN COALESCE(current_total, 86);
END;
$$;

-- 🔧 Grant permissions
GRANT SELECT ON global_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_total_hi() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_total_his() TO authenticated, anon;

-- ✅ Test everything
SELECT 'Initial value:' as test, get_total_his() as value;
SELECT 'After increment:' as test, increment_total_hi() as value;
SELECT 'Final check:' as test, get_total_his() as value;