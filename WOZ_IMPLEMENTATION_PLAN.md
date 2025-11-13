# 🏗️ WOZ-GRADE IMPLEMENTATION PLAN
**Principle:** Measure twice, cut once. No breaking changes.

---

## 🎯 PHASE 1: MISSION CONTROL SETUP (30 minutes)

### **Objective:** Get admin dashboard working with code generation

**Risk Level:** 🟢 ZERO RISK (only adds permissions, no schema changes)

### **Step 1.1: Grant Admin Access (2 minutes)**
```sql
-- Run in Supabase SQL Editor
INSERT INTO admin_roles (
  user_id,
  role_type,
  permissions,
  security_level,
  mfa_required,
  session_timeout_minutes
) 
SELECT 
  id,
  'super_admin',
  '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}'::jsonb,
  'maximum',
  false,
  120
FROM auth.users 
WHERE email = 'joeatang7@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role_type = 'super_admin',
  permissions = '{"all": true, "user_management": true, "system_admin": true, "invitation_management": true}'::jsonb,
  is_active = true,
  updated_at = NOW();
```

**Verification:**
```sql
-- Verify admin role created
SELECT 
  ar.role_type,
  ar.security_level,
  ar.is_active,
  au.email
FROM admin_roles ar
JOIN auth.users au ON ar.user_id = au.id
WHERE au.email = 'joeatang7@gmail.com';
```

**Expected Result:** 1 row showing super_admin role

---

### **Step 1.2: Test Mission Control Access (5 minutes)**

1. Open: `http://127.0.0.1:5500/public/hi-mission-control.html`
2. Should see:
   - ✅ Security loading screen
   - ✅ Dashboard stats (users, invitations, etc.)
   - ✅ "Generate Invite Code" button

3. If you see "Access Denied":
   - Check browser console for errors
   - Verify you're logged into Supabase
   - Re-run Step 1.1 SQL

---

### **Step 1.3: Test Code Generation (10 minutes)**

**Test 1: Generate 24hr test code**
1. Click "Generate Invite Code" in mission control
2. Should create code in format: `HI24H_XXXXX`
3. Verify in Supabase:
```sql
SELECT code, code_type, trial_days, max_uses, is_active, created_at
FROM invite_codes
ORDER BY created_at DESC
LIMIT 5;
```

**Test 2: Redeem code**
1. Copy generated code
2. Open dashboard in incognito window
3. Use code activation flow
4. Verify membership granted

**If code generation fails:**
- Check mission control console logs
- Verify `admin_generate_invite_code()` function exists
- May need to check function permissions

---

### **Step 1.4: Add Mission Control Nav Link (5 minutes)**

**Goal:** Easy access to admin dashboard from main dashboard

**File:** `public/hi-dashboard.html`

**Location:** Admin nav section (lines ~1531-1533)

**Change:** Verify link exists and works
```html
<a href="hi-mission-control.html" class="nav-link">
  <span class="nav-icon">🎛️</span>
  <span class="nav-text">Hi Mission Control</span>
</a>
```

**Verification:**
- Click hamburger menu in dashboard
- Should see "Hi Mission Control" option (only if admin)
- Click should navigate to mission control

---

## 🎯 PHASE 2: CODE GENERATION WORKFLOWS (30 minutes)

### **Objective:** Document and test all code generation patterns

**Risk Level:** 🟢 ZERO RISK (using existing functions, no changes)

### **Step 2.1: Test 24hr Code Pattern**

**Purpose:** Quick test access for friends (expires in 24 hours)

**SQL (run in Supabase):**
```sql
SELECT admin_generate_invite_code(
  auth.uid(),  -- created_by (your user ID)
  1,           -- max_uses (single use)
  24           -- expires_in_hours
);
```

**Expected Result:**
```json
{
  "code": "ABC123XY",
  "expires_at": "2025-11-14 12:00:00",
  "max_uses": 1
}
```

**Test:**
1. Share code with test user
2. They activate it
3. Check their tier: should be 24hr/trial
4. Wait 24 hours (or manually expire)
5. Verify access revoked

