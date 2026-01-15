# 🌟 Hi Index — Design Specification

> **Status:** Ready for Implementation  
> **Created:** January 15, 2026  
> **Mindset:** Jobs/Woz intuitive elegance  
> **Branding:** Hi (not Tesla)

---

## 📐 Visual Design Decision

### Where It Lives: **Dashboard Trigger Card → Modal**

**Rationale:**
- Dashboard real estate is already tight (medallion, global stats, week strip)
- A compact trigger card respects existing layout
- Modal allows full personal stats without cluttering main view
- One tap to expand, one tap to close — intuitive

### UI Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ DASHBOARD (existing layout)                                     │
│                                                                 │
│ [Header: Calendar | Hi Logo | Tier + Hiffirmations + Avatar]   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 👋 Hi Waves  🔥 Total His  👥 Users  ⚡ Streak  🌟 Points  ││
│ │ 1,247        486          52        7          128         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ✨ YOUR HI INDEX: 3.4 ↑12%                                  ││  ← NEW TRIGGER CARD
│ │ Tap to see your Hi journey                                  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│               ┌─────────────────────┐                          │
│               │     [MEDALLION]     │                          │
│               │      Hi Logo        │                          │
│               └─────────────────────┘                          │
│                                                                 │
│ [Week Strip: M T W T F S S]                                    │
│                                                                 │
│ [✨ Celebrate This Moment]  [Navigation Footer]                │
└─────────────────────────────────────────────────────────────────┘
```

### Modal (When Tapped)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                          [✕]   │
│                                                                 │
│                 🌟 Your Hi Journey                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                            ││
│  │   HI INDEX: 3.4                    ↑12% from yesterday    ││
│  │   ●●●●○ (out of 5)                                        ││
│  │                                                            ││
│  │   You're in the top 22% of Hi users                       ││
│  │                                                            ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  30-Day Journey                            [7d] [30d]     ││
│  │                                                            ││
│  │     ╭─────────────────────────────────────╮               ││
│  │  5 ─┤                          ╭──────────│               ││
│  │  4 ─┤              ╭───────────╯          │               ││
│  │  3 ─┤    ╭────────╯                       │               ││
│  │  2 ─┤────╯                                │               ││
│  │  1 ─┤                                     │               ││
│  │     ╰─────────────────────────────────────╯               ││
│  │      Jan 1        Jan 8        Jan 15                     ││
│  │                                                            ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  Today's Activity                                          ││
│  │  ───────────────────────                                  ││
│  │  📤 Shares: 2      (worth 20 index pts)                   ││
│  │  👋 Taps: 47       (worth 0.47 index pts)                 ││
│  │  🔥 Streak: 7 days (+10% bonus!)                          ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│                  [Share My Journey]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Language

### Colors (Hi Palette)
```css
--hi-index-primary: #FFD166;      /* Hi Gold */
--hi-index-up: #10B981;           /* Growth Green */
--hi-index-down: #F59E0B;         /* Opportunity Amber (not red!) */
--hi-index-chart-line: #6366F1;   /* Journey Purple */
--hi-index-chart-fill: rgba(99, 102, 241, 0.1);
```

### Index Scale Visual
```
1.0 ●○○○○  "Planting seeds"
2.0 ●●○○○  "Taking root"
3.0 ●●●○○  "Growing strong"
4.0 ●●●●○  "Flourishing"
5.0 ●●●●●  "Hi Master"
```

### States

| State | Display |
|-------|---------|
| **Loading** | Shimmer skeleton (matches existing dashboard pattern) |
| **Empty (new user)** | "Start your Hi journey — share or tap to begin!" |
| **Low activity** | Show score with encouragement, not judgment |
| **Error** | "Couldn't load your journey. Tap to retry." |

---

## 📊 Formula (Confirmed)

### Community Hi Index (Global)
```
Daily Raw Score = (shares × 10) + (taps / 100)
7-Day Rolling Sum = SUM(last 7 days raw scores)
Normalized Index = MIN(5, MAX(1, (rolling_sum / expected_max) × 5))
```

Where `expected_max` adjusts based on community median (prevents ceiling/floor effects)

### Personal Hi Index (Per-User)
```
Same formula, but only YOUR shares and taps
Percentile = WHERE your 7-day sum ranks vs all users' 7-day sums
```

### % Change Calculation
```
Today vs Yesterday change = ((today_score - yesterday_score) / yesterday_score) × 100
Display: ↑12% or ↓3%
Label: ↑ = "Hi Inspiration" / ↓ = "Hi Opportunity" (not negative framing!)
```

---

## 🗃️ Data Available (Confirmed)

### Existing Tables We Can Use
```sql
-- hi_points_daily_activity (already tracks per-user, per-day)
user_id, day, share_count, tap_accumulator, tap_batches_awarded

