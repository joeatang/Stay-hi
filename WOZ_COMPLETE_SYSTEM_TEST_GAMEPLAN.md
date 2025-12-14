# 🎯 WOZ Complete System Test Gameplan
**Hi Network Production Readiness Testing Protocol**

## Phase 1: Share System Foundation (CRITICAL - FIX FIRST)

### 1.1 Origin Tracking Audit
**Problem**: Shares from Hi Gym show `origin: 'hi-island'` instead of proper origin
**Impact**: Wrong pills, missing emotional emojis, broken filtering

**Immediate Fixes Required:**
- [ ] Audit all share sheet implementations across pages
- [ ] Fix Hi Gym page to pass correct origin (`hi-gym` or `muscle-journey`)
- [ ] Fix Hi Dashboard to pass correct origin (`hi-dashboard` or `hi5`)
- [ ] Fix Hi Island to pass correct origin (`hi-island`)
- [ ] Verify origin propagates through: Share Sheet → HiDB → Database → Feed

**Pages to Audit:**
- `public/index.html` (Hi Today/Dashboard)
- `public/hi-gym/index.html` (Muscle Journey)
- `public/hi-island-NEW.html` (Hi Island)
- Any other pages with share functionality

### 1.2 Content Format Validation
**Problem**: Emotional emojis not showing in feed
**Fix Required:**
- [ ] Verify Hi Gym shares include: `[current_emoji] → [desired_emoji]` format
- [ ] Verify feed display preserves emoji formatting
- [ ] Test content with hashtags: #higym, #hi5
- [ ] Validate location string format

### 1.3 Pill Derivation Logic
**Current Logic Issues:**
```javascript
// HiRealFeed.js line 247-250
const isGym = origin.includes('gym') || origin.includes('muscle') || 
              content.toLowerCase().includes('#higym') ||
              content.toLowerCase().includes('muscle journey');
const derivedType = isGym ? 'higym' : 'hi5';
```

**Enhancement Needed:**
- [ ] Add logging to show why detection failed
- [ ] Prioritize origin over content for accuracy
- [ ] Handle edge cases (anonymous gym shares, etc.)

---

## Phase 2: Visual Polish (Tesla-Grade UX)

### 2.1 Feed Card Design Enhancement
**Target**: Sleek, modern cards without changing functionality

**Enhancements:**
- [ ] Add subtle card shadows with depth
- [ ] Improve spacing/padding (current: adequate, target: exceptional)
- [ ] Enhance pill visual hierarchy (already good, polish edges)
- [ ] Add micro-animations (pill hover, card entry)
- [ ] Improve avatar border/shadow
- [ ] Add gradient overlays for depth

### 2.2 Typography & Color Refinement
- [ ] Ensure consistent font weights across all text
- [ ] Optimize contrast ratios for accessibility
- [ ] Add subtle color variations for state changes
- [ ] Polish timestamp display format

### 2.3 Interactive States
- [ ] Smooth hover transitions on all buttons
- [ ] Active state feedback (pills, filters, tabs)
- [ ] Loading state animations (skeleton screens)
- [ ] Empty state illustrations

---

## Phase 3: Tier & Membership Testing

### 3.1 Tier Access Matrix
Test each tier for proper feature access:

**Anonymous (No Account)**
- [ ] Can view General Shares feed
- [ ] Cannot access My Archive
- [ ] See auth prompt on Drop Hi
- [ ] Can create anonymous shares (if enabled)
- [ ] Proper UI messaging/CTAs

**Bronze (Hi Pathfinder)**
- [ ] 30 shares per month limit enforced
- [ ] Full map access
- [ ] Private + Public + Anonymous shares available
- [ ] Archive accessible
- [ ] Wave interactions unlimited

**Silver (Hi Trailblazer)**
- [ ] 100 shares per month
- [ ] All Bronze features +
- [ ] Enhanced profile features
- [ ] Proper tier badge display

**Gold (Hi Pioneer)**
- [ ] Unlimited shares
- [ ] All Silver features +
- [ ] Premium map features
- [ ] Priority support indicators

**Diamond, Platinum**
- [ ] Test premium-exclusive features
- [ ] Verify tier-specific UI elements

### 3.2 Share Button Matrix by Tier
**Test for each tier:**
- [ ] Drop Hi button shows correct options
- [ ] Share limit counters accurate
- [ ] Anonymous option visibility per tier
- [ ] Private/Public options per tier config
- [ ] Upgrade prompts at limits

