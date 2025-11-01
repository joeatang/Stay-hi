# 🎯 REPO INVENTORY REPORT
*Hi Standard Protocol - Factual dependency mapping of Stay Hi codebase*

---

## A. REACHABLE PAGES
*Pages accessible from current navigation flows*

1. **welcome.html** - Entry point (Vercel root redirect)
2. **hi-dashboard.html** - Main dashboard (medallion interface)
3. **hi-island-NEW.html** - Community hub (HiIsland)
4. **hi-muscle.html** - Fitness tracking (HiGym) 
5. **profile.html** - User profile management
6. **signin.html** - Authentication portal
7. **signup.html** - Registration portal
8. **index.html** - Flow router/magic link handler
9. **post-auth.html** - Post-authentication processor
10. **hi-mission-control.html** - Admin panel (conditional)

---

## B. DEPENDENCY TABLE

| File/Folder | Used By (page) | Type | First Seen In | Still Referenced? | Notes |
|-------------|---------------|------|---------------|-------------------|-------|
| **External Dependencies** |
| `@supabase/supabase-js` | ALL pages | util | welcome.html | yes | CDN: v2.45.1 |
| `leaflet@1.9.4` | hi-island-NEW | component | hi-island-NEW.html | yes | Map library + cluster |
| **Core System Files** |
| `assets/supabase-init.js` | welcome, hi-dashboard, hi-muscle, profile | util | welcome.html | yes | DB connection |
| `assets/hi-flow-controller.js` | welcome, index | util | welcome.html | yes | Tesla routing brain |
| `assets/unified-membership-system.js` | welcome, hi-dashboard | util | welcome.html | yes | Access control |
| `assets/hi-unified-global-stats.js` | welcome, hi-dashboard | util | welcome.html | yes | Live stats |
| `assets/db.js` | welcome, hi-dashboard, hi-muscle | util | welcome.html | yes | Database interface |
| **Authentication Stack** |
| `assets/progressive-auth.js` | hi-dashboard | util | hi-dashboard.html | yes | Gradual auth |
| `assets/anonymous-access-modal.js` | hi-dashboard, hi-island-NEW, hi-muscle, profile | component | hi-dashboard.html | yes | Anonymous access |
| `assets/tesla-auth-controller.js` | index | util | index.html | yes | Magic link auth |
| `assets/tesla-data-isolation.js` | welcome, profile | util | welcome.html | yes | Privacy protection |
| `assets/auth.js` | hi-muscle | util | hi-muscle.html | yes | Legacy auth |
| **UI/UX System** |
| `assets/premium-ux.css` | ALL pages except signin/signup | style | hi-dashboard.html | yes | Primary theme |
| `assets/theme.css` | ALL pages | style | welcome.html | yes | Brand foundation |
| `assets/create-parity.css` | welcome, hi-island-NEW, hi-muscle, signin, signup | style | welcome.html | yes | Form consistency |
| `assets/premium-footer.css` | hi-dashboard, hi-island-NEW, hi-muscle | style | hi-dashboard.html | yes | Navigation footer |
| `assets/premium-calendar.css` | hi-dashboard, hi-island-NEW, profile | style | hi-dashboard.html | yes | Calendar component |
| `assets/premium-stats.css` | profile | style | profile.html | yes | Profile stats |
| **Loading & Performance** |
| `assets/hi-loading-experience.js` | welcome | component | welcome.html | yes | Loading states |
| `assets/hi-loading-experience.css` | welcome | style | welcome.html | yes | Loading animations |
| `assets/performance-manager.js` | hi-dashboard, profile | util | hi-dashboard.html | yes | Optimization |
| `assets/url-path-fixer.js` | hi-dashboard, hi-muscle | util | hi-dashboard.html | yes | Path correction |
| **Feature Components** |
| `assets/hi-gym.js` | hi-muscle | component | hi-muscle.html | yes | Fitness tracking |
| `assets/geocoding-service.js` | hi-muscle | util | hi-muscle.html | yes | Location services |
| `assets/emotions.js` | hi-muscle | component | hi-muscle.html | yes | Emotion tracking |
| `assets/header.js` | hi-muscle | component | hi-muscle.html | yes | Page header |
| `assets/premium-ux.js` | hi-muscle | util | hi-muscle.html | yes | Enhanced UX |
| **PWA System** |
| `assets/pwa-manager.js` | welcome, hi-island-NEW | util | welcome.html | yes | App installation |
| `manifest.json` | ALL pages | asset | welcome.html | yes | PWA config |
| `sw.js` | ALL pages | util | manifest.json | yes | Service worker |
| **Profile & Media** |
| `assets/avatar-utils.js` | profile | util | profile.html | yes | Avatar handling |
| `assets/location-picker.js` | profile | component | profile.html | yes | Location selection |
| `assets/location-picker.css` | profile | style | profile.html | yes | Location UI |
| `assets/image-optimizer.js` | profile | util | profile.html | yes | Image processing |
| `assets/social-avatar-uploader.js` | profile | component | profile.html | yes | Avatar upload |
| `assets/premium-calendar.js` | profile | component | profile.html | yes | Calendar functionality |
| `assets/tesla-mobile-fixes.css` | welcome, profile | style | welcome.html | yes | Mobile optimization |
| **Onboarding & Access** |
| `assets/hi-access-tiers.js` | welcome | util | welcome.html | yes | Membership tiers |
| `assets/hi-anonymous-onboarding.js` | welcome | component | welcome.html | yes | Progressive signup |
| `assets/onboarding.js` | hi-dashboard | component | hi-dashboard.html | yes | User onboarding |
| `assets/tesla-edge-protection.css` | welcome | style | welcome.html | yes | Edge case fixes |
| **Base Styles** |
| `styles/modal-base.css` | hi-dashboard, hi-muscle | style | hi-dashboard.html | yes | Modal foundation |
| `styles/tokens.css` | hi-island-NEW | style | hi-island-NEW.html | yes | Design tokens |
| `styles/base.css` | hi-island-NEW | style | hi-island-NEW.html | yes | Base styling |
| **Components Directory** |
| `components/hi-share-sheet/` | hi-dashboard, hi-island-NEW, hi-muscle | component | hi-dashboard.html | yes | Share functionality |
| `components/hi-island-map/` | hi-island-NEW | component | hi-island-NEW.html | yes | Interactive map |
| `components/hi-island-feed/` | hi-island-NEW | component | hi-island-NEW.html | yes | Social feed |
| `components/profile-preview-modal/` | hi-island-NEW | component | hi-island-NEW.html | yes | Profile modals |
| **Rewards & Analytics** |
| `assets/hi-rewards-styles.css` | hi-island-NEW | style | hi-island-NEW.html | yes | Rewards UI |

