# 🎯 STAY HI - SOURCES OF TRUTH & SYSTEM STANDARDS

**Purpose**: This document defines the single sources of truth for all systems in the Stay Hi app. Reference this to maintain consistency and avoid conflicting implementations.

---

## 📊 **TIER SYSTEM - SINGLE SOURCE OF TRUTH**

### **Frontend Source**: `/public/lib/config/TIER_CONFIG.js`
- **Status**: ✅ DEPLOYED (All 7 HTML pages load this)
- **Tiers Defined**: free, bronze, silver, gold, premium, collective (6 tiers)
- **What It Controls**:
  - Features per tier (shareCreation, hiMedallionInteractions, mapAccess, etc.)
  - Trial days (0, 7, 14, 21, 30, 90)
  - Pricing ($0, $5.55, $15.55, $25.55, $55.55, $155.55)
  - Display names, emojis, colors, CTAs
  - Capabilities (canAccessFeature(), getTierRank(), isAtLeast())

### **Database Source**: `DEPLOY_MASTER_TIER_SYSTEM.sql`
- **Status**: ⚠️ NOT YET DEPLOYED (must run in Supabase SQL Editor)
- **Functions Updated**:
  1. `admin_generate_invite_code(p_tier, p_trial_days, p_max_uses, p_expires_in_hours)`
  2. `use_invite_code(p_code, p_user_id)` → writes to `user_memberships`
  3. `get_unified_membership()` → reads from `user_memberships`
- **Critical Tables**:
  - `invitation_codes`: stores `grants_tier`, `trial_days`
  - `user_memberships`: stores `tier`, `trial_start`, `trial_end`, `trial_days_total`
  - **NOT** `hi_members` (legacy table - DO NOT USE)

### **Mission Control**: `/public/hi-mission-control.html`
- **Component**: `InviteCodeModal.js` (lines 28-48)
- **UI**: Tier dropdown with all 6 tiers, custom trial days input
- **RPC Call**: Passes `p_tier` and `p_trial_days` to `admin_generate_invite_code()`

### **❌ ANTI-PATTERNS** (DO NOT USE):
```javascript
// WRONG - Hardcoded tier checks (legacy floating.js files)
if (userTier === 'PREMIUM') // ❌ OLD PATTERN
if (userTier === 'STANDARD') // ❌ OLD PATTERN

// RIGHT - Use TIER_CONFIG.js
const canShare = window.HiTierConfig?.canAccessFeature(tier, 'shareCreation');
const features = window.HiTierConfig?.getTierFeatures(tier);
```

**Legacy Files With Hardcoded Tiers** (NEEDS CLEANUP):
- `/public/lib/boot/dashboard-init.js` (150+ references to 'PREMIUM'/'STANDARD')
- `/public/lib/boot/muscle-floating.js` (30+ hardcoded checks)
- `/public/lib/boot/island-floating.js` (25+ hardcoded checks)

---

## 🎨 **SHARE MODAL - SINGLE SOURCE OF TRUTH**

### **Component**: `/public/ui/HiShareSheet/HiShareSheet.js`
- **Version**: v2.1.0-auth (with authentication detection)
- **Status**: ✅ DEPLOYED (fixed Nov 22, 2025)
- **Used By**: hi-dashboard.html, hi-island-NEW.html, hi-muscle.html

### **Standard Structure (Authenticated Users)**:
```html
1. Save Privately 🔒
   - Destination: My Archive only (private)
   - Visibility: Private
   
2. Share Anonymously 🥸
   - Destination: Hi Island public feed + My Archive
   - Visibility: Anonymous (city/state only, no profile)
   
3. Share Publicly 🌟
   - Destination: Hi Island public feed + My Archive
   - Visibility: Public (with profile, city/state location)
```

### **Standard Structure (Anonymous Users)**:
```html
1. Save Privately 🔒
   - Destination: Local storage (no database)
   
2. Join Community to Share ✨
   - Action: Opens auth modal (signup/sign-in prompt)
```

### **Authentication Detection**:
- Method: `checkAuthentication()` checks Supabase session, `window.__hiAuth`, `window.__hiMembership`
- Called: On every `open()` via `updateShareOptionsForAuthState()`
- Shows/Hides: Auth prompt vs Anonymous/Public buttons dynamically

### **❌ DO NOT**:
- Show "Join Community" button to authenticated users
- Remove "Share Anonymously" option
- Create custom share modals (use HiShareSheet.js)

---

## 🎯 **HEADER STRUCTURE - TESLA-GRADE STANDARD**

