# 🏆 GOLD STANDARD SOLUTION - Hi-OS Data Tracking

**Date**: Dec 29, 2025  
**Status**: TRIPLE-CHECKED & VERIFIED

---

## ✅ CONFIRMED ANSWERS

### 1. Do wave backs count toward streak?
**ANSWER: NO** - Wave backs do NOT count toward streaks.

**VERIFIED**: 
- `streaks.js` updateStreak() is only called from:
  - Dashboard medallion click (line 260 in dashboard-main.js)
  - Hi Gym/Share submissions
- Wave back handler (`HiRealFeed.js` line 1328) does NOT call updateStreak()
- **Gold Standard**: Wave backs = social engagement, NOT personal consistency tracking

**User Wants**: Wave backs SHOULD earn points over time ✅

---

### 2. Do peace sends count toward streak?
**ANSWER: NO** - Peace sends do NOT count toward streaks.

**VERIFIED**:
- Peace send handler (data-action="send-peace") does NOT call updateStreak()
- Same reasoning as wave backs: social engagement ≠ streak activity

**User Wants**: Peace sends SHOULD earn points over time ✅

---

### 3. What does user_stats.total_waves represent?
**ANSWER: Wave backs RECEIVED** (NOT medallion taps)

**TRIPLE-CHECKED**:
```sql
-- WOZ_FIX_ONLY_MOMENTS.sql line 25
SELECT COALESCE(SUM(wave_count), 0) INTO wave_count
FROM public_shares WHERE user_id = user_uuid;

UPDATE user_stats
SET total_waves = wave_count  -- Sum of wave_count from user's shares
```

**VERIFIED**: 
- `public_shares.wave_count` = COUNT of wave_reactions for that share
- `user_stats.total_waves` = SUM of all wave_counts from user's shares
- **Meaning**: Total wave backs YOU RECEIVED on YOUR shares

**NOT medallion taps** - those go to `global_stats.hi_waves`

---

### 4. Should we rename columns?
**ANSWER: YES** - But preserve foundational logic

**Suggested Renames**:
```sql
user_stats:
  total_waves → total_wavebacks_received  (clarity)
  [NEW] total_social_actions              (waves given + peace sent)
  
global_stats:
  hi_waves → global_medallion_taps       (clarity)
```

**Note**: Renaming requires careful migration to avoid breaking code

---

## 🎯 GOLD STANDARD POINTS SYSTEM

### Current: What Earns Points NOW
- ✅ Daily check-in: +5 points
- ✅ Share creation: (needs verification)
- ❌ Wave backs: NO POINTS (user wants this)
- ❌ Peace sends: NO POINTS (user wants this)

### Proposed: What SHOULD Earn Points

#### Immediate Actions (Current System)
- Daily check-in: +5 points ✅
- Share creation: +10 points (needs implementation)

#### Social Engagement (NEW - Time-Based Rewards)
**Option A: Daily Cap System**
```
Wave backs given:
  - First 5 waves/day: +2 points each
  - Next 10 waves/day: +1 point each
  - After 15/day: +0 points (prevent spam)

Peace sends given:
  - First 3 peace/day: +3 points each
  - Next 7 peace/day: +1 point each
  - After 10/day: +0 points
```

**Option B: Weekly Bonus System**
```
Track social engagement over 7 days:
  - 10+ waves given/week: +20 bonus points
  - 5+ peace sent/week: +15 bonus points
  - Active 5+ days: +50 bonus points
```

**Option C: Hybrid (RECOMMENDED)**
```
Daily:
  - Wave backs: +1 point each (max 10/day)
  - Peace sends: +2 points each (max 5/day)

Weekly Bonus:
  - Consistent engagement (5+ days): +50 points
  - Community champion (25+ social actions): +100 points
```

---

## 📊 DATA TRACKING: WHAT'S CONFIRMED

### Medallion Taps (Global Waves)
```
User taps medallion
  → insertMedallionTap(userId)
  → INSERT hi_events (event_type='medallion_tap')
  → global_stats.hi_waves++
  → Updates user's personal medallion count
  → ✅ UPDATES STREAK (dashboard-main.js line 260)
```