### 3.3 Share Sheet Consistency Audit
**Verify across ALL pages:**
- [ ] Hi Today (`index.html`)
- [ ] Hi Gym (`hi-gym/index.html`)
- [ ] Hi Island (`hi-island-NEW.html`)
- [ ] Profile page
- [ ] Any other share-enabled pages

**For each page check:**
- [ ] Share sheet opens correctly
- [ ] Tier limits respected
- [ ] Origin passed correctly
- [ ] Content formatting preserved
- [ ] Location capture works
- [ ] Submission succeeds
- [ ] Feed updates immediately
- [ ] Pills show correctly

---

## Phase 4: Page-by-Page Functional Testing

### 4.1 Hi Today (index.html / Dashboard)
- [ ] Quick Hi 5 creation
- [ ] Stats display accurately (waves, his, users)
- [ ] Navigation buttons work
- [ ] Profile link functional
- [ ] Share origin = `hi-dashboard` or `hi5`

### 4.2 Hi Gym (Muscle Journey)
- [ ] Emoji selection (current → desired)
- [ ] Journal text input
- [ ] Location capture
- [ ] Share origin = `hi-gym` or `muscle-journey`
- [ ] Emotional emojis included in content
- [ ] Content format: `[emoji] → [emoji] + text + #higym`
- [ ] Purple pills in feed

### 4.3 Hi Island (Community Hub)
- [ ] General Shares tab loads correctly
- [ ] My Archive tab (auth required)
- [ ] Origin filters work (All, Hi5, HiGym, Island)
- [ ] Pills visible and color-coded
- [ ] Map displays (sample markers currently)
- [ ] Tab switching smooth
- [ ] Stats counter accurate
- [ ] Share refresh automatic

### 4.4 Profile Page
- [ ] User's own profile
- [ ] Other users' profiles
- [ ] Avatar display/upload
- [ ] Bio editing (own profile)
- [ ] Share history display
- [ ] Privacy controls
- [ ] Tier badge display

---

## Phase 5: Map & Location System

### 5.1 Map Functionality
**Current State**: Sample markers only (geocoding 0/493)

**Testing Protocol:**
- [ ] Map loads on Hi Island
- [ ] Marker clustering works
- [ ] Click marker shows share popup
- [ ] Zoom controls functional
- [ ] Pan/drag responsive

**Location System Fixes Needed:**
- [ ] Implement DB-based lat/lng storage
- [ ] Add columns: latitude, longitude to public_shares
- [ ] Geocode on share creation (not render)
- [ ] Test with real user locations
- [ ] Privacy: blur exact coords to neighborhood level

### 5.2 Location Capture
- [ ] GPS location (with permission)
- [ ] IP-based fallback
- [ ] Manual entry option
- [ ] Location display format
- [ ] Privacy controls

---

## Phase 6: Database & RPC Layer

### 6.1 RPCs to Deploy
- [x] `get_user_share_count` - User's share count (has SQL file)
- [ ] `wave_back` - Wave interactions
- [ ] `create_archive_entry` - Private archives
- [ ] `get_public_shares_map_tier` - Map data

**Deployment Steps:**
1. Open Supabase SQL Editor
2. Paste SQL from deploy files
3. Execute
4. Test via REST endpoint
5. Verify GRANT permissions

### 6.2 Database Schema Validation
- [ ] public_shares columns match feed expectations
- [ ] hi_archives columns correct
- [ ] profiles table has avatar_url, display_name
- [ ] RLS policies enforce tier limits
- [ ] Indexes on frequently queried columns

### 6.3 Stats System Integrity
- [ ] increment_total_hi() trigger works
- [ ] Stats Write Guard allows authoritative sources
- [ ] No duplicate counting
- [ ] Real-time stats refresh after shares

---

## Phase 7: Authentication & Authorization

### 7.1 Auth Flows
- [ ] Sign up (new user)
- [ ] Sign in (existing user)
- [ ] Magic link (email)
- [ ] Anonymous browsing
- [ ] Session persistence
- [ ] Logout

### 7.2 Permission Boundaries
- [ ] Cannot access others' private archives
- [ ] Cannot edit others' shares
- [ ] Cannot exceed tier share limits
- [ ] API properly enforces RLS

---

## Phase 8: Performance & Edge Cases

### 8.1 Performance
- [ ] Feed loads < 1s
- [ ] Tab switching < 300ms
- [ ] Share submission < 500ms
- [ ] Map render < 2s
- [ ] No memory leaks (long sessions)

