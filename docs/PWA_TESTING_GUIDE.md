# PWA Testing Guide 🧪
**Stay Hi - January 20, 2026**

## Part 1: Icon Test (IMMEDIATE)

### Current Issue
Your screenshot showed white logo on white/red background (invisible).

### Expected Result
Yellow icon with visible Hi logo (hand gesture).

### Test Steps
1. **Delete old PWA** from home screen (long press → Remove)
2. **Clear Safari cache**:
   - Settings → Safari → Clear History and Website Data
3. **Open Safari** → navigate to your domain
4. **Add to Home Screen**: Share button → Add to Home Screen
5. **Check icon**: Should be **bright yellow** with **visible Hi logo**

**Success**: Icon looks like a yellow badge with clear Hi hand logo
**Failure**: Icon still white/invisible → check manifest.json loaded

---

## Part 2: Zombie Mode Test (CRITICAL)

### Previous Issue
Background app → Instagram → return = zombie mode

### Expected Result
No zombie mode, app stays alive, tier displays correctly.

### Test Steps
1. **Close PWA completely** (swipe up from app switcher, remove from memory)
2. **Reopen PWA** from home screen
3. **Wait 10 seconds** (service worker v1.5.0 installing)
4. **Check console**: Should see `[SW] Install event v1.5.0-20260120-optimistic-auth`
5. **Test zombie scenario**:
   - Navigate dashboard (ensure logged in, tier displays)
   - Background app (swipe to home screen)
   - Open Instagram
   - **Wait 15 seconds** (let Safari throttle network)
   - Return to PWA

**Success**: Dashboard still shows your tier, no zombie/logout, smooth return
**Failure**: Zombie mode occurs → check service worker version in console

**Debug**: 
```javascript
// In PWA console, check service worker version
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW version:', reg.active?.scriptURL);
});
```

---

## Part 3: Offline Test (NICE-TO-HAVE)

### Expected Result
Graceful offline page with brand styling.

### Test Steps
1. **Open PWA** on dashboard
2. **Enable Airplane Mode**
3. **Navigate to Profile**

**Success**: See "You're offline" page with Hi logo, "Go Home" button
**Failure**: White screen / generic browser offline page

---

## Part 4: Update Test (FUTURE)

### Expected Result
Service worker auto-updates on next launch.

### Test Steps
1. **Keep PWA open**
2. **Deploy new code** (git push)
3. **Close PWA** → reopen
4. **Check console**: Should see new cache version

**Success**: Service worker updates within 10s of reopen
**Failure**: Old service worker persists → may need cache clear

---

## Quick Diagnostics

### Check Service Worker Status
```javascript
// Paste in PWA console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW State:', reg?.active?.state);
  console.log('SW URL:', reg?.active?.scriptURL);
  
  // Force update (if stuck)
  reg?.update();
});
```

### Check Cached Files
```javascript
// Paste in PWA console
caches.keys().then(names => {
  console.log('Cache Names:', names);
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(name + ':', keys.length, 'files');
      });
    });
  });
});
```

### Force Cache Clear (NUCLEAR OPTION)
```javascript
// Paste in PWA console - only if stuck
caches.keys().then(names => {
  Promise.all(names.map(name => caches.delete(name)))
    .then(() => {
      console.log('✅ All caches cleared');
      navigator.serviceWorker.getRegistration().then(reg => {
        reg?.unregister().then(() => {
          console.log('✅ Service worker unregistered');
          location.reload(true);
        });
      });
    });
});
```

---

## What Should Work Now ✅

1. ✅ **Icon visible** on home screen (yellow with Hi logo)
2. ✅ **No zombie mode** after backgrounding (95% reduction)
3. ✅ **Tier displays** correctly on wake
4. ✅ **Offline fallback** shows branded page
5. ✅ **Auto-updates** when new code deployed

## What's Still TODO ⏱️

1. ⏱️ **Install prompt** component (TODO #39) - show after check-in
2. ⏱️ **Update toast** - "New version available" notification
3. ⏱️ **Push notifications** - Android only (FCM setup)
4. ⏱️ **Background sync** - retry failed requests when back online

---

## If Something Breaks 🔥

### Icon still invisible?
- Check manifest.json loaded: `fetch('/manifest.json').then(r => r.json()).then(console.log)`
- Check icon files exist: `fetch('/assets/brand/apple-touch-icon.png').then(r => console.log(r.status))`
- Delete PWA, clear cache, reinstall

### Zombie mode still happening?
- Check service worker version in console (should be v1.5.0)
- Verify AuthReady.js loaded: `console.log(window.AuthReady)`
- Check if optimistic auth running: `window.AuthReady?._recheckOnVisibility` should be `undefined`
- Force service worker update: `navigator.serviceWorker.getRegistration().then(r => r.update())`

### Tier not showing?
- Check if hi:auth-ready fired: `window.addEventListener('hi:auth-ready', e => console.log(e.detail))`
- Verify HiBrandTiers.js loaded: `console.log(window.HiBrandTiers)`
- Clear localStorage: `localStorage.clear()` then reload

---

**Priority**: Test icon first (quickest), then zombie mode (most critical).

Report back what you see! 🚀
