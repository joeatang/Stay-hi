# 🧪 Hi-Island UX Testing Checklist
**Base Functionality Validation (Before Tier System)**

## ✅ **PRIORITY 1: DROP HI BUTTON (Core Action)**

### 📍 **Test Cases:**
- [ ] Drop Hi button visible and properly styled
- [ ] Click opens share composer (no tier restrictions)
- [ ] Share composer loads without errors
- [ ] Share submission works (data saves to database)
- [ ] Success feedback displays
- [ ] Feed refreshes after successful share

### 🔍 **Expected Behavior:**
1. Click "Drop Hi" button
2. Share composer modal opens instantly
3. Fill in share content + submit
4. Success message appears
5. New share appears in General tab feed
6. Stats counter increases

---

## ✅ **PRIORITY 2: TAB NAVIGATION (Feed System)**

### 📍 **Test Cases:**
- [ ] General tab loads by default
- [ ] Archives tab accessible (no restrictions)
- [ ] Tab switching smooth with no errors
- [ ] Each tab shows relevant content
- [ ] Mobile responsive tab behavior

### 🔍 **Expected Behavior:**
1. Page loads with General tab active
2. Clicking Archives tab switches view
3. Tab content loads from correct database tables
4. No tier restriction messages appear

---

## ✅ **PRIORITY 3: FEED LOADING (Data Display)**

### 📍 **Test Cases:**
- [ ] General feed loads public_shares data
- [ ] Archives feed loads user's hi_archives data
- [ ] Loading states display properly
- [ ] Error states handle gracefully
- [ ] Pagination works if implemented

### 🔍 **Expected Database Queries:**
- **General Tab**: `public_shares` table
- **Archives Tab**: `hi_archives` table (user-specific)
- **Stats Display**: `global_community_stats` table

---

## ✅ **PRIORITY 4: AUTHENTICATION FLOW**

### 📍 **Test Cases:**
- [ ] Anonymous users can view general feed
- [ ] Authenticated users can access archives
- [ ] Login/signup flows work smoothly
- [ ] Session persistence works
- [ ] Progressive auth enhancement functions

### 🔍 **Expected Behavior:**
1. Anonymous: Can view general, prompted for archives
2. Authenticated: Full access to personal archives
3. Smooth upgrade from anonymous to authenticated

---

## ✅ **PRIORITY 5: STATS & UI ELEMENTS**

### 📍 **Test Cases:**
- [ ] Global stats display correctly
- [ ] Stats update after new shares
- [ ] UI elements responsive on mobile
- [ ] Loading animations smooth
- [ ] Error boundaries prevent crashes

### 🔍 **Database Integration:**
- Stats from `global_community_stats`
- Updates via `increment_total_hi()` function
- Real-time or periodic refresh

---

## ⚠️ **KNOWN DISABLED FEATURES (For Testing)**

```javascript
// Temporarily disabled for base UX validation:
// - Tier access checks on Drop Hi button
// - Tab access restrictions 
// - Feature gating system
```

---

## 🎯 **SUCCESS CRITERIA**

**✅ READY FOR TIER SYSTEM** when all items above pass without:
- Console errors
- Failed database queries  
- Broken user flows
- Missing UI components
- Authentication issues

---

## 🔄 **TESTING WORKFLOW**

1. **Load Page**: Hi-Island opens without errors
2. **Test Drop Hi**: Share creation & submission works
3. **Test Tabs**: All tabs accessible and functional
4. **Test Feed**: Data loads from correct tables
5. **Test Auth**: Anonymous + authenticated flows work
6. **Test Stats**: Global stats display correctly

**Once all validated** → Re-enable tier system on solid foundation.