# Hi-OS Deployment Checklist (MVP Hardened)

## 1. Supabase Settings
- Project URL & anon key available in `lib/HiSupabase.v3.js`.
- Auth > URL Configuration: Add production domain (https://stay-hi.example or actual) and ensure redirect whitelist includes:
  - https://<prod-domain>/post-auth.html (root fallback)
  - https://<prod-domain>/public/post-auth.html (primary)
  - https://<prod-domain>/signin.html
- Disable email link expiration mismatch (default TTL acceptable). Confirm OTP type is magic link.
- Email template: Link should point to `${SITE_URL}/public/post-auth.html` with query tokens intact; remove hardcoded legacy paths.

## 2. Magic Link End-to-End Test
1. Open `/signin.html` on production.
2. Request magic link; verify email arrives.
3. Click link:
   - Lands on `/public/post-auth.html` (or root fallback then redirect) with tokens.
   - JS processes session; redirects to dashboard.
4. Confirm no 404 and no console errors.

## 3. CSP & Security Headers
- Load `/hi-dashboard.html` (or `/dashboard`).
- Open DevTools console; ensure no `Content Security Policy` violations.
- If violations: update CSP in `vercel.json` (script-src/connect-src) accordingly.

## 4. Service Worker Behavior
- Confirm `sw.js` fetched (unless using `no-sw` query flag).
- Check Application > Service Workers in DevTools: registered and controlling page.
- Verify cache strategy not interfering with latest HTML (HTML has `must-revalidate`).

## 5. Redirects & Legacy Pages
- Visiting any old variant like `/signin-enhanced.html` should 301/308 to `/signin.html`.
- Non-canonical sign-in pages removed from indexability (redirects ensure this).

## 6. Fallback Integrity
- Root `post-auth.html` exists and performs query/hash passthrough redirect to `/public/post-auth.html`.
- Test by manually trimming `/public` from a magic link.

## 7. Cache Headers
- Inspect network panel:
  - HTML: `Cache-Control: public, max-age=0, must-revalidate`.
  - Static assets (in `/public/assets`): `immutable` with 3600+ seconds.
  - SW: `no-cache`.

## 8. Health Check Page
- `/health.html` loads simple OK payload + build timestamp.
- Suitable for external uptime monitors (returns 200, small size).

## 9. Error Monitoring (Optional)
- If Sentry or other monitoring integrated, confirm DSN allowed by CSP `connect-src`.

## 10. Post-Deploy Manual QA
- Login, logout flows.
- Calendar open event fires.
- Medallion rings render with updated CSS.
- Progressive auth path handling works on both direct and link-based sessions.

## 11. Version Tagging
- Tag release in git: `v1.0.0-mvp` (or chosen semantic version).
- Include short changelog referencing auth consolidation & hardened headers.

## 12. Rollback Plan
- Keep last stable build commit hash documented.
- Backups of legacy sign-in pages remain in repo but redirected.

---
Run this checklist before announcing production readiness.
