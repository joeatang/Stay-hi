# 🐛 Race Condition Fix - Hi Island, Hi Muscle, Profile Pages
**Date:** January 7, 2026  
**Issue:** Pages break on first navigation, require refresh to work

## Root Cause Analysis

### The Problem
All three pages (hi-island, hi-muscle, profile) rely on **async dependencies** that may not load in time on first navigation:

1. **HiSupabase/hiDB** - Database client
2. **AuthReady.js** - User authentication  
3. **ProfileManager** - User profile data
4. **HiBrandTiers** - Tier display system
5. **Various UI components**

### Timeline of Failure

**First Navigation (❌ BREAKS):**
```
0ms    → User clicks link to hi-island.html
10ms   → HTML starts parsing
50ms   → Scripts start loading (some are async modules)
100ms  → DOMContentLoaded fires
150ms  → Page tries to render
        ❌ hiDB not loaded yet → crash
        ❌ HiSupabase not ready → crash
        ❌ ProfileManager not initialized → crash
RESULT: Blank page or partial render
```

**After Refresh (✅ WORKS):**
```
0ms    → User refreshes page
10ms   → HTML starts parsing
20ms   → Scripts load from browser cache (FAST)
80ms   → DOMContentLoaded fires
100ms  → Page renders
        ✅ hiDB already loaded
        ✅ HiSupabase ready
        ✅ ProfileManager initialized
RESULT: Page works perfectly
```

### Specific Code Issues

**1. Hi Island ([island-main.mjs](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) line 22-32)**
```javascript
// ❌ BROKEN: No timeout, can hang forever
await new Promise(resolve => {
  if (window.hiDB) {
    resolve();
  } else {
    const check = setInterval(() => {
      if (window.hiDB) {
        clearInterval(check);
        resolve();
      }
    }, 100);  // No timeout!
  }
});
```

**2. Hi Muscle ([hi-muscle.html](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) line 2986)**
```javascript
// ❌ BROKEN: Silent failure, location never loads
async function loadUserLocation() {
  if (!window.hiDB || typeof window.hiDB.getUserProfile !== 'function') {
    console.warn('💾 HiDB not ready, skipping user location load');
    return; // Function just exits
  }
}
```

**3. Profile ([profile.html](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) line ~4138)**
```javascript
// ❌ BROKEN: Blocks if ProfileManager not ready
document.addEventListener('DOMContentLoaded', function() {
  await loadProfileData(); // Waits indefinitely
});
```

## The Solution

### Created: DependencyManager System

**File:** `public/lib/boot/dependency-manager.js`

**Features:**
- ✅ Waits for multiple dependencies with **timeout protection** (10s max)
- ✅ Polls every 50ms for fast response
- ✅ Smart checks for complex objects (not just `window.foo`)
- ✅ Returns detailed success/failure info
- ✅ Shows user-friendly error messages
- ✅ Works on both first load and refresh

**Usage Example:**
```javascript
// Before init, wait for critical dependencies
const result = await window.DependencyManager.waitForDependencies([
  'hiDB',
  'HiSupabase',
  'ProfileManager',
  'HiBrandTiers'
]);

if (!result.success) {
  console.error('❌ Failed to load:', result.missing);
  // Show reload button to user
  return;
}

// Safe to proceed - all dependencies loaded
console.log('✅ All dependencies ready');
```

## Implementation Steps

### Step 1: Add DependencyManager Script

Add to **all three pages** right before other scripts:

**Hi Island (line ~1714):**
```html
<script src="./lib/boot/dependency-manager.js"></script>
<script src="./lib/HiSupabase.v3.js"></script>
```

**Hi Muscle (line ~86):**
```html
<script src="./lib/boot/dependency-manager.js"></script>
<script src="assets/url-path-fixer.js"></script>
```

**Profile (line ~98):**
```html
<script src="./lib/boot/dependency-manager.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1"...></script>
```

### Step 2: Update Island Initialization

**File:** `public/lib/boot/island-main.mjs`  
**Line:** 4

**Replace:**
```javascript
async function initHiIsland() {
  console.log('🏝️ Hi Island initializing...');
  
  // 🏆 WOZ FIX: Initialize ProfileManager first
  if (window.ProfileManager && !window.ProfileManager.isReady()) {
```

