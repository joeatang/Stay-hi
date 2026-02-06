# 📋 Hi-OS TODO — February 2026

> **Started:** February 5, 2026  
> **Status:** Active  
> **Rolled Over From:** January 2026 (incomplete items migrated)  
> **Last Updated:** February 5, 2026

---

## 🎯 PRIORITY THIS MONTH

### 🏆 TOP 4 FOCUS AREAS (Feb 2026)

1. **🚀 Launch-Ready Polish** - Fix remaining critical bugs, complete Capacitor/App Store prep
2. **📊 Analytics v2.0** - Complete Patterns + Milestones tabs (80% done, finish it!)
3. **🎁 User Retention** - PWA install push, bulk 1-year upgrade for current users
4. **₿ Trac Foundation** - Start building Self-Custody Edition (parallel development, zero risk to current users)

### 🔀 DUAL-TRACK STRATEGY

**Track A: Current App (Web/PWA)** - Continue serving 30 users, add features
**Track B: Trac Version (Pear/Bitcoin)** - Build independence, real earning for users

Both tracks run in parallel. Current users unaffected.

---

## 🔴 P0 — CRITICAL BUGS (Fix First Week)

### #19 Auth Session Loss on Phone Sleep 🔥
**Status:** IN PROGRESS (80% solved via Jan fixes)  
**What happened in Jan:**
- ✅ Fixed severe zombie mode with optimistic auth + HiStateResilience.js
- ✅ 80% reduction in session loss cases
- ❌ Safari still kills JS engine on background (~5-10% of cases)

**Remaining work:**
- [ ] Complete Capacitor native wrapper to eliminate final 5-10% (Phase 1B-2A-3A started)
- [ ] iOS App Store submission (wrapper eliminates JS engine kill issue)
- [ ] Add "Install PWA" prompt before shipping native app

**Why this is P0:** Core experience blocker for mobile users  
**Timeline:** 1 week (Capacitor wrapper completion)  
**Location:** See CAPACITOR_SETUP_GUIDE.md, PWA_PRODUCTION_READY.md

---

### #21 Mission Control: degenmentality Can't Generate Codes 🔥
**Status:** NEEDS INVESTIGATION  
**Problem:** Admin gets "need to be verified admin" error  
**Check:**
- [ ] admin_roles table - is user listed?
- [ ] RPC permissions - does generate_invite_code check is_active flag?
- [ ] Does user have is_verified = true in admin_roles?

**Timeline:** 2 hours debug + fix  
**Blocking:** Admin team functionality

---

### #25 Invite Code Expiration Flow — Triple Check
**Status:** DOCUMENTED but needs UX test  
**What we know (from Jan audit):**
- Code expiration ≠ Membership expiration
- User shown "Trial Expired" modal → auto-downgrade to free after 5s
- Re-access via new code or purchase

**Remaining:**
- [ ] Manual test flow: Create code, let expire, verify UX
- [ ] Does user get notification before expiration?
- [ ] Document in user-facing help doc

**Timeline:** 3 hours  
**Why P0:** Must be smooth before public launch

---

## 🟠 P1 — HIGH PRIORITY (Complete This Month)

### TRACK A: Current App Improvements

### #39 PWA Install Promotion 🚀
**Status:** READY TO BUILD  
**Jan work:** Full PWA audit complete, icons production-ready  
**Task:** Build install promotion UI
- [ ] Post-check-in install banner (high-intent moment)
- [ ] Settings page "Add to Home Screen" button
- [ ] Zombie mode tooltip: "📱 Install Hi for smoothest experience"
- [ ] Track install rate in analytics

**Copy:** "Install Hi for instant loading" / "Power users install Hi"  
**Timeline:** 1 day  
**Files:** Create InstallPrompt component, update settings.html  
**See:** PWA_CAPABILITIES_DEEP_DIVE.md, PWA_PRODUCTION_READY.md

---

### #34 Analytics v2.0 — Hi Scale Prompt (Post-Check-In Modal)
**Status:** BACKEND COMPLETE, need frontend  
**What's done:**
- ✅ Migrations 003 + 004 deployed
- ✅ `record_hi_scale_rating(rating, note)` RPC live

**Task:** Add modal after successful check-in
- Location: dashboard-main.js after check-in success
- UI: "😫 1 2 3 4 5 😊 How are you feeling?"
- Optional note field, non-blocking, dismissible
- Tesla-grade animation, celebrates submission

**Timeline:** 2-3 hours  
**Goal:** Capture feeling to enable Hi Index v2.0 authenticity

---

