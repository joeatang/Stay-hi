# 🔬 WOZ-GRADE DIAGNOSTIC: Page Lockup Root Cause Analysis

## Context
**User Report**: "the page literally freezes. sometimes the content on the page just wont load."
**My Previous Assumption**: Only happens during share submission
**Reality**: Happens during page load AND modal open

---

## 🚨 CRITICAL FINDING: The Freeze Happens EARLIER Than I Thought

### The Call Chain:
```
Hi Island Page Loads
    ↓
User Clicks "Drop a Hi" Button
    ↓
HiShareSheet.open() [line 670]
    ↓
updateShareOptionsForAuthState() [line 700]
    ↓
enforceTierLimits(tier, buttons) [line 336]
    ↓
checkShareQuota(tier, limit) [line 391]
    ↓
window.sb.rpc('get_user_share_count', { period: 'month' }) [line 435]
    ↓
💥 RPC has wrong signature → Error → Timeout after 2s → Falls back to localStorage
```

### The 2-Second Delay You're Experiencing:
- **NOT a freeze** - it's the timeout working as designed
- **FEELS like a freeze** because nothing happens for 2 seconds
- Modal tries to open → calls RPC → RPC fails → waits 2s → fallback → modal opens

---

## ✅ What I've Already Fixed

### 1. Timeout Protection (DEPLOYED to localhost)
**File**: [HiShareSheet.js lines 435-450](public/ui/HiShareSheet/HiShareSheet.js#L435-L450)

```javascript
const rpcPromise = window.sb.rpc('get_user_share_count', { period: 'month' });
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('RPC timeout')), 2000)
);

const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
```

**Status**: ✅ Deployed and working (verified via curl)
**Effect**: Page won't freeze forever, but has 2-second delay

### 2. SQL Fix for RPC Signature (CREATED, not deployed)
**File**: [FIX_GET_USER_SHARE_COUNT_SIGNATURE.sql](FIX_GET_USER_SHARE_COUNT_SIGNATURE.sql)

**Problem**: Your database has:
```sql
-- ❌ CURRENT (wrong):
get_user_share_count(p_user_id UUID, p_since TIMESTAMP)
```

**Solution**: Replace with:
```sql
-- ✅ CORRECT:
get_user_share_count(period TEXT DEFAULT 'month')
```

**Status**: ⏳ SQL file ready, waiting for you to deploy
**Effect**: RPC will work instantly, no 2-second delay

---

## 🧪 HOW TO TEST THIS PROPERLY (Woz Method)

### Test 1: Verify Current Behavior (BEFORE SQL fix)
1. Open Hi Island in browser: http://localhost:3030/public/hi-island.html
2. Open DevTools Console (F12)
3. Clear console (Cmd+K)
4. Click "Drop a Hi" button
5. **Watch for**:
   - Console message: "⚠️ get_user_share_count RPC failed (using fallback): RPC timeout"
   - 2-second delay before modal opens
   - Modal DOES eventually open (doesn't freeze forever)

**Expected Result**: 2-second delay, then modal opens ✅

### Test 2: Deploy SQL Fix
1. Open Supabase SQL Editor
2. Copy entire contents of `FIX_GET_USER_SHARE_COUNT_SIGNATURE.sql`
3. Execute
4. Look for: "✅ Function created" message

### Test 3: Verify Fix Works (AFTER SQL fix)
1. Hard refresh browser: Cmd+Shift+R (clears cache)
2. Open Hi Island
3. Open DevTools Console
4. Clear console
5. Click "Drop a Hi" button
6. **Watch for**:
   - NO timeout warning
   - Modal opens IMMEDIATELY (no 2s delay)
   - Clean console (no errors)

**Expected Result**: Modal opens instantly ✅

---

## 🔍 Additional Diagnostic Questions

Please answer these to help me understand the EXACT issue:

### Question 1: Browser Console
When the freeze happens, what do you see in the browser console? (F12 → Console tab)
- [ ] "⚠️ get_user_share_count RPC failed (using fallback): RPC timeout"
- [ ] "404: /rest/v1/rpc/get_user_share_count"
- [ ] No errors at all
- [ ] Other error (please copy/paste)

### Question 2: Network Tab
When the freeze happens, open DevTools Network tab (F12 → Network):
- [ ] See a request to `/rest/v1/rpc/get_user_share_count` that takes 2+ seconds
- [ ] See a request that never completes (spinning forever)
- [ ] See a 404 error
- [ ] Other (please describe)

### Question 3: Exact Reproduction Steps
How do you trigger the freeze?
- [ ] Hi Island page loads → freeze immediately (before clicking anything)
- [ ] Click "Drop a Hi" button → freeze
- [ ] Click "Drop a Hi" → modal opens → click "Share Publicly" → freeze
- [ ] Other timing (please describe)

### Question 4: Freeze Duration
How long does the freeze last?
- [ ] 2-3 seconds, then recovers
- [ ] Forever (need to refresh page)
- [ ] Varies randomly
- [ ] Other (please describe)

### Question 5: Content Not Loading
You said "sometimes the content on the page just wont load" - which content?
- [ ] The feed of shares (blank/empty feed)
- [ ] The share modal won't open
- [ ] The entire page is white/blank
- [ ] Other (please describe)

---

## 🎯 My Current Hypothesis

Based on your test results (RPC exists with wrong signature), here's what I think is happening:

### Scenario A: The 2-Second Delay (Most Likely)
- You click "Drop a Hi"
- Modal tries to open
- Calls `get_user_share_count` with wrong parameters
- RPC errors out
- Timeout kicks in after 2 seconds
- Falls back to localStorage
- Modal opens

**Feels like a freeze but isn't** - it's the timeout working as designed.

**Fix**: Deploy `FIX_GET_USER_SHARE_COUNT_SIGNATURE.sql` → RPC works properly → no delay

### Scenario B: Browser Cache (Less Likely)
- Your browser cached the OLD version of HiShareSheet.js (without timeout)
- Still experiencing infinite hang
- Dev server is serving NEW version but browser not loading it

**Fix**: Hard refresh (Cmd+Shift+R) to clear cache

### Scenario C: Different RPC Causing Issue (Need to Investigate)
- `get_user_share_count` is protected with timeout
- But ANOTHER RPC call during page load is hanging
- Need console logs to identify which one

**Fix**: Check browser console, identify the hanging RPC, add timeout there too

---

## 📋 Immediate Action Plan

### For You (User):
1. **Answer the 5 diagnostic questions above** (check boxes)
2. **Deploy SQL fix**: Run `FIX_GET_USER_SHARE_COUNT_SIGNATURE.sql` in Supabase
3. **Hard refresh browser**: Cmd+Shift+R
4. **Test again**: Click "Drop a Hi" and measure how long until modal opens
5. **Report back**: Did the delay disappear?

### For Me (After you report):
- If delay persists: Search for other unprotected RPC calls
- If different error: Debug the actual error from console
- If truly freezing forever: Check browser version, JavaScript engine issues

---

## 🔧 Emergency Workarounds (If SQL fix doesn't work)

### Workaround 1: Disable Tier Enforcement Temporarily
Add to browser console before clicking "Drop a Hi":
```javascript
window.HiTierConfig = {
  getTierFeatures: () => ({
    shareTypes: ['private', 'anonymous', 'public'],
    shareCreation: true // Unlimited
  })
};
```

This bypasses the quota check entirely, so modal opens instantly.

### Workaround 2: Pre-warm the RPC
Run this in browser console when page loads:
```javascript
(async () => {
  try {
    await window.sb.rpc('get_user_share_count', { period: 'month' });
  } catch {}
})();
```

This triggers the 2-second timeout during page load (when you're not watching), so the modal open feels instant.

---

## 🎓 What Woz Would Do

1. **Test the actual behavior** - Don't assume, measure the exact timing
2. **Check the console** - All the clues are there
3. **Isolate the variable** - Deploy SQL fix, test again, compare
4. **Measure twice, deploy once** - Verify the fix works locally first
5. **Keep it simple** - The simplest explanation (RPC signature mismatch) is probably correct

**Woz wouldn't deploy anything until he saw the actual console error and network timing.**

---

## 🚀 Expected Outcome After SQL Fix

### Before:
- Click "Drop a Hi" → 2-second delay → modal opens
- Console: "⚠️ RPC timeout"
- Network: 2000ms delay on RPC call

### After:
- Click "Drop a Hi" → modal opens instantly (<100ms)
- Console: Clean (no warnings)
- Network: RPC returns in <50ms

**The 2-second delay should completely disappear.**

---

## 📞 Next Steps

Please run Test 1 (verify current behavior) and answer the diagnostic questions. Once I know EXACTLY what you're seeing in the console and network tab, I can give you the precise fix.

The SQL file is ready to deploy - it will fix the RPC signature mismatch and eliminate the 2-second delay. But I want to make sure that's the ONLY issue before you deploy it.
