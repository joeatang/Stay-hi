# EVIDENCE.md - Welcome Page Metrics Debug

## A. Script Audit

### Every <script> tag from welcome.html:
1. **Line 9**: `<script type="module">` - imports `./lib/flags/HiFlags.js` (MISSING QUOTES)
2. **Line 25**: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js">` - External CDN (no type)
3. **Line 29**: `<script src="./lib/HiMembership.js">` - Local script (no type)
4. **Line 32**: `<script src="assets/hi-flow-controller.js">` - Local script (no type) 
5. **Line 36**: `<script src="assets/hi-loading-experience.js">` - Local script (no type)
6. **Line 39**: `<script type="module">` - imports `./lib/hibase/index.js` (MISSING QUOTES)
7. **Line 66**: `<script src="assets/tesla-data-isolation.js">` - Local script (no type)
8. **Line 69**: `<script src="assets/pwa-manager.js">` - Local script (no type)  
9. **Line 72**: `<script src="assets/hi-anonymous-onboarding.js">` - Local script (no type)
10. **Line 75**: `<script type="module" src="assets/hi-rewards-beta.js">` - ES Module (correct type)
11. **Line 78**: `<script type="module">` - imports `./lib/HiMetrics.js` (MISSING QUOTES)
12. **Line 678**: `<script src="./lib/HiSupabase.js">` - **ES Module loaded as classic script**
13. **Line 679**: `<script src="./lib/HiDB.js">` - **ES Module loaded as classic script** 
14. **Line 848**: `<script type="module" src./lib/monitoring/HiMonitor.js">` - **SYNTAX ERROR: missing "="**
15. **Line 851**: `<script type="module" src="./lib/flags/HiFlags.js">` - ES Module (correct)
16. **Line 854**: `<script type="module">` - imports HiRollout/HiAuthCore
17. **Line 986**: `<script type="module">` - welcome init logic
18. **Line 995**: `<script defer src="./js/welcome-cta.js">` - Deferred script (no type)

### Critical Issues Found:
- **MULTIPLE SYNTAX ERRORS**: Missing quotes in import statements (lines 9, 39, 78)
- **MISSING EQUALS**: Line 848 `src./lib/` should be `src="./lib/`
- **ESM AS CLASSIC**: HiSupabase.js and HiDB.js loaded without type="module" but contain export statements

## B. Network + SW Audit

### HTTP Status Tests (from server logs):
- **HiSupabase.js**: 200 (served from `/public/lib/HiSupabase.js`)
- **HiDB.js**: 200 (served from `/public/lib/HiDB.js`)
- **HiRollout.js**: 404 (path: `/public/lib/rollout/HiRollout.js`)  
- **HiAuthCore.js**: 404 (path: `/public/lib/auth/HiAuthCore.js`)
- **HiMonitor.js**: 200 (served from `/public/lib/monitoring/HiMonitor.js`)
- **HiMetrics.js**: 200 (served from `/public/lib/HiMetrics.js`)

### Service Worker Evidence:
- SW is serving from cache (304 responses seen in logs for multiple assets)
- No cache-control headers verified yet
- SW version key not extracted yet

## C. Path Audit

### 404 Failures:
- `/public/lib/rollout/HiRollout.js` - File not found
- `/public/lib/auth/HiAuthCore.js` - File not found  

## D. Ready Gates

### From welcome.html inspection:
- **HiFlags**: Attempts import at line 9 but has syntax error (missing quotes)
- **Supabase**: CDN loads first, then HiSupabase.js tries to initialize
- **HiBase.stats**: Imported in module script at line 39, but has syntax error
- **Metrics loading**: Line 78 module imports HiMetrics but syntax error blocks execution

### Legacy Writers Detected:
- Line ~85-95: Direct DOM updates to `#globalWaves` and `#totalHis` elements
- HiMetrics subscriber pattern updates these same elements
- Potential race condition between legacy setters and modern metrics

## Root Evidence Summary:
1. **SYNTAX ERRORS**: Multiple missing quotes in import statements prevent ES modules from loading
2. **WRONG SCRIPT TYPE**: HiSupabase.js/HiDB.js loaded as classic scripts but contain export statements  
3. **404 IMPORTS**: Missing HiRollout.js and HiAuthCore.js break dependency chain
4. **PARSE FAILURES**: "Unexpected token 'export'" from loading ES modules as classic scripts