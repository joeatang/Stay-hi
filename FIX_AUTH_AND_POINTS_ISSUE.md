# 🔧 Fix: Auth State + Points Persistence Issue

## Problem Summary
**User**: joeatang (degenmentality@gmail.com)  
**User ID**: 68d6ac30-742a-47b4-b1d7-0631bf7a2ec6

### Issue 1: Profile Modal Shows "Not Own Profile"
- **Root Cause**: Anonymous session (not authenticated)
- **RPC Call**: `is_viewing_own_profile()` returns `false` because `auth.uid()` is `null`
- **Expected**: Should recognize you as viewing your own profile

### Issue 2: Points Reset to Zero on Refresh
- **Root Cause**: Points are stored in database tables (`hi_points`, `hi_points_ledger`)
- **Anonymous users cannot persist points** because there's no `user_id` to associate them with
- **Expected**: Points should persist across sessions when authenticated

## Console Evidence
```javascript
// From your logs:
ProfileManager.js:281 ℹ️ Auth ready - anonymous user
ProfileManager.js:304 ℹ️ No user_id - skipping profile load
ProfileManager.js:65 ✅ ProfileManager ready: {userId: null, username: 'Anonymous', authenticated: false}

profile-modal.js:171 🔍 Is own profile: false  // ❌ Should be TRUE
profile-modal.js:487 ✅ Community profile fetched: {id: '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6', username: 'Joeatang'}
```

## Solution

### Step 1: Sign In to Your Account
You need to authenticate with your account to fix both issues:

1. **On Desktop (Hi Island)**: 
   - Click your avatar/profile button
   - Sign in with: degenmentality@gmail.com
   
2. **Or go to Sign In page**:
   - Navigate to: http://localhost:3030/public/signin.html
   - Enter: degenmentality@gmail.com
   - Check your email for magic link

### Step 2: Verify Authentication State
After signing in, check console for:
```javascript
✅ ProfileManager ready: {
  userId: '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6',  // ✅ Should have your ID
  username: 'Joeatang',
  authenticated: true  // ✅ Should be true
}
```

### Step 3: Test Profile Modal
1. Click on your own profile/shares
2. Console should show:
   ```javascript
   🔍 Is own profile: true  // ✅ Now correct
   🔍 Fetching OWN profile (full data)
   ```

### Step 4: Test Points Persistence
1. Check in for daily points (medallion tap or daily check-in button)
2. Refresh the page
3. Points should persist (stored in database under your `user_id`)

## Technical Details

### RPC Function: `is_viewing_own_profile`
```sql
CREATE OR REPLACE FUNCTION is_viewing_own_profile(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = target_user_id;  -- ❌ Returns false when auth.uid() is NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Problem**: When anonymous, `auth.uid()` returns `NULL`, so comparison always fails.

### Points System Tables
```sql
-- Balance table (requires user_id)
CREATE TABLE hi_points (
  user_id UUID PRIMARY KEY,  -- ❌ Cannot insert with NULL user_id
  balance BIGINT DEFAULT 0
);

-- Ledger table (requires user_id)
CREATE TABLE hi_points_ledger (
  user_id UUID NOT NULL,  -- ❌ Cannot insert with NULL user_id
  delta BIGINT,
  reason TEXT
);
```

**Problem**: Both tables require a valid `user_id` (cannot be NULL), so anonymous users cannot accumulate points.

## Quick Test
Run this in browser console after signing in:

```javascript
// Check auth state
console.log('Auth State:', {
  userId: window.ProfileManager?.getUserId?.(),
  authenticated: window.ProfileManager?.isAuthenticated?.(),
  session: await window.__HI_SUPABASE_CLIENT?.auth.getSession()
});

// Check points balance
const { data, error } = await window.__HI_SUPABASE_CLIENT
  .from('hi_points')
  .select('balance')
  .eq('user_id', window.ProfileManager.getUserId())
  .single();
console.log('Points Balance:', data?.balance || 0);
```

## Expected After Fix
1. ✅ Profile modal recognizes you as viewing your own profile
2. ✅ Can see full profile data (bio, location, stats)
3. ✅ Points persist across page refreshes/navigation
4. ✅ Daily check-in works and accumulates points
5. ✅ Hi Points ledger shows transaction history

## Why This Happens
The app supports **anonymous browsing** for discovery, but certain features require authentication:
- **Read-only features** (browsing shares, community profiles): Work anonymous
- **User-specific features** (own profile, points, check-ins): Require authentication

You were browsing anonymously while trying to access authenticated features, causing both issues.
