# 📋 Hi-OS TODO — January 2026

> **Started:** January 13, 2026  
> **Status:** Active  
> **Rollover:** Incomplete items move to `TODO_FEB2026.md` at month end

---

## 🎯 Active Tasks

### 🔴 HIGH PRIORITY — User-Facing Issues

- [ ] **Diagnose dual modal issue** — Update Available modal + App Recovery Mode appearing together on mobile. Investigate trigger conditions in `HiPWA.js` + `EmergencyRecovery.js`
- [ ] **Hi Island user profiles** — Finish profile showcase with bio, info display. Started but not completed.
- [ ] **Free account signup on welcome page** — Implementation checklist below

#### 📋 Free Signup Implementation Checklist

| Step | File | Status | Notes |
|------|------|--------|-------|
| 1. Deploy RPC | `DEPLOY_FREE_MEMBERSHIP_RPC.sql` | ✅ | Deployed 2026-01-13 |
| 2. Add free signup handler | `signup-init.js` | ✅ | Calls `create_free_membership()` when no invite code |
| 3. Update welcome page | `welcome.html` | ⬜ | Add "Create Free Account" CTA |
| 4. Remove invite requirement | `signup.html` | ✅ | Invite field now optional |
| 5. Test free → paid upgrade | Manual test | ⬜ | Verify free user can later use invite code |

**Architecture verified:** Zero schema changes. `user_memberships` table unchanged. Existing users unaffected.

### 🟡 MEDIUM PRIORITY — Mission Control Fixes

- [ ] **Fix User Statistics button** — Create `get_admin_user_stats()` RPC with SECURITY DEFINER to safely query auth.users
- [ ] **Fix Recent Signups button** — Create `get_admin_recent_signups()` RPC (same pattern)
- [ ] **Improve Membership Analytics formatting** — Better UI display instead of raw JSON
- [ ] **Audit Security Events RLS** — Ensure admin_access_logs is accessible

### 🟢 BACKLOG — Feature Ideas

- [ ] **Hi Wall / Guest Book concept** — Alternative to replies on shares. Public wall for leaving nice messages. Needs design thinking.
- [ ] Bulk invite code generation UI
- [ ] User search in Mission Control
- [ ] Tier upgrade/downgrade UI in Mission Control

---

## ✅ Completed

| Task | Completed | Notes |
|------|-----------|-------|
| Profile check-in button fix | 2026-01-13 | Removed duplicate handlers, fixed balance property |
| Mission Control added to Hi Code Map | 2026-01-13 | Full architecture docs |
| Grant degenmentality admin access | 2026-01-13 | SQL executed in Supabase |
| Create TODO tracker | 2026-01-13 | This file |

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

## 💡 Feature Brainstorm: Hi Wall

**User request:** Way to interact with shares (like replies)  
**Concern:** Too close to social media territory  

**Alternative concepts:**
1. **Hi Wall** — Public wall on profile where visitors leave short encouraging messages
2. **Hi Book / Guest Book** — Collection of nice notes from the community
3. **Hi Cheers** — One-tap positivity reactions without threading
4. **Hi Kudos** — Weekly digest of appreciation received

**Decision needed:** Does wall-style interaction fulfill the need without becoming comment threads?

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
> **Last Updated:** January 13, 2026
