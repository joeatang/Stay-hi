# HYPOTHESES.md - Ranked by Evidence

| Hypothesis | Evidence Refs | Likelihood % | Quick Test to Falsify |
|-----------|---------------|--------------|----------------------|
| **H1: ESM loaded as classic (missing type="module") → export token error** | Lines 678-679: HiSupabase.js, HiDB.js loaded without type="module" but contain export statements | **95%** | Add type="module" to these script tags in sandbox |
| **H2: Syntax errors in import statements → module loading chain fails** | Lines 9, 39, 78, 848: Missing quotes and equals signs in import/src attributes | **90%** | Fix syntax errors in sandbox copy |
| **H3: Bad import paths (404) break init chain → Supabase never created** | HiRollout.js 404, HiAuthCore.js 404 from server logs | **75%** | Comment out the 404 imports in sandbox |
| **H4: SW serving stale/non-module copy → ESM parse failure** | 304 responses in logs indicate SW cache serving | **60%** | Disable SW and hard reload |
| **H5: Race condition (metrics called before flags/Supabase ready)** | No explicit await gates before metrics calls, multiple async inits | **40%** | Add proper await barriers in sandbox |

## Detailed Evidence Analysis:

### H1 (95% Confidence):
**Lines 678-679** in EVIDENCE.md show HiSupabase.js and HiDB.js loaded as `<script src="">` without `type="module"`. But from our previous debugging, we know HiSupabase.js contains `export function getClient()` statements. Browser will throw "Unexpected token 'export'" when trying to parse ES6 exports in classic script context.

### H2 (90% Confidence):  
**Multiple syntax errors** prevent module loading entirely:
- Line 9: `import * as HiFlags from ./lib/flags/HiFlags.js';` (missing opening quote)
- Line 39: `import HiBase from ./lib/hibase/index.js';` (missing opening quote)  
- Line 78: `import HiMetrics from './lib/HiMetrics.js';` (looks correct, need to verify)
- Line 848: `src./lib/monitoring/HiMonitor.js"` (missing equals sign)

### H3 (75% Confidence):
**404 errors** break dependency chains:
- HiRollout.js needed for rollout logic
- HiAuthCore.js needed for auth initialization  
- If these fail to load, downstream modules that depend on them will also fail

### H4 (60% Confidence):
**Service Worker cache** could be serving stale versions:
- Multiple 304 responses indicate SW is active
- If SW cached a version of HiSupabase.js before exports were added, it could serve stale classic script version
- Need to check CACHE_VERSION and cache keys

### H5 (40% Confidence):  
**Race conditions** less likely given syntax errors:
- If syntax errors prevent modules from loading at all, race conditions become secondary
- But could be contributing factor after syntax fixes