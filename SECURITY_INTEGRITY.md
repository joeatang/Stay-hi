# Hi-OS Script Integrity & Build Verification

## Overview
Hi-OS establishes a multi-layer integrity posture:
1. Build Tag Surfacing: `HiPWA.js` injects a minimal banner (`build:<tag>[.<sha>] • <env>`) in non-production or when `?show-build=1`.
2. Runtime Audit API: `window.HiIntegrity.audit()` enumerates all cross-origin scripts and reports integrity presence, expected hash (when known), and mismatch state.
3. Expected Hash Registry: `window.HiIntegrity.expected` maps stable pinned CDN URLs to their `sha384` SRI values.
4. Verification Helper: `window.HiIntegrity.summary()` returns totals for missing and mismatched scripts for quick console triage.
5. Optional Dynamic Loader SRI: Plausible analytics loader accepts a provided hash via `env.PLAUSIBLE_SRI` or `window.__HI_SRI.plausible`.

## Current Pinned Hashes (sha384)
| Library | URL | Hash |
|---------|-----|------|
| Supabase UMD 2.81.1 | https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1/dist/umd/supabase.min.js | XLEuzmdNfK1V09d59bu+Uv3EFtEp5kFP8BmseBq85CUpeFZXhUfqjk4ZeR/biZmS |
| Supabase Alias (avoid in prod) | https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.1 | XLEuzmdNfK1V09d59bu+Uv3EFtEp5kFP8BmseBq85CUpeFZXhUfqjk4ZeR/biZmS |
| Leaflet 1.9.4 | https://unpkg.com/leaflet@1.9.4/dist/leaflet.js | cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH |
| MarkerCluster 1.4.1 | https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js | RLIyj5q1b5XJTn0tqUhucRZe40nFTocRP91R/NkRJHwAe4XxnTV77FXy/vGLiec2 |

## Using the Audit
Open DevTools Console:
```js
HiIntegrity.summary();
HiIntegrity.audit(); // detailed per-script breakdown
```

Example Result:
```js
{
  total: 3,
  missing: 0,
  mismatched: 0,
  details: [ { src, hasIntegrity, expected, actual, matches }, ... ]
}
```

## Workflow to Update Hashes
1. Pin Versions: Prefer explicit versions (e.g. `@supabase/supabase-js@2.45.1`) to avoid silent upstream changes breaking SRI.
2. Fetch Script & Compute Hash:
```bash
curl -Ls <URL> -o /tmp/lib.js
openssl dgst -sha384 -binary /tmp/lib.js | openssl base64 -A
```
3. Update HTML Tag: Add / replace `integrity="sha384-<hash>" crossorigin="anonymous"`.
4. Update Expected Registry: Modify `expectedHashes` in `public/lib/HiPWA.js`.
5. Verify: Reload page → `HiIntegrity.summary()` should show `missing:0, mismatched:0`.
6. Commit: Include note referencing version bump and updated hash.

### Version Pinning
Supabase previously used the alias `@2` (floating latest). We now pin to `2.81.1` to ensure deterministic SRI. Future bumps: repeat steps 1–6; do not rely on alias for production.

### Automated Script Support
Use the helper script to audit and update hashes:
```bash
# Dry report (JSON summary)
node scripts/update-sri.js

# Show updated HTML script tag suggestions
node scripts/update-sri.js --html

# Apply new hashes directly into HiPWA.js (if changed)
node scripts/update-sri.js --apply
```
Integrate into CI to fail if any hash changes without an intentional version bump commit:
```bash
node scripts/update-sri.js --check  # exits non-zero if drift detected
```

## Plausible Analytics SRI Consideration
Plausible script may update upstream. Enabling SRI without pinning can cause breakage when the remote file changes. Provide hash only if:
- You mirror a pinned build internally; OR
- Accept deliberate update workflow for analytics.
Configure via:
```js
window.__HI_SRI = { plausible: 'sha384-<hash>' };
// or env.PLAUSIBLE_SRI injection mechanism
```
If omitted, loader operates without integrity to avoid unnecessary outages.

## Build Tag Banner
Displayed automatically outside production or when forced by `?show-build=1`. Useful for QA & staging differentiation and quick version verification during audits.

## Fallback & Degradation Strategy
- Missing integrity on production triggers console warnings (non-blocking) enabling progressive rollout.
- Mismatched integrity (hash differs) surfaces console mismatch warnings for rapid detection before full user impact.
- Integrity Beaconing: On production, missing or mismatched hashes now send a lightweight `navigator.sendBeacon` POST to `/integrity-beacon` with `{ type:'missing'|'mismatch', src, expected?, actual?, build, ts }` enabling future server-side aggregation.

## Performance Budgets
Baseline thresholds stored in `perf-budget.json` and enforced against the latest perf beacon via:
```bash
node scripts/check-perf-budget.js
```
Budget keys: `lcp`, `cls`, `fid`, `fcp`, `tbt`, `totalTransferKB`. Failing the script can gate merges to protect UX quality.

## Telemetry Persistence
Runtime beacons (perf, integrity, error) now also persist to Supabase tables when a client is present:

Tables (defined in `DEPLOY_TELEMETRY.sql`):
- `perf_beacons` (core web vitals + resource summary)
- `integrity_events` (missing / mismatch external script detections)
- `error_events` (window error & unhandled promise rejections)

Client module: `public/lib/telemetry.js`
Usage: auto-queues events; flushes when a Supabase client with `.from()` API is detected (e.g., `window.supabaseClient`).
Query examples:
```sql
select build_tag, avg(lcp) as avg_lcp from perf_beacons where ts > (extract(epoch from now())*1000 - 86400000) group by 1 order by avg_lcp;
select event_type, count(*) from integrity_events where ts > (extract(epoch from now())*1000 - 86400000) group by 1;
select type, count(*) from error_events where ts > (extract(epoch from now())*1000 - 86400000) group by 1;
```
Retention: add a scheduled function later to purge rows older than 30d.

## Recommended Future Enhancements
- Hash Beacon Aggregation API: Expose summarized metrics (e.g., mismatches per build) for dashboards.
- Automatic Pinning Script: CI job that resolves CDN aliases to explicit version & updates both tag + expected hash.
- Local Vendoring Option: Mirror critical third-party libs locally, eliminating external execution risk.
- Query Dashboards: Lightweight admin view for recent perf percentile trends and error volumes.

## Summary
The integrity layer now provides: visibility (banner), verification (audit + expected hashes), and controlled tightening (progressive SRI). This advances Hi-OS toward "5 star" security & reliability while preserving deploy agility.