---

### **Step 2.2: Test 7d Code Pattern**

**Purpose:** Full feature testing (7 days)

**SQL:**
```sql
SELECT admin_generate_invite_code(
  auth.uid(),
  1,           -- Single use
  168          -- 7 days (24 * 7 hours)
);
```

**Recommended for:** Friends testing all features

---

### **Step 2.3: Test Multi-Use Beta Code**

**Purpose:** Public beta testing (100 people can use same code)

**SQL:**
```sql
SELECT admin_generate_invite_code(
  auth.uid(),
  100,         -- 100 uses
  720          -- 30 days (24 * 30 hours)
);
```

**Use Case:** Post on social media for beta testers

---

### **Step 2.4: Document Code Generation Reference**

Create quick reference card:

| Duration | SQL Command | Use Case |
|----------|-------------|----------|
| 1 hour | `max_uses=1, expires_in_hours=1` | Ultra-quick demo |
| 24 hours | `max_uses=1, expires_in_hours=24` | Friend testing |
| 7 days | `max_uses=1, expires_in_hours=168` | Full feature test |
| 30 days | `max_uses=1, expires_in_hours=720` | Beta tester |
| 30 days (100 uses) | `max_uses=100, expires_in_hours=720` | Public beta code |

---

## 🎯 VERIFICATION CHECKLIST

Before declaring success:

- [ ] Admin role exists in database
- [ ] Mission control loads without "Access Denied"
- [ ] Can generate codes from mission control UI
- [ ] Generated codes appear in `invite_codes` table
- [ ] Can redeem codes and get membership
- [ ] Mission control link appears in dashboard menu (admin only)
- [ ] No errors in browser console
- [ ] Dashboard still works for non-admin users
- [ ] No changes to existing database schema

---

## 🚨 ROLLBACK PROCEDURES

### **If Mission Control Access Fails:**
```sql
-- Remove admin role
DELETE FROM admin_roles WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'joeatang7@gmail.com'
);
```

### **If Code Generation Breaks:**
- No schema changes were made
- Existing codes still work
- Can manually insert codes:
```sql
INSERT INTO invite_codes (code, code_type, max_uses, trial_days, is_active)
VALUES ('MANUAL123', '24h', 1, 1, true);
```

### **If Dashboard Breaks:**
- Revert nav link addition
- Clear localStorage: `localStorage.clear()`
- Hard refresh: Cmd+Shift+R

---

## 🎯 SUCCESS CRITERIA

**Phase 1 & 2 Complete When:**
1. ✅ You can access mission control dashboard
2. ✅ You can generate codes with 1 click
3. ✅ Codes can be redeemed successfully
4. ✅ No existing features broken
5. ✅ Dashboard UI unchanged (except admin nav link)

---

## 🚫 PHASE 3 - NOT INCLUDED (Needs More Analysis)

**Deferred for separate planning:**
- Tier system standardization
- Deprecating hi-tier-system.js
- Feature gate consolidation
- Adding "tester" tier

**Why deferred:**
- Touches core feature access logic
- Affects multiple pages (dashboard, island, muscle)
- Needs comprehensive testing
- Higher risk of breaking existing functionality

**Next session:** Deep dive on Phase 3 after Phase 1 & 2 verified working

---

## 📊 DEPLOYMENT PLAN

### **Step 1: Commit Current State**
```bash
git add -A
git commit -m "Checkpoint: Before mission control setup"
git push origin main
```

### **Step 2: Test Mission Control Locally**
- Complete Phase 1 & 2
- Verify all features work

### **Step 3: Deploy to Vercel**
```bash
# Vercel auto-deploys from main branch
# Just verify deployment successful:
# https://stay-hi.vercel.app
```

### **Step 4: Verify Production**
- Mission control should work on Vercel
- Admin role is in Supabase (shared across local/prod)
- Test code generation on production

---

**READY TO EXECUTE?** Yes - Phase 1 & 2 only  
**READY FOR PHASE 3?** No - needs separate planning session  
**RISK LEVEL:** 🟢 Minimal (additive changes only)
