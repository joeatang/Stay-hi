# Performance Audit — Jan 18, 2026
## Issue: Slow page loads + Auth signouts on Vercel

### 📊 Root Cause Analysis (Wozniak Method)

#### 1. SCRIPT BLOAT
**Problem**: Hi Pulse loads 27+ scripts sequentially
```html
<!-- BEFORE optimization -->
<script src="dependency-manager.js"></script>
<script src="url-path-fixer.js"></script>
<script src="HiSupabase.v3.js"></script>
<script src="ProfileManager.js"></script>
<script src="NavigationStateCache.js"></script>
<script src="HiBrandTiers.js"></script>
<script src="auth-resilience.js"></script>
<script src="hi-paths.js"></script>
<script src="TIER_CONFIG.js"></script>
<script src="HiMembershipBridge.js"></script>
<script src="AccessGate.js"></script>
<script src="AccessGateModal.js"></script>
<script src="AdminAccessManager.js"></script>
<script src="AccessGateTelemetry.js"></script>
<script src="AccessGateTelemetryExport.js"></script>
<script src="upgrade-cta.js"></script>
<script src="sw-register.js"></script>
<script src="post-auth-path.js"></script>
<script src="AuthShim.js"></script>
<script src="HiDB.js" defer></script>
<script src="HiFooter.js"></script>
<script src="HiTicker.js" type="module"></script>
<script src="HiToast.js" type="module"></script>
<script src="HiIndex.js"></script>
<script src="HiIndexCard.js"></script>
<script src="AuthReady.js" type="module"></script>
<script src="universal-tier-listener.js" type="module"></script>
<script src="pulse-main.js"></script>
```

**Impact**: 
- 27 HTTP requests (even with HTTP/2, parser blocks on each)
- ~5-10 seconds on slow 3G
- Waterfall effect (script 2 waits for script 1)

**Woz Solution**: Bundle into 3 files MAX
1. `hi-core.js` (auth + db + tier system) — 1 bundle
2. `hi-ui.js` (components) — 1 bundle
3. `pulse-app.js` (page-specific) — 1 file

#### 2. AUTH SESSION SPAM
**Problem**: Multiple session checks on page load
- `HiSupabase.v3.js`: Creates client + checks session
- `auth-resilience.js`: Checks session on init
- `AuthReady.js`: Checks session
- `ProfileManager.js`: Checks session
- `universal-tier-listener.js`: Checks session
- `pulse-main.js`: Checks session for stats

**Evidence from grep**:
```javascript
// 50+ calls to auth.getSession() across codebase!
HiSupabase.v3.js line 38: onAuthStateChange()
auth-resilience.js line 48: onAuthStateChange()
auth-resilience.js line 123: auth.getSession()
AuthReady.js line 183: auth.getSession()
ProfileManager.js line 483: auth.getSession()
ProfileManager.js line 662: onAuthStateChange()
```

**Impact**:
- 6+ simultaneous `auth.getSession()` calls
- Supabase rate limiting kicks in
- Network congestion
- Race conditions (one clears while another reads)

**Woz Solution**: ONE session manager
```javascript
// hi-session.js (singleton)
window.HiSession = {
  _session: null,
  _promise: null,
  
  async get() {
    if (this._session) return this._session;
    if (this._promise) return this._promise;
    
    this._promise = window.supabase.auth.getSession()
      .then(({ data }) => {
        this._session = data.session;
        return this._session;
      });
    
    return this._promise;
  },
  
  clear() {
    this._session = null;
    this._promise = null;
  }
};

// All modules call HiSession.get() instead of auth.getSession()
```

#### 3. AUTH SIGNOUT ISSUE
**Root Cause**: BFCache + Mobile backgrounding
- iOS Safari: App backgrounds → Supabase loses in-memory session
- Android Chrome: BFCache restores page → AbortControllers dead
- auth-resilience.js tries to restore → fails → signs user out

**Evidence**:
```javascript
// HiSupabase.v3.js line 100
if (event.persisted && urlChanged) {
  clearSupabaseClient(); // ⚠️ This clears session!
}
```

**Problem**: `urlChanged` check fails on mobile sleep/wake
- Phone sleeps: URL = `/hi-pulse.html`
- Phone wakes: URL = `/hi-pulse.html` (SAME!)
- BUT `event.persisted = true` (BFCache)
- Code thinks it's navigation → clears client → session lost

**Woz Solution**: Don't clear on phone wake
```javascript
// Only clear if ACTUAL navigation (referrer changed)
const isPhoneWake = event.persisted && 
                    !urlChanged && 
                    document.referrer === window.location.href;

if (event.persisted && !isPhoneWake) {
  clearSupabaseClient();
}
```

#### 4. MULTIPLE AUTH LISTENERS
**Problem**: Every module adds its own `onAuthStateChange` listener
- HiSupabase.v3.js: 1 listener
- auth-resilience.js: 1 listener  
- ProfileManager.js: 1 listener
- AdminAccessManager.js: 1 listener
- PWASessionSync.js: 1 listener

**Impact**:
- 5+ listeners firing on every auth event
- Each does redundant work
- Memory leaks (listeners never unsubscribed)

**Woz Solution**: ONE event bus
```javascript
// hi-auth-bus.js
window.HiAuthBus = {
  listeners: new Set(),
  
  on(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  
  emit(event, session) {
    this.listeners.forEach(cb => cb(event, session));
  }
};

// HiSupabase.v3.js (ONLY place with real listener)
supabase.auth.onAuthStateChange((event, session) => {
  window.HiAuthBus.emit(event, session);
});

// All other modules listen to bus
window.HiAuthBus.on((event, session) => {
  // Handle auth changes
});
```

### 🎯 Wozniak Priorities (Fix What Matters)

1. **Bundle scripts** (biggest impact, 80% faster load)
2. **Single session manager** (eliminates race conditions)
3. **Fix phone wake detection** (stops auth signouts)
4. **Centralize auth listeners** (cleaner architecture)

### ✅ Preserved Architecture
- ✅ All existing auth flows work
- ✅ No user data loss
- ✅ ProfileManager untouched
- ✅ HiDB untouched
- ✅ Tier system untouched
- ✅ Only optimization, no refactor

### 📦 Implementation Plan

**Phase 1: Emergency Fixes (today)**
- Fix phone wake detection in HiSupabase.v3.js
- Add session cache to prevent spam

**Phase 2: Bundling (tomorrow)**
- Create build script with esbuild
- Bundle 27 scripts → 3 bundles
- Test on all pages

**Phase 3: Auth Cleanup (next week)**
- Create HiSession singleton
- Create HiAuthBus event system
- Migrate modules one by one
