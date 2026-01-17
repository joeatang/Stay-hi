# 📋 Hi-OS TODO — January 2026

> **Started:** January 13, 2026  
> **Status:** Active  
> **Rollover:** Incomplete items move to `TODO_FEB2026.md` at month end

---

## 🎯 Active Tasks (Prioritized)

### 🔴 P0 — IN PROGRESS (Hi Pulse Update v1.1.0) 🆕 *Started 2026-01-17*

**Branch:** `feature/hi-pulse-v1.1.0`  
**Goal:** Simplify UX, unify share entry points, reduce user confusion

#### Core Changes
- [ ] **#0a Hi Pulse Page** — NEW dedicated analytics page
  - [ ] Create `hi-pulse.html` with ticker, stats, personal journey
  - [ ] Move Hi Index stats from dashboard to Hi Pulse
  - [ ] Add scrolling ticker with configurable messages
  - [ ] Global stats + Personal stats + Trends (Gold+)
  
- [ ] **#0b Dashboard Simplification**
  - [ ] Remove heavy stats (moved to Hi Pulse)
  - [ ] Add warm branding: "Say Hi to You."
  - [ ] Add guidance text: "one tap starts your day"
  - [ ] 7-day pill + Medallion + Streak + Hiffirmation only
  
- [ ] **#0c Medallion Redesign**
  - [ ] First tap = Daily check-in (+5 pts animation) + wave count
  - [ ] Subsequent taps = Wave counts + accumulate tap points
  - [ ] Long-press (800ms) = "Weapon select" menu
    - [ ] Option 1: "Share a Hi" → Standard HiShareSheet
    - [ ] Option 2: "Mind Gym" → Navigate to hi-muscle.html
  - [ ] Elegant toast system for feedback
  
- [ ] **#0d Footer Update**
  - [ ] Replace "Hi Gym" with "Hi Pulse" 
  - [ ] Update HiFooter.js tabs array
  
- [ ] **#0e Hi Island Cleanup**
  - [ ] Remove "Drop a Hi" button
  - [ ] Remove "Try it" button
  - [ ] Keep map + feed + reactions
  
- [ ] **#0f Navigation Updates**
  - [ ] Update hamburger menus (dashboard, island, profile)
  - [ ] Update HiHeader.js dropdown
  - [ ] Update HiStandardNavigation.js

#### New Components to Build
- [ ] `HiTicker.js` + `HiTicker.css` — Bloomberg-style scrolling ticker
- [ ] `ticker-config.json` — Editable ticker messages
- [ ] `HiToast.js` + `HiToast.css` — Elegant notification toasts
- [ ] `HiPointsAnimation.js` — Floating +5 animation
- [ ] `HiMedallionMenu.js` + `.css` — Long-press "weapon select" UI

#### Admin Panel (Mission Control)
- [ ] Add "Content Management" section
- [ ] Ticker message editor (CRUD)
- [ ] Export/Import JSON

#### QA Checklist (Before Merge)
- [ ] Test on iPhone SE (320px)
- [ ] Test on iPhone 14 Pro
- [ ] Test on Android Chrome
- [ ] Test all user flows (new + returning)
- [ ] Test anonymous user experience
- [ ] Verify no data loss

---

### 🟠 P1 — Previous Hi Index Work (SUPERSEDED by Hi Pulse)

- [x] **#1 Hi Index Dashboard** — ✅ DEPLOYED 2026-01-15 → Moving to Hi Pulse
  - Community Hi Index (global stats) ✅
  - Personal Hi Index with streak multiplier ✅
  - Tier-gated (free = community only, paid = personal stats) ✅
  - Modal with chart + streak bonus section ✅

### 🟠 P2 — User-Facing Polish

- [ ] **#2 Hi Island user profiles** — Finish profile showcase with bio, info display. Started but not completed. *Most visible incomplete feature.*
- [ ] **#3 Social Links in Bio** — Add Instagram/Twitter/TikTok handles to profiles. Low effort, high value. (~1-2 days)

### 🟡 P3 — Mission Control Admin Fixes

