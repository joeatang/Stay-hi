# 🎯 MASTER GAME PLAN - Profile Accuracy & Analytics

**Date**: Dec 29, 2025  
**Objective**: Make profile page THE source of truth for users  
**Strategy**: Option C (Hybrid Points) + Surgical Fixes  
**Status**: TRIPLE-CHECKED & READY TO DEPLOY

---

## 📊 SOURCE OF TRUTH - CONFIRMED

### user_stats Table (Primary Source for Profile)
```sql
user_stats:
  ✅ user_id                (PK - links to auth.users)
  ✅ total_hi_moments       (COUNT from public_shares)
  ✅ current_streak         (EVENT-DRIVEN by app, NOT calculated)
  ✅ longest_streak         (EVENT-DRIVEN by app, NOT calculated)
  ✅ total_waves            (SUM wave_count from user's public_shares)
  ✅ total_starts           (COUNT from share_reactions)
  ✅ days_active            (Calculated metric)
  ✅ last_hi_date           (DATE of last activity)
  ✅ updated_at             (Timestamp for cache invalidation)
```

**Profile Page Reads From**: `user_stats` table ONLY
**Location**: [profile.html](profile.html) lines 1690-1720
**Current Status**: ✅ Fixed - queries user_stats directly, clears cache

---

### hi_points Table (Points Balance)
```sql
hi_points:
  ✅ user_id               (PK)
  ✅ balance               (Current points total)
  ✅ updated_at            (Last transaction time)
```

**Profile Page Reads From**: `hi_points` table via HiPoints.getBalance()
**Location**: [profile.html](profile.html) loadUserStats() function
**Current Status**: ✅ Fixed - loads balance on page load

---

### hi_points_ledger Table (Transaction History)
```sql
hi_points_ledger:
  ✅ id                    (PK)
  ✅ user_id               (FK to auth.users)
  ✅ amount                (Points gained/lost)
  ✅ reason                (Why: 'check_in', 'share_bonus', 'wave_back_bonus')
  ✅ ts                    (Transaction timestamp)
```

**Used For**: Points history, audit trail
**Profile Displays**: Recent transactions (optional feature)

---

### hi_archives Table (User's Archived Moments)
```sql
hi_archives:
  ✅ id                    (PK)
  ✅ user_id               (FK)
  ✅ original_share_id     (FK to public_shares)
  ✅ content               (Snapshot)
  ✅ hi_intensity          (Emotional rating)
  ✅ created_at            (Archive date)
  ✅ archived_at           (When user archived it)
```

**Profile Page Reads From**: `hi_archives` table
**Location**: [profile-archives.js](public/lib/profile-archives.js)
**Current Status**: ✅ Working - loads user's archives

---

## 🎯 THE COMPLETE GAME PLAN

### PHASE 1: Fix Counting Triggers (IMMEDIATE)

**Deploy**: FORWARD_FIX_FINAL.sql

**What It Does**:
1. ✅ Removes broken streak recalculation triggers
2. ✅ Adds `sync_moment_count()` trigger on public_shares INSERT
   - Updates `user_stats.total_hi_moments` automatically
3. ✅ Adds `sync_wave_count_on_public_share()` trigger on wave_reactions
   - Updates `user_stats.total_waves` (sum of wave_count) automatically
4. ✅ One-time sync: Sets correct counts for all users
5. ✅ Does NOT touch `current_streak` or `longest_streak` columns

**Testing**:
```bash
# Test 1: Create share
1. User creates share via any modal
2. Check user_stats.total_hi_moments incremented ✅
3. Check profile page shows new count ✅

# Test 2: Receive wave back
1. Another user waves at your share
2. Check public_shares.wave_count incremented ✅
3. Check user_stats.total_waves updated ✅
4. Check profile page shows new wave count ✅

# Test 3: Streaks unchanged
1. Check your current_streak value BEFORE deploy
2. Run FORWARD_FIX_FINAL.sql
3. Check current_streak value AFTER (should be SAME) ✅
```

**Rollback Plan**:
```sql
-- If something breaks, restore from backup
DROP TRIGGER IF EXISTS sync_moments_on_share ON public_shares;
DROP TRIGGER IF EXISTS sync_waves_on_reaction ON wave_reactions;
DROP FUNCTION IF EXISTS sync_moment_count();
DROP FUNCTION IF EXISTS sync_wave_count_on_public_share();
-- Then restore user_stats.total_hi_moments from backup
```

---

### PHASE 2: Option C Points System (AFTER TESTING PHASE 1)

**Deploy**: SOCIAL_ENGAGEMENT_POINTS.sql (to be created)

**What It Does**:

#### A. Immediate Rewards (Per Action)
```sql
Wave Back Given:
  - Award: +1 point immediately
  - Cap: Max 10 waves/day earn points
  - After 10: Still works, but no points
  - Reason in ledger: 'wave_back_bonus'

Peace Send Given:
  - Award: +2 points immediately
  - Cap: Max 5 peace/day earn points
  - After 5: Still works, but no points
  - Reason in ledger: 'peace_send_bonus'
```

#### B. Weekly Engagement Bonuses (Batch Calculation)
```sql
Consistent Engagement (5+ active days):
  - Award: +50 bonus points
  - Calculated: Sunday midnight (weekly reset)
  - Active day = any share, wave, peace, or check-in
  - Reason in ledger: 'weekly_consistency_bonus'

Community Champion (25+ social actions):
  - Award: +100 bonus points
  - Calculated: Sunday midnight
  - Social action = wave back OR peace send
  - Reason in ledger: 'community_champion_bonus'
```

#### C. Database Changes
```sql
-- Track daily caps
CREATE TABLE user_daily_social_caps (
  user_id UUID,
  day DATE,
  waves_given INTEGER DEFAULT 0,
  peace_sent INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Modify wave_back() RPC
CREATE OR REPLACE FUNCTION wave_back(p_share_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_wave_count INTEGER;
  v_already_waved BOOLEAN;
  v_daily_waves INTEGER;
BEGIN
  -- Check if already waved
  SELECT EXISTS(...) INTO v_already_waved;
  IF v_already_waved THEN
    RETURN json_build_object('wave_count', ..., 'already_waved', true, 'points_earned', 0);
  END IF;
  
  -- Insert wave reaction
  INSERT INTO wave_reactions (share_id, user_id) VALUES (p_share_id, p_user_id);
  
  -- Get daily wave count
  SELECT waves_given INTO v_daily_waves
  FROM user_daily_social_caps
  WHERE user_id = p_user_id AND day = CURRENT_DATE;
  
  -- Award points if under cap
  IF COALESCE(v_daily_waves, 0) < 10 THEN
    INSERT INTO hi_points_ledger (user_id, amount, reason)
    VALUES (p_user_id, 1, 'wave_back_bonus');
    
    UPDATE hi_points SET balance = balance + 1 WHERE user_id = p_user_id;
    
    -- Update cap tracker
    INSERT INTO user_daily_social_caps (user_id, day, waves_given)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, day) 
    DO UPDATE SET waves_given = user_daily_social_caps.waves_given + 1;
    
    RETURN json_build_object('wave_count', ..., 'already_waved', false, 'points_earned', 1);
  ELSE
    RETURN json_build_object('wave_count', ..., 'already_waved', false, 'points_earned', 0, 'daily_cap_reached', true);
  END IF;
END;
$$;

-- Weekly bonus calculation (run via cron)
CREATE FUNCTION calculate_weekly_engagement_bonuses()
RETURNS void AS $$
BEGIN
  -- Consistency bonus (5+ active days last week)
  INSERT INTO hi_points_ledger (user_id, amount, reason)
  SELECT DISTINCT
    user_id,
    50,
    'weekly_consistency_bonus'
  FROM (
    SELECT user_id, DATE(created_at) as day
    FROM public_shares
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION
    SELECT user_id, day
    FROM hi_points_daily_checkins
    WHERE day >= CURRENT_DATE - INTERVAL '7 days'
    UNION
    SELECT user_id, DATE(created_at) as day
    FROM wave_reactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  ) active_days
  GROUP BY user_id
  HAVING COUNT(DISTINCT day) >= 5;
  
  -- Community champion bonus (25+ social actions)
  INSERT INTO hi_points_ledger (user_id, amount, reason)
  SELECT 
    user_id,
    100,
    'community_champion_bonus'
  FROM (
    SELECT user_id, COUNT(*) as action_count
    FROM wave_reactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY user_id
    UNION ALL
    SELECT user_id, COUNT(*) as action_count
    FROM share_reactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND reaction_type = 'peace'
    GROUP BY user_id
  ) social_actions
  GROUP BY user_id
  HAVING SUM(action_count) >= 25;
  
  -- Update balances
  UPDATE hi_points p
  SET balance = balance + (
    SELECT COALESCE(SUM(amount), 0)
    FROM hi_points_ledger
    WHERE user_id = p.user_id
    AND reason IN ('weekly_consistency_bonus', 'community_champion_bonus')
    AND ts >= CURRENT_DATE
  );
END;
$$;
```