### #37 Analytics v2.0 — Patterns Tab (Phase 2) 📊
**Status:** BACKEND READY, need RPCs + frontend  
**What's done:**
- ✅ user_daily_snapshots table deployed
- ✅ user_behavior_insights table ready

**Need:**
- [ ] New RPCs for pattern analysis
- [ ] Best/worst days of week (bar chart)
- [ ] Peak activity hours (heatmap)
- [ ] Correlations: "Sharing boosts your Hi Scale by +0.7"
- [ ] 30-day trend analysis (moving averages)

**Tier Gating:** Gold+ only  
**Timeline:** 2-3 days  
**Files:** Create HiPatternsChart.js, add RPC `get_user_behavior_patterns()`

---

### #38 Analytics v2.0 — Milestones Tab (Phase 3) 🏆
**Status:** BACKEND READY, need achievement system  
**What's done:**
- ✅ user_daily_snapshots for calendar heatmap

**Need:**
- [ ] Achievement badge system RPC
- [ ] Streak calendar heatmap (GitHub-style)
- [ ] Achievement badges (7-day, 30-day, 100 shares, etc.)
- [ ] Progress timeline (milestone history)
- [ ] Personal records (longest streak, highest Hi Index)

**Tier Gating:** Silver+  
**Timeline:** 2-3 days  
**Files:** Create HiMilestonesChart.js, add RPC `get_user_achievements()`

---

### #27 Bulk Upgrade Current Users to 1-Year 🎁
**Status:** READY TO EXECUTE  
**Why:** Thank-you gift before public launch  
**Task:**
- [ ] Write SQL to extend all user_memberships.expires_at by +1 year
- [ ] Test on dev account first
- [ ] Execute on production
- [ ] Add in-app banner: "🎉 As a thank you, your membership has been extended 1 year!"

**Timeline:** 2 hours (SQL write + test + deploy)  
**Note:** Consider timing with next major update announcement

---

### #26 Unified Stats Source of Truth
**Status:** CRITICAL for consistency  
**Problem:** Hi Pulse, Profile, Hi Island all show different numbers  
**Solution:**
- [ ] Audit current RPC calls: `get_user_stats()`, `get_profile_stats()`, etc.
- [ ] Create single canonical RPC: `get_unified_user_stats(user_id)`
- [ ] Update all pages to use same RPC
- [ ] Add caching layer (5min TTL) to reduce DB load

**Timeline:** 1 day  
**Files:** Create `/lib/stats/UnifiedStats.js`, update dashboard, profile, Hi Island

---

### #22 Hi Island Social Media Links in Profile Cards
**Status:** QUICK WIN  
**Problem:** Links exist in profiles table but not displaying  
**Audit:**
- [ ] Check HiIslandProfileCard.js rendering
- [ ] Verify profile fetch includes social columns
- [ ] Add icon display for Instagram, Twitter, website

**Timeline:** 1-2 hours (likely just display bug)

---

### #23 Hi Island Map Audit
**Status:** NEEDS VERIFICATION  
**Issue:** Previous audit found missing geographic areas  
**Task:**
- [ ] Verify all continents represented
- [ ] Check Leaflet map bounds
- [ ] Test with shares from various locations
- [ ] Update map center/zoom if needed

**Timeline:** 2 hours

---

### #24 Mission Control Full Audit
**Status:** NEEDS LOVE  
**Known issues:**
- Hardcoded stats don't match real data
- Some buttons don't work
- Admin sign-in friction

**Task:**
- [ ] Connect real-time stats from database
- [ ] Fix broken buttons (User Stats, Recent Signups)
- [ ] Create admin RPCs with SECURITY DEFINER
- [ ] Add admin session persistence

**Timeline:** 1 day  
**Files:** hi-mission-control.html, admin-core.js

---

### TRACK B: Trac Foundation (Self-Custody Edition) ₿

**Goal:** Start building parallel Trac version for TRUE ownership + Bitcoin earning

### #41 Trac Project Setup 🆕🔥
**Status:** NEW - Critical foundation work  
**Why this matters:** 
- Current Hi Points = database numbers you control
- TAP tokens = Bitcoin-native assets USERS own
- Enable real earning: "Stay Hi to Earn Bitcoin"
- Users can trade, transfer, truly own their rewards

**Week 1 Tasks (Feb 6-12):**
- [ ] Create new repo: `stay-hi-trac` (separate from current app)
- [ ] Clone Trac reference repos to workspace for Copilot context:
  ```bash
  git clone https://github.com/Trac-Systems/trac-contract-example
  git clone https://github.com/Trac-Systems/tap-protocol-token-auth-boilerplate
  git clone https://github.com/Trac-Systems/pear-appling-v2
  ```
