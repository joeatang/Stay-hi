# 🎯 Trial System - Woz-Level UX Design
**Date:** January 7, 2026  
**Philosophy:** Non-intrusive, clear value, perfect timing

---

## 🧠 User Psychology Principles

1. **Never interrupt momentum** - Don't block them mid-action
2. **Clear expectations upfront** - They know what they're getting
3. **Gentle reminders** - Not panic, just awareness
4. **Graceful downgrade** - Feel like they're still valued, not punished
5. **Easy upgrade path** - One click when they're ready

---

## 📅 14-Day Bronze Trial Flow

### Day 0: Signup
**Where:** After email verification lands on dashboard

**UX:**
```
┌─────────────────────────────────────────────────┐
│ 🎉 Welcome to Hi!                               │
│                                                 │
│ You have 14 days to explore Hi Pathfinder:     │
│ • 30 shares per month                          │
│ • All share types (public, private, anonymous) │
│ • Avatar upload                                │
│ • Calendar access                              │
│                                                 │
│ [Start Exploring] [Learn More]                 │
└─────────────────────────────────────────────────┘
```

**Technical:**
- Small banner at top of dashboard (NOT modal)
- Dismissible with X
- LocalStorage flag: `hi_welcome_banner_dismissed`
- Shows only once (first load after signup)
- Auto-dismisses after 10 seconds if not interacted

**Code location:** `dashboard-main.js` after `await initializeDashboard()`

---

### Day 1-10: Silent Usage
**Where:** Nowhere - they use the app normally

**UX:**
- **No nag screens**
- **No countdown timers**
- **No anxiety**
- Just let them enjoy

**Status pill:** Shows "Hi Pathfinder" (bronze tier)

**Optional (non-intrusive):**
- Small "Trial" badge on profile page only
- Not shown on dashboard/island (keep clean)

---

### Day 11: First Gentle Reminder (3 Days Left)
**When:** First app open on day 11

**Where:** Top of dashboard (like welcome banner)

**UX:**
```
┌─────────────────────────────────────────────────┐
│ ⏰ Trial Update                                  │
│                                                 │
│ 3 days left in your Hi Pathfinder trial        │
│                                                 │
│ Keep 30 shares/month for just $5.55            │
│ [Upgrade Now] [Maybe Later]                     │
└─────────────────────────────────────────────────┘
```

**Technical:**
- Check on dashboard load: `trial_end - NOW() < 3 days`
- LocalStorage flag: `hi_trial_3day_warning_shown_20260111` (date-specific)
- Dismissible with "Maybe Later"
- Auto-dismiss after 15 seconds
- Show max once per day (not every page load)

**Timing:** After loading spinner done, before they start using app

---

### Day 13: Second Gentle Reminder (1 Day Left)
**When:** First app open on day 13

**Where:** Top of dashboard (same position)

**UX:**
```
┌─────────────────────────────────────────────────┐
│ ⏰ Final Day of Trial                            │
│                                                 │
│ Your trial ends tomorrow. After that:          │
│ • You'll switch to Hi Explorer (free tier)     │
│ • 5 private shares per month                   │
│ • Still full access to medallion & feed        │
│                                                 │
│ Want to keep 30 shares? Just $5.55/month       │
│ [Upgrade to Keep Access] [Continue Free]       │
└─────────────────────────────────────────────────┘
```

**Technical:**
- Check: `trial_end - NOW() < 24 hours`
- LocalStorage flag: `hi_trial_1day_warning_shown_20260113`
- NOT dismissible automatically (must click button)
- "Continue Free" button = dismiss
- Show once per day

**Philosophy:** Clear about what happens, not scary

---

### Day 14: Trial Expires (Background)
**When:** Cron job runs at 00:00 UTC

**What Happens:**
```sql
UPDATE user_memberships
SET tier = 'free', trial_end = NULL
WHERE trial_end < NOW();
```

**User Experience:** SEAMLESS
- They don't get kicked out mid-session
- Next page load shows new status
- No error messages
- No jarring transitions

---

### Day 15: Post-Trial Experience
**When:** First app open after trial ended

**Where:** Top of dashboard (final reminder)

**UX:**
```
┌─────────────────────────────────────────────────┐
│ 🌱 Your trial has ended                         │
│                                                 │
│ You're now on Hi Explorer (free tier):         │
│ ✓ 5 private shares per month                   │
│ ✓ Unlimited medallion taps                     │
│ ✓ View all public shares                       │
│                                                 │
│ Want to upgrade?                                │
│ [Unlock 30 Shares - $5.55/mo] [Stay Free]      │
└─────────────────────────────────────────────────┘
```

