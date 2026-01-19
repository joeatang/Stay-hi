# 🔍 Hi Island Zombie Mode Testing Guide

**Issue:** Hi Island goes into "zombie mode" (freezes/becomes unresponsive) on mobile after interaction  
**Goal:** Catch the root cause using desktop debugging tools  
**Strategy:** Test on desktop with mobile emulation + persistent logging

---

## 🎯 Setup (2 minutes)

### Option 1: URL Parameter (Easiest)
1. Open Hi Island with: `https://your-url/hi-island-NEW.html?debug=zombie`
2. Zombie Detective activates automatically
3. Green terminal window appears top-right

### Option 2: Keyboard Shortcut
1. Open Hi Island normally
2. Press **Ctrl+Shift+Z** (or **Cmd+Shift+Z** on Mac)
3. Green terminal appears

### Option 3: Console Command
1. Open DevTools (F12)
2. Type: `window.zombieDetective.start()`
3. Press Enter

---

## 🧪 Testing Steps

### Test 1: Cold Start (Fresh Page Load)
**Purpose:** Catch race conditions on first load

1. **Clear cache:** Cmd+Shift+Delete → Clear all
2. **Open Hi Island** with `?debug=zombie`
3. **Watch detective panel** for:
   - ✓ Auth Ready
   - ✓ DB Ready
   - ✓ Feed Ready
   - ✓ Map Ready

**Expected:** All green checkmarks within 3 seconds  
**Zombie Symptom:** Some stay red (✗), page doesn't fully load

---

### Test 2: Interactions (Click Everything)
**Purpose:** Find which interaction triggers zombie mode

**Try each of these, watching logs after each:**

1. **Click "Drop a Hi" button** → Does modal open?
2. **Click share card** → Does detail view open?
3. **Click wave button** → Does count increment?
4. **Click tab (Archive, Trends, etc)** → Does tab switch?
5. **Scroll feed up/down** → Does scrolling work?
6. **Click origin filter (Hi5, Gym, etc)** → Does filter apply?
7. **Click map pin** → Does popup show?
8. **Click header navigation** → Does menu open?

**Watch for:**
- ⚠️ **MAIN THREAD BLOCKED** messages
- ⚠️ **HEARTBEAT DELAYED** messages
- ❌ **ERROR** logs
- 💀 Skull icon (means heartbeat stopped = zombie!)

**Record:** Which specific interaction caused zombie mode?

---

### Test 3: Navigation Flow
**Purpose:** Catch zombie mode during page transitions

1. **Start on Dashboard**
2. **Open detective:** Ctrl+Shift+Z
3. **Click "Hi Island"** link
4. **Watch logs** for:
   - 🚪 BEFOREUNLOAD
   - 🚪 PAGEHIDE
   - 👋 PAGESHOW
   - Loading sequence

**Zombie Symptom:** Heartbeat stops (💀), logs freeze, no more events

---

### Test 4: Background/Resume (Mobile Simulation)
**Purpose:** Test backgrounding behavior (common mobile issue)

1. **On Hi Island page**
2. **Press Cmd+Tab** (switch to different app)
3. **Wait 10 seconds**
4. **Switch back** to browser
5. **Check detective:**
   - 👁️ VISIBILITY: HIDDEN → VISIBLE
   - Does heartbeat continue? ❤️ or 💀?

**Zombie Symptom:** Heartbeat turns to skull (💀), no new logs

---

### Test 5: Rapid Interactions
**Purpose:** Trigger race conditions with fast clicks

1. **Rapidly click** "Drop a Hi" button 5 times fast
2. **Rapidly switch** between tabs (General → Archive → Trends)
3. **Rapidly scroll** up/down
4. **Watch for:**
   - ⚠️ MAIN THREAD BLOCKED
   - Multiple modal open attempts
   - Conflicting state changes

---

## 📊 What to Look For

### 🚨 Zombie Indicators

| Indicator | Meaning | Next Step |
|-----------|---------|-----------|
| 💀 Skull icon | Heartbeat stopped - JS frozen | Check last log before freeze |
| ❌ Red checkmarks | System not initializing | Check which component failed |
| ⚠️ Thread blocked | Main thread hanging | Find what's blocking |
| 🚪 Navigation stuck | Page transition failed | Check navigation logs |

### Common Root Causes

1. **Database not ready** → Queries fail → infinite retry loop → zombie
2. **Auth state race** → Multiple auth checks → deadlock → zombie
3. **Feed loading loop** → Failed fetch → retry → block thread → zombie
4. **Map initialization** → Leaflet crash → event loop blocked → zombie
5. **Modal conflict** → Multiple modals open → state corruption → zombie

---

## 📦 Export & Share Results

**When you catch zombie mode:**

1. **Click "EXPORT LOGS"** button in detective panel
2. **Downloads:** `zombie-detective-[timestamp].json`
3. **Contains:**
   - All logs with timestamps
   - State of all systems
   - User interactions timeline
   - Performance data

**Send me:**
- The exported JSON file
- Which test triggered it (Test 1, 2, 3, etc)
- What you were doing when it zombified
- Screenshot of detective panel at moment of freeze

---

## 🔧 Mobile Emulation in Chrome

**To simulate mobile on desktop:**

1. **Open DevTools** (F12)
2. **Toggle device toolbar** (Ctrl+Shift+M)
3. **Select device:**
   - iPhone 12 Pro
   - Pixel 5
   - Or custom: 375x667 (iPhone SE size)
4. **Enable:**
   - Touch simulation
   - Throttle: Slow 3G (tests slow networks)
   - Disable cache

**Now test with detective active** - simulates mobile but with full DevTools access!

---

## 🎯 Success Criteria

**We've found the root cause when:**
- ✅ Zombie mode is reproducible (happens every time doing X)
- ✅ Detective logs show exactly when it happens
- ✅ We can see which component/system fails
- ✅ We can export proof (JSON + screenshot)

**Then we can fix it surgically** without guessing.

---

## 💡 Tips

1. **Keep detective open** while testing - don't close it
2. **Test one thing at a time** - easier to isolate cause
3. **Export logs often** - before they get too long
4. **Check heartbeat** - if it stops (💀), that's zombie mode
5. **Note the sequence** - what was the LAST log before freeze?

---

## 🚀 Quick Reference

| Action | How |
|--------|-----|
| Open detective | `?debug=zombie` or Ctrl+Shift+Z |
| Close detective | Click "CLOSE" button |
| Export logs | Click "EXPORT LOGS" button |
| Clear logs | Click "CLEAR" button |
| Check heartbeat | Look for ❤️ or 💀 in bottom-right |
| Mobile emulation | DevTools → Ctrl+Shift+M |

---

**Ready to hunt zombies! 🔍💀**