### **Universal Header Specs**:
```css
.tesla-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px; /* Fixed across all pages */
  background: rgba(15, 16, 34, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  z-index: 1000;
}
```

### **Header Layout (3-Section Grid)**:
```
| LEFT (60-90px)    | CENTER (flex:1)      | RIGHT (140-220px)  |
|-------------------|----------------------|-------------------|
| Calendar btn      | Brand logo + text    | Tier + Menu       |
| Home btn (some)   | (24-32px logo)       | (2 elements max)  |
```

### **Brand Logo Standard**:
```css
.brand-hi-logo {
  width: 24px;  /* Dashboard, Profile */
  height: 24px;
  /* OR */
  width: 32px;  /* Some pages use 32px */
  height: 32px;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: #FFD166;
  letter-spacing: -0.5px;
}
```

### **Pages Using Standard Header**:
- ✅ hi-dashboard.html (60px, 32px logo)
- ✅ profile.html (60px, 24px logo)
- ✅ hi-island-NEW.html (60px header)
- ✅ hi-muscle.html (60px header)
- ⚠️ welcome.html, signup.html (different structure)

### **Mobile Responsive**:
```css
@media (max-width: 480px) {
  .tesla-header {
    padding: 0 12px;
    height: 56px; /* Slightly smaller on mobile */
  }
  
  .brand-hi-logo {
    width: 20px;
    height: 20px;
  }
}
```

---

## 🔐 **AUTHENTICATION FLOW**

### **Sign In Page**: `/public/signin.html`
- **Primary Method**: Magic link (passwordless email)
- **Secondary Options**:
  - "I have an invite code" → Essential for tier system
  - "Use 6-digit email code" → Optional (consider removing)
- **PWA Issue**: Email links open in browser (not PWA)
- **Recommendation**: Add direct username/password login for PWA users

### **Auth Check Sources**:
```javascript
// Method 1: Supabase session
const { data: { session } } = await window.sb.auth.getSession();
if (session?.user) return true;

// Method 2: Global auth state
if (window.__hiAuth?.user || window.__currentUser) return true;

// Method 3: Membership tier (non-free = authenticated)
if (window.__hiMembership?.tier && window.__hiMembership.tier !== 'free') return true;
```

---

## 📦 **DATA FLOW ARCHITECTURE**

### **Tier Assignment Flow**:
```
1. Mission Control → admin_generate_invite_code(p_tier='bronze')
   ↓
2. Database → invitation_codes.grants_tier='bronze', trial_days=7
   ↓
3. Signup → use_invite_code(p_code)
   ↓
4. Database → user_memberships.tier='bronze', trial_end=NOW()+7 days
   ↓
5. Dashboard → get_unified_membership() returns tier='bronze'
   ↓
6. Frontend → HiMembership.js adds features from TIER_CONFIG.js
   ↓
7. Feature Check → canAccess('shareCreation') checks features.shareCreation
```

### **Critical Integration Points**:
1. **Mission Control UI** → Must pass `p_tier` parameter (✅ DONE)
2. **Database Functions** → Must NOT hardcode tier values (⚠️ PENDING DEPLOYMENT)
3. **Frontend Display** → Must read from TIER_CONFIG.js (✅ DONE)
4. **Access Control** → Must check `window.__hiMembership.features` (✅ DONE)

---

## 🚨 **CRITICAL ISSUES IDENTIFIED**

### **1. Database NOT Deployed** (BLOCKING)
- **Issue**: DEPLOY_MASTER_TIER_SYSTEM.sql has NOT been run
- **Evidence**: User used 1hr code hours later, still worked (hardcoded 30-day trial still active)
- **Impact**: All invite codes grant 'premium' tier with 30-day trial regardless of Mission Control selection
- **Fix**: Run DEPLOY_MASTER_TIER_SYSTEM.sql in Supabase SQL Editor

### **2. Legacy Tier Checks** (CLEANUP NEEDED)
- **Files**: dashboard-init.js, muscle-floating.js, island-floating.js
- **Issue**: 150+ references to 'PREMIUM'/'STANDARD' (old 2-tier system)
- **Impact**: Features may not work correctly for bronze/silver/gold tiers
- **Fix**: Refactor to use `window.HiTierConfig.canAccessFeature()`

### **3. Share Modal Authentication** (FIXED ✅)
- **Issue**: All users saw "Join Community" button, missing "Share Anonymously"
- **Fix**: Added `checkAuthentication()` and `updateShareOptionsForAuthState()`
- **Status**: Deployed Nov 22, 2025