**Technical:**
- Check: `tier === 'free' AND trial_end === NULL AND created_at < 14 days ago`
- LocalStorage flag: `hi_post_trial_notice_shown`
- Dismissible with "Stay Free"
- Show ONCE EVER (not daily nag)

**Philosophy:** Celebrate free tier, don't shame them

---

### Ongoing Free Tier: Soft Prompts
**When:** User hits 5-share limit

**Where:** Share sheet (when they try to share)

**UX:**
```
┌─────────────────────────────────────────────────┐
│ 📊 5/5 Shares Used This Month                   │
│                                                 │
│ Your January shares are all used! Resets Feb 1.│
│                                                 │
│ Want unlimited sharing?                         │
│ [Upgrade to Hi Pathfinder - $5.55] [Not Now]   │
└─────────────────────────────────────────────────┘
```

**Technical:**
- Triggered by share validation RPC
- Modal inside share sheet (context-aware)
- "Not Now" closes modal
- No localStorage needed (shown when relevant)

**Philosophy:** Show upgrade at point of friction, not random times

---

## 🎨 Visual Design Standards

### Banner Positioning
- **Top of page** (below header/nav)
- Full width, centered content
- Max-width: 600px
- Padding: 20px
- Border-radius: 12px
- Box-shadow: subtle (0 2px 8px rgba(0,0,0,0.1))

### Colors
- **Informational** (trial updates): Gradient purple/blue (#667eea to #764ba2)
- **Celebration** (welcome): Gradient gold (#FFD700 to #FFA500)
- **Gentle reminder** (post-trial): Gradient green/teal (#10b981 to #06b6d4)
- **Upgrade prompt** (at limit): Solid orange (#f59e0b)

### Typography
- **Title:** Bold, 18px
- **Body:** Regular, 14px
- **Buttons:** Bold, 14px

### Animation
- Slide down from top (300ms ease-out)
- Auto-dismiss: Fade out (200ms)
- No bouncing, no flashing, no anxiety

---

## 🔧 Implementation Checklist

### Backend (SQL)
- [ ] Update `trial_days_total` in TIER_CONFIG.js (free=0, bronze=14)
- [ ] Modify signup flow to set `trial_end = NOW() + 14 days`
- [ ] Create cron job SQL function `expire_trials_daily()`
- [ ] Deploy trial expiration Edge Function (runs daily at 00:00 UTC)

### Frontend (JavaScript)
- [ ] Create `TrialBanner.js` component (reusable)
- [ ] Add trial check to `dashboard-main.js` (after init)
- [ ] Add localStorage tracking for dismissals
- [ ] Update share sheet quota modal (upgrade prompt)
- [ ] Add trial badge to profile page

### UX Polish
- [ ] Test banner on mobile (full width, readable)
- [ ] Test auto-dismiss timing (not too fast)
- [ ] Test localStorage flags (prevent spam)
- [ ] Test upgrade button links to Stripe checkout
- [ ] Test "Continue Free" doesn't feel punishing

---

## 📊 Success Metrics

**Week 1 After Launch:**
- % of trial users clicking "Start Exploring" on welcome banner
- % of trial users who see 3-day warning
- % of trial users who see 1-day warning
- % conversion on each warning (3-day vs 1-day vs post-trial)

**Key Insight:**
If conversion is highest at **post-trial** prompt (after they hit 5-share limit), that means:
- Trial was long enough to form habit
- Friction is the right motivator
- Free tier is valuable enough to keep them around

---

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T:
- Modal that blocks navigation
- Countdown timer on every page
- Red "WARNING" banners
- Disable features before trial ends
- Show upgrade prompts on every share
- Email them 10 times about trial ending
- Make free tier feel like punishment

### ✅ DO:
- Small, dismissible banners
- Show once per milestone
- Clear expectations from day 1
- Celebrate free tier as valuable
- Show upgrade at friction points only
- Respect their choice to stay free

---

## 🎯 The Woz Philosophy

> "Make it so good they don't want to downgrade, not so annoying they have to upgrade."

**Key Insight:** If trial system is well-designed, users won't NEED reminders. They'll upgrade because they want to, not because we nagged them.

**The Goal:** 
- 30% convert during trial (amazing!)
- 50% stay on free tier happily (still engaged)
- 20% churn (acceptable, not for them)

**If free tier is strong, we win either way:**
- Paid users = revenue
- Free users = community growth, network effects, future conversions

---

## 📝 Next Steps

1. ✅ Approve this UX design (with any tweaks)
2. 🔧 Implement SQL changes (trial_end logic)
3. 🎨 Build TrialBanner.js component
4. 🧪 Test on staging with test account
5. 🚀 Deploy to production
6. 📊 Monitor conversion rates weekly

**Timeline:** 4-6 hours for full implementation + testing

**Risk Level:** LOW (all non-breaking, can disable banners with feature flag)
