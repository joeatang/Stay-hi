# Hi Mission Control — Quick Start

- URL: `/hi-mission-control` (file: `public/hi-mission-control.html`)
- Requires: Authenticated user with admin role in `admin_roles`
- Core RPCs: `check_admin_access`, `create_admin_session`, `get_admin_dashboard_stats`, `admin_generate_invite_code`, `admin_list_invite_codes`

## 1) Grant Admin Access
Run in Supabase SQL editor (or psql) after you’ve signed in with your admin email:
- `ADMIN_GRANT_SUPERADMIN_JOE.sql` — idempotent, sets role to `super_admin` for `joeatang7@gmail.com`.
- Optional verification:
  select * from admin_roles ar join auth.users au on au.id = ar.user_id where au.email = 'joeatang7@gmail.com';
  select check_admin_access('admin', null);

### Rapid Bootstrap (Leader Path)
1. Ensure full security schema deployed: run `hi-mission-control-security.sql` (creates tables + RPCs). Safe if already applied.
2. Run `FAST_GRANT_SUPERADMIN.sql` (or `ADMIN_GRANT_SUPERADMIN_JOE.sql`) to seed your role.
3. Verify immediately: `select check_admin_access('admin', null);` should return `{"access_granted": true, ...}`.
4. (Optional) Set passcode for team unlock: `select set_admin_passcode('1234','initial beta');`.
5. Users can now unlock via modal with that passcode (grants `admin`).

### Self-Diagnostic Page
Deploy + visit: `/admin-self-check.html` (added in repo). It shows:
- Session user id/email
- Membership tier (via `get_unified_membership`)
- Raw `check_admin_access` JSON
- Next steps guidance if role missing

If this page shows `DENIED` and you just ran the grant script, confirm you signed in with **exactly** `joeatang7@gmail.com` and hard-refresh (Shift+Reload) to bypass cached anonymous state.

## 2) Access Mission Control
1. Sign in at `/signin` (magic link OK).
2. Open `/hi-mission-control`.
3. Security flow:
   - Verifies authentication and admin role via `check_admin_access`.
   - Creates a secure admin session via `create_admin_session`.
   - Loads dashboard stats.
If you see “Access Denied”, ensure your `admin_roles` row exists and is active.

## 3) Generate and Manage Codes
- Generate New Invite Code → Calls `admin_generate_invite_code` with defaults (single-use, expires in 7 days).
- View All Invitations → `admin_list_invite_codes()` returns codes and metadata.
- Active Invitations Only → Reads `invitation_codes` where active and not expired.
- Clean Expired Codes → Deactivates expired codes.
Redeeming flows are already wired in welcome/signup pages via validation and usage RPCs.

## 4) Troubleshooting
- If stats/actions don’t load: ensure `public/lib/boot/mission-control-init.js` is using `supabaseClient` (already fixed) and your DB functions are deployed.
- CSP/Headers: now single-sourced in `vercel.json`. No page-level meta CSP.
- Logging: production logs are quieted by `public/lib/boot/prod-quiet-console.js`. Use `?debug=1` or `window.enableHiLogs()` to see logs.
 - Gate modal keeps appearing: run `/admin-self-check.html` and inspect Admin Role card. If `DENIED` and email correct, re-run grant script or verify schema deployment.
 - Invite redeemed but no admin: `activate_unified_invite_code` affects membership tier, not admin role. Use passcode or grant script for admin elevation.

## 5) Optional Local Telemetry Admin
- Start server (requires `.env.local` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`):
  node scripts/telemetry-admin-server.mjs
- Open `public/admin/telemetry.html` (uses `http://localhost:5055`).