### **4. Hi Muscle 404 Issue** (PENDING DIAGNOSIS)
- **Symptoms**: Blank modal appears, any click redirects to 404
- **Hypothesis**: Modal initialization conflict OR global click handler
- **Need**: Check HiGoldStandardModal auto-init, backdrop click propagation

### **5. Profile Mobile Header** (PENDING DIAGNOSIS)
- **Symptoms**: Enlarged logo/broken header on mobile
- **Current CSS**: Logo 24px, header 60px (correct)
- **Hypothesis**: Duplicate header elements OR z-index stacking
- **Need**: Check for overlapping headers, media query overrides

---

## 🎯 **DEPLOYMENT CHECKLIST**

### **Before ANY Major Changes**:
- [ ] Check TIER_CONFIG.js is loaded on page (`window.HiTierConfig` exists)
- [ ] Verify HiShareSheet.js v2.1.0+ is used (has authentication detection)
- [ ] Ensure header follows Tesla-grade 60px standard
- [ ] Test with authenticated AND anonymous users
- [ ] Check mobile responsive behavior

### **Tier System Deployment**:
1. [ ] Deploy DEPLOY_MASTER_TIER_SYSTEM.sql to Supabase
2. [ ] Test: Generate bronze code in Mission Control
3. [ ] Verify: `SELECT code, grants_tier, trial_days FROM invitation_codes;` shows 'bronze', 7
4. [ ] Test: Signup with bronze code in incognito
5. [ ] Verify: `SELECT tier, trial_end FROM user_memberships;` shows 'bronze', NOW()+7 days
6. [ ] Test: Dashboard shows "Bronze" tier indicator
7. [ ] Test: Share modal shows 3 options (Private, Anonymous, Public)

---

## 💬 **HOW TO TELL ME TO MAINTAIN STANDARDS**

### **When Asking for Changes**:
```
"Please implement [feature] while maintaining our sources of truth:
- Use TIER_CONFIG.js for all tier-related logic
- Use HiShareSheet.js v2.1.0+ for share modals
- Follow Tesla-grade header structure (60px, 3-section layout)
- Ensure authentication detection works for anon/auth users"
```

### **When Debugging Issues**:
```
"Check against our sources of truth documentation (SOURCES_OF_TRUTH.md):
- Is TIER_CONFIG.js loaded on this page?
- Does HiShareSheet have authentication detection?
- Does the header follow 60px Tesla-grade standard?
- Are we querying user_memberships (not hi_members)?"
```

### **When Auditing Code**:
```
"Audit [system] against SOURCES_OF_TRUTH.md and flag:
- Any hardcoded tier checks (PREMIUM/STANDARD)
- Any share modals not using HiShareSheet.js
- Any headers not following 60px standard
- Any database queries to hi_members table"
```

---

## 📚 **KEY FILES REFERENCE**

### **Tier System**:
- Frontend: `/public/lib/config/TIER_CONFIG.js` (✅ loaded on all pages)
- Database: `/DEPLOY_MASTER_TIER_SYSTEM.sql` (⚠️ not deployed)
- UI: `/public/lib/admin/InviteCodeModal.js` (✅ passes p_tier)
- Access: `/public/lib/HiMembership.js` (✅ imports from TIER_CONFIG)

### **Share Modal**:
- Component: `/public/ui/HiShareSheet/HiShareSheet.js` v2.1.0-auth (✅ auth detection)
- CSS: `/public/ui/HiShareSheet/HiShareSheet.css`
- Init: Dashboard: `dashboard-main.mjs`, Island: `island-sharesheet-global.mjs`, Muscle: inline

### **Headers**:
- Standard CSS: `/public/lib/navigation/HiStandardNavigation.css`
- Component: `/public/ui/HiHeader/HiHeader.js` (some pages)
- Inline: Most pages define `.tesla-header` in `<style>` block

### **Authentication**:
- Sign In: `/public/signin.html`
- Signup: `/public/signup.html` (with invite code support)
- Auth Shim: `/public/lib/access/AuthShim.js`
- Membership: `/public/lib/HiMembership.js`

---

## 🔄 **VERSION HISTORY**

- **Nov 22, 2025**: Created SOURCES_OF_TRUTH.md
- **Nov 22, 2025**: Fixed HiShareSheet authentication detection (v2.1.0-auth)
- **Nov 22, 2025**: Fixed profile.html broken script tag
- **Nov 22, 2025**: Identified database deployment blocker (DEPLOY_MASTER_TIER_SYSTEM.sql)

---

**Remember**: When in doubt, reference this document. These are the ONLY sources of truth for the Stay Hi app architecture.
