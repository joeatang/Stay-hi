# 🚨 Security Incident Playbook

**Purpose**: Step-by-step procedures for security incident response  
**Scope**: Hi App production environment  
**Emergency Contact**: [Update with actual contact info]  
**Last Updated**: 2025-11-01  

---

## Incident Severity Levels

### P0 - Critical (0-15 minutes response)
- Data breach confirmed
- Service role key compromised  
- System-wide compromise
- Mass data exfiltration

### P1 - High (0-1 hour response)  
- Authentication bypass discovered
- RLS policy violation confirmed
- Single user account compromised
- Suspicious admin activity

### P2 - Medium (0-4 hours response)
- Rate limiting triggered
- Failed authentication spikes
- Potential reconnaissance activity
- Service degradation

---

## Emergency Procedures

### 🔒 Enable Read-Only Mode (P0 Response)

**When**: Complete system compromise suspected

```sql
-- Step 1: Connect to Supabase with service role
-- Step 2: Enable read-only mode
ALTER DATABASE hi_app SET default_transaction_read_only = true;

-- Step 3: Verify mode is active
SHOW default_transaction_read_only; -- Should return 'on'

-- Step 4: Test that writes are blocked
INSERT INTO hi_shares (user_id, content_text) VALUES ('test', 'test'); 
-- Should fail with read-only error
```

**Communication**: 
- Notify all stakeholders immediately
- Update status page with "Emergency Maintenance"
- Prepare public communication about temporary read-only access

---

### 🔄 Rotate API Keys (P0/P1 Response)

**When**: Key compromise confirmed or suspected

