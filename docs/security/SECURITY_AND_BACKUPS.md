# 🛡️ Hi App Security & Backups

**Tesla-Grade Security**: Zero-trust architecture with defense in depth  
**Philosophy**: Least privilege, assume breach, audit everything  
**Last Updated**: 2025-11-01  

---

## Overview

The Hi App implements comprehensive security controls across authentication, authorization, data protection, and operational resilience. All user data is protected by Row Level Security (RLS) with strict least-privilege policies.

### Security Principles
- **Zero Trust**: Never trust, always verify
- **Least Privilege**: Minimum necessary access only
- **Defense in Depth**: Multiple security layers
- **Audit Everything**: Complete activity logging
- **Assume Breach**: Plan for compromise scenarios

---

## Roles & Keys

### Supabase Roles in Use

#### 1. `anon` (Anonymous Role)
- **Purpose**: Unauthenticated public access
- **Permissions**: Read-only access to public views only
- **Usage**: Public feed viewing, landing page data
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe)

#### 2. `authenticated` (Authenticated Users)  
- **Purpose**: Signed-in user operations
- **Permissions**: CRUD on own data only via RLS policies
- **Usage**: Profile management, share creation, streak tracking
- **Key**: JWT token from Supabase Auth (automatic)

#### 3. `service_role` (Server Operations)
- **Purpose**: Administrative and server-side operations
- **Permissions**: Full database access (bypass RLS)
- **Usage**: Migrations, analytics, admin functions
- **Key**: `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client)

### Key Security Matrix

| Environment | Public URL | Anon Key | Service Key |
|-------------|------------|----------|-------------|
| Local | ✅ Exposed | ✅ Exposed | 🔒 Server only |
| Preview | ✅ Exposed | ✅ Exposed | 🔒 Vercel env |
| Production | ✅ Exposed | ✅ Exposed | 🔒 Vercel env |

---

## RLS Policies (Least Privilege)

### Database Tables Inventory

| Table | Purpose | RLS Enabled | Owner Access | Public Access |
|-------|---------|-------------|--------------|---------------|
| `hi_users` | Auth user records | ✅ | Own record only | None |
| `hi_profiles` | User profile data | ✅ | Own profile only | None |
| `hi_shares` | User sharing posts | ✅ | Own shares + public feed | Public view only |
| `hi_streaks` | Streak tracking | ✅ | Own streaks only | None |
| `hi_codes` | Referral codes | ✅ | Redeem only via RPC | None |
| `hi_referrals` | Referral tracking | ✅ | Own referrals only | None |
| `hi_stats` | Global statistics | ✅ | Read-only | Read-only |

### Policy Definitions

#### hi_users Table
```sql
-- Policy: Users can only access their own record
CREATE POLICY "users_own_record_only" ON hi_users
FOR ALL USING (auth.uid() = id);

-- Purpose: Prevents cross-user data access
-- Example: User A cannot read User B's auth data
```

#### hi_profiles Table  
```sql
-- Policy: Users can select/update only their own profile
CREATE POLICY "profiles_own_access_only" ON hi_profiles
FOR ALL USING (auth.uid() = user_id);

-- Purpose: Profile data isolation between users
-- Example: SELECT * FROM hi_profiles WHERE user_id = auth.uid()
```

#### hi_shares Table
```sql
-- Policy: Insert only if authenticated user owns the share
CREATE POLICY "shares_insert_own_only" ON hi_shares
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can read own shares + public shares
CREATE POLICY "shares_select_own_and_public" ON hi_shares  
FOR SELECT USING (
  auth.uid() = user_id OR 
  (visibility = 'public' AND status = 'active')
);

-- Policy: Users can update/delete only their own shares
CREATE POLICY "shares_modify_own_only" ON hi_shares
FOR UPDATE USING (auth.uid() = user_id);

-- Purpose: Share ownership and public feed safety
-- Example: Public feed shows only visibility='public' rows
```

#### hi_streaks Table
```sql
-- Policy: Owner read/write only
CREATE POLICY "streaks_owner_only" ON hi_streaks
FOR ALL USING (auth.uid() = user_id);

-- Purpose: Streak data privacy and integrity
-- Example: Users cannot manipulate other users' streaks
```

#### hi_codes & hi_referrals Tables
```sql  
-- Policy: Codes - Read for redemption, no direct insert
CREATE POLICY "codes_read_only_for_redemption" ON hi_codes
FOR SELECT USING (status = 'active');

