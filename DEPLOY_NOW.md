# 🚀 PHASE 1 DEPLOYMENT INSTRUCTIONS

## Before Running SQL:

**Backup Current Streak Values:**
```sql
-- Run this FIRST in Supabase SQL Editor to save current values
SELECT 
  user_id,
  current_streak,
  longest_streak,
  total_hi_moments,
  total_waves
FROM user_stats
ORDER BY user_id;
```

**Save the results** - if anything breaks, we can restore streaks from this backup.

---

## Deploy FORWARD_FIX_FINAL.sql:

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of FORWARD_FIX_FINAL.sql
3. Paste into SQL Editor
4. Click "Run" (or Cmd+Enter)

**Expected Output:**
```
✅ Triggers dropped (cleanup)
✅ sync_moment_count() created
✅ Trigger sync_moments_on_share created
✅ sync_wave_count_on_public_share() created
✅ Trigger sync_waves_on_reaction created
✅ UPDATE user_stats executed (synced counts)
✅ Final SELECT shows your stats
```

---

## Verification (Step 5 already in SQL):

**Your Stats Should Show:**
```
user_id: 68d6ac30-742a-47b4-b1d7-0631bf7a2ec6
total_hi_moments: 52 ✅ (was 1, now correct)
current_streak: 2 ✅ (UNCHANGED from before)
longest_streak: 7 ✅ (UNCHANGED from before) 
total_waves: 14 ✅ (correct sum of wave_count)
updated_at: [just now]
```

**🚨 CRITICAL CHECK:**
- If current_streak or longest_streak CHANGED → STOP, rollback
- If they stayed same → SUCCESS ✅

---

## Test Triggers Working:

### Test 1: Create a Share
```bash
1. Go to dashboard
2. Create any share (quick Hi, breath moment, or full share)
3. Run this SQL:
   SELECT total_hi_moments FROM user_stats 
   WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
4. Should show 53 (was 52, now incremented) ✅
```

### Test 2: Get Wave Back (Need Another User)
```bash
1. Have someone wave at one of your shares
   (or create test account to wave at yourself)
2. Run this SQL:
   SELECT total_waves FROM user_stats
   WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
3. Should show 15 (was 14, now incremented) ✅
```

### Test 3: Profile Page
```bash
1. Refresh profile page
2. Check displayed stats match database values ✅
```

---

## If Something Goes Wrong:

**Rollback Plan:**
```sql
-- Drop the new triggers
DROP TRIGGER IF EXISTS sync_moments_on_share ON public_shares;
DROP TRIGGER IF EXISTS sync_waves_on_reaction ON wave_reactions;
DROP FUNCTION IF EXISTS sync_moment_count();
DROP FUNCTION IF EXISTS sync_wave_count_on_public_share();

-- Restore streak values from backup (if they changed)
UPDATE user_stats
SET 
  current_streak = [backup_value],
  longest_streak = [backup_value]
WHERE user_id = '68d6ac30-742a-47b4-b1d7-0631bf7a2ec6';
```

---

## Success Criteria:

- ✅ SQL runs without errors
- ✅ Streaks UNCHANGED (current_streak still 2, longest_streak still 7)
- ✅ Moments count now accurate (52)
- ✅ Waves count now accurate (14)
- ✅ Creating share increments moments
- ✅ Receiving wave increments waves
- ✅ Profile page shows correct values

**If all checks pass → Phase 1 COMPLETE** 🎉

**Next:** Create SOCIAL_ENGAGEMENT_POINTS.sql for Phase 2