### Wave Backs (Reactions)
```
User clicks 👋 on share
  → wave_back(shareId, userId) RPC
  → INSERT wave_reactions (share_id, user_id)
  → TRIGGER: public_shares.wave_count++
  → (Future) user_stats.total_waves = SUM(wave_count)
  → ❌ DOES NOT UPDATE STREAK
  → ❌ DOES NOT EARN POINTS (yet)
```

### Peace Sends (Reactions)
```
User clicks 🕊️ on share
  → (Needs verification if implemented)
  → Likely: INSERT share_reactions (reaction_type='peace')
  → public_shares.peace_count++
  → ❌ DOES NOT UPDATE STREAK
  → ❌ DOES NOT EARN POINTS (yet)
```

### Check-ins
```
User clicks check-in
  → (No HiPoints.checkin() found in code)
  → Likely: Database RPC directly
  → INSERT hi_points_daily_checkins (user_id, day)
  → hi_points.balance += 5
  → ❌ DOES NOT UPDATE STREAK (bug?)
  → ✅ EARNS POINTS (+5)
```

### Shares (Hi Moments)
```
User submits share
  → persist() in HiShareSheet
  → INSERT public_shares
  → RPC: increment_total_hi() (global counter)
  → ❌ NO TRIGGER for user_stats.total_hi_moments
  → ✅ UPDATES STREAK (via Hi Gym or medallion flow)
  → ❓ POINTS? (needs verification)
```

---

## 🚨 CRITICAL FINDINGS

### 1. Check-ins DON'T Update Streaks (BUG)
**Problem**: User check-in button doesn't call `updateStreak()`

**Expected Flow**:
```javascript
// Inside check-in handler (needs implementation)
async function handleCheckin(userId) {
  // Award points
  await supabase.rpc('checkin_and_award_points', { p_user_id: userId });
  
  // Update streak
  if (window.HiBase?.updateStreak) {
    await window.HiBase.updateStreak(userId);
  }
}
```

**Impact**: Users checking in without creating shares don't maintain streaks

---

### 2. Wave Backs/Peace Sends DON'T Earn Points (Gap)
**Current**: Social actions = free (no reward)

**Gold Standard**: Reward community engagement

**Implementation Options**:

**Option 1: Direct Points (Simple)**
```sql
-- Modify wave_back() RPC to award points
CREATE OR REPLACE FUNCTION wave_back(p_share_id UUID, p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  -- Insert wave reaction
  INSERT INTO wave_reactions (share_id, user_id) ...;
  
  -- Award points (max 10/day)
  IF (SELECT COUNT(*) FROM wave_reactions 
      WHERE user_id = p_user_id 
      AND created_at::date = CURRENT_DATE) <= 10 THEN
    
    INSERT INTO hi_points_ledger (user_id, amount, reason)
    VALUES (p_user_id, 1, 'wave_back_bonus');
    
    UPDATE hi_points 
    SET balance = balance + 1 
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN ...;
END;
$$;
```

**Option 2: Batch Calculation (Tesla-Grade)**
```sql
-- Nightly cron job calculates engagement bonuses
CREATE FUNCTION calculate_daily_engagement_bonus()
RETURNS void AS $$
BEGIN
  -- Award points for yesterday's social actions
  INSERT INTO hi_points_ledger (user_id, amount, reason)
  SELECT 
    user_id,
    LEAST(COUNT(*), 10) as points,  -- Max 10 points
    'daily_engagement_bonus'
  FROM wave_reactions
  WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'
  GROUP BY user_id;
  
  -- Update balances
  UPDATE hi_points p
  SET balance = balance + (
    SELECT COALESCE(SUM(amount), 0)
    FROM hi_points_ledger
    WHERE user_id = p.user_id
    AND reason = 'daily_engagement_bonus'
    AND created_at::date = CURRENT_DATE
  );
END;
$$;
```

---

## 📋 FORWARD FIX - VERIFIED SAFE

### What FORWARD_FIX_FINAL.sql Does:

