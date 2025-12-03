# 🔬 SURGICAL AUDIT: Hi Island Stats & Share Feed
**Date**: December 3, 2025  
**Scope**: Diagnose total_hi incrementing on navigation & generic share placeholder  
**Status**: 🔍 **ROOT CAUSES IDENTIFIED** - Fixes Ready

---

## 🎯 **ISSUES REPORTED**

### **Issue #1: Total Hi Incrementing on Page Navigation**
- **Symptom**: When navigating away from dashboard and back, `total_hi` count increases
- **Impact**: Inflated global stats, user confusion about actual Hi 5 count

### **Issue #2: Generic Share Placeholder in Feed**
- **Symptom**: Feed populates with generic placeholder every time
- **Impact**: Unclear if real user shares are displaying correctly

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **Issue #1: Stats Incrementing - DIAGNOSED** ✅

**Location**: `/public/lib/boot/dashboard-main.js` lines 656-657

```javascript
window.addEventListener('visibilitychange', () => { 
  if (document.visibilityState === 'visible') safeRefresh(); 
});
window.addEventListener('pageshow', (e) => { 
  if (e.persisted || document.visibilityState === 'visible') safeRefresh(); 
});
```

**Problem Chain**:
1. User navigates from Dashboard → Hi Island → Back to Dashboard
2. `visibilitychange` event fires when dashboard becomes visible
3. `safeRefresh()` is called → triggers `loadCurrentStatsFromDatabase()`
4. Function reads from **TWO** sources (lines 623-640):
   - `global_stats.total_his` (canonical source)
   - `public_shares.total_his` (fallback with stale data)

**Critical Code** (line 639):
```javascript
const { data:shareData, error:shareError } = await supabase
  .from('public_shares')
  .select('total_his')
  .limit(1)
  .single();

if(shareData && !shareError && shareData.total_his){
  if(window._gTotalHisIsTemporary || shareData.total_his > window.gTotalHis){
    window.gTotalHis=shareData.total_his; // ← PROBLEM: Uses > comparison
    window._gTotalHisIsTemporary=false;
  }
}
```

**The Bug**:
- `public_shares.total_his` is a **counter column** (auto-incremented by database trigger)
- It may be out of sync with `global_stats.total_his`
- The `>` comparison allows stale/incremented values to override the truth
- Every page navigation re-fetches and compares, causing drift

**Evidence of Multiple Increment Points**:
Found 20+ locations calling `increment_total_hi()`:
- `lib/stats/DashboardStats.js` (line 515)
- `lib/stats/GoldStandardTracker.js` (line 17)
- `assets/tesla-counter-system.js` (line 243)
- `components/hi-real-feed/HiIslandIntegration.js` (line 228)

**Conclusion**: Multiple systems incrementing same counter + comparison logic = **stat drift on navigation**

---

### **Issue #2: Generic Share Placeholder - DIAGNOSED** ✅

**Location**: `/public/components/hi-real-feed/HiRealFeed.js`

**Finding 1 - Loading State Placeholder**:
Line 927:
```javascript
// Tesla-grade placeholder matching Emotional Trends styling
```

Line 693:
```javascript
'<div class="share-avatar-placeholder">👤</div>'
```

**Finding 2 - Data Processing**:
Lines 145-200: `loadGeneralSharesFromPublicShares()`
```javascript
const processedShares = (shares || []).map(share => {
  const processed = {
    id: share.id,
    content: share.content || 'Shared a Hi 5 moment!', // ← Fallback text
    visibility: share.visibility || 'public',
    metadata: share.metadata || {},
    created_at: share.created_at,
    user_id: share.user_id,
    location: share.location_data?.location || share.location,
    origin: share.metadata?.origin || 'unknown',
    type: share.metadata?.type || 'hi5'
  };
  
  // Handle anonymization
  if (share.visibility === 'anonymous') {
    processed.display_name = 'Hi Friend'; // ← Generic name
    processed.avatar_url = null;
  }
  // ...
});
```

**The "Placeholder" Behavior**:
1. **If database returns empty array**: Shows "No shares yet" message (intentional)
2. **If database returns shares without content**: Falls back to "Shared a Hi 5 moment!" (generic but valid)
3. **If anonymous shares**: Shows "Hi Friend" + 👤 emoji (intentional anonymization)

**Conclusion**: What user sees as "placeholder" is likely:
- **Anonymous shares** displaying correctly with "Hi Friend" name
- **Shares with minimal metadata** showing fallback text
- **NOT a bug** - this is correct behavior for anonymous/minimal shares

**HOWEVER**: Need to verify if real public shares (with full metadata) display properly.

---

## 🔧 **SURGICAL FIXES**

### **Fix #1: Prevent Stats Drift on Navigation**

