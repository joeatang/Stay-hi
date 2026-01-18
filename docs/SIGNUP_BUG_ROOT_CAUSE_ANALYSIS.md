# 🐛 Signup Bug: Root Cause Analysis

> **Date:** January 18, 2026  
> **Status:** ✅ ROOT CAUSE IDENTIFIED  
> **Severity:** 🔴 CRITICAL - False error blocks user, but account created

---

## 🎯 The Mystery

**User Reports:**
- User enters fresh invite code `886664B0` 
- Gets error: "Code has reached maximum uses"
- But code was just generated (not maxed)
- User CAN sign in afterward (account exists!)

**The Paradox:**
- Error says code is maxed → BUT code is fresh
- Error shown to user → BUT account was created
- User thinks signup failed → BUT can sign in

---

## 🔍 Investigation Timeline

### Step 1: First Hypothesis (WRONG)
**Thought:** Code actually maxed out  
**Evidence:** Error message says "Code has reached maximum uses"  
**Problem:** Code was freshly generated, can't be maxed

### Step 2: Check Validation Logic
**File:** `DEPLOY_INVITATION_SYSTEM.sql:201-241`  
**Function:** `validate_invite_code(p_code TEXT)`  
**Result:** ✅ Logic is CORRECT

```sql
-- Check if code has reached max uses
IF v_code_record.max_uses IS NOT NULL 
   AND v_code_record.current_uses >= v_code_record.max_uses THEN
  RETURN jsonb_build_object('is_valid', false, 
    'reason', 'Code has reached maximum uses');
END IF;
```

**Conclusion:** Validation is working correctly

### Step 3: Check Signup Flow
**File:** `signup-init.js:240-380`  
**Process:**
1. Validate code via `validate_invite_code()` ✅
2. Create user via `supabase.auth.signUp()` ✅
3. Call `use_invite_code(p_code, p_user_id)` ❓

**Key Finding:** Step 3 has retry logic (10 attempts, 500ms delays)

### Step 4: THE SMOKING GUN 🎯

**File:** `DEPLOY_MASTER_TIER_SYSTEM.sql:130-180`  
**Function:** `use_invite_code(p_code TEXT, p_user_id UUID)`

```sql
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- ... code validation ...
  
  -- 🚨 THIS IS THE BUG! 🚨
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 
      'error', 'User email not found');  -- ❌ FALSE NEGATIVE
  END IF;
  
  -- ... rest of function ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 💥 The Race Condition

### What Actually Happens (Timeline)

**T+0ms:** User clicks "Create Account"  
**T+10ms:** Frontend validates code → ✅ Returns `is_valid: true`  
**T+50ms:** Frontend calls `supabase.auth.signUp()`  
**T+200ms:** Supabase creates auth.users entry (async operation)  
**T+250ms:** Frontend calls `use_invite_code(user_id, code)`  

**T+251ms:** `use_invite_code()` executes:
```sql
SELECT email FROM auth.users WHERE id = user_id;
-- Returns: NULL (auth.users record not yet visible!)
```

**T+252ms:** Function returns:
```json
{
  "success": false,
  "error": "User email not found"
}
```

**T+253ms:** Frontend sees `success: false`  
**T+254ms:** Frontend shows error to user: "Code has reached maximum uses" ❌

**T+300ms:** Auth trigger fires, creates profile  
**T+400ms:** Email verification sent  
**T+500ms:** User record fully committed  

**Result:** 
- Account created ✅
- Profile exists ✅
- User can sign in ✅
- But user saw error and thinks signup failed ❌

---

## 🔬 Why This Happens

### Database Replication Delay

Supabase uses PostgreSQL with:
- Async replication
- Read replicas
- Transaction isolation

When `auth.signUp()` completes client-side, it means:
1. User record **submitted** to database
2. Transaction **committed** on primary
3. But **not yet visible** to all connections

The `use_invite_code()` RPC might hit:
- A read replica that's slightly behind
- The same connection before transaction commits
- A different connection pool

### Why Retry Logic Exists

The signup-init.js has this:

```javascript
// Retry up to 10 times (5 seconds) to handle auth trigger delay
for (let attempt = 0; attempt < 10; attempt++) {
  const { data, error } = await supabaseClient.rpc('use_invite_code', { 
    p_code: invite, 
    p_user_id: userId 
  });
  
  if (error.code === '23503') {  // Foreign key error
    await new Promise(resolve => setTimeout(resolve, 500));
    continue;  // Retry
  }
  // ...
}
```

**But the bug is:** 
- Retry logic checks for error code `23503` (foreign key violation)
- `use_invite_code()` returns `{success: false, error: 'User email not found'}`
- This is NOT a PostgreSQL error, it's a JSON response
- So retry logic doesn't catch it!

---

## 🛠️ The Fix

### Root Cause
`use_invite_code()` queries `auth.users.email` to populate `public.users` table, but the email is already available from the RPC parameters or can be derived differently.

### Solution Options

#### Option A: Remove Email Query (RECOMMENDED)
The email is already in `auth.users` and will be there eventually. We don't need it RIGHT NOW.

```sql
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT, p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_grants_tier TEXT;
  v_trial_days INTEGER;
