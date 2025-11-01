# 🎯 SURGICAL MEDALLION SYSTEM - FUTURE-PROOF ARCHITECTURE

## **📋 CRITICAL SYSTEM OVERVIEW**

This document ensures **bulletproof maintenance** of the medallion tap tracking system with **1:1 data mapping**.

---

## **🔑 CORE ARCHITECTURE**

### **Data Mapping (1:1 Relationship)**
```
Global Waves = Medallion Taps (from public_shares where share_type='hi_wave')
Global Hi5 = Share Sheet Entries (from public_shares where share_type='share_sheet')
```

### **System Flow**
```
Medallion Tap → increment_hi_wave() RPC → public_shares INSERT → get_global_stats() → DOM Update
```

---

## **📁 CRITICAL FILES & RESPONSIBILITIES**

### **1. Core System Files** ⚠️ **DO NOT MODIFY WITHOUT TESTING**

| File | Purpose | Critical Elements |
|------|---------|-------------------|
| `public/hi-dashboard.html` | Medallion interface | `incrementHiWave()`, Supabase client init |
| `public/assets/hi-unified-global-stats.js` | Stats engine | `trackMedallionTap()`, `getSupabaseClient()` |
| `public/assets/supabase-init.js` | Database connection | Primary Supabase client setup |
| `HI_DEV_SURGICAL_DATA_MAPPING.sql` | Database functions | `get_global_stats()`, `increment_hi_wave()` RPC |

### **2. Configuration Constants** 🔧 **UPDATE THESE TOGETHER**

```javascript
// ALWAYS USE THESE VALUES - DO NOT MIX URLs/KEYS
SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g'
```

---

## **⚡ MEDALLION TAP EXECUTION FLOW**

### **Primary Path (Surgical System)**
```
1. User taps medallion → setupMedallionHandler() click event
2. incrementHiWave() → window.HiUnifiedStats.trackMedallionTap()
3. getSupabaseClient() → window.db (cached) OR fresh supabase.createClient()
4. supabase.rpc('increment_hi_wave') → Database INSERT
5. get_global_stats() → Fresh count retrieval
6. updateDOM() → Display refresh
```

### **Fallback Path (Legacy System)**
```
1. incrementHiWave() → window.trackHiWave() 
2. Legacy RPC call
3. Manual DOM refresh
```

### **Error Path (Graceful Degradation)**
```
1. Console logging for debugging
2. Error propagation with detailed messages
3. No system crashes - UI remains functional
```

---

## **🛡️ FUTURE-PROOFING CHECKLIST**

### **Before Making Changes:**
- [ ] **Backup current working system**
- [ ] **Test on localhost first**
- [ ] **Verify both URLs/keys match**
- [ ] **Check console for surgical debug logs**

### **When Adding New Features:**
- [ ] **Use the unified stats system (`window.HiUnifiedStats`)**
- [ ] **Follow the surgical debugging pattern**
- [ ] **Maintain the 1:1 data mapping**
- [ ] **Add fallback error handling**

### **Database Changes:**
- [ ] **Update RPC functions in surgical mapping file**
- [ ] **Test with `HI_DEV_SURGICAL_TEST.sql`**
- [ ] **Verify table permissions and sequences**
- [ ] **Check cross-device data consistency**

---

## **🚨 EMERGENCY TROUBLESHOOTING**

### **Problem: Medallion tap not working**
1. Check console for "🎯 SURGICAL" debug messages
2. Verify `window.db` exists and has `.rpc()` method
3. Test direct RPC call: `window.db.rpc('get_global_stats')`
4. Check network tab for failed requests

### **Problem: SSL Certificate errors**
1. Verify all files use `gfcubvroxgfvjhacinic.supabase.co`
2. Search for old URL: `grep -r "cnqonwsijqzdqahheesx" public/`
3. Update any mismatched URLs/keys immediately

### **Problem: Numbers not syncing across devices**
1. Check unified stats cache: `window.HiUnifiedStats.cache`
2. Force refresh: `window.HiUnifiedStats.cache.data = null`
3. Verify database permissions on public_shares table

---

## **📝 TESTING PROTOCOL**

### **Manual Testing Steps:**
1. Open hi-dashboard.html on localhost
2. Check console shows "🎯 SURGICAL: Initializing Supabase client"
3. Tap medallion - should see "🎯 SURGICAL: Medallion tapped"
4. Verify Global Waves counter increments by 1
5. Open welcome.html - should show identical numbers

### **Database Testing:**
```sql
-- Test surgical functions exist
SELECT * FROM get_global_stats();
SELECT increment_hi_wave();

-- Verify data structure
SELECT share_type, COUNT(*) FROM public_shares GROUP BY share_type;
```

---

## **🏗️ ARCHITECTURAL PRINCIPLES**

1. **Single Source of Truth**: All stats come from `get_global_stats()` RPC
2. **Surgical Debugging**: Every critical action logs with "🎯 SURGICAL" prefix  
3. **Graceful Degradation**: System works even if primary components fail
4. **Cross-Device Consistency**: Same numbers everywhere via unified caching
5. **Future-Proof URLs**: One canonical Supabase URL across entire system

---

**⚠️ CRITICAL MAINTENANCE RULE:**
**NEVER modify core files without testing the complete medallion tap → database → display cycle on localhost first.**

---

*Last Updated: November 1, 2025*  
*System Status: ✅ SURGICALLY OPTIMIZED & FUTURE-PROOF*