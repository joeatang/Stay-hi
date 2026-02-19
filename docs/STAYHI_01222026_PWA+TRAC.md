# 🌐 TRAC NETWORK EVALUATION - Stay Hi App Architecture

**Date:** January 20, 2026  
**Purpose:** Evaluate if Stay Hi can be built on Trac Network (decentralized P2P)  
**Current State:** PWA with Capacitor wrapper, experiencing Safari background kill issues

---

## 📱 THE PROBLEM: Safari Background Kill ("Zombie Mode")

### Current Architecture
- **Platform:** Progressive Web App (PWA) hosted on GitHub Pages
- **Backend:** Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Users:** ~30 active users
- **Issue:** Safari kills JavaScript after 5-10s of backgrounding

### Technical Symptoms

When user backgrounds app (iPhone/iPad):
1. **T+0s:** User switches to another app
2. **T+3s:** Safari throttles timers (setInterval slows to 1/min)
3. **T+5s:** Safari pauses JavaScript execution
4. **T+10s:** Safari terminates WebSocket connections
5. **T+30s:** Safari may evict page from memory entirely

When user returns:
1. JavaScript engine cold-starts (all in-memory state lost)
2. Network requests are throttled (Safari reconnecting)
3. Supabase client needs to reconnect (300-1000ms)
4. Auth session needs refresh (if stale)
5. Profile data needs re-fetch (network throttled → timeout)
6. Feed data needs re-fetch (network throttled → timeout)
7. **Result:** App shows nothing (zombie state) until force-reload

### What Specifically Fails

**In-Memory State (Lost):**
```javascript
window.ProfileManager.instance._profile // Gone
window.HiRealFeed.feedData // Gone
window.gWaves // Gone
```

**Network Layer (Throttled):**
```javascript
// Timeouts on resume (Safari throttling)
await supabase.auth.getSession() // 3-5s timeout
await supabase.from('user_profiles').select() // 3-5s timeout
await supabase.from('public_shares').select() // 3-5s timeout
```

**WebSocket Connections (Closed):**
```javascript
supabase.realtime // Connection closed, needs reconnect
```

---

## ✅ WHAT WE'VE TRIED

### Attempt 1: Optimistic Auth (Deployed)
**Strategy:** Don't proactively check session on page load
**Result:** 30-40% zombie reduction (from 40% → 10%)
**Limitation:** Still fails when network is throttled

### Attempt 2: Service Worker Precaching (Deployed)
**Strategy:** Cache critical auth files in service worker
**Result:** 5% zombie reduction (faster cache hits)
**Limitation:** Doesn't prevent Safari from killing JS

