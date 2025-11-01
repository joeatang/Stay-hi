# 🎯 KEEP_REFINE_ARCHIVE_MATRIX
*Hi Standard Protocol - Decision matrix for repo sanitation based on REPO_INVENTORY_REPORT.md*

---

## DECISION RULES APPLIED

- **KEEP**: Reachable pages + mission-critical dependencies
- **REFINE → /ui**: Shared visual components used by multiple pages  
- **REFINE → /lib**: Shared logic/utilities used by multiple pages
- **ARCHIVE**: Orphaned test/debug/backup files (→ /archive/2025-11-01/)
- **HOLD**: Ambiguous/overlapping systems requiring canonicality review

---

## DECISION MATRIX

| File/Folder | Used By | Decision | Why | Risk if Wrong | Rollback Plan |
|-------------|---------|----------|-----|---------------|---------------|
| **REACHABLE PAGES (All KEEP)** |
| `welcome.html` | Entry point | KEEP | Core MVP entry point | App breaks completely | Git revert |
| `hi-dashboard.html` | Main interface | KEEP | Primary user interface | Dashboard unusable | Git revert |
| `hi-island-NEW.html` | Community hub | KEEP | Active HiIsland version | Community features break | Git revert |
| `hi-muscle.html` | Fitness tracking | KEEP | HiGym functionality | Fitness features break | Git revert |
| `profile.html` | User management | KEEP | Profile management | User settings break | Git revert |
| `signin.html` | Auth portal | KEEP | Authentication entry | Users cannot login | Git revert |
| `signup.html` | Registration | KEEP | User registration | New users cannot join | Git revert |
| `index.html` | Flow router | KEEP | Magic link handler + routing | Auth flow breaks | Git revert |
| `post-auth.html` | Auth completion | KEEP | Post-auth processor | Magic links fail | Git revert |
| `hi-mission-control.html` | Admin panel | KEEP | Admin functionality | Admin features break | Git revert |
| **EXTERNAL DEPENDENCIES (All KEEP)** |
| `@supabase/supabase-js` | ALL pages | KEEP | Core database connection | App completely broken | Restore CDN link |
| `leaflet@1.9.4` | hi-island-NEW | KEEP | Map functionality | Maps break | Restore CDN link |
| **SHARED UI/UX COMPONENTS (REFINE → /ui)** |
| `assets/premium-ux.css` | Multiple pages | REFINE → /ui | Shared primary theme | Visual consistency breaks | Move back to assets/ |
| `assets/theme.css` | ALL pages | REFINE → /ui | Brand foundation | Brand breaks globally | Move back to assets/ |
| `assets/create-parity.css` | Multiple pages | REFINE → /ui | Form consistency | Forms look inconsistent | Move back to assets/ |
| `assets/premium-footer.css` | Multiple pages | REFINE → /ui | Navigation footer | Footer breaks | Move back to assets/ |
| `assets/premium-calendar.css` | Multiple pages | REFINE → /ui | Calendar component | Calendar UI breaks | Move back to assets/ |
| `assets/hi-loading-experience.css` | welcome | REFINE → /ui | Loading animations | Loading states break | Move back to assets/ |
| `assets/tesla-mobile-fixes.css` | Multiple pages | REFINE → /ui | Mobile optimization | Mobile UX degrades | Move back to assets/ |
| `assets/tesla-edge-protection.css` | welcome | REFINE → /ui | Edge case fixes | Edge cases resurface | Move back to assets/ |
| `styles/modal-base.css` | Multiple pages | REFINE → /ui | Modal foundation | Modals break | Move back to styles/ |
| `styles/tokens.css` | hi-island-NEW | KEEP | Design tokens (global, not /ui) | Design inconsistency | Git revert |
| `styles/base.css` | hi-island-NEW | REFINE → /ui | Base styling | Styling foundation breaks | Move back to styles/ |
| **SHARED LOGIC/UTILITIES (REFINE → /lib)** |
| `assets/supabase-init.js` | Multiple pages | REFINE → /lib | DB connection utility | Database fails globally | Move back to assets/ |
| `assets/unified-membership-system.js` | Multiple pages | REFINE → /lib | Access control logic | Access control breaks | Move back to assets/ |
| `assets/hi-unified-global-stats.js` | Multiple pages | REFINE → /lib | Live stats system | Stats system breaks | Move back to assets/ |
| `assets/db.js` | Multiple pages | REFINE → /lib | Database interface | DB operations fail | Move back to assets/ |
| `assets/anonymous-access-modal.js` | Multiple pages | HOLD | Split into /ui/HiAnonymousAccessModal + /lib/anonymous_access | Anonymous access breaks | Full system test |
| `assets/tesla-data-isolation.js` | Multiple pages | REFINE → /lib | Privacy protection | Privacy compliance fails | Move back to assets/ |
| `assets/performance-manager.js` | Multiple pages | REFINE → /lib | Optimization utility | Performance degrades | Move back to assets/ |
| `assets/pwa-manager.js` | Multiple pages | REFINE → /lib | PWA functionality | PWA features break | Move back to assets/ |
| `assets/hi-flow-controller.js` | Multiple pages | REFINE → /lib | Tesla routing brain | Routing completely breaks | Move back to assets/ |
| **CORE SYSTEM FILES (KEEP)** |
| `manifest.json` | ALL pages | KEEP | PWA config (do not rename) | PWA installation breaks | Git revert |
| `sw.js` | ALL pages | KEEP | Service worker (do not rename) | Offline functionality breaks | Git revert |
| `assets/progressive-auth.js` | hi-dashboard | KEEP | Gradual auth system | Dashboard auth breaks | Git revert |
| `assets/url-path-fixer.js` | Multiple pages | KEEP | Path correction utility | URL handling breaks | Git revert |
| **FEATURE-SPECIFIC COMPONENTS (KEEP)** |
| `assets/hi-gym.js` | hi-muscle | KEEP | Fitness tracking core | HiGym completely breaks | Git revert |
| `assets/geocoding-service.js` | hi-muscle | KEEP | Location services | Location features break | Git revert |
| `assets/emotions.js` | hi-muscle | KEEP | Emotion tracking | Emotion logging breaks | Git revert |
| `assets/header.js` | hi-muscle | KEEP | Page header component | Page header breaks | Git revert |
| `assets/premium-ux.js` | hi-muscle | REFINE → /lib | Cross-cutting helper (defer move) | UX enhancements break | Move back to assets/ |
| `assets/hi-loading-experience.js` | welcome | KEEP | Loading states | Loading experience breaks | Git revert |
| `assets/onboarding.js` | hi-dashboard | KEEP | User onboarding | Onboarding flow breaks | Git revert |
| **PROFILE STACK (KEEP until regression test)** |
| `assets/avatar-utils.js` | profile | KEEP | Avatar handling | Avatar system breaks | Git revert |
| `assets/location-picker.js` | profile | KEEP | Location selection | Location picker breaks | Git revert |
| `assets/location-picker.css` | profile | KEEP | Location UI | Location UI breaks | Git revert |
| `assets/image-optimizer.js` | profile | KEEP | Image processing | Image upload breaks | Git revert |
| `assets/social-avatar-uploader.js` | profile | KEEP | Avatar upload | Avatar upload breaks | Git revert |
| `assets/premium-calendar.js` | profile | KEEP | Calendar functionality | Calendar breaks | Git revert |
| `assets/premium-stats.css` | profile | KEEP | Profile stats styling | Profile stats break | Git revert |
| **ACCESS & ONBOARDING (KEEP)** |
| `assets/hi-access-tiers.js` | welcome | KEEP | Membership tiers | Access control breaks | Git revert |
| `assets/hi-anonymous-onboarding.js` | welcome | KEEP | Progressive signup | Anonymous flow breaks | Git revert |
| **COMPONENTS DIRECTORY (REFINE → /ui)** |
| `components/hi-share-sheet/` | Multiple pages | REFINE → /ui | Shared component | Share functionality breaks | Move back to components/ |
| `components/hi-island-map/` | hi-island-NEW | REFINE → /ui | Map component | Map functionality breaks | Move back to components/ |
| `components/hi-island-feed/` | hi-island-NEW | REFINE → /ui | Feed component | Feed functionality breaks | Move back to components/ |
| `components/profile-preview-modal/` | hi-island-NEW | REFINE → /ui | Profile modal | Profile previews break | Move back to components/ |
| **REWARDS SYSTEM (KEEP)** |
| `assets/hi-rewards-styles.css` | hi-island-NEW | REFINE → /ui | Rewards UI styling (defer move) | Rewards UI breaks | Move back to assets/ |
| **OVERLAPPING SYSTEMS (HOLD for canonicality review)** |
| `assets/auth.js` | hi-muscle | HOLD | Legacy auth vs progressive-auth | Unknown auth dependencies | Full system test |
| `assets/tesla-auth-controller.js` | index | HOLD | Magic link auth overlap | Auth flow confusion | Full system test |
| `assets/real-time-stats.js` | None found | HOLD | Superseded by unified stats? | Stats system conflicts | Verify no dependencies |
| `assets/global-stats.js` | None found | HOLD | Replaced by hi-unified-global-stats? | Stats duplication | Verify replacement complete |
| **ARCHIVE CANDIDATES - Test/Debug Pages** |
| `regression-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `live-auth-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `redirect-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `anti-glitch-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `minimal-auth-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `auth-guard-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `avatar-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `test-share.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `incognito-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `crop-modal-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `tesla-access-testing.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| `critical-fix-test.html` | None | ARCHIVE | Test file | Development workflow impact | Keep in archive/ |
| **ARCHIVE CANDIDATES - Backup/Legacy** |
| `hi-island-OLD-*.html` (all) | None | ARCHIVE | Superseded by hi-island-NEW | Legacy code confusion | Keep in archive/ |
| `signin-fixed.html` | None | ARCHIVE | Backup version | Version confusion | Keep in archive/ |
| `post-auth-backup.html` | None | ARCHIVE | Backup version | Version confusion | Keep in archive/ |
| `archived-medallion-pages/` | None | ARCHIVE | Legacy directory | Legacy code confusion | Keep in archive/ |
| **ARCHIVE CANDIDATES - Unused Assets** |
| `assets/auth-test-framework.js` | None | ARCHIVE | Test utility | Development workflow impact | Keep in archive/ |
| `assets/bypass-auth-guard.js` | None | ARCHIVE | Debug utility | Security risk if active | Keep in archive/ |
| `assets/demo-auth.js` | None | ARCHIVE | Demo utility | Demo confusion | Keep in archive/ |
| `assets/system-demo.js` | None | ARCHIVE | Demo utility | Demo confusion | Keep in archive/ |
| `assets/profile-debug-cleaner.js` | None | ARCHIVE | Debug utility | Development workflow impact | Keep in archive/ |
| `assets/launch-validator.js` | None | ARCHIVE | Validation utility | Development workflow impact | Keep in archive/ |

---

**SUMMARY COUNTS**
- **KEEP**: 35 files (pages + critical dependencies + PWA + feature-specific)
- **REFINE → /ui**: 15 files (shared visual components)
- **REFINE → /lib**: 8 files (shared logic utilities)
- **HOLD**: 4 files (overlapping systems need canonicality review)
- **ARCHIVE**: 60+ files (test/debug/backup/legacy)

---

*Matrix generated per Hi Standard Dev Protocol with risk assessment and rollback planning*