-- Policy: Referrals - Own referrals only
CREATE POLICY "referrals_own_only" ON hi_referrals  
FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Purpose: Code security and referral tracking isolation
-- Example: Code creation via server RPC functions only
```

---

## Public Views (Safety-First)

### public_hi_feed View

```sql
CREATE VIEW public_hi_feed AS
SELECT 
  id,
  content_text,
  emotion_type,
  created_at,
  -- Privacy: Approximate location using geohash rounding
  ST_SnapToGrid(location, 0.01) as approx_location, -- ~1km precision
  -- Privacy: No user email, phone, or precise location
  'anonymous' as display_name
FROM hi_shares 
WHERE visibility = 'public' 
  AND status = 'active'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;

-- RLS Policy: Allow anonymous read of public view only
CREATE POLICY "public_feed_anon_access" ON public_hi_feed
FOR SELECT USING (true);
```

### Privacy Features
- **Location Privacy**: Coordinates rounded to ~1km grid
- **Identity Privacy**: No user emails or names exposed  
- **Content Filter**: Only approved public shares shown
- **Time Bounds**: Only recent shares (30 days max)
- **Rate Limiting**: Limited to 100 most recent items

---

## Secrets & Environment Hygiene

### Environment Variables Matrix

| Variable | Local | Preview | Production | Client Safe |
|----------|-------|---------|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 | 🔒 | 🔒 | ❌ Never |
| `JWT_SECRET` | 🔒 | 🔒 | 🔒 | ❌ Never |

### Secret Security Checklist
- ✅ No service keys in repository
- ✅ No service keys in client bundle  
- ✅ Vercel environment variables properly configured
- ✅ Service role key restricted to server-side functions only
- ✅ Anon key limited by RLS policies

---

## Backups & Recovery

### Backup Schedule
- **Frequency**: Nightly automated backups at 2:00 AM UTC
- **Retention**: 30 days point-in-time recovery (PITR)
- **Storage**: Supabase managed backup system
- **Verification**: Weekly restore test to staging environment

### Recovery Procedures

#### Standard Recovery (Data Loss < 24h)
1. Access Supabase dashboard backup section
2. Select recovery timestamp
3. Initiate point-in-time restore
4. Verify data integrity
5. Update application configuration if needed

#### Emergency Recovery (Complete System Compromise)  
1. Activate read-only mode: `ALTER DATABASE hi_app SET default_transaction_read_only = true;`
2. Rotate all API keys immediately
3. Restore from known good backup (phase4-prod-stable baseline)
4. Review audit logs for breach timeline
5. Implement additional security measures before re-enabling writes

---

## Audit Logging & Monitoring

### Enabled Audit Features
- ✅ Row-level security policy violations
- ✅ Authentication failures and successes  
- ✅ High-rate insert/update operations
- ✅ Failed code redemption attempts
- ✅ API key usage patterns

### Monitoring Queries

#### Suspicious Activity Detection
```sql
-- Policy violations in last 24h
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND payload->>'level' = 'ERROR'
  AND payload->>'msg' LIKE '%policy%';

-- High-rate operations per user
SELECT user_id, COUNT(*) as operation_count
FROM hi_shares 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 10;
```

#### Security Dashboard Links
- **Policy Violations**: [Supabase Dashboard → Logs → Security]
- **Auth Anomalies**: [Supabase Dashboard → Auth → Audit]
- **Rate Limiting**: [Vercel Dashboard → Functions → Metrics]

---

## Incident Response

### Severity Levels

#### P0 - Critical (Data Breach/System Compromise)
- **Response Time**: Immediate (0-15 minutes)
- **Actions**: Enable read-only mode, rotate keys, notify stakeholders
- **Escalation**: All hands, external security team if needed

#### P1 - High (Auth Bypass/Policy Violation)
- **Response Time**: 1 hour
- **Actions**: Patch vulnerability, audit impact, strengthen controls
- **Escalation**: Security team + engineering lead

#### P2 - Medium (Suspicious Activity/Rate Limiting)
- **Response Time**: 4 hours  
- **Actions**: Investigate patterns, adjust policies if needed
- **Escalation**: On-call engineer

### Emergency Procedures
See `docs/security/INCIDENT_PLAYBOOK.md` for detailed step-by-step procedures.

---

*Tesla-Grade Security | Defense in Depth | Audit Everything*