### 8.2 Edge Cases
- [ ] Offline behavior
- [ ] Slow network
- [ ] Failed submissions (error handling)
- [ ] Empty states (no shares, no archives)
- [ ] Very long content (truncation?)
- [ ] Special characters in content
- [ ] Emoji-only shares
- [ ] Missing location data
- [ ] Deleted users' shares

### 8.3 Browser Compatibility
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

## Phase 9: Integration Testing

### 9.1 End-to-End User Journeys

**Journey 1: New Anonymous User**
1. Land on Hi Island
2. Browse General Shares
3. See auth prompt on Archive
4. Click Drop Hi
5. See anonymous share option
6. Create anonymous share
7. See it in feed immediately
8. Sign up prompt after engagement

**Journey 2: Bronze Member Quick Hi5**
1. Sign in
2. Navigate to Hi Today
3. Click Quick Hi5
4. Enter text
5. Share publicly
6. Navigate to Hi Island
7. See share in General feed
8. See orange Hi5 pill
9. Check My Archive
10. See private copy

**Journey 3: Gold Member Muscle Journey**
1. Sign in (Gold tier)
2. Navigate to Hi Gym
3. Select emotional emojis
4. Write journal entry
5. Capture location
6. Share publicly
7. Navigate to Hi Island
8. See share in General feed
9. See purple HiGym pill
10. See emotional emoji format
11. Filter by HiGym - share visible

---

## Phase 10: Production Readiness Checklist

### 10.1 Code Quality
- [ ] Remove all debug console.logs (or gate behind isDev)
- [ ] No hardcoded user IDs
- [ ] No test data in production
- [ ] Error boundaries in place
- [ ] Proper error messages (user-friendly)

### 10.2 Security
- [ ] All RPCs have proper RLS
- [ ] No SQL injection vectors
- [ ] XSS protection (escapeHtml everywhere)
- [ ] CORS configured correctly
- [ ] API keys in environment variables

### 10.3 Monitoring
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (Plausible enabled)
- [ ] Performance monitoring
- [ ] Database query optimization

### 10.4 Documentation
- [ ] User guide for each feature
- [ ] Tier comparison chart
- [ ] Privacy policy
- [ ] Terms of service
- [ ] API documentation (if public)

---

## Execution Priority

### IMMEDIATE (Fix Now)
1. **Origin tracking bug** - Hi Gym shares showing wrong origin
2. **Pill derivation logic** - Detect gym shares properly
3. **Emotional emoji display** - Show in feed correctly
4. **Deploy get_user_share_count RPC**

### HIGH (This Session)
5. **Share sheet audit** - All pages pass correct origin
6. **Visual polish** - Tesla-grade feed cards
7. **Tier testing** - Bronze, Silver, Gold access matrix
8. **Feed refresh smoothness** - Already improved (500ms delay)

### MEDIUM (Next Session)
9. **Map location system** - DB-based lat/lng
10. **Profile page testing** - All tiers
11. **Performance optimization**
12. **Edge case handling**

### LOW (Before Launch)
13. **Browser compatibility**
14. **Documentation**
15. **Production checklist**

---

## Success Criteria

**System is production-ready when:**
- ✅ All shares show correct pills (origin-based)
- ✅ Emotional emojis visible in Hi Gym shares
- ✅ Feed refreshes instantly after submission
- ✅ All tier limits enforced correctly
- ✅ Share buttons work on all pages
- ✅ Map shows real user locations (not samples)
- ✅ Profile pages functional for all tiers
- ✅ No console errors in production mode
- ✅ All RPCs deployed and working
- ✅ Stats system accurate and authoritative
- ✅ Authentication flows smooth
- ✅ Visual polish at Tesla grade

---

## Testing Log Template

```markdown
## Test Session: [Date]
Tester: [Name]
Environment: [Local/Staging/Production]

### Tests Executed:
- [ ] Test 1: [Description] - [PASS/FAIL] - [Notes]
- [ ] Test 2: [Description] - [PASS/FAIL] - [Notes]

### Bugs Found:
1. [Bug description] - Severity: [Critical/High/Medium/Low]
2. [Bug description] - Severity: [Critical/High/Medium/Low]

### Next Steps:
- [Action item 1]
- [Action item 2]
```

---

**This gameplan ensures systematic, comprehensive testing of the entire Hi Network before traffic arrives.**