- [ ] **#4 Fix User Statistics button** — Create `get_admin_user_stats()` RPC with SECURITY DEFINER
- [ ] **#5 Fix Recent Signups button** — Create `get_admin_recent_signups()` RPC (same pattern)
- [ ] **#6 Improve Membership Analytics formatting** — Better UI display instead of raw JSON

### 🟢 P4 — Points Redemption (Hi Wall)

- [ ] **#7 Hi Wall / Hi Notes** — Users spend Hi Points to leave encouraging notes. Points system deployed, redemption table ready. (~2-3 days)

### 🔵 P5 — Growth Features

- [ ] **#8 Push Notifications** — Connect sw.js listener to backend. Web push first. (~3-5 days)
- [ ] **#9 Google OAuth** — Supabase config + frontend buttons. (~1-2 days)
- [ ] **#10 Apple OAuth** — Requires Apple Dev account. Prep for App Store. (~1-2 days)

### ⚫ P6 — App Store Prep 🆕 *Expanded 2026-01-15*

- [ ] **#11 Capacitor wrapper** — PWA → native iOS/Android. (~2-4 weeks)
- [ ] **#12 App Store submission** — iOS first (harder = fix issues early)
- [ ] **#17 App Store Deployment Plan** 🆕
  - [ ] Document full iOS App Store submission process
  - [ ] Document full Google Play submission process
  - [ ] Create app icons (all required sizes)
  - [ ] Write App Store descriptions + screenshots
  - [ ] Understand TestFlight beta testing workflow
  
- [ ] **#18 Post-Launch Update Strategy** 🆕 *Education needed*
  - [ ] Learn how iOS/Android app updates work after publish
  - [ ] Understand review times for updates
  - [ ] Document "how to push bug fixes to live app"
  - [ ] PWA fallback strategy (web updates instant, app updates delayed)
  - [ ] Version numbering strategy (semantic versioning)

### ⚪ P7 — Future / Research (Lowest Priority)

- [ ] **#13 AI Companion Bot** — Daily encouragement posts. High complexity.
- [ ] **#14 Hi Gym emotion search** — Fuzzy matching, AI suggestions.
- [ ] **#15 User Analytics Dashboard** — `/hi-insights.html` with charts.
- [ ] **#16 Trac Network exploration** — Evaluate P2P integration for Hi Wall or content proofs. See [TRAC_NETWORK_COMPATIBILITY_AUDIT.md](TRAC_NETWORK_COMPATIBILITY_AUDIT.md). *Wait for Mainnet or hybrid approach. LAST PRIORITY.*

---

### ✅ Recently Completed

- [x] ~~**#0 Share Submission Bug**~~ — ✅ FIXED (2026-01-15). Anonymous shares now truly anonymous.
  - **Root cause:** RPC COALESCE bug — `v_user_id := COALESCE(p_user_id, auth.uid())` made anonymous shares get real user_id
  - **Fixes deployed:** `FIX_ANONYMOUS_SHARE_RPC.sql` (RPC now respects NULL), `CLEANUP_FALSELY_ATTRIBUTED_ANON_SHARES.sql` (7 historical shares fixed)
  - **JS updated:** `HiShareSheet.js` now checks `result.ok` after archive/public share operations
  - **Diagnostic:** `DIAGNOSTIC_SHARE_SUBMISSION_BUG.sql` created for future debugging
  - **Architecture verified:** hi_archives (private) separate from public_shares (public/anonymous) — private records unaffected
- [x] ~~**Diagnose dual modal issue**~~ — ✅ FIXED (2026-01-14). EmergencyRecovery.js now skips auth pages.
- [x] ~~**Free account signup on welcome page**~~ — ✅ COMPLETE (2026-01-14)
- [x] ~~**Welcome page logo + floating nav cleanup**~~ — ✅ COMPLETE (2026-01-14)
- [x] ~~**Hi Points System**~~ — ✅ DEPLOYED (2026-01-14). Tier multipliers, daily caps, all RPCs live.

#### 📋 Free Signup Implementation Checklist — ✅ ALL COMPLETE

