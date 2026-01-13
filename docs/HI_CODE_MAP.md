# 🗺️ Hi Code Map

> **Living Document** - Last Updated: January 13, 2026  
> **Purpose:** Complete architecture reference for the Hi App codebase  
> **Location:** `/docs/HI_CODE_MAP.md`

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Directory Structure](#-directory-structure)
3. [Core Architecture Layers](#-core-architecture-layers)
4. [Data Flow Diagrams](#-data-flow-diagrams)
5. [Page-by-Page Breakdown](#-page-by-page-breakdown)
6. [Authentication System](#-authentication-system)
7. [Membership & Tier System](#-membership--tier-system)
8. [Event System](#-event-system)
9. [Database Schema](#-database-schema)
10. [Component Library](#-component-library)
11. [Boot Sequence](#-boot-sequence)
12. [Key Patterns & Conventions](#-key-patterns--conventions)

---

## 🏠 Project Overview

**Hi** is a positivity-focused PWA (Progressive Web App) that helps users track and share "Hi moments" - small acts of kindness, gratitude, and connection.

### Tech Stack
- **Frontend:** Vanilla JavaScript (ES6+), CSS3
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Hosting:** Vercel (auto-deploy from GitHub main branch)
- **PWA:** Service Worker for offline support

### Core Concepts
| Concept | Description |
|---------|-------------|
| **Hi Moment** | A captured moment of positivity (gratitude, kindness, connection) |
| **Hi Wave** | Medallion tap = sending positive energy into the world |
| **Hi5** | Quick self-affirmation from dashboard |
| **Hi Gym** | Emotional journey tracker (current → desired emotion) |
| **Hi Island** | Map + feed showing community Hi moments |
| **Hiffirmations** | Daily inspirational messages |
| **Streak** | Consecutive days of Hi activity |

---

## 📂 Directory Structure

```
Stay-hi/
├── public/                    # 🌐 WEBROOT - All served files
│   ├── assets/               # Scripts, styles, brand assets
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Core libraries & utilities
│   │   ├── access/          # Access control (gates, tiers)
│   │   ├── admin/           # Admin-only systems
│   │   ├── auth/            # Authentication helpers
│   │   ├── boot/            # Page initialization scripts
│   │   ├── config/          # Configuration (tiers, flags)
│   │   ├── hibase/          # Unified Supabase layer
│   │   ├── hifeed/          # Feed system
│   │   ├── membership/      # Membership bridge
│   │   ├── stats/           # Stats tracking
│   │   ├── streaks/         # Streak system
│   │   └── trial/           # Trial management
│   ├── ui/                   # UI component library
│   │   ├── HiFeed/          # Social feed
│   │   ├── HiFooter/        # Navigation footer
│   │   ├── HiHeader/        # Page headers
│   │   ├── HiMedallion/     # Tap medallion
│   │   ├── HiModal/         # Modal system
│   │   ├── HiScale/         # Intensity slider
│   │   ├── HiShareSheet/    # Share modal
│   │   ├── HiStreaks/       # Streak display
│   │   └── HiUpgradeModal/  # Upgrade prompts
│   ├── admin/                # Admin panel pages
│   └── *.html                # Main app pages
├── scripts/                   # Build & utility scripts
├── docs/                      # Documentation (you are here!)
├── supabase/                  # Database migrations
└── *.sql                      # SQL deployment files
```

---

## 🏗️ Core Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  hi-dashboard.html │ hi-island-NEW.html │ hi-muscle.html │ etc  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      BOOT LAYER                                  │
│  dashboard-init.js │ island-main.mjs │ muscle-main.js │ etc     │
│  (Page-specific initialization & wiring)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    UI COMPONENT LAYER                            │
│  HiShareSheet │ HiFooter │ HiMedallion │ HiScale │ HiModal      │
│  (Reusable, encapsulated UI components)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    CORE SERVICES LAYER                           │
│  ProfileManager │ HiMembership │ HiDB │ HiBase │ TrialManager   │
│  (Business logic, state management, data access)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    AUTH & ACCESS LAYER                           │
│  HiSupabase.v3 │ AuthReady │ AccessGate │ HiMembershipBridge    │
│  (Authentication, authorization, session management)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      DATABASE LAYER                              │
│                    Supabase (PostgreSQL)                         │
│  profiles │ public_shares │ user_stats │ user_memberships │ etc │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User Opens │────▶│ HiSupabase   │────▶│ auth-resilience │
│    Page     │     │    .v3.js    │     │      .js        │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────────────────────▼─────────┐
                    │             AuthReady.js               │
                    │  - Waits for session                   │
                    │  - Fetches membership via RPC          │
                    │  - Emits 'hi:auth-ready' event         │
                    └──────────────────────────────┬─────────┘
                                                   │
      ┌────────────────────────────────────────────▼────────────────┐
      │                    hi:auth-ready event                       │
      │  { session: {...}, membership: { tier, is_admin, ... } }     │
      └────────────────────────────────────────────┬────────────────┘
                                                   │
         ┌─────────────┬─────────────┬─────────────┼─────────────┐
         ▼             ▼             ▼             ▼             ▼
   ProfileManager  HiMembership  TrialManager  AccessGate   UI Updates
```

### Share Submission Flow

```
┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Writes  │────▶│ HiShareSheet │────▶│ Validates   │
│   Message    │     │    .js       │     │   Input     │
└──────────────┘     └──────────────┘     └──────┬──────┘
                                                  │
                     ┌────────────────────────────▼─────────────┐
                     │                 HiDB.js                   │
                     │  insertPublicShare() / insertPrivateHi() │
                     └────────────────────────────┬─────────────┘
                                                  │
                     ┌────────────────────────────▼─────────────┐
                     │            Supabase RPC                   │
                     │  create_share_v2() → public_shares table  │
                     └────────────────────────────┬─────────────┘
                                                  │
                     ┌────────────────────────────▼─────────────┐
                     │         Database Trigger                  │
                     │  increment_total_hi() → global_stats      │
                     └────────────────────────────┬─────────────┘
                                                  │
                     ┌────────────────────────────▼─────────────┐
                     │       GoldStandardTracker.js              │
                     │  - Refreshes stats from DB                │
                     │  - Updates UI displays                    │
                     │  - Fires 'hi:share-recorded' event        │
                     └────────────────────────────┬─────────────┘
                                                  │
                              ┌────────────────────▼───────────┐
                              │  Premium celebrations          │
                              │  (confetti, milestones, etc)   │
                              └────────────────────────────────┘
```

---

## 📄 Page-by-Page Breakdown

### 🏠 hi-dashboard.html (Main Dashboard)

**Purpose:** Home screen showing user stats, streak, and quick actions

**Key Files:**
| File | Purpose |
|------|---------|
| `lib/boot/dashboard-init.js` | Floating systems, calendar init |
| `lib/boot/dashboard-main.js` | Navigation, stats, Hiffirmations modal |
| `lib/boot/dashboard-header-wire.js` | Header button wiring |
| `assets/premium-calendar.js` | 7-day activity pill |

**Load Order:**
1. HiSupabase.v3.js → Supabase client
2. ProfileManager.js → User identity
3. AuthReady.js → Session + membership
4. dashboard-init.js → Floating buttons, calendar
5. dashboard-main.js → Navigation, stats display

**Key DOM Elements:**
- `#hiffirmationsTrigger` - Opens Hiffirmations modal
- `#globalHiWaves`, `#globalTotalHis`, `#globalUsers` - Stats display
- `#userStreak` - Current streak
- `#weekly-progress-container` - 7-day activity dots

---

### 🏝️ hi-island-NEW.html (Community Feed + Map)

**Purpose:** View and share Hi moments with the community

**Key Files:**
| File | Purpose |
|------|---------|
| `lib/boot/island-main.mjs` | Feed loading, tab switching |
| `lib/boot/island-floating.js` | Floating button systems |
| `assets/island.js` | Map rendering with Leaflet |
| `components/hi-island-feed/` | Feed card components |

**Features:**
- Interactive map showing Hi moment locations
- Social feed with reactions
- Share filtering (all/anonymous/public)
- Real-time updates

---

### 💪 hi-muscle.html (Hi Gym)

**Purpose:** Emotional intelligence training - track emotional journeys

**Key Files:**
| File | Purpose |
|------|---------|
| `lib/boot/muscle-main.js` | Emotion selection, submission |
| `lib/boot/muscle-floating.js` | Floating systems |
| `assets/hi-gym.js` | Emotional analytics engine |
| `assets/emotions.js` | Emotion definitions |

**Flow:**
1. Select current emotion (where you are)
2. Select desired emotion (where you want to be)
3. Optionally write journal entry
4. Save privately or share publicly

---

### 👤 profile.html (User Profile)

**Purpose:** View and edit user profile, see personal stats

**Key Files:**
| File | Purpose |
|------|---------|
| `lib/boot/profile-main.js` | Profile data loading |
| `lib/boot/profile-navigation.js` | Back navigation, Hiffirmations |
| `lib/ProfileManager.js` | Profile state management |
| `assets/tesla-avatar-cropper.js` | Avatar upload & crop |

---

### 🎪 welcome.html (Onboarding)

**Purpose:** First-time user experience, invite code entry

**Key Files:**
| File | Purpose |
|------|---------|
| `lib/boot/welcome-*.js` | Various initialization modules |
| `ui/HiMedallion/` | Interactive tap medallion |

---

## 🔐 Authentication System

### Key Files

| File | Role |
|------|------|
| `lib/HiSupabase.v3.js` | **Supabase client factory** - Creates/manages client, handles BFCache |
| `lib/auth/auth-resilience.js` | **Session persistence** - Restores sessions from localStorage on mobile |
| `lib/AuthReady.js` | **Auth orchestrator** - Waits for session, fetches membership, fires event |
| `lib/ProfileManager.js` | **Identity source of truth** - Provides guaranteed user_id |
| `lib/access/AuthShim.js` | **Legacy compatibility** - Bridges old auth patterns |

### Auth State Sources

```javascript
// ✅ CORRECT: Use ProfileManager
const userId = await ProfileManager.ensureUserId();

// ✅ CORRECT: Listen for auth-ready
window.addEventListener('hi:auth-ready', (e) => {
  const { session, membership } = e.detail;
});

// ❌ AVOID: Direct Supabase calls (race conditions)
const { data } = await supabase.auth.getUser();
```

### Session Storage

| Key | Contents |
|-----|----------|
| `sb-access-token` | Supabase access token |
| `sb-refresh-token` | Supabase refresh token |
| `hi_membership_tier` | Cached tier (bronze, gold, etc) |
| `hi_membership_is_admin` | Cached admin flag (0 or 1) |

---

## 🎫 Membership & Tier System

### Tier Hierarchy

```
Level 1: free       → "Hi Explorer"    → 5 shares/month, private only
Level 2: bronze     → "Hi Pathfinder"  → 30 shares/month, public sharing
Level 3: silver     → "Hi Wayfinder"   → 100 shares/month, advanced features
Level 4: gold       → "Hi Trailblazer" → 500 shares/month, premium features
Level 5: premium    → "Hi Luminary"    → Unlimited, all features
Level 6: collective → "Hi Collective"  → Lifetime, admin access
```

### Key Files

| File | Role |
|------|------|
| `lib/config/TIER_CONFIG.js` | **Single source of truth** - All tier definitions |
| `lib/HiBrandTiers.js` | **UI rendering** - Tier badges, colors, gradients |
| `lib/membership/HiMembershipBridge.js` | **Event bridge** - Unifies membership signals |
| `lib/access/AccessGate.js` | **Access control** - Decides allow/block based on tier |
| `lib/trial/TrialManager.js` | **Trial system** - 14-day Bronze trial management |

### Tier Check Pattern

```javascript
// Get current membership
const membership = window.HiMembership.get();
// { tier: 'bronze', isAnonymous: false, is_admin: false }

// Check specific tier
if (['bronze', 'gold', 'premium', 'collective'].includes(membership.tier)) {
  // Paid user - unlock feature
}

// Check admin
if (window.HiMembership.isAdmin()) {
  // Show admin features
}
```

---

## 📡 Event System

### Core Events

| Event | Payload | Purpose |
|-------|---------|---------|
| `hi:auth-ready` | `{ session, membership, fromCache }` | Auth complete, safe to make authenticated requests |
| `hi:membership-changed` | `{ tier, isAnonymous, is_admin }` | Tier updated |
| `hi:share-recorded` | `{ type, origin, ... }` | New share submitted |
| `hi:streak-updated` | `{ streak, milestone }` | Streak changed |
| `hi:supabase-client-ready` | `{ client }` | Fresh Supabase client created |
| `membershipStatusChanged` | (legacy) | Backward compat membership event |

### Listening Pattern

```javascript
// Wait for auth to be ready before making requests
window.addEventListener('hi:auth-ready', async (e) => {
  const { session, membership } = e.detail;
  
  if (session) {
    // User is authenticated
    await loadUserData();
  } else {
    // Anonymous user
    showSignInPrompt();
  }
});
```

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (username, avatar, bio) |
| `public_shares` | All Hi moments (public + anonymous) |
| `hi_archives` | Private/personal Hi moments |
| `user_stats` | Per-user statistics |
| `global_stats` | App-wide statistics |
| `user_memberships` | Tier, trial dates, status |
| `user_streaks` | Streak data |
| `invitation_codes` | Invite code system |

### Key RPC Functions

| Function | Purpose |
|----------|---------|
| `get_unified_membership()` | Returns tier, is_admin, features |
| `get_global_stats()` | Returns total_his, hi_waves, total_users |
| `get_user_share_count(user_id)` | Count user's shares |
| `create_share_v2(...)` | Insert new share |
| `use_invite_code(code)` | Redeem invitation code |

### Triggers

| Trigger | On | Action |
|---------|----|----|
| `on_new_profile_increment_stats` | profiles INSERT | Increment total_users |
| `increment_total_hi` | public_shares INSERT | Increment total_his |
| `handle_new_user` | auth.users INSERT | Create profile row |

---

## 🧩 Component Library

### `/public/ui/` Components

| Component | File | Purpose |
|-----------|------|---------|
| **HiShareSheet** | `HiShareSheet/HiShareSheet.js` | Share modal with private/public/anonymous options |
| **HiFooter** | `HiFooter/HiFooter.js` | Bottom navigation bar |
| **HiMedallion** | `HiMedallion/HiMedallion.js` | Interactive tap circle |
| **HiScale** | `HiScale/HiScale.js` | Intensity slider (1-10) |
| **HiModal** | `HiModal/HiModal.css` | Base modal styles |
| **HiStreaks** | `HiStreaks/HiStreaks.js` | Streak display widget |
| **HiUpgradeModal** | `HiUpgradeModal/` | Tier upgrade prompts |
| **HiFeed** | `HiFeed/HiFeed.js` | Social feed rendering |

### `/public/components/` Components

| Component | Purpose |
|-----------|---------|
| `AccessGateModal.js` | Sign-in prompt for anonymous users |
| `HiShareableCard/` | Shareable quote card generator |
| `hi-calendar/` | Calendar view |
| `profile-preview-modal/` | Profile popup |

---

## 🚀 Boot Sequence

### Dashboard Boot Order

```
1. [CRITICAL] HTML <head> scripts load
   ├── HiSupabase.v3.js (Supabase client)
   ├── ProfileManager.js (Identity)
   ├── auth-resilience.js (Session restore)
   └── TIER_CONFIG.js (Tier definitions)

2. [AUTH] AuthReady.js fires
   ├── Waits for session
   ├── Calls get_unified_membership()
   └── Emits 'hi:auth-ready' event

3. [BOOT] dashboard-init.js runs
   ├── S-DASH anchors setup
   ├── Calendar initialization
   └── (Floating buttons disabled)

4. [MAIN] dashboard-main.js runs
   ├── Navigation handler setup
   ├── Stats display wiring
   ├── Hiffirmations handler setup
   └── Weekly progress initialization

5. [READY] Page interactive
```

### Key Boot Files by Page

| Page | Boot File |
|------|-----------|
| hi-dashboard.html | dashboard-init.js + dashboard-main.js |
| hi-island-NEW.html | island-main.mjs + island-floating.js |
| hi-muscle.html | muscle-main.js + muscle-floating.js |
| profile.html | profile-main.js + profile-navigation.js |
| welcome.html | welcome-*.js (multiple modules) |

---

## 🎯 Key Patterns & Conventions

### Singleton Pattern

```javascript
// ProfileManager uses singleton pattern
class ProfileManager {
  constructor() {
    if (ProfileManager.instance) {
      return ProfileManager.instance;
    }
    ProfileManager.instance = this;
  }
}
```

### IIFE Pattern (Non-Module Scripts)

```javascript
// Many lib files use IIFE to avoid global pollution
(function() {
  'use strict';
  
  // Private implementation
  function doSomething() { ... }
  
  // Expose public API
  window.HiMembership = { get, onChange, tier };
})();
```

### Event-Driven Architecture

```javascript
// Fire events for cross-module communication
window.dispatchEvent(new CustomEvent('hi:share-recorded', {
  detail: { type: 'public', origin: 'dashboard' }
}));
```

### Guard Clauses

```javascript
// Early returns prevent deep nesting
if (!userId) return;
if (!supabase) return;
if (this._initialized) return;
```

### Fallback Chains

```javascript
// Graceful degradation with multiple sources
const supabase = window.hiSupabase 
  || window.supabaseClient 
  || window.sb 
  || window.__HI_SUPABASE_CLIENT;
```

---

## 📝 Changelog

| Date | Change |
|------|--------|
| 2026-01-13 | Initial Hi Code Map created |

---

## 🔮 Future Additions

- [ ] Add Supabase database schema diagram
- [ ] Document all RLS policies
- [ ] Add troubleshooting section
- [ ] Document build/deploy process
- [ ] Add performance optimization notes

---

> **Maintained by:** Hi Development Team  
> **Questions?** Check ARCHITECTURE.md for high-level overview