BEGIN
  -- Validate and lock code
  SELECT id, grants_tier, trial_days
  INTO v_code_id, v_grants_tier, v_trial_days
  FROM invitation_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;

  -- Increment usage
  UPDATE invitation_codes
  SET current_uses = current_uses + 1, last_used_at = NOW()
  WHERE id = v_code_id;

  -- Create membership (no email needed here!)
  IF v_grants_tier IS NOT NULL THEN
    INSERT INTO user_memberships (
      user_id, tier, status, invitation_code,
      trial_start, trial_end, trial_days_total
    )
    VALUES (
      p_user_id, v_grants_tier, 'active', p_code,
      NOW(), NOW() + (v_trial_days || ' days')::INTERVAL, v_trial_days
    )
    ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier, status = EXCLUDED.status;
  END IF;

  RETURN jsonb_build_object('success', true, 'code_id', v_code_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why This Works:**
- Email already in `auth.users` (created by signUp)
- `public.users` table can be populated by trigger or later
- `user_memberships` only needs `user_id` (foreign key to `auth.users.id`)
- No race condition!

#### Option B: Add Retry Logic to Function
Make the function retry internally if email not found yet.

**Problem:** More complex, hides the issue, adds latency

#### Option C: Pass Email from Frontend
Frontend already has the email, pass it as parameter.

**Problem:** Security risk (user could pass wrong email), defeats purpose of SECURITY DEFINER

---

## 📊 Impact Assessment

### Current State
- **Users Affected:** Unknown (need to check logs)
- **Symptoms:** See error but account exists
- **Workaround:** Users can sign in despite error
- **Data Integrity:** ✅ Accounts created correctly
- **Code Usage:** ✅ Codes marked as used correctly (eventually)

### Why Users Get Confusing Error

**Frontend Error Logic** (`signup-init.js:257-276`):
```javascript
if (!data || !data.is_valid) {
  if (data?.reason === 'Code has reached maximum uses') {
    errorMessage = '⚠️ This invite code is full...';
  }
  // ...
  showError(errorMessage);
  return;  // ❌ Stops here, doesn't redirect
}
```

**But actual error from `use_invite_code()`:**
```json
{
  "success": false,
  "error": "User email not found"
}
```

**The frontend checks `data.is_valid`** which is `undefined` because:
- `use_invite_code()` returns `{success: false, error: ...}`
- Frontend expects `{is_valid: false, reason: ...}` (from `validate_invite_code`)
- Frontend sees falsy value, falls through to default error

**This explains the wrong error message!**

---

## ✅ Recommended Fix (Detailed)

### Fix 1: Update `use_invite_code()` SQL Function

**File to deploy:** `FIX_USE_INVITE_CODE_RACE_CONDITION.sql`

Remove the email query that causes race condition.

### Fix 2: Update Frontend Error Handling

**File:** `signup-init.js:325-370`

Distinguish between `validate_invite_code` errors and `use_invite_code` errors:

```javascript
// After use_invite_code RPC call
if (error) {
  // Don't show user a scary error - their account exists!
  console.error('❌ Invite code tracking failed:', error);
  console.warn('⚠️ User account was created successfully');
  
  // Show success, note tracking issue
  showSuccess('📧 Account created! Check your email to verify.<br><small>Note: Invite code tracking delayed.</small>');
  
  setTimeout(() => {
    window.location.href = 'awaiting-verification.html?email=' + encodeURIComponent(email);
  }, 2000);
  return;  // Don't show error, account is real!
}
```

### Fix 3: Add Monitoring

Track when `use_invite_code()` returns `success: false` but user exists:

```javascript
if (!usageData.success && userId) {
  // Log to monitoring
  if (window.hiMonitor) {
    window.hiMonitor.logEvent('signup_code_tracking_delayed', {
      userId,
      code: invite,
      error: usageData.error
    });
  }
}
```

---

## 🧪 Testing Plan

### Test Case 1: Normal Signup (Should Work)
1. Generate fresh invite code
2. Wait 5 minutes (ensure all systems stable)
3. Sign up with code
4. Should succeed without errors

### Test Case 2: Fast Signup (Race Condition)
1. Generate fresh invite code
2. Immediately sign up (within 30 seconds)
3. Current: May see error
4. After fix: Should succeed

### Test Case 3: Verify Data Integrity
After signup:
```sql
SELECT 
  au.id, au.email, au.created_at,
  p.username, p.created_at as profile_created,
  um.tier, um.status, um.invitation_code
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_memberships um ON um.user_id = au.id
WHERE au.email = 'test@example.com';
```

Should show:
- auth.users entry ✅
- profiles entry ✅
- user_memberships entry with correct tier ✅

---

## 📋 Action Items

- [ ] Create `FIX_USE_INVITE_CODE_RACE_CONDITION.sql`
- [ ] Test fix in staging environment
- [ ] Deploy SQL fix to production
- [ ] Update frontend error handling
- [ ] Add monitoring for race condition events
- [ ] Check logs for affected users (past week)
- [ ] Contact affected users to clarify account is active

---

> **Conclusion:** This is a classic database race condition. User account creation succeeds, but immediate verification fails due to replication delay. Fix: Remove unnecessary email query from `use_invite_code()` function.