#### Step 1: Supabase Key Rotation
1. **Log into Supabase Dashboard** → Project Settings → API
2. **Generate new anon key**: Click "Generate new anon key"
3. **Generate new service role key**: Click "Generate new service role key"  
4. **Keep old keys active** (don't revoke yet - will break current deployments)

#### Step 2: Update Vercel Environment Variables
1. **Vercel Dashboard** → Hi App Project → Settings → Environment Variables
2. **Update NEXT_PUBLIC_SUPABASE_ANON_KEY** with new anon key
3. **Update SUPABASE_SERVICE_ROLE_KEY** with new service role key
4. **Redeploy** → Deployments → Redeploy latest production build

#### Step 3: Update Local Development
```bash
# Update .env.local with new keys
NEXT_PUBLIC_SUPABASE_ANON_KEY=new_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=new_service_key_here

# Test locally
npm run dev
# Verify app functions correctly
```

#### Step 4: Revoke Old Keys
1. **Wait for deployment confirmation** (all environments updated)
2. **Return to Supabase Dashboard** → Project Settings → API
3. **Revoke old anon key**: Click "Revoke" next to old key
4. **Revoke old service role key**: Click "Revoke" next to old key
5. **Monitor logs** for any failed authentication attempts

---

### 🚫 Revoke Referral Code (P1/P2 Response)

**When**: Fraudulent code activity detected

```sql
-- Step 1: Identify suspicious codes
SELECT * FROM hi_codes 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND usage_count > expected_normal_usage;

-- Step 2: Revoke specific code
UPDATE hi_codes 
SET status = 'revoked', 
    revoked_at = NOW(),
    revoked_reason = 'Security incident - suspicious usage'
WHERE code = 'SUSPICIOUS_CODE_HERE';

-- Step 3: Audit redemptions
SELECT * FROM hi_referrals 
WHERE code_used = 'SUSPICIOUS_CODE_HERE'
ORDER BY created_at DESC;

-- Step 4: Consider user account review if needed
```

---

### ⏪ Emergency Rollback to phase4-prod-stable

**When**: New deployment causes security issues

#### Database Rollback
```sql
-- Option 1: Point-in-time recovery (if within backup window)
-- Use Supabase Dashboard → Database → Backups
-- Select timestamp from before incident
-- Initiate restore (creates new database - will require DNS update)

-- Option 2: Manual data correction (if isolated issue)
-- Identify and reverse malicious changes
-- Use audit logs to track what needs rollback
```

#### Application Rollback
```bash
# Step 1: Checkout stable tag
git checkout phase4-prod-stable

# Step 2: Force deploy to production
vercel --prod --force

# Step 3: Verify rollback success
curl https://stay-eoyezel0s-joeatangs-projects.vercel.app/health
```

#### DNS/CDN Cache Clear (if needed)
```bash
# Vercel automatic cache invalidation on deploy
# Manual verification:
curl -H "Cache-Control: no-cache" https://stay-eoyezel0s-joeatangs-projects.vercel.app/
```

---

## Investigation Procedures

### 🔍 Audit Log Analysis

#### Recent Policy Violations
```sql
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '4 hours'
  AND payload->>'level' = 'ERROR'
  AND payload->>'msg' ILIKE '%policy%'
ORDER BY created_at DESC;
```

#### Authentication Anomalies  
```sql
SELECT 
  payload->>'user_id' as user_id,
  payload->>'msg' as message,
  created_at
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND payload->>'msg' ILIKE '%auth%'
ORDER BY created_at DESC;
```

#### High-Rate Operations
```sql
SELECT 
  user_id, 
  COUNT(*) as operation_count,
  MIN(created_at) as first_op,
  MAX(created_at) as last_op
FROM hi_shares 
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY user_id
HAVING COUNT(*) > 20
ORDER BY operation_count DESC;
```

### 📊 Security Dashboard Queries

#### Failed Authentication Rate
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as failed_attempts
FROM auth.audit_log_entries
WHERE payload->>'msg' ILIKE '%failed%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

#### Cross-User Access Attempts  
```sql
-- This requires custom logging in application
-- Look for attempts to access other users' data
SELECT 
  user_id,
  attempted_resource,
  created_at
FROM security_violations_log
WHERE violation_type = 'cross_user_access'
  AND created_at > NOW() - INTERVAL '4 hours';
```

---

## Communication Templates

### P0 Incident Announcement
```
SECURITY INCIDENT - IMMEDIATE ACTION REQUIRED

Hi App is temporarily in read-only mode due to a security incident.

Status: Investigating
Impact: Write operations disabled
Timeline: Updates every 30 minutes

Actions taken:
- Read-only mode activated
- All API keys rotated
- Investigation in progress

Next update: [TIME + 30 minutes]
```

### P1 Resolution Notice
```
SECURITY INCIDENT - RESOLVED

The security issue has been resolved and normal operations restored.

Summary: [Brief description]
Root cause: [Technical cause]
Resolution: [Actions taken]
Prevention: [Preventive measures added]

Full post-incident review will be published within 72 hours.
```

---

## Post-Incident Actions

### Immediate (0-4 hours)
- [ ] Confirm threat is neutralized
- [ ] Restore normal operations  
- [ ] Document timeline of events
- [ ] Preserve forensic evidence

### Short-term (4-24 hours)
- [ ] Conduct initial root cause analysis
- [ ] Implement immediate preventive measures
- [ ] Update monitoring and alerting
- [ ] Brief stakeholders on findings

### Long-term (1-7 days)
- [ ] Complete formal post-incident review
- [ ] Update security policies and procedures
- [ ] Conduct security training if needed
- [ ] Publish public incident report (if required)

---

## Contact Information

### Emergency Contacts
- **Security Team**: [security@hiapp.com]
- **On-Call Engineer**: [oncall@hiapp.com]  
- **Legal Team**: [legal@hiapp.com]
- **Public Relations**: [pr@hiapp.com]

### External Resources
- **Supabase Support**: [Dashboard → Support → Emergency]
- **Vercel Support**: [Dashboard → Help → Contact Support]
- **Law Enforcement**: [Local cyber crime unit]

---

*Security Incident Response | Tesla-Grade Procedures | Zero-Tolerance for Breaches*