### Attempt 3: Aggressive State Snapshot (Rolled Back)
**Strategy:** Save state to localStorage on background, restore on foreground
**Implementation:**
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    localStorage.setItem('app_state', JSON.stringify({
      profile: ProfileManager.getProfile(),
      feed: HiRealFeed.getFeed(),
      tier: HiBrandTiers.getTier()
    }));
  } else {
    const state = JSON.parse(localStorage.getItem('app_state'));
    ProfileManager.restoreProfile(state.profile);
    HiRealFeed.restoreFeed(state.feed);
  }
});
```
**Result:** WORKED on resume, BROKE fresh loads (restoration only ran on visibilitychange)
**Status:** Rolled back, needs redesign

### Attempt 4: Capacitor Native Wrapper (In Progress)
**Strategy:** Wrap PWA in native Swift/Kotlin container
**Status:** Android + iOS platforms added, ready to build
**Expected Result:** 100% zombie elimination (native process survives backgrounding)
**Timeline:** Android APK today (side-load), iOS App Store 7-14 days

---

## 🎯 IDEAL SOLUTION REQUIREMENTS

For Stay Hi to work without zombie mode, we need:

### 1. **Persistent Process**
- App process survives backgrounding (not killed by OS)
- OR: App can resume instantly from exact state (<500ms)

### 2. **Reliable Network Reconnection**
- WebSocket/SSE connections auto-reconnect on resume
- No network throttling on foreground
- OR: P2P connections that survive OS backgrounding

### 3. **State Persistence**
- User profile data persists across background/foreground
- Feed data persists (or refetches instantly)
- Auth session persists (or refreshes silently)

### 4. **Realtime Features**
- Feed updates (new shares appear in real-time)
- Like/wave reactions update live
- Global stats counter updates live
- OR: State sync happens on foreground (within 1-2s)

### 5. **Offline Capability**
- User can view cached feed while offline
- User can queue actions (like/wave/check-in) while offline
- Actions sync when connection restored

---

## 🌐 TRAC NETWORK QUESTIONS

### Architecture Questions

**1. Process Model:**
- Do Trac apps run as native processes (Swift/Kotlin)?
- Or do they run in WebView/browser context (like PWA)?
- If WebView: Does Trac prevent OS from killing backgrounded apps?

**2. Networking:**
- How do P2P connections handle backgrounding?
- Do connections survive iOS/Android background restrictions?
- What's the reconnection time on foreground? (<500ms ideal)

**3. State Management:**
- How is app state persisted across background/foreground?
- Is there local-first state management built-in?
- Can we cache large datasets (feeds with images)?

**4. Realtime Updates:**
- How do P2P updates work when app is backgrounded?
- Can we show notifications for new feed items?
- What's the latency for state sync on foreground?

**5. Offline Capability:**
- Does Trac support offline-first architecture?
- Can we queue actions while offline and sync later?
- How is conflict resolution handled (e.g., two users like same share)?

### Feature Requirements for Stay Hi

**Core Features:**
1. **User Profiles** - Name, avatar, bio, tier, points
2. **Social Feed** - Photos/videos with captions, likes, wave reactions
3. **Real-time Stats** - Global wave counter, active users count
4. **Check-in System** - Daily check-ins award points, maintain streak
5. **Leaderboard** - Top users by points/waves/shares
6. **Membership Tiers** - Anonymous → Bronze → Silver → Gold (feature gating)
7. **Hi Islands** - Location-based check-ins (uses device GPS)

**Technical Requirements:**
- ~30 active users (growing to 100-500)
- Feed with 50-200 images (need CDN/storage)
- Real-time updates (1-2s latency acceptable)
- Offline viewing of cached feed
- Auth (email/password, social login)
- File uploads (photos/videos up to 50MB)

---

## 📊 CURRENT TECH STACK

### Frontend
- **HTML/CSS/JS** - Vanilla (no React/Vue)
- **Service Worker** - Offline caching, precaching
- **PWA** - Installable, home screen icon
- **Capacitor** - Native wrapper (iOS + Android)

### Backend (Supabase)
- **PostgreSQL** - User profiles, feed, stats, check-ins
- **Supabase Realtime** - Live feed updates, global stats counter
- **Supabase Auth** - Email/password, anonymous users
- **Supabase Storage** - Photo/video uploads, avatars
- **Edge Functions** - Serverless functions for complex logic

### Hosting
- **GitHub Pages** - Static site hosting
- **Custom Domain** - stayhi.live (Cloudflare DNS)

---

## 🤔 CAN STAY HI BE BUILT ON TRAC?

**Questions for Trac Team:**

1. **Can Trac apps survive iOS/Android backgrounding better than PWAs?**
   - If YES: This solves our core problem
   - If NO: Same zombie mode issue persists

2. **Does Trac have built-in state persistence/sync?**
   - If YES: We can migrate from Supabase
   - If NO: We'd need to build this layer

3. **How does Trac handle large binary data (images/videos)?**
   - Do we need separate CDN? (Cloudflare R2, etc.)
   - Or is there P2P file distribution?

4. **What's the developer experience?**
   - Can we migrate incrementally? (Trac for state, Supabase for storage?)
   - Or all-or-nothing migration?

5. **What's the performance like for 30-500 users?**
   - P2P can be slow for discovery/sync
   - Do you have benchmarks for social feed apps?

---

## 📋 DECISION CRITERIA

**Stay Hi should migrate to Trac IF:**

✅ Trac apps survive backgrounding better than PWAs  
✅ Trac has built-in state sync (no need for Supabase Realtime)  
✅ Trac supports offline-first with conflict resolution  
✅ Developer experience is smooth (good docs, examples)  
✅ Performance is acceptable (feed loads <2s, sync <1s)  
✅ File uploads/storage solution exists (or easy integration)  

**Stay Hi should stick with Capacitor IF:**

❌ Trac doesn't solve background kill issue  
❌ Trac requires complete rewrite (no incremental migration)  
❌ Trac can't handle binary data well  
❌ Trac performance is slow (>3s for common operations)  
❌ Trac ecosystem is immature (breaking changes, poor docs)  

---

## 🎯 RECOMMENDED NEXT STEPS

### For Trac Evaluation:

1. **Build Proof-of-Concept** (2-4 hours)
   - Simple social feed on Trac
   - Test backgrounding behavior
   - Measure state sync performance
   - Test offline capability

2. **Compare Metrics**
   - Background survival: Trac vs Capacitor vs PWA
   - State sync latency: Trac P2P vs Supabase Realtime
   - Developer velocity: Trac ecosystem vs current stack

3. **Migration Plan** (if Trac wins)
   - Phase 1: Migrate state management to Trac (keep Supabase for storage)
   - Phase 2: Test with beta users (10-20 people)
   - Phase 3: Full migration (if successful)

### For Immediate Fix (While Evaluating Trac):

**Continue with Capacitor (guaranteed to work):**
- Android APK: TODAY (side-load, 0% zombie mode)
- iOS App Store: 2 weeks (0% zombie mode)
- Keep PWA running during migration (users unaffected)

**Then evaluate Trac in parallel:**
- Build POC while native apps are in review
- If Trac is better: Migrate later
- If Capacitor is better: Stay course

---

## 📞 QUESTIONS FOR TRAC DEV

**Please answer these to evaluate fit:**

1. How do Trac apps handle iOS/Android backgrounding? Native process or WebView?
2. What's the state persistence model? Automatic or manual sync?
3. How do you handle large binary files (photos/videos)?
4. What's the typical latency for P2P state sync? (1-2s acceptable)
5. Do you have example apps similar to Stay Hi? (social feed, real-time updates)
6. What's the migration path from Supabase? (all-or-nothing or incremental)
7. What's the developer experience like? (docs, tooling, debugging)
8. What's the community maturity? (Discord, GitHub, Stack Overflow)

---

## 📁 RELEVANT FILES FOR COPILOT CONTEXT

If evaluating migration, provide these to your Copilot:

**Architecture:**
- `/docs/ZOMBIE_MODE_BRUTAL_TRUTH.md` - Root cause analysis
- `/docs/HI_CODE_MAP.md` - Complete codebase overview
- `/docs/COMPREHENSIVE_FOUNDATION_AUDIT_JAN_2026.md` - System architecture

**Database Schema:**
- `/supabase/migrations/*.sql` - PostgreSQL schema
- `/GOLD_STANDARD_SOLUTION.md` - Data tracking patterns

**State Management:**
- `/public/lib/managers/ProfileManager.js` - User profile state
- `/public/components/hi-real-feed/HiRealFeed.js` - Feed state
- `/public/lib/boot/HiStateResilience.js` - State snapshot (rolled back)

**Auth & Realtime:**
- `/public/lib/AuthReady.js` - Auth orchestration
- `/public/lib/HiSupabase.v3.js` - Supabase client wrapper

**Service Worker:**
- `/public/sw.js` - Caching strategy (just updated with aggressive caching)

---

## 💡 FINAL RECOMMENDATION

**SHORT TERM (THIS WEEK):**
Finish Capacitor implementation (guaranteed fix, 2 hours work remaining)

**LONG TERM (NEXT MONTH):**
Evaluate Trac with POC - if P2P backgrounding is better, migrate incrementally

**HYBRID APPROACH:**
Use Capacitor for reliable baseline + explore Trac for decentralization benefits

The key question: **Does Trac solve the background kill issue better than native wrapper?**

If YES → Trac is the future  
If NO → Capacitor is the solution  

Let's find out! 🚀
