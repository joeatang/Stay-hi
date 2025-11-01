# Rollback: PR #4 / PR #4b - UI Token Wiring

Date: 2025-11-01

Summary
-------
This rollback reverts UI-only changes introduced in PR #4 / PR #4b that caused widespread visual regressions during Test 5 verification.

What was rolled back
--------------------
- All files under `/ui/*` reverted to the `phase3-ui-base` tag.
- Page files reverted (from `public/`) to their versions in `phase3-ui-base`:
  - `public/hi-dashboard.html`
  - `public/hi-island-NEW.html`
  - `public/hi-muscle.html`
  - `public/profile.html`
  - `public/welcome.html`
  - `public/index.html`
  - `public/post-auth.html`
  - `public/signin.html`
  - `public/signup.html`
  - `public/hi-mission-control.html`

What was preserved
------------------
- `/lib/*` was NOT changed and remains as-is (per rollback instructions).
- `styles/tokens.css` is kept in the repository so the design tokens remain available for future gradual adoption.
- `ui/DESIGN_TOKENS.md` retained for documentation and future token mapping work.
- Tags preserved on the repo: `phase3-ui-base`, `phase3-lib-base`, and `phase3-style-guardrails-fix`.

Why
---
After PR #4/#4b we observed multiple visual regressions: missing glassmorphism effects, broken modal/share sheet behavior, and JS color lookup errors. These changes regressed user-facing UI and blocked final verification. This rollback freezes the UI at the stable `phase3-ui-base` while allowing tokens and documentation to persist for a safer, staged adoption later.

Next steps
----------
1. Run cross-browser QA on the rolled-back UI pages and confirm console shows zero errors.
2. Create a plan to reintroduce token wiring incrementally, starting with non-critical components and adding automated visual regression tests.
3. Reattempt PR #4b changes behind a feature flag and include visual diffing in CI.

Author: repo automation (performed per user request)
