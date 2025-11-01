-- 🚀 Hi Dev Emergency Table Creation
-- Creates missing tables that increment_hi_wave function needs

-- Create public_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public_shares (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  share_type TEXT DEFAULT 'hi_wave',
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for public_shares
CREATE POLICY "Users can insert their own shares" ON public_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can view public shares" ON public_shares
  FOR SELECT USING (true);

-- Create island_activities table if it doesn't exist  
CREATE TABLE IF NOT EXISTS island_activities (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT DEFAULT 'hi_wave',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE island_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for island_activities
CREATE POLICY "Users can insert their own activities" ON island_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can view activities" ON island_activities
  FOR SELECT USING (true);

-- Grant permissions
GRANT INSERT, SELECT ON public_shares TO anon, authenticated;
GRANT INSERT, SELECT ON island_activities TO anon, authenticated;

-- Grant sequence permissions (handle dynamic sequence names)
DO $$
DECLARE
    seq_name TEXT;
BEGIN
    -- Find and grant permissions on public_shares sequence
    SELECT sequence_name INTO seq_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public' 
    AND sequence_name LIKE 'public_shares%seq';
    
    IF seq_name IS NOT NULL THEN
        EXECUTE 'GRANT USAGE ON SEQUENCE ' || seq_name || ' TO anon, authenticated';
    END IF;
    
    -- Find and grant permissions on island_activities sequence
    SELECT sequence_name INTO seq_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public' 
    AND sequence_name LIKE 'island_activities%seq';
    
    IF seq_name IS NOT NULL THEN
        EXECUTE 'GRANT USAGE ON SEQUENCE ' || seq_name || ' TO anon, authenticated';
    END IF;
END $$;

-- Test the increment function
SELECT increment_hi_wave();

-- Verify tables exist
SELECT 
  'public_shares' as table_name, 
  COUNT(*) as record_count 
FROM public_shares
UNION ALL
SELECT 
  'island_activities' as table_name,
  COUNT(*) as record_count
FROM island_activities;