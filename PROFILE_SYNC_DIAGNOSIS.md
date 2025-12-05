# 🚨 CRITICAL PROFILE SYNC ISSUE DIAGNOSED

## Issue: Old Avatar Showing in Shares & Profile

### Root Cause Analysis

1. **Profile Caching**: Profile loads from localStorage first (lines 2838-2843)
2. **Avatar Update**: When user uploads new avatar, it:
   - ✅ Saves to Supabase storage
   - ✅ Updates `profiles` table
   - ❌ DOES NOT update localStorage cache
3. **Share Avatar Fetch**: HiDB.js fetches avatar from profiles table when creating share
4. **Feed Display**: Shows avatar from share OR profiles JOIN (both should show new avatar)

### The Problem

**Timeline**:
1. User uploads new avatar → Supabase updated ✅
2. Profile page STILL shows old avatar (from localStorage cache) ❌
3. New shares fetch from database → Get NEW avatar ✅
4. But profile header shows OLD avatar (cached) ❌

**Inconsistency**: Database has new avatar, UI shows old avatar from cache

### Files Involved

1. `public/profile.html` (lines 1820-1875):
   - `updateProfileInDatabase()` - Updates database
   - Missing: localStorage cache update

2. `public/lib/HiDB.js` (lines 96-130):
   - `insertPublicShare()` - Fetches current profile for avatar snapshot
   - Working correctly ✅

3. `public/profile.html` (lines 2789-2850):
   - `loadProfileData()` - Loads FROM cache first
   - Should refresh after avatar update

## Surgical Fix Required

### Fix #1: Update localStorage After Avatar Upload

**File**: `public/profile.html`
**Function**: `updateProfileInDatabase(avatarUrl)`
**Line**: After line 1873 (after database update)

**Add**:
```javascript
// CACHE FIX: Update localStorage immediately after database update
currentProfile.avatar_url = avatarUrl;
currentProfile.updated_at = new Date().toISOString();
const userId = currentProfile.id || (await window.HiSupabase.getClient().auth.getUser()).data?.user?.id;
if (userId) {
  const storageKey = `stayhi_profile_${userId}`;
  localStorage.setItem(storageKey, JSON.stringify(currentProfile));
  console.log('✅ Profile cache updated with new avatar');
}

// Trigger profile refresh event
window.dispatchEvent(new CustomEvent('profile:updated', { 
  detail: { avatar_url: avatarUrl } 
}));
```

### Fix #2: Force Profile Refresh After Upload

**File**: `public/profile.html`
**Function**: After successful `saveCroppedAvatar()`
**Line**: After line 1705

**Add**:
```javascript
// Force reload profile data to ensure UI consistency
await loadProfileData();
```

### Fix #3: Clear Stale Cache on Load

**File**: `public/profile.html`
**Function**: `loadProfileData()`
**Line**: After line 2850 (after fetching from Supabase)

**Change**:
```javascript
if (!profile && window.supabaseClient) {
  profile = await loadAuthenticatedProfileFromSupabase(userId);
  
  // CACHE FIX: If we got fresh data from Supabase, update localStorage
  if (profile) {
    const storageKey = `stayhi_profile_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(profile));
    console.log('✅ Profile cache refreshed from database');
  }
}
```

## Testing Plan

1. **Before Fix**:
   - Upload new avatar
   - Check profile header → Shows OLD avatar ❌
   - Create new share → Uses NEW avatar ✅
   - Inconsistent state ❌

2. **After Fix**:
   - Upload new avatar
   - Check profile header → Shows NEW avatar immediately ✅
   - Create new share → Uses NEW avatar ✅
   - Consistent state ✅

## Additional Recommendations

### Cache Invalidation Strategy

1. **On Avatar Upload**: Clear cache immediately
2. **On Profile Edit**: Clear cache after save
3. **On Auth Change**: Clear all caches
4. **Periodic Refresh**: Compare cache timestamp vs database

### Profile Sync Events

Add event listeners across app:
```javascript
// Listen for profile updates
window.addEventListener('profile:updated', (e) => {
  // Update UI elements that show profile data
  updateHeaderAvatar(e.detail.avatar_url);
  updateShareModalAvatar(e.detail.avatar_url);
});
```

## Priority

**HIGH** - This causes user confusion and inconsistent UI state

**Impact**: Every user who uploads avatar sees stale data until page refresh

**Effort**: 15 minutes to implement all fixes

## Related Issues

1. Share modal avatar sync (needs same fix)
2. Header avatar sync across pages
3. Archive display consistency