---

## C. ORPHANED ITEMS
*Files not referenced by any reachable page*

### Test/Debug Pages (60+ files)
- `regression-test.html`, `live-auth-test.html`, `redirect-test.html`
- `anti-glitch-test.html`, `minimal-auth-test.html`, `auth-guard-test.html`
- `avatar-test.html`, `test-share.html`, `incognito-test.html`
- `crop-modal-test.html`, `tesla-access-testing.html`, `critical-fix-test.html`
- `tesla-crop-test.html`, `tesla-auth-test.html`, `user-journey-test.html`
- [55+ additional test files...]

### Backup/Legacy Pages
- `hi-island-OLD-*.html` (multiple backup versions)
- `signin-fixed.html`, `post-auth-backup.html`
- `index-*.html` (alternative index versions)
- `archived-medallion-pages/` directory (entire folder)

### Unused Assets
- `assets/auth-test-framework.js`, `assets/bypass-auth-guard.js`
- `assets/demo-auth.js`, `assets/system-demo.js`
- `assets/profile-debug-cleaner.js`, `assets/launch-validator.js`
- `assets/real-time-stats.js` (superseded by unified system)
- `assets/global-stats.js` (replaced by hi-unified-global-stats.js)

### Documentation & Build Files
- `fixes-verification.html`, `nav-test.html`, `path-debug.html`
- Multiple `.md` files (deployment guides, audits, etc.)
- Shell scripts (`*.sh` files)

---

*Inventory completed per Hi Standard Dev Protocol with triple verification*