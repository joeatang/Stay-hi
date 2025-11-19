# Stay Hi Changelog

## v1.1.0-unified-access (2025-11-19)
### Highlights
- Replaced legacy `progressive-auth.js` + anonymous access modal with unified AccessGate architecture.
- Added `AccessGateModal` decision router with event emissions (`hi:access-requested`, `hi:access-allowed`, `hi:access-blocked`).
- Introduced `AccessGateTelemetry.js` for request/allow/block/upgradeIntent funnel instrumentation.
- Implemented `ProfileMerge.js` to seamlessly merge anonymous demo profile edits into authenticated profile upon sign-in.
- Added `AuthShim.js` providing compatibility globals `isAuthenticated()` and `requireAuth()` backed by HiMembership + AccessGate.
- Refactored `DashboardStats.js` to remove ProgressiveAuth dependencies and use unified membership/session.
- Added `scripts/rls-audit.js` for foundational Supabase RLS/policy presence verification.
- Created `ACCESS_GATE_GUIDE.md` documenting architecture, events, migration path & troubleshooting.

### Removed / Deprecated
- Deleted `assets/progressive-auth.js` (fully superseded by AccessGate + AuthShim).
- Removed legacy `anonymous-access-modal.js` script tags from primary surfaces (dashboard, island, muscle, profile).

### Security & Reliability
- Centralized auth gating reduces inconsistent UI states and eliminates dual modal race conditions.
- RLS audit script enables automated detection of policy regressions in CI.
- Profile merge ensures no data loss between anonymous exploration and account creation.

### Telemetry
- SessionStorage counters for access funnel; ready for future export to analytics backend.

### Next (Planned)
- Performance payload audit & code-splitting heavy modules (avatar cropper, calendar).
- Offline shell + service worker caching strategy.
- Membership UI upgrade CTA unification and tier visualization enhancements.
- RLS audit integration into CI pipeline with fail-on-gap.

---
Maintained under unified auth & membership initiative.# Changelog

## v1.0.0-mvp (2025-11-18)
### Added
- Deployment hardening artifacts: `DEPLOY_CHECKLIST.md`, `RELEASE_STEPS.md`, `SUPABASE_CONFIG_CHECKLIST.md`.
- CSP runtime visibility via `public/lib/csp-report.js`.
- Health endpoint `public/health.html` plus timestamp updater script `scripts/update-health-timestamp.js`.

### Changed
- Consolidated and hardened `vercel.json` (single JSON) with security headers & CSP.
- Permanent redirects for all legacy sign-in variants to canonical `/signin.html`.
- Updated auth flow robustness (post-auth fallback already in place prior to release commit).

### Security
- Enforced strict headers: HSTS, X-Frame-Options DENY, CSP with restricted sources.

### Notes
- Magic link landing paths normalized (`/public/post-auth.html` with root fallback).
- Preflight passed locally prior to tag.

---
Earlier changes before this formal changelog were not versioned; future releases will append here.
