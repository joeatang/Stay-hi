# Deployment Verification Checklist
**Date:** January 8, 2026  
**Issue:** Profile page works on localhost but regressed on deployed version

## Recent Commits (Deployed ✅)
- `a9494a1` - Fix: Clear corrupted pending queue causing 400 errors on mobile
- `d123a00` - Fix: Initialize ProfileManager on Hi Gym for share submissions
- `aa172a0` - Fix: Single source of truth for tier display
- `c11f23d` - Fix: Extract tier string from NavCache structured object

## Known Working (Localhost)
✅ Profile.html loads all data correctly  
✅ ProfileManager initializes  
✅ Stats display (66 hi_moments, 8 streak, etc.)  
✅ Avatar displays  
✅ Tier pill works  
✅ All systems operational  

## Reported Issues (Deployed)
❌ Profile page regression - user seeing issues  
❌ Reload buttons on hi-muscle/hi-island don't fix loading issues  
❌ Mobile loading failures persist  

## Root Cause Analysis

### 1. **Vercel Cache Layers**
Vercel has MULTIPLE cache layers that can serve stale content:
- **Edge Cache** (CDN) - caches HTML/JS/CSS globally
- **Build Cache** - caches dependencies and build artifacts
- **Browser Cache** - user's browser cache

### 2. **Cache Version Issues**
Current cache version in profile.html: `20260108-v1`

This needs to be incremented with EACH deployment to force cache invalidation.

### 3. **Service Worker Cache**
Profile page has service worker that can cache old versions:
```javascript
// Force service worker update on mobile Chrome
```

Users on mobile may have OLD service worker that serves cached HTML.

## Immediate Fixes Needed

### Fix 1: Increment Cache Version
Update cache version in ALL pages:
- profile.html
- hi-muscle.html  
- hi-island-NEW.html
- hi-dashboard.html

Change from `20260108-v1` to `20260108-v2` or use timestamp.

### Fix 2: Add Vercel Headers for No-Cache
Create/update `vercel.json` with proper cache headers:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### Fix 3: Clear Vercel Deployment Cache
After deployment, users need to:
1. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Clear browser cache and data for stayhighly.com
3. Close all tabs and reopen

### Fix 4: Add Service Worker Update Check
Add to all pages:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.update());
  });
}
```

## Why "Reload" Buttons Don't Work

The reload buttons call `location.reload()` which:
- ✅ Reloads the page
- ❌ But serves from browser cache if present
- ❌ Doesn't bypass service worker cache
- ❌ Doesn't force edge cache refresh

**Better reload implementation:**
```javascript
// Force cache bypass
location.reload(true); // DEPRECATED in modern browsers

// Better: Clear caches then reload
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  }).then(() => location.replace(location.href));
}
```

## Deployment Verification Steps

1. **Verify Git Push Completed** ✅
   ```bash
   git log -1
   # Shows: a9494a1
   ```

2. **Check Vercel Deployment Dashboard**
   - Visit: https://vercel.com/joeatangs-projects/stay-hi
   - Verify latest deployment shows commit `a9494a1`
   - Check deployment status: Success
   - Check deployment time: Within last 5 minutes

3. **Test Deployed Version**
   - Visit: https://stayhighly.com/public/profile.html
   - Open DevTools Console
   - Check for logs: "🚀 ProfileManager initializing..."
   - Verify no 400 errors

4. **Test with Cache Bypass**
   - Visit with query param: https://stayhighly.com/public/profile.html?v=20260108
   - Hard refresh: Cmd+Shift+R
   - Check console for new logs

## Next Steps

1. ✅ Increment cache version in all HTML files
2. ✅ Update reload button implementation to bypass cache
3. ✅ Add service worker update check
4. ✅ Commit and push changes
5. ⏳ Wait for Vercel deployment (2-3 minutes)
6. ✅ Verify deployment on Vercel dashboard
7. ✅ Test deployed version with cache bypass
8. ✅ Ask user to hard refresh and test

## User Instructions

**For the user reporting profile page issues:**

1. **Clear browser cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Safari: Develop → Empty Caches
   
2. **Hard refresh the page:**
   - Mac: Cmd + Shift + R
   - Windows: Ctrl + Shift + R
   
3. **Try incognito/private window:**
   - This bypasses all cache
   - If it works here, it's definitely a cache issue
   
4. **Check URL:**
   - Make sure using: https://stayhighly.com/public/profile.html
   - NOT: http://localhost:3030/public/profile.html

## Technical Debt to Address

- [ ] Implement automatic cache busting on all script/CSS loads
- [ ] Add versioned URLs for all assets (e.g., `/lib/ProfileManager.js?v=abc123`)
- [ ] Create deployment script that increments cache version automatically
- [ ] Add Vercel deployment webhook to Slack/Discord for visibility
- [ ] Implement service worker with proper update strategy
- [ ] Add "Update Available" banner when new version deployed
