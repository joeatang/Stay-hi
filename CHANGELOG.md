# Changelog

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
