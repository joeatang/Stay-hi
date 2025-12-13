# 🔥 WOZ FIX: Profile Flash Race Condition

## Problem Diagnosis

**Symptom:** Flash of placeholder data before real profile loads on mobile

**Root Cause:** THREE layers of profile loading code competing:

1. **Inline HTML** (profile.html lines 1552-3312) - 1,760 lines of duplicate logic
2. **External JS** (profile-main.js) - 222 lines (clean, working version)  
3. **Race condition** - Both systems calling `loadProfileData()` independently

**The Flash Timeline:**
```
T=0ms:   Page loads → Inline currentProfile renders placeholders
         ↓ "Stay Hi User", "@user_abc123" visible
T=100ms: Inline loadProfileData() fetches DB → Updates DOM
         ↓ Brief flash of old data
T=200ms: profile-main.js loadProfileData() fetches again → Updates DOM again
         ↓ Another flash
T=300ms: Tier pill updates → Final state
```

## Woz Solution: Single Source of Truth

**Philosophy:** "Delete duplicate code, not refactor it"

**Strategy:**
- ✅ Keep profile-main.js (already has tier pill fix, database loading, caching)
- ❌ Delete inline duplicate from profile.html (1,760 lines)
- ✅ Keep only UI event handlers in HTML (buttons, modals)
- ✅ Bridge inline references to profile-main.js exports

## Surgical Changes

### Change 1: Replace Duplicate Profile Logic

**File:** `public/profile.html`

**Delete:** Lines 1552-3312 (entire inline `<script type="module">` block)

**Replace with:**
```html
<script type="module">
  // 🎯 WOZ FIX: Single source of truth - profile-main.js owns all profile logic
  // This inline script only bridges to external module exports
  
  console.log('✅ Profile page using profile-main.js (single source of truth)');
  
  // Bridge to profile-main.js exports (loaded via <script src="./lib/boot/profile-main.js">)
  // All profile data, loading, and tier integration handled by external module
  
  // Wait for profile-main.js to initialize
  let waitForProfileMain = setInterval(() => {
    if (window.TeslaProfile && window.currentProfile) {
      clearInterval(waitForProfileMain);
      console.log('✅ Profile system ready via profile-main.js');
      
      // Global exposure for inline event handlers
      window.openAvatarCrop = window.TeslaProfile.openAvatarCrop;
      window.closeAvatarCrop = window.TeslaProfile.closeAvatarCrop;
      window.editProfile = window.TeslaProfile.editProfile;
      window.shareProfile = window.TeslaProfile.shareProfile;
      window.navigateToHiDashboard = () => window.location.href = 'hi-dashboard.html';
      
      console.log('✅ Event handlers bridged from profile-main.js');
    }
  }, 50);
  
  // Timeout fallback
  setTimeout(() => {
    if (waitForProfileMain) {
      clearInterval(waitForProfileMain);
      console.warn('⚠️ Profile main initialization timeout');
    }
  }, 5000);
</script>
```

**Impact:**
- ✅ Eliminates race condition (only one load path)
- ✅ No flash (single DOM update)
- ✅ Keeps tier pill fix from profile-main.js
- ✅ Maintains all event handlers

### Change 2: Update DOMContentLoaded Handler

**File:** `public/profile.html` (line ~3654)

**Current:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  await loadProfileData(); // ❌ This is the inline version causing flash
});
```

**Replace with:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  
  // 🎯 WOZ FIX: Call external profile-main.js version (single source)
  if (window.TeslaProfile?.loadProfileData) {
    window.TeslaProfile.loadProfileData();
  } else {
    console.warn('⚠️ TeslaProfile.loadProfileData not available');
  }
});
```

### Change 3: Remove Duplicate currentProfile Declaration

**File:** `public/profile.html` (line ~1554)

**Current:**
```javascript
let currentProfile = {
  username: '',
  display_name: 'Stay Hi User',  // ❌ Hardcoded placeholder
  bio: 'Living life one Hi at a time! 👋',
  location: '',
  avatar_url: null,
  created_at: new Date().toISOString().split('T')[0],
  id: null
};
```

**Delete entirely** - profile-main.js already declares and exports this.

## Benefits

**Before (3 layers):**
```
profile.html inline script
├── currentProfile (placeholders)
├── loadProfileData() → DB fetch → DOM update
└── DOMContentLoaded → calls loadProfileData()

profile-main.js
├── currentProfile (empty)
├── loadProfileData() → DB fetch → DOM update
└── Exports to window.TeslaProfile

Result: 2 DB fetches, 2 DOM updates, FLASH
```

**After (1 layer):**
```
profile.html inline script
└── Bridge to window.TeslaProfile (event handlers only)

profile-main.js (OWNS ALL LOGIC)
├── currentProfile (single source)
├── loadProfileData() → DB fetch → DOM update → tier pill update
└── Exports to window.TeslaProfile

Result: 1 DB fetch, 1 DOM update, NO FLASH
```

## Testing Checklist

**Desktop:**
- [ ] Clear cache (Cmd+Shift+R)
- [ ] Load profile.html
- [ ] ✅ No flash of placeholders
- [ ] ✅ Tier badge shows immediately
- [ ] ✅ Real username shows immediately

**Mobile:**
- [ ] Clear Safari cache
- [ ] Load stay-hi.vercel.app/profile.html
- [ ] ✅ No flash (smooth single render)
- [ ] ✅ Tier badge "🧭 Hi Pathfinder" visible
- [ ] ✅ Real data only (no placeholders)

## Rollback Plan

If anything breaks:

1. Restore profile.html from git:
   ```bash
   git checkout HEAD -- public/profile.html
   ```

2. Keep only profile-main.js changes (tier pill fix)

3. Investigate which inline function broke

## Implementation

**Lines to Delete:** 1552-3312 (1,760 lines of duplicate code)

**Lines to Add:** ~40 lines (bridge script)

**Net Change:** -1,720 lines (96% reduction in inline code)

**Risk:** LOW - profile-main.js already works, just eliminating duplicate

**Confidence:** HIGH - This is exactly how Dashboard works (clean, no flash)