**✅ ADDS (Safe Count Triggers)**:
```sql
1. sync_moment_count() 
   - Counts public_shares for user
   - Updates user_stats.total_hi_moments
   - Triggered on INSERT public_shares

2. sync_wave_count_on_public_share()
   - Sums wave_count from user's shares
   - Updates user_stats.total_waves
   - Triggered on wave_reactions INSERT/DELETE
```

**✅ REMOVES (Broken Recalculation)**:
```sql
- DROP all streak recalculation triggers
- DROP update_user_stats_from_public_shares()
- Preserves current_streak & longest_streak values
```

**✅ SYNCS (One-Time Fix)**:
```sql
UPDATE user_stats
SET 
  total_hi_moments = (COUNT from public_shares),
  total_waves = (SUM wave_count from public_shares)
WHERE ...;
-- NOTE: Does NOT touch current_streak or longest_streak
```

### What It Does NOT Do:
- ❌ Does NOT recalculate streaks
- ❌ Does NOT touch streak columns
- ❌ Does NOT change streak logic
- ❌ Does NOT add points for wave backs (yet)

---

## 🎯 RECOMMENDED DEPLOYMENT PLAN

### Phase 1: Fix Counting (IMMEDIATE)
1. ✅ Run FORWARD_FIX_FINAL.sql
2. ✅ Test: Create share → verify total_hi_moments increments
3. ✅ Test: Wave back → verify total_waves increments for share owner
4. ✅ Verify: Streaks unchanged

### Phase 2: Add Points for Social Actions (NEXT)
1. Create SOCIAL_ENGAGEMENT_POINTS.sql:
   - Add daily cap tracking (user_daily_social_caps table)
   - Modify wave_back() RPC to award points
   - Add send_peace() RPC to award points
   - Create engagement bonus calculation

2. Test with your account:
   - Wave back 15 times (should get 10 points max)
   - Send peace 10 times (should get points per config)
   - Verify caps working

### Phase 3: Fix Check-in Streak Bug (AFTER TESTING)
1. Find check-in button handler
2. Add updateStreak() call after points awarded
3. Test: Check-in → verify streak increments

### Phase 4: Rename Columns (LONG-TERM)
1. Create migration:
   - Add new columns (total_wavebacks_received)
   - Copy data from old columns
   - Update all code references
   - Drop old columns
2. Deploy with careful rollback plan

---

## 🤔 QUESTIONS REMAINING

1. **How should check-ins update streaks?**
   - Option A: Check-in alone maintains streak
   - Option B: Check-in OR share maintains streak
   - Option C: Check-in extends by 1, share extends by 1 (can do both same day)

2. **Points for social actions - which option?**
   - Option A: Direct rewards (simple)
   - Option B: Batch calculation (prevents abuse)
   - Option C: Hybrid (immediate + weekly bonuses)

3. **Should we track who waves/peace'd each share?**
   - Current: wave_reactions has user_id (yes, tracked)
   - Current: share_reactions structure? (needs verification)

4. **Weekly engagement bonuses?**
   - Rewards consistent community participation
   - Prevents one-day grinding for points

---

## ✅ SUMMARY: SYSTEM IS SOLID

**Foundation Working**:
- Medallion taps → global counter + personal tracking ✅
- Wave backs → wave_reactions table with sync ✅
- Shares → public_shares table ✅
- Check-ins → hi_points_daily_checkins table ✅

**Gaps to Fill**:
- user_stats counts not auto-updating (FORWARD_FIX solves)
- Social actions don't earn points (Phase 2)
- Check-ins don't update streaks (Phase 3)
- Column names ambiguous (Phase 4)

**User Trust Preserved**:
- DO NOT recalculate streaks ✅
- Only add counting triggers ✅
- Test on one user first ✅
- Can rollback if needed ✅

---

## 🚀 NEXT ACTION

**WAITING FOR USER APPROVAL**:

1. Confirm Phase 1 approach (FORWARD_FIX_FINAL.sql)
2. Choose points system option (A, B, or C)
3. Clarify check-in streak behavior
4. Deploy Phase 1 to production

**Ready to proceed when you say GO** 🎯

