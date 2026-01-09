# Mobile Diag - Quick Reference

## Enable/Disable

**Enable:**
```
http://192.168.1.212:3030/public/hi-dashboard.html?diag=1
```
OR
```javascript
localStorage.setItem('HI_DIAG', '1');
```

**Disable:**
```javascript
localStorage.removeItem('HI_DIAG');
```

---

## What It Logs

| Category | What | When |
|----------|------|------|
| `[DIAG:LIFECYCLE]` | visibilitychange, pageshow, pagehide | Page state changes |
| `[DIAG:NAV]` | Navigation clicks | User clicks footer/header |
| `[DIAG:REQUESTS]` | fetch/XHR calls | First 5 sec after page visible |
| `[DIAG:ERROR]` | window.error, promise rejections | Any error |
| `[DIAG:TIMING]` | ProfileManager, Auth fetches | Critical operations |
| `[DIAG:MEMORY]` | Heap snapshots | Every 10 seconds |
| `[DIAG:BFCACHE]` | BFCache restoration warnings | Page restored from cache |

---

## Root Cause Hypotheses

**1. Listener/Subscription Leak**
- Signal: Memory increases 5-10MB per nav cycle
- Test: Dashboard → Island → Dashboard (3x), check memory

**2. BFCache State Corruption**
- Signal: `persisted: true` + duplicate init logs
- Test: Navigate away → back button, check console

**3. Request Storm on Visibility**
- Signal: 10+ requests in first 2 seconds
- Test: Background → foreground, check network tab

---

## Files Changed

```
public/lib/diagnostics/mobile-diag.js          (NEW - core instrumentation)
public/lib/diagnostics/enable-mobile-diag.js   (NEW - conditional loader)
public/hi-dashboard.html                       (MODIFIED - added loader)
public/hi-island-NEW.html                      (MODIFIED - added loader)
```

**Impact when disabled:** ZERO (loader checks flag before loading anything)

---

## Evidence to Collect

From Safari Web Inspector Console:

1. All `[DIAG:LIFECYCLE]` logs showing page state transitions
2. `[DIAG:REQUESTS]` count after backgrounding
3. Any `[DIAG:ERROR]` logs
4. `[DIAG:BFCACHE]` warnings about restored pages
5. Memory usage before/after nav cycles
6. Subjective feel: laggy? broken? unresponsive?

**Send back:** Raw console logs + your observations
