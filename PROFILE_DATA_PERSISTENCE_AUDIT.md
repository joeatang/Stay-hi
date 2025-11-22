# 🔐 PROFILE DATA PERSISTENCE AUDIT
**Critical Question**: "If we say users own their profiles, how do we ensure the DB is the source of truth?"

## 🎯 WOZ/JOBS ANSWER

**Woz**: "The database is the single source of truth. UI is just a mirror of what's stored. Every refresh should pull from database, not localStorage."

**Jobs**: "Users should NEVER lose their profile photo or display name. It should feel permanent, like their Apple ID."

---

## 📊 CURRENT SYSTEM ANALYSIS

### **Profile Data Flow**

```
USER EDITS PROFILE →
  1. Update UI immediately (optimistic update)
  2. Upload avatar blob to Supabase Storage (if changed)
  3. Call update_user_profile() RPC with new data
  4. RPC upserts into public.users table
  5. RPC returns success/error
  6. On success: Keep UI updated
  7. On error: Revert UI, show error toast

ON PAGE LOAD/REFRESH →
  1. Call get_user_profile() RPC
  2. RPC queries public.users table
  3. Returns avatar_url, display_name, bio, location
  4. Update all UI elements with database values
  5. IGNORE localStorage (only use for caching, not truth)
```

### **Single Source of Truth: `public.users` Table**

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,          -- Supabase Storage URL
  bio TEXT,
  location TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- ✅ Users can read their own profile
- ✅ Users can update their own profile
- ✅ Public profiles visible to all (when is_public = true)

---

## 🚨 CURRENT ISSUES

### **Issue #1: Profile Save Logic Not Using Database**

**Problem**: Some pages may be using localStorage as source of truth instead of database

**Evidence**:
```javascript
// ❌ BAD PATTERN (if found):
localStorage.setItem('user_avatar', avatarUrl);
localStorage.setItem('user_display_name', displayName);

// ✅ CORRECT PATTERN:
await window.supabase.rpc('update_user_profile', {
  p_user_id: userId,
  p_avatar_url: avatarUrl,
  p_display_name: displayName
});
```

**Fix**: Audit all profile save functions to ensure they call `update_user_profile()` RPC

---

### **Issue #2: Profile Load May Use localStorage Fallback**

**Problem**: On page load, profile data might be read from localStorage instead of database

**Evidence**:
```javascript
// ❌ BAD PATTERN (if found):
const displayName = localStorage.getItem('user_display_name') || currentProfile.display_name;

// ✅ CORRECT PATTERN:
const { data } = await window.supabase.rpc('get_user_profile', { p_user_id: userId });
currentProfile = {
  display_name: data.display_name,
  avatar_url: data.avatar_url,
  bio: data.bio,
  location: data.location
};
```

**Fix**: Load profile data from database FIRST, use localStorage only for offline caching

---

### **Issue #3: Avatar Upload May Not Persist to Database**

**Problem**: Avatar might be stored in Supabase Storage but URL not saved to `public.users.avatar_url`

**Current Flow** (from profile.html uploadAvatarToSupabase):
```javascript
1. Upload blob → Supabase Storage (avatars bucket)
2. Get public URL → https://...supabase.co/storage/v1/object/public/avatars/...
3. Call updateProfileInDatabase(publicUrl) ← CHECK IF THIS WORKS
4. Update currentProfile.avatar_url in memory ← LOCAL ONLY, NOT PERSISTENT
```

**Fix Required**:
```javascript
async function updateProfileInDatabase(avatarUrl) {
  const { data, error } = await window.supabase.rpc('update_user_profile', {
    p_user_id: currentProfile.id,
    p_avatar_url: avatarUrl
  });
  
  if (error) {
    console.error('❌ Database update failed:', error);
    throw error;
  }
  
  console.log('✅ Avatar URL saved to database:', avatarUrl);
  return data;
}
```

---

## ✅ BULLETPROOF SOLUTION

### **Rule #1: Database is Single Source of Truth**

```javascript
// On every page load
async function loadUserProfile() {
  const userId = (await window.supabase.auth.getUser()).data?.user?.id;
  
  if (!userId) {
    console.log('👻 Anonymous user - no profile to load');
    return null;
  }
  
  // Query database (SINGLE SOURCE OF TRUTH)
  const { data, error } = await window.supabase.rpc('get_user_profile', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('❌ Failed to load profile from database:', error);
    return null;
  }
  
  // Cache to localStorage for OFFLINE USE ONLY
  localStorage.setItem('profile_cache', JSON.stringify(data));
  localStorage.setItem('profile_cache_time', Date.now().toString());
  
  return data;
}
```

