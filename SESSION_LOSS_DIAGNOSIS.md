# 🚨 CRITICAL ISSUE: Session Loss on Background

## Problem Identified

When you background the app (switch to another app), the Supabase session is being lost because:

1. **Supabase client not configured with `persistSession: true`**
2. **Session not being persisted to localStorage properly**
3. **Session refresh may be failing on visibility change**

This causes:
- ❌ User logged out when returning to app
- ❌ Hi Island fails to load (no auth = no data)
- ❌ Map/feed don't load (requires authenticated queries)

## Root Cause

**File**: `public/lib/HiSupabase.v3.js`

**Issue**: Client created without auth options:
```javascript
const real = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY);
// Missing: auth options for session persistence!
```

**Should be**:
```javascript
const real = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Prevent issues with URL-based auth
    storage: window.localStorage, // Explicitly use localStorage
    storageKey: 'sb-gfcubvroxgfvjhacinic-auth-token' // Stable key
  }
});
```

## Secondary Issue: 10-15 Second Load Time

**Stats load slowly because**:
- Query times out (5s)
- Retries 3 times (1s + 2s + 4s = 7s)
- Total: ~12-15 seconds

**Why timeout?**:
- Database value is WRONG (1 instead of 53)
- RLS policies may be blocking
- Network slow on mobile

**Fix**: Run `FINAL_FIX_MOMENTS_COUNT.sql` to fix database value

## Immediate Actions Needed

### 1. Fix Session Persistence (CRITICAL)
Update `HiSupabase.v3.js` to persist sessions properly

### 2. Fix Database Stats Value
Run SQL to update count from 1 → 53

### 3. Add Session Restore on Visibility Change
Listen for `visibilitychange` and restore session if lost

## Files to Update

1. `public/lib/HiSupabase.v3.js` - Add auth persistence options
2. `public/lib/AuthReady.js` - Add session restore on visibility change
3. Database - Run FINAL_FIX_MOMENTS_COUNT.sql

---

**Next**: Implementing fixes now...
