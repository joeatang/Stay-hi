# 📋 Hi-OS TODO — January 2026

> **Started:** January 13, 2026  
> **Status:** Active  
> **Last Updated:** January 17, 2026 (brain dump session)  
> **Rollover:** Incomplete items move to `TODO_FEB2026.md` at month end

---

## 🎯 Active Tasks (Prioritized)

### 🔴 P0 — CRITICAL BUGS (Fix Immediately)

- [ ] **#33 Signup Race Condition Bug** 🆕🔥🐛 *(2026-01-18)* **✅ FIX DEPLOYED**
  - **Critical Discovery:** `use_invite_code()` has database race condition
  - **What happens:** Function queries `auth.users.email` immediately after signup, but record not visible yet
  - **Result:** User sees false error "Code has reached maximum uses" but account IS created
  - **Proof:** User italo505@aol.com saw error, but can now sign in (account exists)
  - **Root Cause:** Replication delay between auth.signUp() and RPC seeing the user record
  - **Fix:** Remove email query from `use_invite_code()` - not needed for membership creation
  - **Files:** `FIX_USE_INVITE_CODE_RACE_CONDITION.sql` ✅ DEPLOYED, `SIGNUP_BUG_ROOT_CAUSE_ANALYSIS.md`
  - **Status:** SQL fix deployed (2026-01-18), awaiting test signup confirmation
  - **Next:** Test with fresh invite code, monitor for 24h, then close if successful

- [ ] **#19 Auth Session Loss on Phone Sleep** 🆕🔥
  - User gets signed out when phone sleeps but app shows "half signed in" state
  - Profile pic loads but 7-day pill breaks, sign-in button appears on Hi Pulse
  - Investigate: auth-resilience.js, BFCache handling, session restore on wake
  - *This is breaking the core experience*

- [x] ~~**#20 Hi Pulse "Your Shares" Regression**~~ — ✅ FIXED (2026-01-18)
  - **Root cause:** `get_user_stats` RPC read from cached `user_stats.total_hi_moments` instead of source `public_shares`
  - **Fix:** Migration 009 - RPC now queries `public_shares` directly (single source of truth)
  - **Result:** Share count always accurate, no more cache drift
  - **Files:** `2026-01-18_009_fix_user_stats_shares_source.sql` ✅ DEPLOYED

- [ ] **#21 Mission Control: degenmentality Can't Generate Codes** 🆕
  - Error: "need to be a verified admin or logged into an admin account"
  - Check: admin_roles table, RPC permissions, is_active flag
  - *Blocking admin functionality*

### 🟠 P1 — HIGH PRIORITY (This Week)

- [ ] **#39 PWA Install Promotion + Zombie Mode Fix** 🆕🔥 *(2026-01-20)*
  - **Goal:** Get 30-40% of active users to install PWA (eliminates 70-80% zombie mode)
  - **Strategy:** Positive framing ("upgrade experience"), NOT browser shaming
  - **Components:**
    - Install banner after successful check-in (high-intent moment)
    - "Add to Home Screen" button in settings
    - Tooltip on first zombie mode detection: "📱 Install Hi for smoothest experience"
  - **Tracking:** Analytics for install rate, zombie mode % (browser vs installed)
  - **Copy:** "Install Hi for instant loading" / "Power users install Hi"
  - **Files:** Add install prompt component, update sw.js/manifest.json
  - **Documentation:** PWA_INSTALLATION_GUIDE.md with iOS/Android instructions
  - *Estimated: 1 day for component, ongoing for optimization*
  - **See:** [PWA_CAPABILITIES_DEEP_DIVE.md](./PWA_CAPABILITIES_DEEP_DIVE.md) for full analysis

