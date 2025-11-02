# 🔧 Supabase Security Implementation Script

**Purpose**: SQL commands to implement Tesla-grade security policies  
**Environment**: Run in Supabase SQL Editor  
**Prerequisites**: Tables created, RLS enabled  
**Last Updated**: 2025-11-01  

---

## Step 1: Enable Row Level Security

```sql
-- Enable RLS on all user data tables
ALTER TABLE hi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_shares ENABLE ROW LEVEL SECURITY;  
ALTER TABLE hi_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hi_stats ENABLE ROW LEVEL SECURITY;
```

---

## Step 2: User Access Policies

### hi_users Table Policies
```sql
-- Users can only access their own auth record
CREATE POLICY "users_own_record_only" ON hi_users
FOR ALL 
USING (auth.uid() = id);

-- Allow users to update their own record  
CREATE POLICY "users_update_own_record" ON hi_users
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### hi_profiles Table Policies  
```sql
-- Users can select/update only their own profile
CREATE POLICY "profiles_own_access_only" ON hi_profiles
FOR ALL 
USING (auth.uid() = user_id);

-- Allow profile creation for authenticated users
CREATE POLICY "profiles_insert_own_only" ON hi_profiles
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

---

## Step 3: Share Access Policies

### hi_shares Table Policies
```sql
-- Insert only if authenticated user owns the share
CREATE POLICY "shares_insert_own_only" ON hi_shares
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can read own shares + public shares
CREATE POLICY "shares_select_own_and_public" ON hi_shares
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (visibility = 'public' AND status = 'active')
);

-- Users can update/delete only their own shares
CREATE POLICY "shares_update_own_only" ON hi_shares
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shares_delete_own_only" ON hi_shares
FOR DELETE 
USING (auth.uid() = user_id);
```

---

## Step 4: Streak & Activity Policies

### hi_streaks Table Policies
```sql
-- Owner read/write only
CREATE POLICY "streaks_owner_only" ON hi_streaks
FOR ALL 
USING (auth.uid() = user_id);

-- Allow streak creation for authenticated users
CREATE POLICY "streaks_insert_own_only" ON hi_streaks
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

---

## Step 5: Referral System Policies

### hi_codes Table Policies
```sql
-- Codes - Read for redemption validation only
CREATE POLICY "codes_read_for_redemption" ON hi_codes
FOR SELECT 
USING (
  status = 'active' AND 
  (expires_at IS NULL OR expires_at > NOW())
);

-- No direct insert - codes created via server functions only
-- CREATE POLICY "codes_no_direct_insert" ON hi_codes
-- FOR INSERT WITH CHECK (false); -- Blocks all direct inserts
```

### hi_referrals Table Policies
```sql
-- Users can see referrals they made or received
CREATE POLICY "referrals_participant_access" ON hi_referrals
FOR SELECT 
USING (
  auth.uid() = referrer_id OR 
  auth.uid() = referred_id
);

-- Referral creation via server functions (with service role)
CREATE POLICY "referrals_server_insert_only" ON hi_referrals
FOR INSERT 
WITH CHECK (
  -- Allow service role to insert
  current_setting('role') = 'service_role' OR
  -- Or allow if user is the referrer
  auth.uid() = referrer_id
);
```

---

## Step 6: Public Statistics Policies

### hi_stats Table Policies
```sql
-- Global stats - read-only for all authenticated users
CREATE POLICY "stats_read_only_authenticated" ON hi_stats
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Anonymous read access for public stats only
CREATE POLICY "stats_public_anonymous_read" ON hi_stats
FOR SELECT 
USING (
  auth.role() = 'anon' AND 
  stat_type = 'public'
);

-- Stats updates via server role only
CREATE POLICY "stats_server_update_only" ON hi_stats
FOR UPDATE 
USING (current_setting('role') = 'service_role');
```

---

## Step 7: Create Public Views

### Public Feed View (Privacy-Safe)
```sql
CREATE OR REPLACE VIEW public_hi_feed AS
SELECT 
  id,
  content_text,
  emotion_type,
  created_at,
  -- Privacy: Approximate location using coordinate rounding
  CASE 
    WHEN location IS NOT NULL THEN 
      ST_SetSRID(ST_MakePoint(
        ROUND(ST_X(location)::numeric, 2), -- ~1km precision
        ROUND(ST_Y(location)::numeric, 2)
      ), 4326)
    ELSE NULL 
  END as approx_location,
  -- Privacy: Anonymous display
  'anonymous' as display_name,
  -- Safe metadata
  likes_count,
  shares_count
