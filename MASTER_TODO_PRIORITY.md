# 🎯 STAY HI - MASTER TODO PRIORITY LIST

**Last Updated**: December 28, 2025  
**Status**: Post-Points Deployment Phase

---

## 🔥 **CRITICAL - SHIP BEFORE BETA LAUNCH**

### 1. ✅ **Hi Points System** *(COMPLETED)*
- ✅ Daily check-in deployed
- ✅ Database tables live
- ✅ RLS policies active
- **Status**: Production-ready

### 2. 🚧 **Privacy Model Implementation** *(IN PROGRESS)*
- **Task**: Implement "Warm Privacy" model
- **What**: 
  - Others see: Username, avatar, "Active today", total waves sent, member since
  - Others DON'T see: Personal stats, streaks, moments, emotional data
  - Your profile: Full stats dashboard
- **Priority**: 🔥 **CRITICAL**
- **Reason**: Core to wellness app trust and user safety
- **ETA**: 2-4 hours implementation
- **Files**: 
  - `hi-island-NEW.html` (user modals)
  - `profile.html` (own profile view)
  - New: `ProfilePrivacy.js` library

### 3. 🚧 **Edit/Delete Post Functionality** *(PRIORITY #3)*
- **Task**: Time-limited edit/delete for Hi Moments
- **What**:
  - Edit window: 15 minutes after post
  - Delete window: 24 hours after post
  - After windows: Post becomes permanent
- **Priority**: 🔥 **HIGH**
- **Reason**: User control + wellness journal integrity balance
- **ETA**: 3-5 hours implementation
- **Technical**:
  - Add `created_at` checks in UI
  - Add edit/delete buttons with countdown timers
  - RPC: `update_hi_moment(id, content)` with time validation
  - RPC: `delete_hi_moment(id)` with 24hr validation
  - Update RLS policies to allow time-limited edits
- **Files**:
  - `hi_archives` table (already has `created_at`)
  - New UI components in share modals
  - Archive page edit/delete buttons

---

## 🟡 **HIGH PRIORITY - POST-BETA POLISH**

### 4. **Additional Points Sources**
- **Task**: Add points for sharing moments, completing activities
- **What**:
  - Share Hi Moment: +10 pts
  - Complete Hi Muscle: +15 pts
  - Send Hi Wave: +2 pts
- **Priority**: 🟡 **HIGH**
- **Reason**: Gamification loop completion
- **ETA**: 2-3 hours
- **Depends On**: Points system (✅ done)

### 5. **Streak Milestone Rewards**
- **Task**: Bonus points for streak achievements
- **What**:
  - 7-day streak: +50 pts
  - 30-day streak: +200 pts
  - Display milestone celebrations
- **Priority**: 🟡 **MEDIUM-HIGH**
- **ETA**: 2 hours

### 6. **Profile Stats Consistency Fix**
- **Task**: Ensure all pages load from `user_stats` table
- **What**:
  - Verify no localStorage fallbacks
  - Clear cache on logout
  - Single source of truth verification
- **Priority**: 🟡 **HIGH**
- **Status**: Needs verification testing
- **ETA**: 1 hour audit + fixes

---

## 🟢 **MEDIUM PRIORITY - ENHANCEMENT PHASE**

### 7. **Points History Viewer**
- **Task**: Expand "Recent Points" ledger
- **What**:
  - Show full transaction history
  - Filter by date/type
  - Export CSV option
- **Priority**: 🟢 **MEDIUM**
- **ETA**: 2-3 hours

### 8. **Profile Privacy Settings UI**
- **Task**: Let users control what's public
- **What**:
  - Toggle: Show my streak publicly
  - Toggle: Show my points publicly
  - Toggle: Show my milestones publicly
- **Priority**: 🟢 **MEDIUM**
- **Depends On**: Privacy model (#2)
- **ETA**: 2 hours

### 9. **Achievement System**
- **Task**: Make achievements dynamic (currently static HTML)
- **What**:
  - Create `user_achievements` table
  - Define achievement unlock conditions
  - Award achievements via triggers
  - Display earned achievements
- **Priority**: 🟢 **MEDIUM**
- **ETA**: 4-6 hours

### 10. **Archives Heatmap/Streak Visualization**
- **Task**: Connect archives section to data
- **What**:
  - Render streak heatmap from `hi_archives`
  - Show check-in calendar
  - Display active days graph
- **Priority**: 🟢 **MEDIUM**
- **ETA**: 3-4 hours

---

## 🔵 **LOW PRIORITY - FUTURE FEATURES**

### 11. **Points Shop/Redemption**
- **Task**: Let users spend points
- **What**:
  - Avatar accessories
  - Custom themes
  - Premium features unlock
- **Priority**: 🔵 **LOW**
- **ETA**: 8-10 hours

### 12. **Referral System**
- **Task**: Earn points for inviting friends
- **What**:
  - Generate referral codes
  - Track code usage
  - Award 100pts when friend joins
- **Priority**: 🔵 **LOW**
- **ETA**: 6-8 hours

### 13. **Community Leaderboard (Opt-In)**
- **Task**: Anonymous/named ranking
- **What**:
  - Weekly/monthly top users
  - Privacy-first (opt-in only)
  - Hide usernames option
- **Priority**: 🔵 **LOW**
- **ETA**: 4-5 hours

---

## 📊 **IMPLEMENTATION ROADMAP**

### **Week 1 (Pre-Beta)**
1. ✅ Points system (DONE)
2. 🚧 Privacy model (2-4 hours)
3. 🚧 Edit/delete posts (3-5 hours)
4. 🚧 Stats consistency fix (1 hour)

### **Week 2 (Beta Launch)**
5. Additional points sources (2-3 hours)
6. Streak milestones (2 hours)
7. Profile privacy settings (2 hours)

### **Week 3-4 (Post-Beta)**
8. Points history viewer
9. Achievement system
10. Archives visualization

### **Future (Based on User Feedback)**
11. Points shop
12. Referral system
13. Community leaderboard

---

## 🎯 **CURRENT FOCUS (Next 48 Hours)**

1. **Privacy Model** - Ship the "Warm Privacy" approach you approved
2. **Edit/Delete Posts** - Give users control with time limits
3. **Stats Fix** - Verify single source of truth everywhere

**Everything else can wait until after these three are solid.**

---

## 📝 **NOTES**

- All database tables for points system ✅ DEPLOYED
- Tesla-grade security (RLS) ✅ ACTIVE
- Profile data single source (ProfileManager) ✅ IMPLEMENTED
- Check-in button ✅ WORKING

**Foundation is SOLID. Now we polish the UX.**
