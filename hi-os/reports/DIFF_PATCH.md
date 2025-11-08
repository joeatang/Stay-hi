# DIFF PATCH - Welcome Page Metrics Fix

## Root Cause Identified:
**ES6 modules loaded as classic scripts + syntax errors** → "Unexpected token 'export'" → metrics loading chain fails → "•••" display

## Minimal Repo Diff Required:

### File: `/public/welcome.html`

**Fix 1 - Line 9**: Add missing opening quote
```diff
- import * as HiFlags from ./lib/flags/HiFlags.js';
+ import * as HiFlags from './lib/flags/HiFlags.js';
```

**Fix 2 - Line 40**: Add missing opening quote  
```diff
- import HiBase from ./lib/hibase/index.js';
+ import HiBase from './lib/hibase/index.js';
```

**Fix 3 - Line 678-679**: Add type="module" to ES6 module scripts
```diff
- <script src="./lib/HiSupabase.js"></script>
- <script src="./lib/HiDB.js"></script>
+ <script type="module" src="./lib/HiSupabase.js"></script>
+ <script type="module" src="./lib/HiDB.js"></script>
```

**Fix 4 - Line 848**: Add missing equals sign
```diff
- <script type="module" src./lib/monitoring/HiMonitor.js"></script>
+ <script type="module" src="./lib/monitoring/HiMonitor.js"></script>
```

## Expected Outcome:
- ES6 modules load properly without "Unexpected token 'export'" errors
- HiMetrics loading chain completes successfully  
- Welcome page displays real metrics (3 waves, 1 hi5) instead of "•••"
- No more "86 flicker" from broken initialization

## Rollback Note:
To rollback, revert the 4 changes above. The syntax errors will return and metrics will show "•••" again.

## Files Changed: 1
## Lines Changed: 4  
## Risk Level: MINIMAL (syntax fixes only, no logic changes)