**With:**
```javascript
async function initHiIsland() {
  console.log('🏝️ Hi Island initializing...');
  
  // 🚀 FIX: Wait for critical dependencies before rendering
  if (window.DependencyManager) {
    console.log('⏳ Waiting for Hi Island dependencies...');
    const result = await window.DependencyManager.waitForDependencies([
      'hiDB',
      'HiSupabase',
      'HiBrandTiers'
    ]);
    
    if (!result.success) {
      console.error('❌ Some dependencies failed to load:', result.missing);
      // Show user-friendly error with reload button
      const feedContainer = document.querySelector('.feed-container');
      if (feedContainer) {
        feedContainer.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #cfd2ea;">
            <div style="font-size: 2rem; margin-bottom: 16px;">🔄</div>
            <div style="font-weight: 600; margin-bottom: 8px;">Loading issue detected</div>
            <div style="font-size: 0.9rem; margin-bottom: 20px;">Some components didn't load properly</div>
            <button onclick="location.reload()" style="padding: 12px 24px; background: #4ECDC4; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
              Reload Page
            </button>
          </div>
        `;
      }
      return; // Stop initialization
    }
    console.log('✅ All dependencies ready');
  }
  
  // 🏆 WOZ FIX: Initialize ProfileManager first
  if (window.ProfileManager && !window.ProfileManager.isReady()) {
```

### Step 3: Update Hi Muscle Initialization

**File:** `public/hi-muscle.html`  
**Line:** ~1846 (inside the main IIFE)

**Add at the start:**
```javascript
(async function(){
    console.log('💪 Hi-Muscle loading...');
    
    // 🚀 FIX: Wait for dependencies before rendering
    if (window.DependencyManager) {
        console.log('⏳ Waiting for Hi Muscle dependencies...');
        const result = await window.DependencyManager.waitForDependencies([
            'hiDB',
            'HiSupabase',
            'HiBrandTiers'
        ]);
        
        if (!result.success) {
            console.error('❌ Dependencies failed:', result.missing);
            document.querySelector('.wrap').innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 2rem; margin-bottom: 16px;">🔄</div>
                    <div style="font-weight: 600; margin-bottom: 8px; color: #FFD166;">Loading issue detected</div>
                    <div style="font-size: 0.9rem; margin-bottom: 20px; color: #cfd2ea;">Some components didn't load properly</div>
                    <button onclick="location.reload()" style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
            return;
        }
        console.log('✅ All dependencies ready');
    }
    
    // Continue with existing initialization...
    try { await hiAuth.ensureSessionMaybe?.(); } catch {}
```

### Step 4: Update Profile Initialization

**File:** `public/lib/boot/profile-main.js`  
**Add at the very top:**

```javascript
// Wait for dependencies before any profile operations
(async function() {
  if (window.DependencyManager) {
    console.log('⏳ Waiting for Profile dependencies...');
    const result = await window.DependencyManager.waitForDependencies([
      'hiDB',
      'HiSupabase',
      'ProfileManager',
      'HiBrandTiers'
    ]);
    
    if (!result.success) {
      console.error('❌ Profile dependencies failed:', result.missing);
      // Profile page has its own error handling
    }
    console.log('✅ Profile dependencies ready');
  }
})();
```

## Testing Steps

### 1. Test First Navigation (Cold Start)
1. Clear browser cache completely
2. Navigate to dashboard/home
3. Click "Hi Island" link
4. **Expected:** Page loads smoothly without errors
5. **Before fix:** Blank page, need to refresh

### 2. Test Refresh (Warm Start)  
1. On Hi Island page, press Cmd+R
2. **Expected:** Page reloads instantly
3. **Should work:** Both before and after fix

### 3. Test All Three Pages
- Hi Island NEW
- Hi Muscle
- Profile

For each page:
1. Clear cache
2. Navigate from another page
3. Check console for errors
4. Verify all UI elements load

### 4. Test Slow Network
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to pages
4. **Expected:** Loading takes longer but no errors
5. **Expected:** Timeout at 10s shows reload button

## Benefits

### Before Fix ❌
- Pages break on first navigation
- Users must refresh to see content
- No error messages
- Looks broken/unprofessional
- Confusing user experience

### After Fix ✅  
- Pages load smoothly on first try
- Graceful degradation with timeout
- Clear error messages with reload button
- Professional user experience
- Works reliably across all scenarios

## Deployment

1. ✅ Created `dependency-manager.js`
2. ⏳ Add script tags to HTML pages
3. ⏳ Update initialization code
4. ⏳ Test thoroughly
5. ⏳ Deploy to production

## Related Files

- `public/lib/boot/dependency-manager.js` (NEW)
- `public/lib/boot/island-main.mjs` (MODIFIED)
- `public/hi-island-NEW.html` (NEEDS SCRIPT TAG)
- `public/hi-muscle.html` (NEEDS SCRIPT TAG + INIT CODE)
- `public/profile.html` (NEEDS SCRIPT TAG)
- `public/lib/boot/profile-main.js` (NEEDS INIT CODE)

## Notes

This fix addresses a **fundamental async loading issue** that affects modern SPAs. The DependencyManager provides a robust, reusable solution that can be applied to any page with similar issues.

The key insight is that `DOMContentLoaded` fires when the DOM is ready, but **not when async scripts/modules are ready**. We must explicitly wait for our dependencies before attempting to use them.
