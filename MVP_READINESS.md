# Hi App MVP Readiness Checklist

## Status Summary
- CSP / Inline JS: 100% externalized (blocks: 31 -> 0; bytes -> 0)
- Service Worker: Resilient install, cache pruning, stale-while-revalidate, integrity guard
- Performance: Vitals (LCP,FID,CLS,TTFB) + FCP + TBT + resource summary beacons
- Monitoring: Global error & promise capture, Sentry placeholder, Plausible, custom hiTrack events
- Integrity: Build banner, SRI (Supabase, Leaflet, MarkerCluster), audit API, beacon telemetry
- Version Pinning: Supabase locked to 2.81.1
- Accessibility: Initial heuristic audit script added (run `node scripts/a11y-audit.js`)
- Observability: Local beacon collector available (`node scripts/beacon-server.js`)

## Remaining (Optional for MVP Hardening)
| Area | Action | Priority |
|------|--------|----------|
| Beacon Persistence | Deploy serverless endpoint to store perf/error/integrity events | High |
| CI Automation | Script to refresh SRI hashes & version pin on bump | High |
| Deep A11y | Manual semantic pass (landmarks, focus order, color contrast) | Medium |
| Analytics Validation | Dashboard / aggregation of beacon logs | Medium |
| Local Vendoring | Mirror critical third-party libs to reduce external script risk | Medium |
| Resource Budgets | Enforce size budgets via build/lint (HTML + assets) | Low |
| Progressive Enhancement Docs | Document degraded modes (offline, no JS) | Low |

## Command Cheatsheet
```bash
# Run local beacon collector
node scripts/beacon-server.js 5050

# View collected logs
tail -f beacon-logs/perf.log

# Run accessibility audit
node scripts/a11y-audit.js
```

## Verification Flow
1. Load key pages with `?perf=1` to inspect console perf payload.
2. Check `window.HiIntegrity.summary()` returns missing:0.
3. Trigger an intentional error in dev to verify `/error-beacon` log.
4. Disconnect network → confirm offline banner appears and app still serves cached shell.
5. Modify one external script integrity value locally → observe mismatch beacon & console warning (do not commit).

## MVP Acceptance Criteria
- No inline scripts; CSP can be tightened further as needed.
- Core user journeys function offline after first visit (navigation + cached assets).
- Performance beacon collects baseline metrics with <3% overhead.
- Integrity audit shows 0 missing for pinned libs; mismatch telemetry functional.
- Accessibility audit returns either zero or documented acceptable exceptions.
- Monitoring captures errors & custom events for future aggregation.

## Next Step Recommendation
Deploy beacon endpoints & set up simple aggregation (e.g., Supabase Edge Function or lightweight server) to convert telemetry into actionable dashboards; then perform final usability & a11y pass.

## Ownership & Runbook
- Integrity & Perf Hash Updates: Use workflow in `SECURITY_INTEGRITY.md`.
- SW Versioning: Bump build tag env var; registration query param auto-busts stale caches.
- Incident Triage: Review `beacon-logs/*` (local) or aggregated table (production) for spikes in errors or integrity mismatches.

## Final Notes
The Hi App codebase now aligns with Hi-OS principles: externalized deterministic boot, integrity & performance observability, progressive offline capability, and security-focused caching.
