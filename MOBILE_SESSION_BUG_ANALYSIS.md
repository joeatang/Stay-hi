# 🐛 Mobile Session Bug - Updated Analysis
**Date**: January 4, 2026  
**Reporter**: User testing on Safari mobile  
**Symptoms**: Different from expected "Hi Friend" → welcome redirect  

---

## 📱 USER-REPORTED SYMPTOMS

### What Happens on Mobile
1. User opens app (signed in)
2. Leaves to check X (Twitter) and TikTok
3. Returns to app
4. **Sees loading/splash page**
5. **Message: "loading space.... still warming things up"**
6. **Then: "retry failed to load"**
7. Redirects back to dashboard
8. Stats pill (hourglass) stuck spinning infinitely

### Expected vs Actual
- **Expected**: Session lost → "Hi Friend" → redirect to welcome
- **Actual**: Loading screen → "still warming up" → error → dashboard with broken stats

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: "Loading your Hi space" Message
**File**: [hi-dashboard.html](hi-dashboard.html#L1547)
```html
<div class="loading-text" data-loading-msg>Loading your Hi space…</div>
```

**File**: [HiUnifiedSplash.js](public/lib/HiUnifiedSplash.js#L154)
```javascript
setSlowState() {
  this.messageEl.textContent = 'Still warming things up…';
}
```

### Issue 2: Session IS Being Restored (Not Lost)
- **User is NOT signed out** (no redirect to welcome)
- Session restoration IS working
- Problem: Something AFTER auth is failing

### Issue 3: Stats Pill Stuck Spinning
**Hypothesis**: 
- auth-resilience restores session ✅
- Dashboard loads ✅
- But data fetch for stats pill fails ❌
- Hourglass spins forever waiting for data

---

## 🎯 THE REAL BUG

### Timing Issue on Mobile Background/Resume

```
MOBILE FLOW (Current):
1. User backgrounds app → iOS clears JavaScript memory
2. User returns → pageshow fires (event.persisted = true)
3. auth-resilience.checkSession() starts ⏳
4. Dashboard loads → tries to fetch stats ❌ (session not ready yet)
5. Stats fetch fails → hourglass stuck spinning
6. Splash times out (8 seconds) → "retry failed to load"
7. User sees broken dashboard
```

### The Problem
- auth-resilience checks session (async)
- Dashboard doesn't wait for auth-resilience to finish
- Race condition: Dashboard tries to load stats before session restored
- Stats API calls fail → infinite spinner
- Splash thinks everything failed → shows error

---

## 🔧 WHY OUR FIX DIDN'T WORK

### What We Fixed (Correctly)
✅ Mobile event listeners (pageshow, pagehide, focus)
✅ auth-guard timing coordination (waits for auth-resilience-ready)
✅ localStorage restore mechanism

### What We DIDN'T Fix
❌ Dashboard doesn't use auth-guard (uses authready-listener instead)
❌ Hi Island doesn't use auth-guard (uses authready-listener instead)
❌ authready-listener doesn't wait for auth-resilience on mobile
❌ Dashboard stats loading doesn't wait for session restoration

---

## 📊 AFFECTED PAGES

### Using auth-guard (Our fix works)
- ❌ None of the main app pages use auth-guard!
- auth-guard is only on admin/protected pages

### Using authready-listener (Our fix doesn't apply)
- ✅ hi-dashboard.html
- ✅ hi-island.html  
- ✅ hi-island-NEW.html
- ✅ hi-muscle.html

**Critical Finding**: Our mobile session fix only works for pages with auth-guard. The main app pages don't use it!

---

## 🚨 THE ACTUAL RACE CONDITION

### Current Flow (BROKEN)
```javascript
// Mobile: User returns to app
pageshow event fires → auth-resilience.checkSession() starts (async)

// Meanwhile, parallel:
hi-dashboard.html loads
  ↓
dashboard-main.js runs
  ↓
loadUserStreak() called
  ↓
StreakAuthority.get(userId) called
  ↓
HiSupabase query → session still null → API error
  ↓
Hourglass spins forever ❌
```

### What Should Happen
```javascript
// Mobile: User returns to app
pageshow event fires → auth-resilience.checkSession() starts

// Wait for session restoration:
auth-resilience emits 'auth-resilience-ready' event

// THEN:
authready-listener receives event
  ↓
Emits 'hi:auth-ready' event
  ↓
dashboard-main.js waits for 'hi:auth-ready'
  ↓
loadUserStreak() called AFTER session restored
  ↓
StreakAuthority.get() succeeds ✅
```

---

## 🎯 THE FIX

### Problem
`authready-listener.js` doesn't coordinate with `auth-resilience.js` on mobile

### Solution
Modify authready-listener to wait for auth-resilience-ready event before checking session

### Files to Modify
1. **public/lib/boot/authready-listener.js**
   - Add wait for 'auth-resilience-ready' event
   - Similar logic to what we did in auth-guard.js

---

## 🔍 VERIFICATION NEEDED

### Check authready-listener Implementation
Need to read:
- [public/lib/boot/authready-listener.js](public/lib/boot/authready-listener.js)
- See if it checks session immediately
- See if it waits for anything
- Confirm it's what dashboard/island use

### Check Dashboard Stats Loading
Need to verify:
- [public/lib/boot/dashboard-main.js](public/lib/boot/dashboard-main.js) loadUserStreak()
- Does it wait for 'hi:auth-ready'?
- Or does it try to load immediately?

---

## 🎯 NEXT STEPS

1. Read authready-listener.js to confirm hypothesis
2. Add mobile session coordination to authready-listener
3. Test on mobile Safari (the original issue)
4. Verify stats pill loads correctly
5. Verify no "retry failed to load" message

---

## 💡 KEY INSIGHT

**Our mobile session fix was correct, but applied to the wrong auth system!**

- We fixed auth-guard (used by admin pages)
- We didn't fix authready-listener (used by main app pages)
- Mobile users experience the main app pages, not admin pages
- That's why the fix didn't work

**Action**: Apply the same timing coordination to authready-listener.js