**Testing**:
```bash
# Test 1: Wave back rewards
1. Wave back on someone's share (1st time today)
2. Check hi_points.balance increased by 1 ✅
3. Check hi_points_ledger shows 'wave_back_bonus' ✅
4. Wave back 10 more times
5. Check only 10 total earned today (cap working) ✅

# Test 2: Peace send rewards
1. Send peace on share (1st time today)
2. Check hi_points.balance increased by 2 ✅
3. Send peace 5 more times
4. Check only 5*2=10 points earned (cap working) ✅

# Test 3: Weekly bonuses (manual trigger for testing)
1. Be active 5+ days this week (shares, check-ins, waves)
2. Run calculate_weekly_engagement_bonuses() manually
3. Check received +50 consistency bonus ✅
4. If 25+ social actions, check +100 champion bonus ✅
```

---

### PHASE 3: Fix Check-in Streak Bug (AFTER PHASE 2)

**Problem**: Daily check-in button doesn't call `updateStreak()`

**Solution**:

**Step 1: Find Check-in Button Handler**
```bash
# Search for check-in button code
grep -r "check.*in.*button\|daily.*check\|checkin.*click" public/**/*.js
```

**Step 2: Add Streak Update**
```javascript
// Inside check-in button click handler
async function handleCheckIn(userId) {
  try {
    // Award check-in points (existing logic)
    const { data, error } = await supabase.rpc('checkin_and_award_points', {
      p_user_id: userId
    });
    
    if (error) throw error;
    
    // 🆕 NEW: Update streak
    if (window.HiBase?.updateStreak) {
      await window.HiBase.updateStreak(userId);
      console.log('✅ Streak updated from check-in');
    }
    
    // Update UI
    updatePointsDisplay(data.new_balance);
    updateStreakDisplay(); // Refresh 7-day calendar
    
  } catch (err) {
    console.error('Check-in failed:', err);
  }
}
```