- [ ] Set up VS Code multi-root workspace (current app + Trac repos)
- [ ] Install Pear CLI: `npm install -g pear-cli`
- [ ] Run Trac example apps to understand UX

**Timeline:** 3-4 hours  
**Risk to current app:** ZERO (completely separate repo)

---

### #42 Hi Points → TAP Token Prototype 🆕₿
**Status:** NEW - Core value proposition  
**Goal:** Prove Hi Points can be real Bitcoin tokens

**Week 2 Tasks (Feb 13-19):**
- [ ] Study `tap-protocol-token-auth-boilerplate` code
- [ ] Write Hi Points TAP contract (mint/burn operations)
- [ ] Deploy to Bitcoin TESTNET (free testnet BTC)
- [ ] Award yourself 100 test Hi Points
- [ ] Verify on Bitcoin testnet explorer
- [ ] Document: "How Hi Points become real Bitcoin assets"

**What success looks like:**
- You can see Hi Points as tokens on Bitcoin blockchain
- Mint operation = award points for check-in
- Burn operation = spend points on Hi Wall
- Provably scarce (can't be inflated by admin)

**Timeline:** 6-8 hours  
**Files:** `stay-hi-trac/contract/hi-points-tap.js`

---

### #43 Local-First Storage Prototype 🆕
**Status:** NEW - Core infrastructure  
**Goal:** Prove user data works offline without Supabase

**Week 3 Tasks (Feb 20-26):**
- [ ] Install Hyperbee: `npm install hyperbee hypercore`
- [ ] Build test: Store 1 profile in Hyperbee (vs Supabase)
- [ ] Build test: Store 5 journal entries locally
- [ ] Measure read/write speed vs Supabase
- [ ] Test offline mode (disconnect internet, still works)

**What success looks like:**
- Profile + journals stored on YOUR computer
- No server dependency
- Works 100% offline
- Data you can backup/transfer

**Timeline:** 4-6 hours  
**Files:** `stay-hi-trac/lib/hyperbee-storage.js`

---

### #44 Trac Learning & Strategy 🆕
**Status:** ONGOING  
**Why:** You're not a dev, need to understand what you're building

**Tasks:**
- [ ] Join Trac Discord server
- [ ] Watch Pear app tutorials
- [ ] Study TAP protocol docs (1 hour reading)
- [ ] List questions for Trac devs
- [ ] Decision by end of month: DIY or hire contractor?

**Key questions to answer:**
- How hard is this really? (firsthand experience building prototypes)
- Do we need help? (technical contractor vs DIY)
- What's the MVPscope? (what can we cut to ship faster?)

**Timeline:** 2 hours/week background learning

---

## 🟡 P2 — MEDIUM PRIORITY (Nice to Have This Month)

### #28 Referral Link System
**Status:** RESEARCH PHASE  
**Options:**
- Custom system (user gets unique link, we track signups)
- Stan Store integration (external platform)

**Questions:**
- How do users share for referral credit?
- What's the reward mechanism?
- Track via URL params? Database foreign key?

**Timeline:** Research 2 days, implement 3 days  
**Decision needed:** Custom vs Stan Store

---

### #7 Hi Wall / Hi Notes (Points Redemption)
**Status:** DESIGN APPROVED (Jan 14)  
**Backend:**
- ✅ Points system deployed
- ✅ Redemption table structure ready
- ✅ Design specs in HI_CODE_MAP.md

**Frontend task:**
- [ ] Create hi_wall_notes table (if not exists)
- [ ] Build compose modal (spend 10-50 points to post)
- [ ] Add "Hi Wall" tab to profile view
- [ ] Display feed-like wall of notes
- [ ] Optional: Word filter, report button

**Timeline:** 2-3 days  
**Files:** HiWall.js component, new RPC `send_hi_note()`

---

### #2 Hi Island User Profiles (Finish)
**Status:** PARTIALLY COMPLETE  
**What's left:**
- [ ] Bio display (rich text?)
- [ ] Social links display (see #22)
- [ ] Profile showcase layout polish

**Timeline:** 1 day

---

### #3 Social Links in Bio (Edit Mode)
**Status:** LOW EFFORT, HIGH VALUE  
**Task:**
- [ ] Add Instagram/Twitter/TikTok fields to profile edit
- [ ] Icon-prefixed inputs
- [ ] Handle validation (@username format)
- [ ] Update profiles table schema if needed

**Timeline:** 1-2 days  
**Files:** profile.html edit form

---

### #36 Timezone Detection on Signup
**Status:** MIGRATION READY (not deployed)  
**Task:**
- [ ] Deploy migration 005 (add timezone column)
- [ ] Add auto-detect to signup-init.js: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [ ] Update profiles.timezone on signup

**Benefit:** Streak resets at user's local midnight (not UTC)  
**Timeline:** 30 minutes  
**Blocked by:** Migration 005 deployment decision

---

## 🟢 P3 — LOWER PRIORITY (If Time Allows)

### #29 Physical Token Rewards for Milestones
**Status:** RESEARCH  
**Concept:** Honor-based with light verification  
**Questions:**
- What milestones trigger rewards? (365-day streak? 1000 shares?)
- Shipping logistics?
- Cost per token?
- Do we have fulfillment systems?

**Timeline:** Research phase only this month

---

### #30 App Pitch Discovery Questions
**Status:** MARKETING EXERCISE  
**Goal:** Discovery questions that lead to Hi as the answer
- "How do you check in with yourself daily?"
- "What's your morning routine for mental health?"
- "How do you track your emotional journey?"

**Timeline:** 1 hour brainstorm session  
**Output:** Document for sales/marketing use

---

### #4 Fix User Statistics Button (Mission Control)
**Status:** NEEDS RPC  
**Task:** Create `get_admin_user_stats()` RPC with SECURITY DEFINER  
**Timeline:** 1 hour

---

### #5 Fix Recent Signups Button (Mission Control)
**Status:** NEEDS RPC  
**Task:** Create `get_admin_recent_signups()` RPC (same pattern as #4)  
**Timeline:** 1 hour

---

## 🔵 P4 — FUTURE FEATURES (Planning/Research)

### #31 AI Companion Bot for Hi Island
**Status:** EXPERIMENTAL  
**Complexity:** HIGH  
**Concept:**
- Separate bot account with special tier
- Scheduled posts with personality
- Option A: Pre-written messages
- Option B: OpenAI/Anthropic API
- Option C: Hybrid (templates + AI fills in)

**Needs:** Full design doc before starting  
**Timeline:** 1 week minimum (basic), ongoing for AI

---

### #40 Trac Network Integration (Research) 🔗
**Status:** RESEARCH PHASE  
**Added:** February 5, 2026  
**Complexity:** HIGH  
**Documentation:** See TRAC_NETWORK_COMPATIBILITY_AUDIT.md

**Summary:**
- Trac Network is P2P blockchain (DAG-based, not traditional blockchain)
- Stay Hi is web PWA on Supabase (centralized)
- **Compatibility:** 40-50% overlap, significant architectural differences

**Options:**
1. **Full migration:** 6-12 months, not recommended for R1 (lacks token standards)
2. **Hybrid integration:** 2-4 months, use Trac for specific features (P2P messaging for Hi Wall)
3. **Wait for Mainnet:** 0 effort now, revisit when token standards ready

**Recommendation from audit:** Option 2 (Hybrid) or Option 3 (Wait)
- R1 doesn't support Hi Points tokenization
- Consider Trac for Hi Wall P2P messaging
- Use Trac for content verification proofs

**Next steps:**
- [ ] Read Trac SDK: https://github.com/Trac-Systems/trac-contract-example/
- [ ] Set up local Trac dev environment (if pursuing hybrid)
- [ ] Build proof-of-concept contract for Hi Wall messaging

**Priority:** P4 (research only, not implementation yet)  
**Timeline:** TBD based on Mainnet timeline

---

### #32 Crypto Wallet Sign-In / Verification
**Status:** RESEARCH  
**Use case:** Verify wallet ownership (not accessing funds), NFT as PFP  
**Research:** Web3 auth libraries, UX patterns  
**Timeline:** TBD

---

### #13 AI Companion Bot (Duplicate of #31)
_Merged into #31_

---

### #8 Push Notifications
**Status:** INFRASTRUCTURE READY  
**Jan work:**
- ✅ Service worker has push listener (sw.js lines 304-330)
- ✅ navigator.vibrate() used in dashboard-main.js

**What's needed:**
- [ ] Backend push service (Supabase Edge Functions or OneSignal)
- [ ] User notification preferences UI
- [ ] Define triggers (check-in reminders, streak risk, etc.)

**Timeline:** 3-5 days web push, +2-3 days native

---

### #9 Google OAuth
**Status:** READY TO ENABLE  
**Timeline:** 1-2 days (enable in Supabase + add frontend button)

---

### #10 Apple OAuth
**Status:** NEEDS APPLE DEV ACCOUNT  
**Requires:** $99/year Apple Developer account (needed for App Store anyway)  
**Timeline:** 1-2 days after account created

---

## ⚫ P5 — APP STORE PREP (In Progress)

### #11 Capacitor Wrapper ✅ IN PROGRESS
**Status:** Phase 1B-2A-3A started (Jan commits show setup complete)  
**Remaining:**
- [ ] Test iOS build
- [ ] Test Android build
- [ ] Fix any platform-specific issues
- [ ] Submit TestFlight beta

**Timeline:** Complete within first 2 weeks of Feb

---

### #12 App Store Submission (iOS First)
**Status:** WAITING FOR CAPACITOR  
**Needs:**
- [ ] Apple Developer account
- [ ] App Store Connect setup
- [ ] Screenshots for all device sizes
- [ ] Privacy Nutrition Labels
- [ ] App Review Guidelines compliance

**Timeline:** 2-4 weeks after Capacitor complete

---

### #17 App Store Deployment Plan
**Status:** NEEDS DOCUMENTATION  
**Task:** Write deployment checklist

---

### #18 Post-Launch Update Strategy
**Status:** NEEDS DOCUMENTATION  
**Task:** Define OTA update process

---

## ✅ ROLLED OVER FROM JANUARY (Already Complete)

| Task | Completed | Files |
|------|-----------|-------|
| #0 Share Submission Bug | ✅ Jan 15 | FIX_ANONYMOUS_SHARE_RPC.sql |
| #20 Hi Pulse "Your Shares" Regression | ✅ Jan 18 | Migration 009 |
| #33 Signup Race Condition | ✅ Jan 18 | FIX_USE_INVITE_CODE_RACE_CONDITION.sql |
| #35 Analytics v2.0 Journey Tab | ✅ Jan 18 | HiAnalytics.js, EmotionalJourneyChart.js |
| Hi Points System | ✅ Jan 14 | DEPLOY_POINTS_SYSTEM_MASTER.sql |
| Free Signup | ✅ Jan 14 | DEPLOY_FREE_MEMBERSHIP_RPC.sql |
| Welcome Page Simplification | ✅ Jan 14 | welcome.html updates |
| Zombie Mode 80% Fix | ✅ Jan | HiStateResilience.js, optimistic auth |
| PWA Production Ready | ✅ Jan | PWA icons, audit, documentation |
| Medallion Tesla-Grade | ✅ Jan | Gradient shimmer, particle burst |

---

## 📊 FEBRUARY SUCCESS METRICS

**Goals for end of month:**

| Metric | Target | Status |
|--------|--------|--------|
| Critical bugs fixed | 3/3 (P0) | 🟡 In Progress |
| Analytics v2.0 complete | 100% (all 3 tabs) | 🔴 60% done |
| PWA install rate | 30-40% | 🔴 Not started |
| App Store submission | iOS submitted | 🟡 Capacitor in progress |
| Current users upgraded | 100% (+1 year) | 🔴 Not executed |
| Mission Control functional | 100% | 🔴 Partially broken |

---

## 🎯 RECOMMENDED ATTACK PLAN (Week by Week)

### Week 1 (Feb 5-11): Critical Bug Bash
- [ ] Fix #19 Auth session loss (complete Capacitor)
- [ ] Fix #21 Mission Control admin issue
- [ ] Test #25 invite expiration flow

### Week 2 (Feb 12-18): Analytics v2.0 Completion
- [ ] #34 Hi Scale prompt (post-check-in modal)
- [ ] #37 Patterns Tab (charts + RPCs)
- [ ] #38 Milestones Tab (achievements)

### Week 3 (Feb 19-25): Polish & Retention
- [ ] #39 PWA install promotion
- [ ] #27 Bulk upgrade users to 1-year
- [ ] #26 Unified stats source of truth

### Week 4 (Feb 26-28): Launch Prep
- [ ] #24 Mission Control audit
- [ ] #22 + #23 Hi Island fixes
- [ ] App Store submission (if Capacitor ready)

---

## 📋 BACKLOG (Unscheduled)

- [ ] Bulk invite code generation UI
- [ ] User search in Mission Control
- [ ] Tier upgrade/downgrade UI in Mission Control
- [ ] Audit Security Events RLS
- [ ] Remove unused medallion CSS from welcome.html
- [ ] Clean up broken module files (welcome-referral.mjs, etc.)

---

> **Maintained by:** Joe  
> **Last Updated:** February 5, 2026  
> **Next Review:** March 1, 2026 (create TODO_MAR2026.md)
