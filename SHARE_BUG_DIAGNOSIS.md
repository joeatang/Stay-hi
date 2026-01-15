# Share Submission Bug - Complete Diagnosis

## User Report
- **User**: degenmentality@gmail.com  
- **Issues Reported**: 
  1. Anonymous share from Hi Island not appearing in archive or general shares
  2. Profile click error on Hi Island (user's profile specifically)
  3. Concern about new accounts having similar issues

---

## 🚨 Root Cause Analysis

### Bug #1: RPC COALESCE Logic (Database)
**Location**: `create_public_share` RPC function  
**Problem**: 
```sql
v_user_id := COALESCE(p_user_id, auth.uid());
```
When user shares anonymously:
- Client sends `p_user_id = NULL`
- `COALESCE` falls back to `auth.uid()` = real user's ID
- "Anonymous" share is attributed to the user!

**Impact**: Anonymous shares appear in "My Shares" instead of being community-visible with hidden identity.

**Fix**: Deploy `FIX_ANONYMOUS_SHARE_RPC.sql`

---

### Bug #2: Silent Failure Mode (JavaScript)
**Location**: `HiDB.js` line 213-218  
**Problem**: When RPC fails, errors are caught and converted to:
```javascript
return { ok: false, offline: true, data: uiLocal, error: e?.message };
```
This **resolves** instead of **rejecting**, so `persist()` doesn't catch it.

**Caller code in HiShareSheet.js**:
```javascript
await this._withRetry(() => ...).catch(err => {
  throw new Error(`Public share failed`);  // Never triggered!
});
```
The `.catch()` only handles rejections, not `{ ok: false }` resolutions.

**Impact**: User sees success toast even when share failed to save.

**Fix**: ✅ APPLIED - Check return value in HiShareSheet.js

---

### Bug #3: Missing Profile Record (Account-Specific)
**Location**: Database `profiles` table  
**Problem**: Profile click error suggests missing profile record for user.

**Root Cause**: The `on_auth_user_created` trigger may not be deployed, or failed during signup.

**Fix**: Run diagnostic Section 17+18 to verify and repair.

---

### Bug #4: New User Trigger May Be Missing (Global)
**Location**: Database trigger `on_auth_user_created`  
**Problem**: If this trigger doesn't exist, new users won't get profile records auto-created.

**Impact**: All new users would experience profile click errors.

**Fix**: Deploy `DEPLOY_PROFILE_AUTO_CREATION_TRIGGER.sql`

---

## 📋 Diagnostic Steps

### Run This SQL in Supabase:
```
DIAGNOSTIC_SHARE_SUBMISSION_BUG.sql
```

**Key sections to check:**
- Section 17: Account Integrity (shows if profile/membership records exist)
- Section 19: RPC Function Check (shows if required functions exist)
- Section 20: Trigger Check (shows if new user trigger exists)
- QUICK DIAGNOSIS: Shows overall system health

---

## 🔧 Deployment Order

1. **Run DIAGNOSTIC_SHARE_SUBMISSION_BUG.sql** - Identify what's missing
2. **If profile missing**: Run Section 18 (repair records)
3. **If trigger missing**: Deploy `DEPLOY_PROFILE_AUTO_CREATION_TRIGGER.sql`
4. **If RPC missing**: Deploy `FIX_PROFILE_RPC_PERFORMANCE.sql`
5. **For anonymous bug**: Deploy `FIX_ANONYMOUS_SHARE_RPC.sql`
6. **Deploy JS fix**: Push updated `HiShareSheet.js` to production

---

## Files Modified
- `DIAGNOSTIC_SHARE_SUBMISSION_BUG.sql` - Comprehensive diagnostic
- `FIX_ANONYMOUS_SHARE_RPC.sql` - RPC fix for anonymous handling
- `public/ui/HiShareSheet/HiShareSheet.js` - ✅ Fixed to check `ok` status
- `SHARE_BUG_DIAGNOSIS.md` - This file

---

## ✅ JavaScript Fixes Applied

### HiShareSheet.js - Lines ~1441-1485
Added `ok` status check for archive save:
```javascript
const archiveResult = await this._withRetry(...);
if (!archiveResult?.ok) {
  throw new Error(`Archive failed: ${archiveResult?.error || 'Database save failed'}`);
}
```

### HiShareSheet.js - Lines ~1500-1515  
Added `ok` status check for public share:
```javascript
const publicShareResult = await this._withRetry(...);
if (!publicShareResult?.ok) {
  throw new Error(`Public share failed: ${publicShareResult?.error || 'Database save failed'}`);
}
```

---

## 📋 Remaining Steps

1. **Run diagnostic SQL** - Identify exact database state
2. **Deploy FIX_ANONYMOUS_SHARE_RPC.sql** - Fix anonymous attribution bug  
3. **Deploy CRITICAL_FIX_PUBLIC_SHARES_SCHEMA.sql** (if `text` column missing)
4. **Test** - Create anonymous share, verify it appears in general feed
