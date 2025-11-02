# HiBase Test Plan - Console Testing Guide

**Purpose**: Quick console tests to verify HiBase functionality  
**Location**: `/docs/hibase/TEST_PLAN.md`  
**Prerequisites**: HiBase loaded in browser console (`window.HiBase` available)

## Setup

1. Open Hi App in browser: `http://localhost:3030/public/welcome.html`
2. Open Developer Console (F12)
3. Verify HiBase is loaded: `console.log(HiBase)`
4. Check connection: `await HiBase.utils.testConnection()`

## Module Tests

### 1. Client Connection Test

```javascript
// Test basic connection
const connectionTest = await HiBase.utils.testConnection();
console.log('Connection result:', connectionTest);

// Get client status
const status = HiBase.utils.getStatus();
console.log('HiBase status:', status);

// Expected: { success: true, client: { connected: true } }
```

### 2. Authentication Module Test

```javascript
// Check current session (should work without login)
const session = await HiBase.auth.getCurrentSession();
console.log('Current session:', session);

// Get current user (may be null if not logged in)
const user = await HiBase.auth.getCurrentUser();
console.log('Current user:', user);

// Expected: { data: { isAuthenticated: false } } if not logged in
```

### 3. Users Module Test

```javascript
// Test profile existence check (safe for any user ID)
const exists = await HiBase.users.profileExists('test-user-id');
console.log('Profile exists check:', exists);

// Search users (safe read operation)
const searchResult = await HiBase.users.searchUsers('test', 5);
console.log('User search result:', searchResult);

// Expected: { data: { exists: false } } for non-existent user
//           { data: { users: [...], count: N } } for search
```

### 4. Shares Module Test

```javascript
// Get public community feed (safe read operation)
const communityFeed = await HiBase.shares.getCommunityFeed({ limit: 5 });
console.log('Community feed:', communityFeed);

// Get public shares using raw operation
const publicShares = await HiBase.shares.getPublicShares(3);
console.log('Public shares (raw):', publicShares);

// Expected: { data: { shares: [...], count: N } }
```

### 5. Streaks Module Test

```javascript
// Get streak leaderboard (safe read operation)
const streakLeaderboard = await HiBase.streaks.getStreakLeaderboard(5);
console.log('Streak leaderboard:', streakLeaderboard);

// Test streak status calculation for non-existent user
const streakTest = await HiBase.streaks.getUserStreak('test-user-id');
console.log('Streak test (should be null/error):', streakTest);

// Expected: { data: { leaderboard: [...] } }
//           { data: null, error: {...} } for non-existent user
```

### 6. Referrals Module Test

```javascript
// Validate a fake referral code (safe test)
const codeValidation = await HiBase.referrals.validateReferralCode('TEST123');
console.log('Code validation:', codeValidation);

// Get referral leaderboard (safe read operation)
const referralLeaderboard = await HiBase.referrals.getReferralLeaderboard(5);
console.log('Referral leaderboard:', referralLeaderboard);

// Expected: { data: { valid: false, reason: 'Code not found' } }
//           { data: { leaderboard: [...] } }
```

### 7. Stats Module Test

```javascript
// Get global statistics (main test)
const globalStats = await HiBase.stats.getGlobalStats();
console.log('Global stats:', globalStats);

// Test cache functionality
console.log('Getting stats again (should use cache)...');
const cachedStats = await HiBase.stats.getGlobalStats();
console.log('Cached stats:', cachedStats.data.fromCache);

// Get points leaderboard
const pointsLeaderboard = await HiBase.stats.getPointsLeaderboard(5);
console.log('Points leaderboard:', pointsLeaderboard);

// Get recent activity
const recentActivity = await HiBase.stats.getRecentActivity(3);
console.log('Recent activity:', recentActivity);

// Expected: { data: { totalHis: N, totalUsers: N, fromCache: true/false } }
//           { data: { leaderboard: [...] } }
//           { data: { activities: [...] } }
```

## Comprehensive Test Suite

**Copy and paste this complete test suite into console:**