| Step | File | Status | Notes |
|------|------|--------|-------|
| 1. Deploy RPC | `DEPLOY_FREE_MEMBERSHIP_RPC.sql` | ✅ | Deployed 2026-01-13 |
| 2. Add free signup handler | `signup-init.js` | ✅ | Calls `create_free_membership()` when no invite code |
| 3. Update welcome page | `welcome.html` | ✅ | Removed anonymous, added "Sign Up Free" as primary CTA |
| 4. Remove invite requirement | `signup.html` | ✅ | Invite field now optional |
| 5. Test free signup | Manual test | ✅ | Verified in Supabase |

**Architecture verified:** Zero schema changes. `user_memberships` table unchanged. Existing users unaffected.

### � Backlog (Unscheduled)
- [ ] Bulk invite code generation UI
- [ ] User search in Mission Control
- [ ] Tier upgrade/downgrade UI in Mission Control
- [ ] **Audit Security Events RLS** — Ensure admin_access_logs is accessible
- [ ] **Remove unused medallion CSS from welcome.html** — `HiMedallion.css`, `medallion-curiosity-system.css/js` still loading
- [ ] **Clean up broken module files** — `welcome-referral.mjs`, `welcome-medallion.mjs`, `welcome-flags-wait.mjs`
---

## ✅ Completed

| Task | Completed | Notes |
|------|-----------|-------|
| Profile check-in button fix | 2026-01-13 | Removed duplicate handlers, fixed balance property |
| Mission Control added to Hi Code Map | 2026-01-13 | Full architecture docs |
| Grant degenmentality admin access | 2026-01-13 | SQL executed in Supabase |
| Create TODO tracker | 2026-01-13 | This file |
| **Free signup implementation** | 2026-01-14 | RPC + signup.html + welcome.html updated |
| **Welcome page simplification** | 2026-01-14 | Removed anonymous mode, 2 clear CTAs |
| **Disable broken welcome scripts** | 2026-01-14 | medallion, referral, flags-wait commented out |

---

## 📋 Audit Results (2026-01-13)

### ✅ 5-Year Points/Streaks/Milestones — CONFIRMED SAFE

The progression system in `hi-rewards-beta.js` is designed for 5+ years:
- **Levels 1-50:** Beginner (1-10 His/level) — Months 1-6
- **Levels 51-150:** Intermediate (10-25 His/level) — Year 1-2
- **Levels 151-300:** Advanced (25-50 His/level) — Year 2-3
- **Levels 301-500:** Expert (50-100 His/level) — Year 3-4
- **Levels 501-750:** Master (100-200 His/level) — Year 4-5
- **Levels 751-1000+:** Legend (200+ His/level) — Year 5+

**No hard caps.** Database uses standard INTEGER types which support billions.

### ⚠️ Dual Modal Issue (Screenshot)

Two systems triggered simultaneously:
1. **Update Available** (`HiPWA.js` line 219) — Service worker detected new version
2. **App Recovery Mode** (`EmergencyRecovery.js` line 112) — Freeze detection triggered

**Root cause:** Both systems likely fired during PWA update/reload cycle. Need to add coordination between them.

### 📜 Invite Code Expiration Flow

When an invite code expires for an existing member:
1. **Code expiration ≠ Membership expiration** — They're separate
2. **Membership continues** until `expires_at` in `user_memberships`
3. **When membership expires:**
   - User shown "Trial Expired" modal with options
   - Auto-downgrade to `anonymous` tier after 5s
   - User can: Upgrade (pay) OR sign out
4. **Re-access options:**
   - New invite code from admin
   - Purchase tier package
   - User account + data remains intact (just tier changes)

---

## � STRATEGIC FEATURE ROADMAP (Added Jan 14, 2026)