**Target File**: `/public/lib/boot/dashboard-main.js`

**Changes Required**:

1. **Remove fallback to `public_shares.total_his`** (lines 638-640)
   - Only use `global_stats` as source of truth
   - Never compare with >  operator (always use database value directly)

2. **Add deduplication guard** to prevent double-refresh
   - Track last refresh timestamp globally
   - Prevent concurrent refreshes

3. **Disable aggressive re-fetch on visibility** (optional but recommended)
   - Only refresh if page was away for >30 seconds
   - Reduces unnecessary database calls

**Proposed Code**:
```javascript
// 🎯 SURGICAL FIX: Single source of truth for stats
async function loadCurrentStatsFromDatabase(){ 
  console.log('🔄 Background loading real stats from database...');
  
  // Dedupe guard: prevent concurrent refreshes
  if (window.__statsRefreshInProgress) {
    console.log('⏭️ Stats refresh already in progress, skipping');
    return;
  }
  
  window.__statsRefreshInProgress = true;
  
  setTimeout(async ()=>{ 
    try { 
      let supabase = window.getSupabase?.() || window.supabaseClient || window.HiSupabase?.getClient?.() || window.supabase; 
      if(!supabase){ 
        window.__statsRefreshInProgress = false;
        return; 
      }
      
      // 🎯 CRITICAL FIX: Only read from global_stats (single source of truth)
      const { data, error } = await supabase
        .from('global_stats')
        .select('total_his, hi_waves, total_users')
        .single();
      
      if(data && !error){ 
        // Database is ALWAYS source of truth - no comparison, just assign
        if (data.total_his != null){
          window.gTotalHis = data.total_his;
          window._gTotalHisIsTemporary = false;
        }
        
        const serverWaves = Number(data.hi_waves)||0;
        window.gWaves = Math.max(serverWaves, Number(window.gWaves)||0);
        
        // Update localStorage cache
        localStorage.setItem('globalHiWaves', String(window.gWaves));
        localStorage.setItem('globalTotalHis', String(window.gTotalHis));
        localStorage.setItem('globalHiWaves_time', String(Date.now()));
        
        updateStatsUI(); 
      }
    } catch(e){ 
      console.warn('Stats refresh failed:', e); 
    } finally {
      window.__statsRefreshInProgress = false;
    }
  },100); 
}

// 🎯 SURGICAL FIX: Smart refresh with time-based guard
(function(){
  let lastFetchAt = 0;
  let lastVisibilityChange = 0;
  const MIN_FETCH_INTERVAL = 5000; // 5s guard (increased from 3s)
  const MIN_AWAY_TIME = 30000; // Only refresh if away >30s
  
  function safeRefresh(){
    const now = Date.now();
    
    // Guard: prevent bursts
    if (now - lastFetchAt < MIN_FETCH_INTERVAL) { 
      console.log('⏭️ Skipping refresh (too soon)');
      updateGlobalStats(); // Just update UI from cached values
      return; 
    }
    
    // Guard: only refresh if page was hidden for significant time
    if (lastVisibilityChange > 0 && (now - lastVisibilityChange) < MIN_AWAY_TIME) {
      console.log('⏭️ Skipping refresh (quick tab switch)');
      updateGlobalStats();
      return;
    }
    
    lastFetchAt = now;
    try { 
      updateGlobalStats(); 
      loadCurrentStatsFromDatabase(); 
    } catch(e){ 
      console.warn('Stats refresh failed:', e); 
    }
  }
  
  // Track when page becomes hidden
  window.addEventListener('visibilitychange', () => { 
    if (document.visibilityState === 'hidden') {
      lastVisibilityChange = Date.now();
    } else if (document.visibilityState === 'visible') {
      safeRefresh(); 
    }
  });
  
  window.addEventListener('pageshow', (e) => { 
    if (e.persisted || document.visibilityState === 'visible') {
      safeRefresh(); 
    }
  });
})();
```

---

### **Fix #2: Verify Real Share Display**

**Target File**: `/public/components/hi-real-feed/HiRealFeed.js`

**Diagnostic Questions**:
1. Are there ANY public/anonymous shares in `public_shares` table?
2. Do they have `content`, `metadata`, and proper `visibility` values?
3. Is the query returning data but UI showing "generic"?

