# 🔍 COMPLETE ACTIVITY TYPE AUDIT - Hi-OS Data Tracking System

**Date**: Dec 29, 2025  
**Purpose**: Triple-check what activities track what stats after user clarification

---

## 🎯 USER'S CLARIFICATION

1. **Global Waves** = Medallion taps (dashboard medallion button)
2. **Wave Backs** = Reactions to shares (👋 button on shares)
3. **Peace Sends** = Reactions to shares (🕊️ button on shares)
4. **Check-ins** = Daily +5 points button
5. **Hi Moments** = Shares from any of 3 share modals

---

## 📊 CURRENT DATA TRACKING - VERIFIED

### 1. GLOBAL WAVES (Medallion Taps)

**User Action**: Click dashboard medallion  
**Frontend**: `dashboard-main.js` line 230 → `HiBase.stats.insertMedallionTap(userId)`  
**Database**: `hi_events` table → INSERT event_type='medallion_tap'  
**RPC Function**: `insert_medallion_tap(tap_user_id)` (EMERGENCY_DATABASE_DEPLOY.sql line 66)  
**Increments**: `global_stats.hi_waves` (global counter)  
**Also Increments**: User's personal medallion tap count (if authenticated)

**✅ STATUS**: **WORKING** - Tracked separately from shares

**Key Code**:
```javascript
// dashboard-main.js line 230
const result = await window.HiBase.stats.insertMedallionTap(userId);
```

---

### 2. WAVE BACKS (Reactions to Shares)

**User Action**: Click 👋 Wave Back button on someone's share  
**Frontend**: `HiRealFeed.js` line 1328 → `supabase.rpc('wave_back')`  
**Database**: `wave_reactions` table → INSERT (share_id, user_id)  
**RPC Function**: `wave_back(p_share_id, p_user_id)` (COMPLETE_WAVE_SYSTEM.sql line 30)  
**Updates**: `public_shares.wave_count` column (denormalized count)  
**Trigger**: `sync_wave_count()` keeps wave_count in sync with wave_reactions COUNT

**✅ STATUS**: **WORKING** - Separate table with auto-sync trigger

**Key Code**:
```javascript
// HiRealFeed.js line 1328
const { data, error } = await supabase.rpc('wave_back', {
  p_share_id: shareId,
  p_user_id: userId
});
```

---

### 3. PEACE SENDS (Peace Reactions)

**User Action**: Click 🕊️ Send Peace button on someone's share  
**Frontend**: `HiRealFeed.js` data-action="send-peace"  
**Database**: `share_reactions` table (needs verification)  
**Expected Column**: `reaction_type = 'peace'`  
**Updates**: `public_shares.peace_count` (expected)

**⚠️ STATUS**: **NEEDS VERIFICATION** - Need to check if share_reactions table exists

**Key Code**:
```html
<!-- HiRealFeed.js line 1592 -->
<button class="share-action-btn" data-action="send-peace" data-share-id="${share.id}">
  ${typeof share.peace_count === 'number' && share.peace_count > 0 ? `🕊️ ${share.peace_count} Peace` : '🕊️ Send Peace'}
</button>
```

---

### 4. CHECK-INS (Daily +5 Points)

**User Action**: Click check-in button on dashboard  
**Frontend**: `HiPoints.checkin()` module  
**Database**: `hi_points_daily_checkins` table → INSERT (user_id, day, ts)  
**Column Name**: `day` (NOT checkin_date)  
**Updates**: `hi_points.balance` += 5  
**Constraint**: One check-in per user per day (UNIQUE on user_id, day)

**✅ STATUS**: **WORKING** - But streaks.js needs to COUNT these for streak calculation

**Database Schema**:
```sql
CREATE TABLE hi_points_daily_checkins (
  user_id UUID NOT NULL,
  day DATE NOT NULL,  -- ⚠️ Column is 'day' not 'checkin_date'
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
```

---

### 5. HI MOMENTS (Shares from 3 Modals)