### **Rule #2: Every Profile Edit Saves to Database**

```javascript
async function saveProfileChanges(changes) {
  const userId = (await window.supabase.auth.getUser()).data?.user?.id;
  
  // Optimistic UI update
  Object.assign(currentProfile, changes);
  updateProfileUI(currentProfile);
  
  // Persist to database
  const { data, error } = await window.supabase.rpc('update_user_profile', {
    p_user_id: userId,
    p_display_name: changes.display_name,
    p_bio: changes.bio,
    p_location: changes.location,
    p_avatar_url: changes.avatar_url
  });
  
  if (error) {
    console.error('❌ Save failed, reverting UI:', error);
    // Revert optimistic update
    await loadUserProfile(); // Reload from database
    throw error;
  }
  
  console.log('✅ Profile saved to database');
  return data;
}
```

### **Rule #3: localStorage is Cache, Not Truth**

```javascript
// Use localStorage ONLY for:
// 1. Offline caching (show last known data when offline)
// 2. Performance (avoid database query on every component mount)
// 3. Temporary storage (before database save completes)

// NEVER use localStorage as:
// ❌ Primary data storage
// ❌ Replacement for database
// ❌ Source of truth on page load
```

---

## 🔍 AUDIT CHECKLIST

### **Files to Verify**:
- [ ] `public/profile.html` - Profile edit/save logic
- [ ] `public/lib/boot/profile-main.js` - Profile loading
- [ ] `public/lib/HiBase/profile.js` - Profile operations
- [ ] Database RPC: `update_user_profile()`
- [ ] Database RPC: `get_user_profile()`

### **Tests to Run**:
1. ✅ Edit display name → Hard refresh → Display name persists
2. ✅ Upload avatar → Hard refresh → Avatar persists
3. ✅ Update bio → Hard refresh → Bio persists
4. ✅ Clear all localStorage → Hard refresh → Profile still loads from DB
5. ✅ Go offline → Profile shows cached data (but marked as offline)
6. ✅ Come back online → Profile refreshes from DB

---

## 🚀 IMPLEMENTATION PLAN

### **Phase 1: Verify Database Functions Exist**
```sql
-- Run in Supabase SQL Editor
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('get_user_profile', 'update_user_profile');
```

Expected: 2 rows (both functions exist)

### **Phase 2: Audit Profile Save Logic**
Search for:
- `localStorage.setItem('user_avatar'`
- `localStorage.setItem('user_display_name'`
- `localStorage.setItem('currentProfile'`

Replace with database RPC calls.

### **Phase 3: Audit Profile Load Logic**
Ensure `loadProfileData()` calls database FIRST:
```javascript
const dbProfile = await loadUserProfile(); // Database
const cachedProfile = JSON.parse(localStorage.getItem('profile_cache') || '{}'); // Cache

// Use database profile if available, fallback to cache only if offline
const profile = dbProfile || cachedProfile;
```

### **Phase 4: Test Complete Flow**
1. Edit profile on desktop
2. Save changes
3. Open same account on mobile (or different browser)
4. Verify changes appear immediately
5. Clear cache on original device
6. Hard refresh
7. Verify profile still correct

---

## 💎 WOZ/JOBS PRINCIPLES APPLIED

**Woz**: "The database is the hardware, the UI is the interface. The interface doesn't store data, it displays data from hardware."

**Jobs**: "It should just work. Users shouldn't have to think about caching or persistence. Their profile is their profile, everywhere, always."

**Tesla Grade**: "If the user changes their avatar at 2:47 PM, it should be changed everywhere by 2:48 PM, including after cache clear, browser crash, or device switch."

---

## 🎯 SUCCESS CRITERIA

✅ Profile data survives:
- Hard refresh (F5)
- Cache clear (Cmd+Shift+Delete)
- Browser close/reopen
- Device switch (desktop → mobile)
- Offline → Online transitions
- localStorage corruption/deletion

✅ Profile edits are:
- Immediate (optimistic UI update)
- Persistent (saved to database)
- Synchronized (across all devices)
- Recoverable (database is source of truth)

---

**Created**: November 22, 2025  
**Philosophy**: Database as single source of truth, localStorage as performance cache only