FROM hi_shares 
WHERE 
  visibility = 'public' 
  AND status = 'active'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;

-- Allow anonymous access to public view
CREATE POLICY "public_feed_anonymous_access" ON public_hi_feed
FOR SELECT 
USING (true);
```

### Public Stats View
```sql
CREATE OR REPLACE VIEW public_stats AS
SELECT 
  stat_name,
  stat_value,
  last_updated
FROM hi_stats 
WHERE stat_type = 'public'
ORDER BY stat_name;

-- Allow anonymous access to public stats
CREATE POLICY "public_stats_anonymous_access" ON public_stats
FOR SELECT 
USING (true);
```

---

## Step 8: Security Functions

### User Ownership Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_user_ownership(table_name text, record_id uuid)
RETURNS boolean AS $$
DECLARE
  owner_id uuid;
BEGIN
  -- Get the user_id of the record owner
  EXECUTE format('SELECT user_id FROM %I WHERE id = $1', table_name)
  INTO owner_id
  USING record_id;
  
  -- Check if current user owns the record
  RETURN owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Secure Code Redemption Function
```sql
CREATE OR REPLACE FUNCTION redeem_referral_code(code_text text)
RETURNS json AS $$
DECLARE
  code_record RECORD;
  redemption_result json;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get code details with row lock
  SELECT * INTO code_record 
  FROM hi_codes 
  WHERE code = code_text 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;
  
  -- Check if code exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;
  
  -- Check usage limits
  IF code_record.max_uses IS NOT NULL AND code_record.usage_count >= code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Code usage limit exceeded');
  END IF;
  
  -- Create redemption record
  INSERT INTO hi_referrals (
    code_used,
    referrer_id,
    referred_id,
    redeemed_at
  ) VALUES (
    code_text,
    code_record.created_by,
    auth.uid(),
    NOW()
  );
  
  -- Update code usage count
  UPDATE hi_codes 
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = code_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'code_id', code_record.id,
    'referrer_id', code_record.created_by
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Redemption failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Step 9: Audit & Monitoring Setup

### Enable Audit Logging
```sql
-- Enable audit logging for all tables (if not already enabled)
-- This is typically done in Supabase dashboard under Database → Extensions
-- Ensure pgaudit extension is enabled

-- Create security violations log table
CREATE TABLE IF NOT EXISTS security_violations_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  violation_type text NOT NULL,
  table_name text,
  attempted_action text,
  attempted_resource text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on violations log  
ALTER TABLE security_violations_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read violation logs
CREATE POLICY "violations_admin_only" ON security_violations_log
FOR ALL 
USING (current_setting('role') = 'service_role');
```

### Create Monitoring Views
```sql
-- Recent policy violations
CREATE OR REPLACE VIEW recent_policy_violations AS
SELECT 
  DATE_TRUNC('hour', created_at) as violation_hour,
  violation_type,
  COUNT(*) as violation_count
FROM security_violations_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), violation_type
ORDER BY violation_hour DESC;

-- High-activity users (potential abuse)
CREATE OR REPLACE VIEW high_activity_users AS
SELECT 
  user_id,
  COUNT(*) as action_count,
  MIN(created_at) as first_action,
  MAX(created_at) as last_action
FROM hi_shares
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY user_id
HAVING COUNT(*) > 20
ORDER BY action_count DESC;
```

---

## Step 10: Verification Queries

### Test RLS Policies
```sql
-- Test 1: Verify cross-user access is blocked
-- (Run this as different users to verify isolation)
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-a-uuid-here';

-- Should only return User A's data
SELECT COUNT(*) FROM hi_profiles; -- Should be 1 (own profile only)
SELECT COUNT(*) FROM hi_shares WHERE user_id != 'user-a-uuid-here'; -- Should be 0

-- Test 2: Verify anonymous access restrictions  
SET ROLE anon;
SELECT COUNT(*) FROM hi_profiles; -- Should be 0 (no access)
SELECT COUNT(*) FROM public_hi_feed; -- Should work (public view)

-- Test 3: Verify service role bypass
SET ROLE service_role;
SELECT COUNT(*) FROM hi_profiles; -- Should see all profiles (bypasses RLS)
```

### Security Health Check
```sql
-- Check that RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'hi_%'
ORDER BY tablename;
-- All should show rowsecurity = true

-- Check policy coverage
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- Ensure all tables have appropriate policies
```

---

*Security Implementation | RLS Policies | Tesla-Grade Protection*