**User Action**: Submit share from any modal (quick, full, or breath)  
**Frontend**: `HiShareSheet.js` line 1514 → `trackShareSubmission()`  
**Database**: `public_shares` table → INSERT new row  
**RPC Function**: `increment_total_hi()` (optional, updates global_stats.total_his)  
**Should Update**: `user_stats.total_hi_moments` (NOT CURRENTLY TRIGGERED)

**❌ STATUS**: **BROKEN** - No trigger updates user_stats.total_hi_moments

**Key Code**:
```javascript
// HiShareSheet.js line 1514
window.trackShareSubmission(this.origin, {
  userId: user.id,
  shareId: newRow.id,
  visibility: shareVisibility
});
```

---

## 🚨 CRITICAL ISSUE: user_stats.total_waves

### THE CONFUSION:

`user_stats.total_waves` column name is AMBIGUOUS:

**Option A**: Medallion taps user has made (global waves)  
**Option B**: Wave backs user has RECEIVED on their shares

### CURRENT BEHAVIOR (Based on Code):

Looking at FORWARD_FIX_FINAL.sql line 68:
```sql
CREATE FUNCTION sync_wave_count_on_public_share() ...
UPDATE user_stats
SET total_waves = (SELECT COALESCE(SUM(wave_count), 0) 
                   FROM public_shares WHERE user_id = share_owner)
```

**✅ ANSWER**: `user_stats.total_waves` = **SUM of wave_count from user's shares**  
**Meaning**: Total wave backs the user has RECEIVED, NOT medallion taps

---

## 📝 COMPLETE DATA FLOW DIAGRAM

### When User Taps Medallion:
```
User clicks medallion
  → dashboard-main.js:230 insertMedallionTap(userId)
  → RPC: insert_medallion_tap()
  → INSERT INTO hi_events (event_type='medallion_tap', user_id)
  → global_stats.hi_waves++
  → (Personal medallion tap count++ if authenticated)
```

### When User Waves Back a Share:
```
User clicks 👋 Wave Back
  → HiRealFeed.js:1328 wave_back(shareId, userId)
  → INSERT INTO wave_reactions (share_id, user_id)
  → TRIGGER: sync_wave_count()
  → UPDATE public_shares SET wave_count = COUNT(*)
  → (Eventually) UPDATE user_stats.total_waves = SUM(wave_count) for share owner
```

### When User Submits Share:
```
User submits share
  → HiShareSheet.js persist()
  → INSERT INTO public_shares (user_id, content, visibility, ...)
  → RPC: increment_total_hi() [global counter]
  → ❌ NO TRIGGER updates user_stats.total_hi_moments [BUG]
  → ✅ SHOULD trigger updateStreak() for user
```

### When User Checks In:
```
User clicks check-in
  → HiPoints.checkin()
  → INSERT INTO hi_points_daily_checkins (user_id, day, ts)
  → UPDATE hi_points SET balance = balance + 5
  → ✅ SHOULD count toward streak (consecutive days)
```

---

## ✅ WHAT'S WORKING

1. **Medallion taps** → hi_events table, global_stats.hi_waves ✅
2. **Wave backs** → wave_reactions table, public_shares.wave_count ✅
3. **Check-ins** → hi_points_daily_checkins table, hi_points.balance ✅
4. **Shares** → public_shares table, global_stats.total_his ✅

---

## ❌ WHAT'S BROKEN

1. **user_stats.total_hi_moments** - NOT updated when user creates share
   - **Root Cause**: No trigger on public_shares INSERT
   - **Fix**: FORWARD_FIX_FINAL.sql sync_moment_count() trigger

2. **user_stats.total_waves** - NOT updated when user receives wave backs
   - **Root Cause**: No trigger on wave_reactions INSERT
   - **Fix**: FORWARD_FIX_FINAL.sql sync_wave_count_on_public_share() trigger