- [ ] **#34 Analytics v2.0 Frontend — Hi Scale Prompt** 🆕 *(2026-01-18)*
  - **Backend:** ✅ COMPLETE (migrations 003 + 004 deployed)
  - **Task:** Add post-check-in modal: "😫 1 2 3 4 5 😊 How are you feeling?"
  - **Location:** dashboard-main.js after successful check-in
  - **Behavior:** Non-blocking, dismissible, optional note field
  - **RPC:** Calls `record_hi_scale_rating(rating, note)` (already deployed)
  - **UX:** Tesla-grade elegance, smooth animation, celebrates submission
  - **Goal:** Capture feeling to enable Hi Index v2.0 authenticity
  - *Estimated: 2-3 hours*

- [x] ~~**#35 Analytics v2.0 Frontend — Journey Tab (Phase 1)**~~ — ✅ COMPLETE (2026-01-18)
  - **Backend:** ✅ Migrations 003, 004, 006, 007, 008 deployed
  - **Frontend:** ✅ HiAnalytics.js + EmotionalJourneyChart.js deployed
  - **Features:** Tabbed interface (Overview | Journey | Patterns | Milestones)
  - **Journey Tab:** Line chart showing Hi Scale ratings over time (7-30 days)
  - **Tier Gating:** Free/Bronze (7 days), Silver (30 days), Gold/Collective (unlimited)
  - **Historical Data:** Migration 008 backfilled check-ins + shares for all users
  - **RPC:** `get_user_emotional_journey()` queries user_daily_snapshots
  - **Files:** `HiAnalytics.js`, `EmotionalJourneyChart.js`, `2026-01-18_007_FIX`, `2026-01-18_008_backfill`
  - **Status:** Journey tab live, Patterns + Milestones placeholders ready for Phase 2 + 3

- [ ] **#37 Analytics v2.0 — Patterns Tab (Phase 2)** 🆕 *(2026-01-18)*
  - **Backend:** ✅ Tables ready (user_daily_snapshots, user_behavior_insights)
  - **Need:** New RPCs for pattern analysis
  - **Charts:**
    - Best/worst days of week (bar chart showing avg Hi Scale by day)
    - Peak activity hours (heatmap showing when user is most active)
    - Correlations: "Sharing boosts your Hi Scale by +0.7" (insight cards)
    - 30-day trend analysis (moving averages, slope direction)
  - **Tier Gating:** Gold+ only (premium analytics feature)
  - **UX:** Data-driven insights with actionable recommendations
  - *Estimated: 2-3 days*

- [ ] **#38 Analytics v2.0 — Milestones Tab (Phase 3)** 🆕 *(2026-01-18)*
  - **Backend:** ✅ Tables ready (user_daily_snapshots for calendar)
  - **Need:** Achievement badge system RPC
  - **Components:**
    - Streak calendar heatmap (GitHub-style contribution graph)
    - Achievement badges (7-day streak, 30-day streak, 100 shares, etc.)
    - Progress timeline (milestone history with dates)
    - Personal records (longest streak, highest Hi Index, peak activity day)
  - **Tier Gating:** Silver+ (motivational feature for committed users)
  - **UX:** Celebrates progress, visual accomplishments, share-worthy
  - *Estimated: 2-3 days*

- [ ] **#36 Timezone Detection on Signup** 🆕 *(2026-01-18)*
  - **Backend:** ⏳ Migration 005 ready (not deployed yet)
  - **Task:** Auto-detect user timezone via Intl API on signup
  - **Location:** signup-init.js after user creation
  - **Code:** `const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;`
  - **Store:** Update profiles.timezone column
  - **Benefit:** Streak resets at user's midnight (not UTC)
  - **Status:** Blocked until migration 005 deployed (optional)
  - *Estimated: 30 minutes*

- [ ] **#22 Hi Island Social Media Not Showing in Profile Cards** 🆕
  - Social links exist in profiles table but not displaying
  - Audit: HiIslandProfileCard.js, profile fetch query, UI rendering
  - Low effort fix if it's just a display issue

