# Stay Hi — MVP Regression Matrix

Status: Authoritative checklist for pre-release and daily sanity runs.
Last Updated: 2025-11-19

This matrix verifies critical MVP flows across user states. Use query flags and tools to accelerate checks:
- `?authdebug=1` → Auth overlay
- `?streakdebug=1` → Streak overlay
- `?runAuthQA=1` → Auth QA harness
- `?nosw=1` → Disable SW for the session (see SERVICE_WORKER_GUIDE.md)

Pages under test:
- Dashboard: `/public/hi-dashboard.html`
- Profile: `/public/profile.html`
- Mission Control: `/public/hi-mission-control.html`
- Muscle: `/public/hi-muscle.html`

## 1) Admin Access & Mission Control
Scenario | Steps | Expect
---|---|---
Anonymous → Dashboard | Open `hi-dashboard.html?authdebug=1&runAuthQA=1` | Admin UI hidden; overlay shows anonymous; QA panel snapshots state
Admin footer link | On dashboard, footer link present (MC entry) | Click opens MC (if admin) or triggers gate
Session fast-path | Unlock once, refresh | Gate does not re-prompt (sessionStorage `hi_admin_session` is honored)
Passcode unlock | MC gate → Unlock with valid passcode | `hi:admin-confirmed` event fires; MC accessible
Invite management | In MC, generate invite, list active | Cards render; copy/share actions work
Demotion | Remove admin in DB → Refresh | Admin section hidden; MC requires re-approval

## 2) Authentication Transitions
Scenario | Steps | Expect
---|---|---
Anonymous → Sign in | Sign-in (manual) → Refresh dashboard | Auth overlay shows user id; streak UI visible; private share allowed
Token refresh | Wait/force token refresh | No duplicate `admin-confirmed`; state remains correct
Sign out | Logout → Dashboard | Streak UI hidden; share sheet restricts public (auth required)

## 3) Streaks & Milestones
Scenario | Steps | Expect
---|---|---
Centralization | Ensure `HiStreakMilestones.js` loads on Dashboard, Muscle, Profile | Single source thresholds: 3,7,15,30,50,100
Streak overlay | `?streakdebug=1` | Shows streak value, source (HiBase/UI/local), current/next milestone, remaining
Milestone toast | Cross threshold (simulate or via data) | One toast only (per-user dedupe); correct emoji/name; no duplicates on refresh
Calendar hints | Open calendar → streak visible | Badge and hint reflect current/next milestone; ARIA live region updates

## 4) Share Flow (HiShareSheet)
Scenario | Steps | Expect
---|---|---
Open sheet | Use button that triggers `openHiShareSheet` | Modal accessible; focus trap; ESC close; char count updates
Save privately | Enter text → Save | Success toast; archive saved; tracking call succeeds or retries silently
Share publicly | Enter text → Public share | Success toast; public insert with retry; map update attempts with retry
Anonymous path | Practice / Restricted modes | Practice toasts; no writes on practice; friendly error if action requires auth
Offline hint | Simulate offline (devtools) → Submit | Warning toast: will retry; no duplicate submissions
Idempotency | Trigger multiple opens/close | No duplicate listeners or double-submits (guarded by `_persisting`)

## 5) Profile Page
Scenario | Steps | Expect
---|---|---
Tier indicator | Allow membership system to resolve | Tier text + color update; admin section visible if admin
Avatar upload | Upload image | Local preview, upload to storage (HiBase or legacy), URL updates; success toast
Streak & stats | With user data | Day streak shows; `HiStreakMilestones` loaded; `?profiledebug=1` displays streak/milestones

## 6) Premium Calendar
Scenario | Steps | Expect
---|---|---
Open calendar | Header button → show | Modal visible; focus management; keyboard arrows navigate months
Remote streak | With authenticated user | Remote streak hydrates; badges/hints correct; milestone toast fires once
No duplicates | Reopen, navigate months | No extra DOM duplicates; singleton instance maintained

## 7) Service Worker (Local Safety)
Scenario | Steps | Expect
---|---|---
Local dev | Use `?nosw=1` or skip SW registration locally | No stale caching; refresh shows newest assets
Versioned prod | Verify deploy stamp use | New SW activates; caches cleaned; `hi:sw-update-available` event can trigger toast
Emergency rollback | Deploy `sw-rollback.js` when needed | SW unregisters; clients reload

## 8) Accessibility & Keyboard
Scenario | Steps | Expect
---|---|---
Share sheet | Tab/Shift+Tab within modal | Focus trapped; ESC closes; buttons have accessible names
Toasts & overlays | Trigger toasts/overlays | `role="status"` used; aria-live polite; overlays not keyboard blocking
Calendar | Arrow keys; close button | Navigable; close button labeled; live region announces month changes

## 9) Security & Permissions (Spot Check)
Area | Check | Expect
---|---|---
Supabase RPCs | Inputs validated; admin-only RPCs restricted | No public writes; errors logged in console
Admin gates | Passcode/invite elevation | Requires valid inputs; no bypass via client-only flags

## 10) Tooling
Tool | How | Expect
---|---|---
Auth QA Harness | `?runAuthQA=1` → Click Run | Logs snapshot + events; guidance for manual steps; export log
Auth Diagnostics | `?authdebug=1` | Inline overlay with state and actions
Streak Debug | `?streakdebug=1` | Panel with streak source and milestone progress

## Run Order (Fast Path)
1. Dashboard: `?runAuthQA=1&authdebug=1&streakdebug=1&nosw=1`
2. Profile: `?profiledebug=1`
3. MC: `?runAuthQA=1`
4. Muscle: open calendar, verify milestone hints/toast

## Pass Criteria
- No duplicate admin prompts after unlock (session fast-path works)
- No double toasts/milestone announcements after refresh
- Share flow resilient (retries on transient failures, no double submission)
- Accessible modals and overlays (focus, roles, escape)
- Single source of truth for milestones across pages

---
Maintainer: hi.dev