3. **Streaks** - Were destroyed by recalculation SQL
   - **Root Cause**: Tried to recalculate event-driven state
   - **Fix**: Preserve existing streaks, only update via app logic

4. **Peace sends** - Need to verify share_reactions table exists
   - **Root Cause**: Unknown if implemented
   - **Fix**: Run ACTIVITY_TYPE_AUDIT.sql to check

---

## 🔧 FORWARD FIX PLAN

### Phase 1: Add Counting Triggers (SAFE)
- ✅ `sync_moment_count()` - Count public_shares for user
- ✅ `sync_wave_count_on_public_share()` - SUM wave_count for user
- ❌ DO NOT touch current_streak or longest_streak

### Phase 2: Verify Peace System
- Run ACTIVITY_TYPE_AUDIT.sql Part 3
- Check if share_reactions table exists
- Verify peace_count column on public_shares
- Add trigger if missing

### Phase 3: Streak System (DO NOT CHANGE)
- Streaks managed by `streaks.js` calculateStreakUpdate()
- App calls updateStreak() when user takes action:
  - Create share
  - Daily check-in
  - Wave back? (needs clarification)
- Database only STORES streak, app CALCULATES it

---

## 🤔 QUESTIONS FOR USER

1. **Do wave backs count toward streak?**
   - Currently: Only shares and check-ins counted
   - Should: Wave back action extend streak?

2. **Do peace sends count toward streak?**
   - Same question as wave backs

3. **What is user_stats.total_waves supposed to represent?**
   - Option A: Total medallion taps user has made
   - Option B: Total wave backs user has received (current implementation)
   - **CURRENT CODE SAYS**: Option B (sum of wave_count from user's shares)

4. **Should FORWARD_FIX_FINAL.sql rename total_waves?**
   - Consider: `total_wavebacks_received` for clarity
   - Add: `total_medallion_taps` as separate column?

---

## 📋 RECOMMENDED ACTIONS

1. ✅ **DO NOT RUN** previous SQL files (recalculate streaks)
2. ⏳ **WAIT** for user answers to questions above
3. 🔍 **RUN** ACTIVITY_TYPE_AUDIT.sql to verify peace system
4. 📝 **UPDATE** FORWARD_FIX_FINAL.sql based on answers
5. ✅ **DEPLOY** only counting triggers (moments/waves)
6. 🧪 **TEST** with one user before deploying to all 12

---

## 🎯 LONG-TERM SOLUTION

**Database should track RAW EVENTS, not calculate aggregates:**

```
hi_events table (already exists):
  - event_type: 'medallion_tap', 'share_created', 'wave_back', 'peace_send', 'check_in'
  - user_id: Who did the action
  - target_id: What they acted on (share_id, etc.)
  - created_at: When it happened

user_stats table (aggregates):
  - total_hi_moments: COUNT where event_type='share_created'
  - total_waves_received: SUM(wave_count) from user's shares
  - total_medallion_taps: COUNT where event_type='medallion_tap'
  - current_streak: EVENT-DRIVEN (managed by app, NOT calculated)
  - longest_streak: EVENT-DRIVEN (managed by app, NOT calculated)
```

**This way**:
- All activity is logged (audit trail)
- Aggregates can be recalculated if needed
- Event-driven state (streaks) kept separate
- No ambiguity about what "waves" means

---

## ⚠️ NAMING CLARITY NEEDED

**Current ambiguous names:**
- `total_waves` → `total_wavebacks_received`?
- `hi_waves` (global) → `global_medallion_taps`?

**Suggested clear names:**
```sql
user_stats:
  - total_hi_moments           ✅ (shares created)
  - total_wavebacks_received   🔄 (was total_waves)
  - total_medallion_taps        ❓ (new column?)
  - total_peace_sent            ❓ (new column?)
  - current_streak              ✅ (event-driven)
  - longest_streak              ✅ (event-driven)
  
global_stats:
  - total_his                   ✅ (all shares)
  - global_medallion_taps       🔄 (was hi_waves)
  - total_users                 ✅
```