**Test Query to Run**:
```sql
-- Check what's actually in public_shares table
SELECT 
  id,
  user_id,
  content,
  visibility,
  metadata,
  location_data,
  created_at
FROM public_shares
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results**:
- **If empty**: No shares exist yet → "No shares" message is correct
- **If has data**: Check if `content` and `metadata` fields are populated

**UI Enhancement** (add debug info):
```javascript
// In renderFeedItems() function, add console logging
renderFeedItems(tabName, items) {
  console.log(`🎨 Rendering ${items.length} items for ${tabName} tab:`, items);
  
  // Log first item for debugging
  if (items.length > 0) {
    console.log('📋 Sample share data:', {
      content: items[0].content,
      visibility: items[0].visibility,
      display_name: items[0].display_name,
      metadata: items[0].metadata
    });
  }
  
  // ... existing render code
}
```

---

## 🧪 **TESTING PLAN**

### **Test #1: Verify Stats Don't Increment on Navigation**

**Steps**:
1. Open Dashboard → Note `total_hi` count
2. Navigate to Hi Island
3. Navigate to Hi Muscle  
4. Navigate back to Dashboard
5. **Expected**: `total_hi` count is SAME as step 1
6. **Bug if**: `total_hi` increased

**If Bug Persists After Fix**:
- Check database triggers on `public_shares` table
- Verify `increment_total_hi()` RPC function logic
- Check if multiple systems calling increment

### **Test #2: Verify Real Shares Display Correctly**

**Steps**:
1. Sign in as higher-tier user (Bronze/Pioneer)
2. Open Hi Share modal
3. Create public share with: "Testing public share - should show my name"
4. Select "Public" visibility
5. Submit share
6. Navigate to Hi Island
7. **Expected**: Your share appears with your display name and content
8. **Bug if**: Shows "Hi Friend" or generic placeholder

**Steps for Anonymous**:
1. Create anonymous share: "Testing anonymous - should show Hi Friend"
2. Select "Anonymous" visibility  
3. Submit share
4. Navigate to Hi Island
5. **Expected**: Share shows "Hi Friend" with 👤 emoji (intentional)
6. **Correct if**: Content shows your actual text

### **Test #3: Verify Share Feed Loads Real Data**

**Database Check**:
```sql
-- Verify shares exist
SELECT COUNT(*) FROM public_shares;

-- Check recent shares
SELECT 
  id, 
  user_id,
  content,
  visibility,
  created_at
FROM public_shares
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**:
- If COUNT > 0: Shares should display in feed
- If COUNT = 0: "No shares yet" message is correct

---

## ✅ **IMPLEMENTATION CHECKLIST**

- [ ] Apply Fix #1 to `dashboard-main.js` (remove public_shares fallback)
- [ ] Apply Fix #1 to `dashboard-main.js` (add deduplication guard)
- [ ] Apply Fix #1 to `dashboard-main.js` (add smart refresh with time guard)
- [ ] Add debug logging to `HiRealFeed.js` `renderFeedItems()`
- [ ] Test navigation flow (Dashboard → Island → Dashboard)
- [ ] Test public share submission + display
- [ ] Test anonymous share submission + display
- [ ] Verify database query returns actual shares
- [ ] Confirm stats no longer increment on navigation
- [ ] Document real vs placeholder behavior for user

---

## 📊 **EXPECTED OUTCOMES**

### **After Fix #1**:
✅ `total_hi` stat remains stable across navigation  
✅ Only `global_stats` table used as source of truth  
✅ No more comparison logic causing drift  
✅ Reduced unnecessary database calls  

### **After Fix #2 Verification**:
✅ Public shares display with real user names  
✅ Anonymous shares show "Hi Friend" (intentional)  
✅ Share content appears correctly (not generic fallback)  
✅ Loading state shows "..." then real data  

---

## 🚨 **CRITICAL FINDINGS**

1. **Multiple Increment Sources**: Found 20+ locations calling `increment_total_hi()` across codebase
   - Potential for race conditions
   - Need unified increment system

2. **Dual Data Sources**: Dashboard uses both `global_stats` AND `public_shares` 
   - Creates inconsistency
   - Must use single source of truth

3. **Aggressive Refresh**: Page visibility triggers immediate refresh
   - Causes unnecessary load
   - Should debounce or use minimum interval

4. **"Placeholder" is Feature**: Generic display for anonymous shares is intentional
   - Need to educate user that "Hi Friend" = anonymous share
   - Not a bug, it's privacy protection

---

## 📝 **RECOMMENDATIONS**

### **Immediate** (Critical):
1. Apply Fix #1 (remove public_shares fallback)
2. Add deduplication guard to prevent double-refresh
3. Test navigation flow thoroughly

### **Short-term** (Important):
1. Consolidate all `increment_total_hi()` calls to single unified tracker
2. Add database index on `public_shares.created_at` for faster queries
3. Implement rate limiting on stats refresh (max 1/minute)

### **Long-term** (Enhancement):
1. Real-time stats using Supabase Realtime subscriptions (eliminate polling)
2. Server-side aggregation for `total_his` (no client-side increment)
3. Caching layer with TTL to reduce database load

---

**END OF SURGICAL AUDIT**
