# 📊 Mobile Navigation Diagnostic Tool - User Guide

**Purpose**: Capture navigation state and page loading behavior without needing to watch console logs in real-time.

---

## How It Works

The tool automatically tracks:
- Page loads and navigation events
- ProfileManager and auth state changes  
- Database query timeouts
- 7-day pill visibility (Dashboard)
- DOM ready events
- Visibility changes (sleep/wake)

All events are stored in sessionStorage and persist across navigation.

---

## How To Use

### Option 1: Keyboard Shortcut (Recommended)
1. Navigate between pages normally on your mobile device
2. When ready to view report, press **Ctrl+Shift+D**
3. Screenshot the report
4. Share screenshot with developer

### Option 2: URL Parameter
1. Add `?navdiag=show` to any page URL
2. Example: `https://stay-hi.vercel.app/hi-dashboard.html?navdiag=show`
3. Report shows automatically after page loads

### Option 3: Console Command
1. Open Safari Web Inspector (USB connected)
2. Type `showNavDiag()` in console
3. Report appears as modal overlay

---

## What The Report Shows

### Session Info
- Start time
- Duration
- Current page
- Total events captured

### Issues Detected
Automatically detects common problems:
- ❌ 7-day pill never became visible (Dashboard)
- ⚠️ Profile query timeouts
- ⚠️ Feed query timeouts
- ℹ️ Rapid navigation (>3 page loads)

### Event Summary
Count of each event type:
- PAGE_LOAD: How many pages loaded
- PROFILE_READY: ProfileManager initialization
- AUTH_READY: Auth state changes
- 7DAY_PILL_CHECK: Dashboard pill visibility checks
- PROFILE_TIMEOUT / FEED_TIMEOUT: Database slow queries
- DOM_READY: DOMContentLoaded timing
- VISIBILITY_CHANGE: Sleep/wake events

### Timeline
Last 20 events in chronological order with:
- Timestamp (seconds from session start)
- Page name
- Event type
- Event data (truncated to 100 chars)

### Dashboard-Specific Diagnostics
When on Dashboard, shows detailed 7-day pill tracking:
- How many checks ran
- When first/last check occurred
- Whether pill was ever found in DOM
- Whether pill was ever visible
- Check-by-check results

---

## Example Use Cases

### Issue: Dashboard 7-day pill not showing
**Steps**:
1. Load Dashboard fresh
2. Wait 5 seconds
3. Press Ctrl+Shift+D
4. Check "Dashboard-Specific Diagnostics" section
5. Screenshot shows exactly when pill checks ran and results

**What to look for**:
- "Ever Found: ❌ No" → DOM element missing (HTML issue)
- "Ever Found: ✅ Yes, Ever Visible: ❌ No" → CSS issue (display:none)
- Check results show display/opacity values

### Issue: Navigation causes zombie mode
**Steps**:
1. Navigate: Dashboard → Hi Island → Dashboard
2. If zombie mode occurs, press Ctrl+Shift+D
3. Screenshot the timeline

**What to look for**:
- Multiple PROFILE_TIMEOUT events = database overwhelmed
- VISIBILITY_CHANGE events = mobile sleep/wake interference
- Rapid PAGE_LOAD sequence = navigation loop

### Issue: Inconsistent page loading
**Steps**:
1. Load same page 3 times
2. Press Ctrl+Shift+D after each load
3. Compare Event Summary counts

**What to look for**:
- Different event counts = race conditions
- Missing AUTH_READY on some loads = auth timing issue
- Missing DOM_READY = readyState problem

---

## Advanced Usage

### Clear Diagnostic History
```javascript
clearNavDiag()
```

### Manual Event Recording (for debugging)
```javascript
window.mobileNavDiag.recordEvent('CUSTOM_EVENT', { 
  myData: 'value' 
})
```

### Access Raw Events
```javascript
window.mobileNavDiag.events
```

---

## Mobile-Friendly Features

✅ **No console watching required** - events captured automatically  
✅ **Persists across navigation** - sessionStorage keeps history  
✅ **Screenshot-friendly** - modal designed for mobile screenshots  
✅ **Auto-detects issues** - highlights problems in red  
✅ **Lightweight** - minimal performance impact  
✅ **Easy activation** - Ctrl+Shift+D or URL param  

---

## Troubleshooting

### "Report is empty"
- Tool loads on page load, so events only start after page with tool loads
- Navigate to a page, THEN check report (not vice versa)

### "Can't press Ctrl+Shift+D on mobile"
- Use URL parameter instead: Add `?navdiag=show` to URL
- Or connect Safari Web Inspector and type `showNavDiag()`

### "Report shows wrong page"
- Each page tracks independently
- Check "Session Info → Current Page" to confirm which page report is from

### "Events seem missing"
- Max 50 events stored (last 50 kept)
- Clear history with `clearNavDiag()` to start fresh

---

## What To Share With Developer

When reporting issues, screenshot these sections:
1. **Issues Detected** (red box at top)
2. **Dashboard-Specific Diagnostics** (if Dashboard issue)
3. **Timeline** (last 20 events showing problem)

Developer can use these to:
- See exact timing of events
- Identify which component failed
- Reproduce issue locally
- Verify fix worked

---

## Example Report Interpretation

```
Session Info:
  Start: 18:15:28
  Duration: 23s
  Current Page: Dashboard
  Total Events: 12

Issues Detected:
  ❌ 7-day pill never became visible
  ⚠️ Profile query timed out 1 time(s)

Event Summary:
  PAGE_LOAD: 1
  AUTH_READY: 1
  PROFILE_READY: 1
  PROFILE_TIMEOUT: 1
  7DAY_PILL_CHECK: 10

Timeline:
  +0.0s | Dashboard | PAGE_LOAD
  +0.5s | Dashboard | AUTH_READY
  +1.2s | Dashboard | 7DAY_PILL_CHECK ({"checkNumber":1,"found":false})
  +1.7s | Dashboard | 7DAY_PILL_CHECK ({"checkNumber":2,"found":false})
  ...
  +3.5s | Dashboard | PROFILE_TIMEOUT
  +4.0s | Dashboard | PROFILE_READY
  +5.0s | Dashboard | 7DAY_PILL_CHECK ({"checkNumber":10,"found":false})

Dashboard-Specific Diagnostics:
  7-Day Pill Checks: 10
  First Check: +1.2s
  Last Check: +5.0s
  Ever Found: ❌ No
  Ever Visible: ❌ No
```

**Interpretation**:
- Dashboard loaded normally
- Auth completed at +0.5s
- Profile query timed out at +3.5s (database slow)
- 7-day pill never appeared in DOM (all 10 checks failed)
- **Problem**: Pill element missing from HTML or wrong selector

---

## Deployed Pages

Tool is active on:
- ✅ Dashboard
- ✅ Hi Island

To add to other pages, include before main orchestrator:
```html
<script src="./lib/diagnostic/MobileNavigationDiagnostic.js"></script>
```