### 1️⃣ Social Login (OAuth Providers)
**Status:** 📋 Research Phase  
**Complexity:** Medium  
**What it entails:**
- Supabase natively supports: Google, Apple, Facebook, Twitter/X, Discord, GitHub
- **Implementation:** Enable providers in Supabase Dashboard → Auth → Providers
- **Frontend changes:** Add OAuth buttons to signup/signin pages, handle redirects
- **Database:** No schema changes (auth.users handles it)
- **Apple requirement:** Requires Apple Developer account ($99/year) - NEEDED for App Store anyway
- **Google:** Free, requires Google Cloud Console project
- **Timeline:** ~1-2 days per provider
- **Recommendation:** Start with Google + Apple (most users). Add X/Twitter for brand alignment.

### 2️⃣ App Store Submission (iOS + Android)
**Status:** 📋 Planning Phase  
**Complexity:** High  
**What it entails:**
- **PWA → Native wrapper** options:
  - **Capacitor** (Ionic) - Recommended, wraps existing web app
  - **PWABuilder** - Microsoft tool, simplest for basic PWA
  - **React Native** - Full rewrite, not recommended
- **iOS Requirements:**
  - Apple Developer Account ($99/year)
  - App Store Connect setup
  - App Review Guidelines compliance (wellness apps have scrutiny)
  - Privacy Nutrition Labels
  - 1024x1024 app icon, screenshots for all device sizes
- **Android Requirements:**
  - Google Play Developer Account ($25 one-time)
  - Privacy Policy URL
  - Content rating questionnaire
  - APK/AAB signing
- **Current state:** Hi-OS is already a PWA with manifest.json, sw.js, icons
- **Timeline:** 2-4 weeks for submission-ready build
- **Recommendation:** Use Capacitor to wrap existing PWA. Start with iOS (harder approval = fix issues early).

### 3️⃣ Social Media Links in Bio
**Status:** 📋 Design Phase  
**Complexity:** Low  
**What it entails:**
- **Database:** Add columns to `profiles` table: `instagram_handle`, `twitter_handle`, `tiktok_handle`, `website_url`
- **Frontend:** Profile edit form with icon-prefixed inputs
- **Display:** Profile modal shows clickable social icons
- **Privacy:** User controls which links are public
- **Validation:** Basic URL/handle validation, no tracking pixels
- **Timeline:** 1-2 days
- **Existing foundation:** `profiles` table has `website` column already

### 4️⃣ Push Notifications (Sound + Haptics)
**Status:** ⚙️ Partial Infrastructure  
**Complexity:** Medium-High  
**Current state:**
- ✅ Service worker exists (`sw.js`) with push notification listener (lines 304-330)
- ✅ Notification click handler implemented
- ✅ `navigator.vibrate()` already used in `dashboard-main.js` (lines 132, 146)
- ❌ Not connected to backend push service
**What's needed:**
- **Web Push:** Supabase Edge Functions or external service (OneSignal, Firebase FCM)
- **Native Push:** Requires Capacitor wrapper + native push plugins
- **Triggers:** Define when to notify (check-in reminders, streak risk, community activity)
- **User prefs:** Notification settings UI
- **Timeline:** 3-5 days for web push, additional 2-3 days for native
- **Recommendation:** Implement web push first, then native when wrapping for app stores.

### 5️⃣ Hi Wall / Hi Notes (Points Redemption Feature)
**Status:** 🎨 Design Approved  
**Complexity:** Medium  
**Concept:** Users spend Hi Points to leave encouraging notes on a public wall
**What it entails:**
- **New table:** `hi_wall_notes` (user_id, message, points_spent, created_at)
- **Cost:** 10-50 points per note (encourages earning before posting)
- **Display:** Feed-like display on dedicated page or profile section
- **Moderation:** Optional word filter, report button
- **Anti-spam:** Points cost = natural rate limiting
- **Name options:** "Hi Wall", "Hi Notes", "Hi Vibes", "The Wall"
- **Timeline:** 2-3 days
- **Fits with:** Points system just deployed, redemption table ready

### 6️⃣ AI Companion Bot (Daily Hi Notes)
**Status:** 🧪 Experimental  
**Complexity:** High  
**What it entails:**
- **Separate admin account:** Create bot user with special tier (e.g., `bot` tier)
- **Scheduler:** Cron job or Supabase Edge Function runs daily
- **Content generation:**
  - Option A: Pre-written messages rotated
  - Option B: OpenAI/Anthropic API generates contextual messages
  - Option C: Hybrid (templates + AI fills in)
