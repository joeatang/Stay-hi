# TODO - Stay Hi Project

## Project Map

**Structure:**
- Root: `package.json`, `vercel.json`, `.vercelnore`
- `public/` - Static site files
  - HTML pages: `index.html`, `calendar.html`, `hi-island.html`, `hi-muscle.html`, `signin.html`, `signup.html`, `post-auth.html`, `profile.html`, `membership-required.html`, `preview-check.html`, `zzz.html`
  - `assets/` - Scripts & styles
    - JS: `header.js`, `app.js`, `db.js`, `create-parity.js`, `muscle.js`, `island.js`, `emotions.js`, `supabase-init.js`, `supabase.js`, `tabs.js`
    - CSS: `theme.css`, `create-parity.css`, `styles.css`
    - `brand/` - Images: `hi-logo-light.png`, `hi-logo-dark.png`

**Navigation:**
- Header assembly via `assets/header.js` with calendar button, brand logo, menu
- Calendar routing: `/calendar` → `/calendar.html` (via `vercel.json` rewrites)
- Auth flow: `signin.html` → `post-auth.html` → redirect to home
- Multiple Supabase client setups across pages (needs unification)

**Key Dependencies:**
- Supabase for auth/database
- Leaflet for maps (hi-island.html)
- LocalStorage for offline data

## Fix Now (Top 5 Priority)

### 1. Fix header logo path mismatch
**Files:** `public/assets/header.js`, brand assets  
**Issue:** Header references `logo.svg` but only `hi-logo-light.png`/`hi-logo-dark.png` exist  
**Action:** Update header.js to use existing PNG files

### 2. Unify Supabase client initialization  
**Files:** `public/assets/supabase-init.js`, `public/post-auth.html`, `public/signin.html`  
**Issue:** Multiple CDN loads and inconsistent global naming (`window.sb` vs `window.supabase`)  
**Action:** Standardize on one client, remove duplicate CDN scripts

### 3. Fix supabase-init.js format
**Files:** `public/assets/supabase-init.js`  
**Issue:** Contains HTML script tags instead of pure JavaScript  
**Action:** Convert to proper JS module format

### 4. Add error handling for API routes
**Files:** `public/assets/create-parity.js`, `public/assets/muscle.js`, `public/assets/app.js`  
**Issue:** Fetch calls to `/api/*` routes may 404 on static hosting  
**Action:** Add proper error handling and fallback messaging

### 5. Standardize auth usage across pages
**Files:** `public/post-auth.html`, `public/profile.html`, `public/signin.html`  
**Issue:** Inconsistent auth patterns and inline auth code  
**Action:** Create unified auth helper module

## Later (Non-blocking improvements)

- Add CI lint step to detect duplicate script includes
- Improve offline sync logging in `db.js`
- Consolidate multiple header builders into single module
- Replace hard-coded keys with env-driven build injection
- Add smoke tests for API routes
- Audit LocalStorage key consistency across modules
- Optimize CSS loading order and z-index conflicts