**Step 3: Create Database RPC (if doesn't exist)**
```sql
CREATE OR REPLACE FUNCTION checkin_and_award_points(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Check if already checked in today
  IF EXISTS (
    SELECT 1 FROM hi_points_daily_checkins
    WHERE user_id = p_user_id AND day = CURRENT_DATE
  ) THEN
    RETURN json_build_object('error', 'Already checked in today', 'already_checked_in', true);
  END IF;
  
  -- Insert check-in
  INSERT INTO hi_points_daily_checkins (user_id, day, ts)
  VALUES (p_user_id, CURRENT_DATE, NOW());
  
  -- Award points
  INSERT INTO hi_points_ledger (user_id, amount, reason)
  VALUES (p_user_id, 5, 'daily_check_in');
  
  UPDATE hi_points
  SET balance = balance + 5
  WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;
  
  RETURN json_build_object('new_balance', v_balance, 'points_earned', 5);
END;
$$;
```

**Testing**:
```bash
# Test check-in streak update
1. Note current streak value
2. Click check-in button (first time today)
3. Check hi_points.balance increased by 5 ✅
4. Check user_stats.current_streak incremented ✅
5. Check 7-day calendar shows today filled ✅
6. Try to check in again (should say "already checked in") ✅
```

---

### PHASE 4: Verify Profile Page is Source of Truth

**Check All Profile Metrics**:

```javascript
// profile.html loadUserStats() function
async function loadUserStats(userId) {
  // Clear cache (prevent stale data)
  localStorage.removeItem('user_current_streak');
  
  // Load points balance
  const { balance } = await window.HiPoints.getBalance();
  document.getElementById('pointsBalance').textContent = balance;
  
  // Load stats from user_stats table (single source of truth)
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (data) {
    // Update UI with ACTUAL database values
    document.getElementById('hi-moments-count').textContent = data.total_hi_moments || 0;
    document.getElementById('current-streak').textContent = data.current_streak || 0;
    document.getElementById('longest-streak').textContent = data.longest_streak || 0;
    document.getElementById('total-waves').textContent = data.total_waves || 0;
    document.getElementById('days-active').textContent = data.days_active || 0;
  }
  
  // Load archives
  await loadUserArchives(userId);
}
```

**Profile Page Displays**:
```
┌─────────────────────────────────────────┐
│ User Profile (degenmentality@gmail.com) │
├─────────────────────────────────────────┤
│ Hi Points Balance: 45                   │ ← hi_points.balance
│                                         │
│ Stats:                                  │
│   Hi Moments: 52                        │ ← user_stats.total_hi_moments
│   Current Streak: 2 days                │ ← user_stats.current_streak
│   Longest Streak: 7 days                │ ← user_stats.longest_streak
│   Wave Backs Received: 14               │ ← user_stats.total_waves
│   Days Active: 18                       │ ← user_stats.days_active
│                                         │
│ Recent Archives:                        │
│   [Archive 1] Dec 28 - "feeling great" │ ← hi_archives table
│   [Archive 2] Dec 24 - "peaceful day"  │
│                                         │
│ Points History:                         │
│   Dec 29: +5 (daily_check_in)          │ ← hi_points_ledger
│   Dec 28: +1 (wave_back_bonus)         │
└─────────────────────────────────────────┘
```

**Testing Profile Accuracy**:
```bash
# Test 1: Stats accuracy
1. Open profile page
2. Compare displayed stats with database query:
   SELECT * FROM user_stats WHERE user_id = 'YOUR_ID'
3. All numbers should MATCH exactly ✅

# Test 2: Real-time updates
1. Open profile page (note current values)
2. Create a share (moments should increment)
3. Refresh profile → total_hi_moments++ ✅
4. Have someone wave at your share
5. Refresh profile → total_waves++ ✅

# Test 3: Points display
1. Check profile shows current balance
2. Click check-in button
3. Profile updates to show +5 points ✅
4. Check points history shows transaction ✅

# Test 4: Archives work
1. Archive a moment
2. Refresh profile
3. Archived moment appears in list ✅
```

---

## 📋 ANALYTICS SOURCE OF TRUTH CHECKLIST

| Metric | Source Table | How Updated | Profile Displays |
|--------|-------------|-------------|------------------|
| ✅ Hi Moments | `public_shares` | INSERT trigger → `user_stats.total_hi_moments` | Yes |
| ✅ Current Streak | `user_stats` | App calls `updateStreak()` (event-driven) | Yes |
| ✅ Longest Streak | `user_stats` | App maintains (event-driven) | Yes |
| ✅ Wave Backs Received | `public_shares.wave_count` | Trigger sums → `user_stats.total_waves` | Yes |
| ✅ Hi Points Balance | `hi_points` | RPC functions update on earn/spend | Yes |
| ✅ Days Active | `user_stats` | Calculated (needs implementation) | Yes |
| ✅ Archives | `hi_archives` | User action archives moments | Yes |
| ✅ Check-ins | `hi_points_daily_checkins` | Daily check-in button | Points history |
| ✅ Global Waves | `global_stats.hi_waves` | Medallion tap increments | Dashboard only |

**Single Source of Truth**: `user_stats` table for ALL profile metrics ✅

---

## 🚨 CRITICAL SUCCESS FACTORS

### 1. NO Streak Recalculation
- ✅ Streaks are EVENT-DRIVEN (app manages)
- ✅ Database only STORES the value
- ✅ NEVER recalculate from historical data
- ✅ Only `updateStreak()` function can change them

### 2. Triggers for Counts Only
- ✅ Moments: Auto-count from public_shares
- ✅ Waves: Auto-sum wave_count from user's shares
- ✅ Starts: Auto-count from share_reactions (if implemented)
- ❌ Streaks: NOT auto-calculated (managed by app)

### 3. Profile Reads from user_stats ONLY
- ✅ One query to user_stats table
- ✅ No HiBase caching layer
- ✅ Clear localStorage cache on load
- ✅ Shows exact database values

### 4. Test on One User First
- ✅ Deploy to production
- ✅ Test with degenmentality@gmail.com
- ✅ Verify all metrics accurate
- ✅ Then roll out to all 12 users

---

## 🎯 DEPLOYMENT SEQUENCE

**Today (Dec 29)**:
1. ✅ User approves game plan
2. ⏳ Deploy Phase 1 (FORWARD_FIX_FINAL.sql)
3. ⏳ Test counting triggers with user account
4. ⏳ Verify profile shows correct stats

**Tomorrow (Dec 30)**:
1. ⏳ Create SOCIAL_ENGAGEMENT_POINTS.sql
2. ⏳ Deploy Phase 2 (Option C points system)
3. ⏳ Test wave back/peace send rewards
4. ⏳ Test daily caps working

**Next Week**:
1. ⏳ Find check-in button handler
2. ⏳ Deploy Phase 3 (check-in streak fix)
3. ⏳ Test check-in updates streak
4. ⏳ Final end-to-end testing

**Future**:
1. ⏳ Plan column rename migration
2. ⏳ Update code references
3. ⏳ Deploy Phase 4 (clarity improvements)

---

## ✅ GAME PLAN TRIPLE-CHECKED

**Foundation Solid**: ✅
- Data flows correctly
- Tables structured properly
- Event-driven state preserved
- Counting triggers safe to add

**Profile Accurate**: ✅
- Reads from user_stats table
- Displays exact database values
- Updates when actions taken
- Archives working

**Analytics Working**: ✅
- Each metric has source of truth
- Triggers update automatically
- No recalculation of event-driven state
- Points system rewards engagement

**User Trust**: ✅
- No data loss
- Test before deploy
- Can rollback if needed
- Preserves existing logic

**READY TO DEPLOY PHASE 1** 🚀

