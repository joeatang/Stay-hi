# Stay Hi Service Worker Guide

Status: Authoritative internal reference for local development and production deployment.
Last Updated: 2025-11-18

## 1. Purpose & Scope
The Service Worker (SW) can improve perceived performance and offline resilience. For current MVP stability, we intentionally run with a *disabled or controlled SW* in local development to prevent cache staleness and debug confusion. This guide defines how to:
- Safely disable or bypass the SW in local development.
- Perform deterministic cache busting.
- Roll out controlled updates without user lock-in.
- Debug hard-refresh issues, stale assets, and registration races.
- Plan future progressive enhancement for offline capability.

## 2. Quick Commands
```
# Force unregister all service workers (Chrome)
npx swctl unregister all   # (Optional helper if adopted)
# Manual dev console snippet
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
# Clear caches manually
caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
```

## 3. Local Development Strategy
| Goal | Action | Rationale |
|------|--------|-----------|
| No stale bundles | Do NOT register SW locally | Ensures every refresh hits fresh files served by python http.server.
| Easy iteration | Provide a `?nosw=1` opt-out flag when testing remote SW build | Avoids manual unregister every time.
| Explicit testing | Only enable SW in a dedicated test page (e.g. `sw-test.html`) | Containment reduces surprise caching across entire app.

### Recommended: Add Guard in SW Bootstrap
Pseudo:
```js
if (location.hostname === 'localhost' || location.search.includes('nosw=1')) {
  console.log('[SW] Skipping registration (dev opt-out)');
} else {
  // normal registration
}
```

## 4. Versioning & Cache Busting
Use a monotonically increasing build stamp (e.g. `BUILD_TS` or git commit) injected into:
- SW filename: `sw.<stamp>.js`
- Cache names: `hi-static-v<stamp>`
- Asset URL query param for critical files: `/public/lib/boot/dashboard-main.js?v=<stamp>`

When deploying:
1. Upload new SW file with new stamp.
2. Update HTML references (if using dynamic injection) OR keep a stable registration stub that imports stamped file.
3. Users receive update after next navigation; old caches purged in `activate` event.

### Activation Pattern
```js
self.addEventListener('activate', event => {
  const expected = ['hi-static-v20251118'];
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !expected.includes(k)).map(k => caches.delete(k))
    ))
  );
});
```

## 5. Registration Pattern (Production)
```js
(function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  if (location.search.includes('nosw=1')) { console.log('[SW] nosw flag active'); return; }
  navigator.serviceWorker.register('/sw.20251118.js').then(reg => {
    console.log('[SW] Registered', reg.scope);
    // Listen for updates
    reg.onupdatefound = () => {
      const nw = reg.installing;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW] Update ready - prompt refresh');
          window.dispatchEvent(new Event('hi:sw-update-available'));
        }
      });
    };
  }).catch(err => console.error('[SW] Registration failed', err));
})();
```

## 6. Update UX
When `hi:sw-update-available` fires:
1. Display unobtrusive toast: "New version ready. Refresh for latest ✨".
2. Offer button to `location.reload()`.
3. Consider auto-refresh if user idle > N seconds (future enhancement).

## 7. Debugging Checklist
| Symptom | Checks | Fix |
|---------|--------|-----|
| Asset not updating | Open DevTools > Network (Disable cache) | Unregister SW, clear caches, hard reload.
| New code not executing | Inspect Active SW script URL | Confirm version stamp changed and registration updated.
| Random 404 on offline mode | Review `fetch` handler logic | Add fallbacks for navigation requests only.
| Double registration | Search codebase for `navigator.serviceWorker.register` duplicates | Consolidate to single bootstrap script.
| Stale milestone constants | Verify stamped JS loaded (check query param) | Bust cache using updated version query.

## 8. Future Offline Roadmap
Phase | Capability | Notes
------|------------|------
1 | Basic shell caching | Cache HTML shell & critical CSS/JS; network-first for dynamic data.
2 | Optimistic Hi Moment queue | Queue writes when offline; replay on regain connectivity.
3 | Avatar caching & low-res placeholder | Serve cached avatar; lazy refresh high-res.
4 | Background sync (if allowed) | Use `sync` event or fallback interval flush.
5 | Analytics batching offline | Store events locally, flush on connectivity check.

## 9. Security Considerations
- Never cache auth tokens or sensitive RPC responses.
- Use cache partitioning by scope (avoid mixing admin assets & public).
- Validate origin when importing SW modules.
- Log version + commit hash to monitoring on `activate` to trace incidents.

## 10. Removal Procedure (Emergency Rollback)
1. Deploy empty SW that immediately calls `self.registration.unregister()`. Example:
```js
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  self.registration.unregister().then(()=> clients.matchAll().then(clis => clis.forEach(c => c.navigate(c.url))));
});
```
2. Users navigate; SW unregisters & forces fresh network load.

## 11. Local Dev TL;DR
- Do not register SW automatically on localhost.
- Use `?nosw=1` to bypass if testing remote build.
- Clear caches with snippet when uncertain.
- Keep version stamp in filenames & cache keys.

## 12. Action Items
- [ ] Add guarded registration stub file `sw-register.js`.
- [ ] Introduce build stamp injection in deployment script.
- [ ] Create lightweight toast for `hi:sw-update-available`.
- [ ] Implement emergency rollback SW in repo (`sw-rollback.js`).

---
Maintainer: hi.dev
For questions: open an internal issue titled `SW: Clarification Needed`.