-- public_shares (all community shares)
id, user_id, created_at, content

-- user_stats (streaks, totals)
user_id, current_streak, total_waves
```

### New Table Needed
```sql
-- hi_index_snapshots (daily aggregation cache)
CREATE TABLE hi_index_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  scope TEXT NOT NULL, -- 'community' or user_id
  raw_score NUMERIC(10,2) NOT NULL,
  normalized_index NUMERIC(3,2) NOT NULL,
  share_count INT DEFAULT 0,
  tap_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(snapshot_date, scope)
);
```

---

## 🔧 Implementation Files

### New Files (Additive Only)
```
public/
├── lib/
│   └── HiIndex.js              # Calculation engine + RPC wrapper
├── components/
│   ├── HiIndexCard.js          # Trigger card for dashboard
│   └── HiIndexModal.js         # Full modal with chart
├── styles/
│   └── hi-index.css            # Isolated styles

sql/
└── DEPLOY_HI_INDEX.sql         # Schema + RPCs
```

### Files NOT Modified
- ❌ hi-dashboard.html (inject via JS, not HTML edit)
- ❌ dashboard-main.js (keep existing boot intact)
- ❌ HiSupabase.v3.js (no changes to auth layer)
- ❌ Any existing tables

---

## 📱 Responsive Behavior

### Mobile (< 480px)
- Trigger card: Full width, compact height (48px)
- Modal: Full screen, bottom-sheet style
- Chart: Simplified, 7-day only default

### Tablet/Desktop (> 768px)
- Trigger card: Same position, slightly larger
- Modal: Centered overlay (max-width: 480px)
- Chart: Full 30-day with hover tooltips

---

## 🔐 Privacy Considerations

| Feature | Privacy Treatment |
|---------|-------------------|
| Personal Index | Only visible to owner (RLS enforced) |
| Percentile | Shows "Top X%" not exact rank or other users |
| Chart Data | Never exposes other users' activity |
| Community Index | Aggregate only, no individual attribution |

---

## ✅ Acceptance Criteria

1. [ ] Trigger card appears on dashboard below global stats
2. [ ] Tap opens modal with full personal stats
3. [ ] Chart renders without external dependencies
4. [ ] Loading shimmer matches existing dashboard pattern
5. [ ] Empty state shows friendly encouragement
6. [ ] % change uses positive framing (Inspiration/Opportunity)
7. [ ] Works on mobile Safari, Chrome, Firefox
8. [ ] Zero console errors in production
9. [ ] RLS prevents cross-user data access

---

## 🚀 Implementation Order

| Step | Task | Verification |
|------|------|--------------|
| 1 | Create SQL schema | Run in Supabase, verify table |
| 2 | Create `get_community_hi_index()` RPC | Test in SQL Editor |
| 3 | Create `get_personal_hi_index()` RPC | Test returns user data only |
| 4 | Create `HiIndex.js` engine | Console log calculation |
| 5 | Create `HiIndexCard.js` | Visible on dashboard |
| 6 | Create `HiIndexModal.js` | Opens on tap |
| 7 | Add chart (Canvas/SVG) | Visual QA |
| 8 | Mobile viewport test | Check responsiveness |
| 9 | Local full flow test | Share → see index update |
| 10 | Git commit | Clean commit after verification |

---

**Ready to build? Let's start with Step 1: SQL Schema.**
