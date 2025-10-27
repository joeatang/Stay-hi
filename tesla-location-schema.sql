-- Tesla-Grade Location System Database Schema
-- Add location fields to profiles table

-- Add location columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_state TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_country_code TEXT,
ADD COLUMN IF NOT EXISTS location_timezone TEXT,
ADD COLUMN IF NOT EXISTS location_source TEXT CHECK (location_source IN ('auto', 'manual', 'browser', 'ip', 'timezone')),
ADD COLUMN IF NOT EXISTS location_accuracy TEXT,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_location_city ON profiles(location_city);
CREATE INDEX IF NOT EXISTS idx_profiles_location_country ON profiles(location_country);
CREATE INDEX IF NOT EXISTS idx_profiles_location_country_code ON profiles(location_country_code);

-- Create location privacy settings table
CREATE TABLE IF NOT EXISTS location_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  show_city BOOLEAN DEFAULT true,
  show_state BOOLEAN DEFAULT true,
  show_country BOOLEAN DEFAULT true,
  allow_location_sharing BOOLEAN DEFAULT true,
  share_with_nearby BOOLEAN DEFAULT false,
  nearby_radius_km INTEGER DEFAULT 50 CHECK (nearby_radius_km BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on location privacy settings
ALTER TABLE location_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for location privacy settings
CREATE POLICY "Users can view their location privacy settings" ON location_privacy_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their location privacy settings" ON location_privacy_settings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their location privacy settings" ON location_privacy_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their location privacy settings" ON location_privacy_settings
FOR DELETE USING (auth.uid() = user_id);

-- Create function to get nearby users (respecting privacy)
CREATE OR REPLACE FUNCTION get_nearby_users(
  user_location_city TEXT,
  user_location_country_code TEXT,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  location_display TEXT,
  distance_category TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    CASE 
      WHEN lps.show_city AND lps.show_state AND lps.show_country THEN p.location
      WHEN lps.show_country THEN p.location_country
      ELSE 'Location Hidden'
    END as location_display,
    CASE
      WHEN p.location_city = user_location_city THEN 'same_city'
      WHEN p.location_country_code = user_location_country_code THEN 'same_country'
      ELSE 'different_country'
    END as distance_category
  FROM profiles p
  LEFT JOIN location_privacy_settings lps ON p.id = lps.user_id
  WHERE 
    p.location_city IS NOT NULL
    AND p.location_country_code IS NOT NULL
    AND (lps.allow_location_sharing IS NULL OR lps.allow_location_sharing = true)
    AND p.id != auth.uid()
    AND (
      (p.location_city = user_location_city AND (lps.share_with_nearby IS NULL OR lps.share_with_nearby = true))
      OR p.location_country_code = user_location_country_code
    )
  ORDER BY 
    CASE
      WHEN p.location_city = user_location_city THEN 1
      WHEN p.location_country_code = user_location_country_code THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT max_results;
END;
$$;

-- Create function to format location display (respecting privacy)
CREATE OR REPLACE FUNCTION format_user_location(
  user_id UUID,
  requester_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_record profiles%ROWTYPE;
  privacy_record location_privacy_settings%ROWTYPE;
  location_parts TEXT[];
BEGIN
  -- Get profile data
  SELECT * INTO profile_record FROM profiles WHERE id = user_id;
  
  -- Get privacy settings (with defaults if not set)
  SELECT * INTO privacy_record FROM location_privacy_settings WHERE user_id = user_id;
  
  -- If no privacy settings found, use defaults
  IF privacy_record IS NULL THEN
    privacy_record.show_city := true;
    privacy_record.show_state := true;
    privacy_record.show_country := true;
    privacy_record.allow_location_sharing := true;
  END IF;
  
  -- Check if location sharing is allowed
  IF NOT privacy_record.allow_location_sharing THEN
    RETURN 'Location Hidden';
  END IF;
  
  -- Build location string based on privacy settings
  location_parts := ARRAY[]::TEXT[];
  
  IF privacy_record.show_city AND profile_record.location_city IS NOT NULL THEN
    location_parts := array_append(location_parts, profile_record.location_city);
  END IF;
  
  IF privacy_record.show_state AND profile_record.location_state IS NOT NULL THEN
    location_parts := array_append(location_parts, profile_record.location_state);
  END IF;
  
  IF privacy_record.show_country AND profile_record.location_country IS NOT NULL THEN
    location_parts := array_append(location_parts, profile_record.location_country);
  END IF;
  
  -- Return formatted location or fallback
  IF array_length(location_parts, 1) > 0 THEN
    RETURN array_to_string(location_parts, ', ');
  ELSE
    RETURN 'Location Not Set';
  END IF;
END;
$$;

-- Create trigger to update location_updated_at
CREATE OR REPLACE FUNCTION update_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.location_city IS DISTINCT FROM NEW.location_city 
      OR OLD.location_state IS DISTINCT FROM NEW.location_state 
      OR OLD.location_country IS DISTINCT FROM NEW.location_country) THEN
    NEW.location_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_location_timestamp ON profiles;
CREATE TRIGGER trigger_update_location_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_location_timestamp();

-- Insert default privacy settings for existing users
INSERT INTO location_privacy_settings (user_id, show_city, show_state, show_country, allow_location_sharing)
SELECT id, true, true, true, true
FROM profiles
WHERE id NOT IN (SELECT user_id FROM location_privacy_settings);

COMMENT ON TABLE location_privacy_settings IS 'Tesla-grade location privacy controls for users';
COMMENT ON FUNCTION get_nearby_users IS 'Find nearby users respecting privacy settings';
COMMENT ON FUNCTION format_user_location IS 'Format user location display respecting privacy preferences';