- **Character system:** Define bot persona, voice, emoji usage
- **Backend tool:** Admin dashboard to preview/approve messages before posting
- **Database:** Bot posts to `public_shares` with `origin: 'ai-companion'`
- **Timeline:** 1 week for basic version, ongoing for AI integration
- **Consideration:** Keep bot posts visually distinct (badge, avatar, styling)

### 7️⃣ Hi Gym Emotion Search Enhancement
**Status:** 📋 Feature Enhancement  
**Complexity:** Medium  
**Current state:**
- ✅ `emotions.js` has structured catalog with categories
- ✅ Search exists in hi-muscle.html grid filtering
- ✅ `hi-gym.js` has `suggestOptimalEmotions()` for smart suggestions
**What's needed:**
- **Expanded emotion pool:** Add 50-100 more emotions with synonyms
- **Search improvements:** Fuzzy matching, emotion synonyms, natural language
- **AI direction:** "I feel stuck" → suggests Clarity, Focus, Momentum
- **Emotion groups:** Quick filters (Energy, Calm, Connection, Growth)
- **Timeline:** 2-3 days for search, 1 week for AI suggestions

### 7a️⃣ Trend Analytics & Behavioral Intelligence
**Status:** 📋 Infrastructure Planning  
**Complexity:** High  
**Current tracking:**
- ✅ `hi_points_daily_activity` - Daily action counts
- ✅ `hi_points_ledger` - All point transactions with timestamps
- ✅ `user_stats` - Streaks, total moments, waves
- ✅ `public_shares` - Share content with emotions, timestamps
- ✅ `HiMonitor.js` - Event telemetry system
- ✅ TIER_CONFIG has `trendsAccess` per tier (basic/full/premium)
**What's needed:**
- **New tables:** `user_emotional_trends`, `user_activity_patterns`
- **Aggregate queries:** Weekly emotion patterns, time-of-day activity, streak patterns
- **ML-ready:** Structure data for future ML model training
- **Notification triggers:** "You usually check in around 9am", "Your streak is at risk"
- **Timeline:** 1-2 weeks for infrastructure, ongoing for insights
- **Recommendation:** Start collecting now, build insights UI later

### 8️⃣ User Analytics Dashboard
**Status:** 📋 Feature Design  
**Complexity:** Medium  
**What makes sense for Hi:**
- **Personal insights page:** `/hi-insights.html` or profile tab
- **Charts:**
  - Streak calendar (already exists in premium-calendar.js)
  - Emotion journey history (current → desired over time)
  - Points earned by category (shares, reactions, check-ins)
  - Time-of-day activity heatmap
- **Tier gating:** Basic charts for Bronze, full analytics for Gold+
- **Privacy-first:** Only shows YOUR data, never comparative
- **Timeline:** 1 week for basic, 2-3 weeks for full analytics
- **Existing foundation:** `premium-calendar.js`, `hi-gym.js` insights, points ledger

---

## 💡 Feature Brainstorm: Hi Wall

**User request:** Way to interact with shares (like replies)  
**Concern:** Too close to social media territory  

**Alternative concepts:**
1. **Hi Wall** — Public wall on profile where visitors leave short encouraging messages
2. **Hi Book / Guest Book** — Collection of nice notes from the community
3. **Hi Cheers** — One-tap positivity reactions without threading
4. **Hi Kudos** — Weekly digest of appreciation received

**Decision:** ✅ Hi Wall with Points Redemption — Users spend points to leave notes (natural rate limiting, adds value to points system)

---

## 🔄 Rolled Over from Previous Month

_N/A — First month_

---

## 📅 End of Month Checklist

At end of January:
1. Move incomplete Active tasks to `TODO_FEB2026.md`
2. Archive this file (keep for reference)
3. Update completion stats

---

> **Maintained by:** Joe  
> **Last Updated:** January 15, 2026