- [ ] **#23 Hi Island Map Audit** 🆕
  - Previous audit found missing areas
  - Need to verify all regions are included
  - Update Leaflet/map bounds if needed

- [ ] **#24 Mission Control Full Audit** 🆕
  - Hardcoded stats that don't match real data
  - Buttons that don't work
  - Admin sign-in friction
  - Make it functional, practical, valuable

- [ ] **#25 Invite Code Expiration Flow — Triple Check** 🆕
  - What happens when code expires?
  - Is user notified? Downgraded? When?
  - Document the complete flow
  - *Must be smooth before public launch*

- [ ] **#26 Unified Stats Source of Truth** 🆕
  - Hi Pulse personal stats
  - Profile page stats  
  - Hi Island profile card stats
  - All must pull from same RPC/table
  - Create single `get_user_stats()` if needed

### 🟡 P2 — MEDIUM PRIORITY (This Month)

- [ ] **#27 Bulk Upgrade Current Users to 1-Year** 🆕
  - Thank-you gift before public launch
  - SQL to extend all current user_memberships by 1 year
  - Does app notify them? Should it?
  - Consider: In-app announcement or email

- [ ] **#28 Referral Link System** 🆕
  - How do users share links for referral credit?
  - Options: Custom system vs Stan Store integration
  - Need: Tracking, attribution, reward mechanism
  - Research phase first

- [ ] **#7 Hi Wall / Hi Notes** *(existing)*
  - Users spend Hi Points to leave encouraging notes
  - Points system deployed, redemption table ready
  - (~2-3 days)

- [ ] **#2 Hi Island user profiles** *(existing)*
  - Finish profile showcase with bio, info display
  - Most visible incomplete feature

- [ ] **#3 Social Links in Bio** *(existing)*
  - Add Instagram/Twitter/TikTok handles to profiles
  - Low effort, high value (~1-2 days)

### 🟢 P3 — LOWER PRIORITY (Nice to Have)

- [ ] **#29 Physical Token Rewards for Milestones** 🆕
  - Honor-based with light verification
  - What milestones trigger rewards?
  - Shipping logistics
  - Do we have systems for this? (Research)

- [ ] **#30 App Pitch Questions** 🆕
  - Discovery questions that lead to Hi as the answer:
    - "How do you check in with yourself daily?"
    - "What's your morning routine for mental health?"
    - "How do you track your emotional journey?"
  - Document for sales/marketing

- [ ] **#4 Fix User Statistics button** *(existing)*
  - Create `get_admin_user_stats()` RPC with SECURITY DEFINER

- [ ] **#5 Fix Recent Signups button** *(existing)*
  - Create `get_admin_recent_signups()` RPC (same pattern)

### 🔵 P4 — FUTURE FEATURES (Research/Planning)

- [ ] **#31 AI Companion Bot for Hi Island** 🆕
  - AI agentic work sending Hi notes
  - Separate bot account
  - Scheduled posts with personality
  - Content generation pipeline
  - *High complexity — needs design doc*

- [ ] **#32 Crypto Wallet Sign-In / Verification** 🆕
  - Not accessing wallet, just verifying ownership
  - Badge for verified wallet holders
  - Use NFT/asset as PFP
  - Community partnerships for badges
  - *Research: Web3 auth libraries, UX patterns*

- [ ] **#13 AI Companion Bot** *(existing — merged with #31)*
- [ ] **#8 Push Notifications** *(existing)*
- [ ] **#9 Google OAuth** *(existing)*
- [ ] **#10 Apple OAuth** *(existing)*

### ⚫ P5 — APP STORE PREP (When Ready)

- [ ] **#11 Capacitor wrapper** — PWA → native iOS/Android
- [ ] **#12 App Store submission** — iOS first
- [ ] **#17 App Store Deployment Plan**
- [ ] **#18 Post-Launch Update Strategy**

---

### ✅ COMPLETED: Hi Pulse Update v1.1.0 *(2026-01-17)*

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
