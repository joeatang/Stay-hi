# Hi-OS Release Steps (MVP → Production)

## 1. Ensure Clean Working Tree
```bash
git status
git pull origin main
```

## 2. Update Health Timestamp
```bash
node scripts/update-health-timestamp.js
```
Commit if changed:
```bash
git add public/health.html
git commit -m "chore: update health timestamp for release"
```

## 3. Tag Release
Decide version (e.g. v1.0.0-mvp):
```bash
git tag -a v1.0.0-mvp -m "Hi-OS MVP production release"
git push origin v1.0.0-mvp
```

## 4. Supabase Final Checks
- Redirect URLs list includes `/public/post-auth.html`, `/post-auth.html`, `/signin.html`.
- Email magic link template points to `/public/post-auth.html`.

## 5. Deploy (Vercel)
Trigger deployment (CI or manual). Verify build succeeded.

## 6. Functional Smoke Test
```bash
open https://<prod-domain>/signin.html
# Request magic link; click email link
# Confirm dashboard loads; check console for errors
open https://<prod-domain>/health.html
```

## 7. Security & CSP
Open DevTools on dashboard page:
- No CSP violation warnings.
- Headers present: HSTS, X-Frame-Options DENY, etc.

## 8. Legacy Redirects
Visit a deprecated URL (e.g. `/signin-enhanced.html`) → Confirm 301 to `/signin.html`.

## 9. Service Worker
Check Application tab for `sw.js` registered, controlling page (unless intentionally disabled).

## 10. Post-Release Monitoring
- Watch Supabase auth logs for anomaly spikes.
- Optional: Add uptime monitor pointing at `/health.html`.

## 11. Rollback Procedure
If issues:
```bash
git checkout <previous-stable-commit>
git push origin main
# or revert tag if necessary
```
Update redirect URLs / CSP only if necessary.

## 12. Record Changelog
Create `CHANGELOG.md` entry summarizing:
- Auth consolidation
- Security headers & CSP
- Magic link robustness
- MVP feature status

---
Follow in order; avoid skipping validation steps for initial production launch.