```javascript
// HiBase Comprehensive Test Suite
console.log('🚀 Starting HiBase Test Suite...\n');

async function runHiBaseTests() {
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    function logTest(name, success, data = null, error = null) {
        const status = success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${name}`);
        
        if (data) console.log('  Data:', data);
        if (error) console.log('  Error:', error);
        
        results.tests.push({ name, success, data, error });
        if (success) results.passed++;
        else results.failed++;
        
        console.log(''); // blank line
    }

    // 1. Client Connection
    try {
        const connection = await HiBase.utils.testConnection();
        logTest('Client Connection', !!connection.client.data, connection.client.data);
    } catch (e) {
        logTest('Client Connection', false, null, e.message);
    }

    // 2. Authentication Module
    try {
        const session = await HiBase.auth.getCurrentSession();
        logTest('Get Current Session', !session.error, session.data);
    } catch (e) {
        logTest('Get Current Session', false, null, e.message);
    }

    // 3. Users Module - Profile Check
    try {
        const exists = await HiBase.users.profileExists('test-nonexistent-user');
        logTest('Profile Exists Check', exists.data && !exists.data.exists, exists.data);
    } catch (e) {
        logTest('Profile Exists Check', false, null, e.message);
    }

    // 4. Shares Module - Community Feed
    try {
        const feed = await HiBase.shares.getCommunityFeed({ limit: 3 });
        logTest('Community Feed', !feed.error && Array.isArray(feed.data.shares), 
               `${feed.data?.count || 0} shares loaded`);
    } catch (e) {
        logTest('Community Feed', false, null, e.message);
    }

    // 5. Stats Module - Global Stats
    try {
        const stats = await HiBase.stats.getGlobalStats();
        logTest('Global Stats', !stats.error && stats.data.totalHis !== undefined, 
               `Total His: ${stats.data?.totalHis || 0}`);
    } catch (e) {
        logTest('Global Stats', false, null, e.message);
    }

    // 6. Stats Module - Cache Test
    try {
        const cachedStats = await HiBase.stats.getGlobalStats();
        logTest('Stats Caching', cachedStats.data.fromCache === true, 
               `Cache age: ${cachedStats.data.cacheAge}s`);
    } catch (e) {
        logTest('Stats Caching', false, null, e.message);
    }

    // 7. Streaks Module - Leaderboard
    try {
        const streaks = await HiBase.streaks.getStreakLeaderboard(3);
        logTest('Streak Leaderboard', !streaks.error, 
               `${streaks.data?.count || 0} streak leaders`);
    } catch (e) {
        logTest('Streak Leaderboard', false, null, e.message);
    }

    // 8. Referrals Module - Code Validation
    try {
        const validation = await HiBase.referrals.validateReferralCode('INVALID123');
        logTest('Referral Validation', validation.data && !validation.data.valid, 
               validation.data);
    } catch (e) {
        logTest('Referral Validation', false, null, e.message);
    }

    // Summary
    console.log('🏁 Test Suite Complete!');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Success Rate: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
    
    if (results.failed === 0) {
        console.log('🎉 All tests passed! HiBase is working perfectly.');
    } else {
        console.log('⚠️ Some tests failed. Check the detailed results above.');
    }

    return results;
}

// Run the test suite
runHiBaseTests();
```

## Expected Results

### Successful Test Output:
```
✅ PASS: Client Connection
  Data: {connected: true, timestamp: "...", message: "HiBase connection test successful"}

✅ PASS: Get Current Session  
  Data: {session: null, user: null, isAuthenticated: false}

✅ PASS: Profile Exists Check
  Data: {exists: false, userId: "test-nonexistent-user"}

✅ PASS: Community Feed
  Data: 5 shares loaded

✅ PASS: Global Stats
  Data: Total His: 45

✅ PASS: Stats Caching
  Data: Cache age: 2s

✅ PASS: Streak Leaderboard
  Data: 3 streak leaders

✅ PASS: Referral Validation
  Data: {valid: false, reason: "Code not found"}

🏁 Test Suite Complete!
✅ Passed: 8
❌ Failed: 0  
📊 Success Rate: 100%
🎉 All tests passed! HiBase is working perfectly.
```

## Troubleshooting Common Issues

### Issue: "HiBase is not defined"
**Solution**: 
```javascript
// Check if HiBase is available
console.log(typeof HiBase);

// If undefined, manually import
const HiBaseModule = await import('/lib/hibase/index.js');
const HiBase = HiBaseModule.default;
window.HiBase = HiBase;
```

### Issue: Connection test fails
**Solution**:
```javascript
// Check Supabase client status
const clientStatus = HiBase.client.getStatus();
console.log('Client status:', clientStatus);

// Check if HiSupabase is loaded
console.log('getClient function:', typeof getClient);
```

### Issue: Database table not found (404 errors)
**Expected**: Some tables may not exist in development
- `hi_flags` table → Creates graceful fallback
- `hi_referral_codes` table → Returns appropriate errors
- This is normal behavior for incomplete database setups

### Issue: Permission errors
**Expected**: RLS policies may restrict access
- Read operations should work for public data
- Write operations may fail without authentication
- This demonstrates proper security implementation

## Manual Testing Scenarios

### Test 1: Global Stats Flow
```javascript
// Should return real community data
const stats = await HiBase.stats.getGlobalStats();
console.log('Community has', stats.data.totalHis, 'total His');
console.log('Active users (24h):', stats.data.activeUsers24h);
```

### Test 2: Community Feed Flow
```javascript
// Should return recent Hi shares
const feed = await HiBase.shares.getCommunityFeed({ limit: 5 });
feed.data.shares.forEach((share, i) => {
    console.log(`${i+1}. ${share.username}: ${share.message || '[Location share]'}`);
});
```

### Test 3: Error Handling Flow
```javascript
// Should handle non-existent data gracefully
const fakeUser = await HiBase.users.getProfile('fake-user-id');
console.log('Expected error:', fakeUser.error?.message);

// Should validate input properly
const invalidShare = await HiBase.shares.createHiShare({});
console.log('Validation error:', invalidShare.error?.message);
```

## Success Criteria

**✅ All tests pass**: HiBase is fully operational  
**✅ Global stats load**: Database connection is working  
**✅ Community feed loads**: Public data access is working  
**✅ Error handling works**: Proper validation and error responses  
**✅ Caching functions**: Performance optimization is active  
**✅ Console availability**: `window.HiBase` is accessible for development

## Next Steps After Testing

1. **Integration**: Replace direct Supabase calls with HiBase functions in UI components
2. **Authentication**: Test login flow and authenticated operations  
3. **Data Creation**: Test write operations (requires authenticated user)
4. **Production**: Deploy with confidence knowing the foundation is solid