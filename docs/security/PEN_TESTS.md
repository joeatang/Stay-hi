# 🔍 Security Penetration Tests

**Purpose**: Manual security tests to validate RLS policies and access controls  
**Frequency**: Run after each security update or monthly  
**Environment**: Use preview environment for testing (never production)  
**Last Updated**: 2025-11-01  

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Use preview/staging environment (not production)
- [ ] Have two test accounts ready (User A, User B)
- [ ] Browser dev tools open to Network/Console tabs
- [ ] Document all test results with screenshots

### Post-Test Cleanup  
- [ ] Delete all test data created
- [ ] Reset any modified user accounts
- [ ] Document any security issues found
- [ ] Update security policies if needed

---

## Test Suite 1: Cross-User Data Access

### T1.1 - Profile Access Test
**Goal**: Verify User A cannot read User B's profile

#### Test Steps
1. **Login as User A** and note your `auth.uid()` from console
2. **Open browser dev tools** → Console tab
3. **Attempt cross-user profile read**:
```javascript
// Paste in console - should FAIL
const { createClient } = supabase; // Assume supabase client available
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Try to read another user's profile (replace with actual user_id)
const { data, error } = await supabase
  .from('hi_profiles')
  .select('*')
  .eq('user_id', 'OTHER_USER_ID_HERE'); // User B's ID

console.log('Cross-user profile access:', { data, error });
// Expected: error with RLS policy violation, data should be null/empty
```

#### Expected Result
- ✅ **PASS**: `error` contains policy violation message
- ✅ **PASS**: `data` is empty array or null
- ❌ **FAIL**: Any data from other user returned

---

### T1.2 - Share Access Test  
**Goal**: Verify users can only access their own shares + public ones

#### Test Steps
1. **Login as User A**, create a private share
2. **Note the share ID** from the response
3. **Login as User B** (different browser/incognito)
4. **Attempt to access User A's private share**:
```javascript
// Should FAIL - private share access
const { data, error } = await supabase
  .from('hi_shares')
  .select('*')
  .eq('id', 'USER_A_PRIVATE_SHARE_ID')
  .eq('visibility', 'private');

console.log('Private share access:', { data, error });
// Expected: empty result, no access to other user's private shares
```

5. **Test public share access** (should work):
```javascript
// Should PASS - public share access
const { data, error } = await supabase
  .from('hi_shares')  
  .select('*')
  .eq('visibility', 'public')
  .limit(5);

console.log('Public share access:', { data, error });
// Expected: returns public shares only, no error
```

#### Expected Result
- ✅ **PASS**: Cannot access other user's private shares
- ✅ **PASS**: Can access public shares from any user
- ❌ **FAIL**: Access to any private share not owned by current user

---

## Test Suite 2: Anonymous Access Control

### T2.1 - Anonymous Table Access Test
**Goal**: Verify anonymous users cannot directly access user tables

#### Test Steps
1. **Open incognito browser** (not logged in)
2. **Access the app** but don't sign in  
3. **Open console and test direct table access**:
```javascript
// Should FAIL - direct table access as anonymous
const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Try direct table reads
const tests = [
  supabase.from('hi_users').select('*'),
  supabase.from('hi_profiles').select('*'), 
  supabase.from('hi_shares').select('*'),
  supabase.from('hi_streaks').select('*')
];

for (let test of tests) {
  const { data, error } = await test;
  console.log('Anon table access:', { data, error });
  // Expected: All should fail with policy violations
}
```

#### Expected Result
- ✅ **PASS**: All direct table queries fail with RLS policy errors
- ❌ **FAIL**: Any user data returned to anonymous user

---

### T2.2 - Public View Access Test
**Goal**: Verify anonymous users can access public view safely

#### Test Steps
1. **Still in incognito browser** (anonymous)
2. **Test public view access**:
```javascript
// Should PASS - public view access
const { data, error } = await supabase
  .from('public_hi_feed')
  .select('*')
  .limit(10);

console.log('Public feed access:', { data, error });
// Expected: Returns sanitized public data only

// Verify no sensitive data leaked
if (data) {
  data.forEach(item => {
    console.log('Item check:', {
      hasEmail: item.email !== undefined, // Should be false
      hasUserId: item.user_id !== undefined, // Should be false  
      hasApproxLocation: item.approx_location !== undefined, // Should be true
      hasDisplayName: item.display_name === 'anonymous' // Should be true
    });
  });
}
```

#### Expected Result
- ✅ **PASS**: Public view returns data successfully
- ✅ **PASS**: No email, user_id, or precise location in response
- ✅ **PASS**: Only approximate location and anonymous display names
- ❌ **FAIL**: Any PII or sensitive data exposed

---

## Test Suite 3: Write Operation Security

### T3.1 - Share Creation Test
**Goal**: Verify users cannot create shares for other users

#### Test Steps
1. **Login as User A**
2. **Attempt to create share for User B**:
```javascript
// Should FAIL - creating share for another user
const { data, error } = await supabase
  .from('hi_shares')
  .insert({
    user_id: 'OTHER_USER_ID_HERE', // User B's ID
    content_text: 'Fake share for other user',
    emotion_type: 'happy',
    visibility: 'public'
  });

console.log('Cross-user share creation:', { data, error });
// Expected: Error due to RLS policy violation
```

#### Expected Result  
- ✅ **PASS**: Insert fails with RLS policy error
- ❌ **FAIL**: Share created for another user

---

### T3.2 - Anonymous Write Test  
**Goal**: Verify anonymous users cannot write to any tables

#### Test Steps
1. **In incognito browser** (not logged in)
2. **Attempt anonymous writes**:
```javascript
// Should FAIL - anonymous user trying to insert
const insertTests = [
  supabase.from('hi_shares').insert({ content_text: 'Anonymous share' }),
  supabase.from('hi_profiles').insert({ email: 'fake@test.com' }),
  supabase.from('hi_streaks').insert({ user_id: 'fake', count: 1 })
];

for (let test of insertTests) {
  const { data, error } = await test;
  console.log('Anon insert attempt:', { data, error });
  // Expected: All should fail
}
```

#### Expected Result
- ✅ **PASS**: All insert attempts fail for anonymous users
- ❌ **FAIL**: Any successful write operation by anonymous user

---

## Test Suite 4: Referral Code Security

### T4.1 - Direct Code Creation Test
**Goal**: Verify users cannot directly create referral codes

#### Test Steps
1. **Login as regular user**
2. **Attempt direct code table insert**:
```javascript
// Should FAIL - direct code creation
const { data, error } = await supabase
  .from('hi_codes')
  .insert({
    code: 'FAKE_CODE_123',
    created_by: auth.user().id,
    status: 'active'
  });

console.log('Direct code creation:', { data, error });
// Expected: Should fail - codes must be created via server functions
```

#### Expected Result
- ✅ **PASS**: Direct insert fails (no insert policy or restricted policy)
- ❌ **FAIL**: User can create codes directly

---

## Browser Console Test Snippet

**Copy-paste this into any page console for quick security check:**

```javascript
// Quick Security Test - Paste in Browser Console
(async function securityQuickTest() {
  console.log('🔍 Hi App Security Quick Test');
  
  if (typeof supabase === 'undefined') {
    console.log('❌ Supabase client not found');
    return;
  }

  // Test 1: Try to access users table as current user
  const usersTest = await supabase.from('hi_users').select('*');
  console.log('Users table access:', usersTest.error ? '✅ BLOCKED' : '❌ ALLOWED');

  // Test 2: Try to access profiles table  
  const profilesTest = await supabase.from('hi_profiles').select('*');
  console.log('Profiles table access:', profilesTest.error ? '✅ BLOCKED' : '❌ ALLOWED');

  // Test 3: Check public feed access
  const feedTest = await supabase.from('public_hi_feed').select('*').limit(1);
  console.log('Public feed access:', feedTest.error ? '❌ BLOCKED' : '✅ ALLOWED');
  
  // Test 4: Check for PII in public feed
  if (feedTest.data && feedTest.data.length > 0) {
    const item = feedTest.data[0];
    const hasPII = item.email || item.user_id || item.phone;
    console.log('Public feed PII leak:', hasPII ? '❌ PII FOUND' : '✅ CLEAN');
  }

  console.log('🔍 Quick test complete');
})();
```

---

## Test Results Template

### Test Execution Record
**Date**: [YYYY-MM-DD]  
**Tester**: [Name]  
**Environment**: [Preview/Staging]  
**Browser**: [Chrome/Firefox/Safari]  

| Test ID | Test Name | Expected | Actual | Status |
|---------|-----------|----------|---------|---------|
| T1.1 | Cross-User Profile Access | DENY | DENY | ✅ PASS |
| T1.2 | Share Access Control | DENY private, ALLOW public | DENY private, ALLOW public | ✅ PASS |
| T2.1 | Anonymous Table Access | DENY | DENY | ✅ PASS |
| T2.2 | Public View Access | ALLOW (sanitized) | ALLOW (sanitized) | ✅ PASS |
| T3.1 | Cross-User Share Creation | DENY | DENY | ✅ PASS |
| T3.2 | Anonymous Write Operations | DENY | DENY | ✅ PASS |
| T4.1 | Direct Code Creation | DENY | DENY | ✅ PASS |

### Issues Found
[Document any failing tests, unexpected behavior, or security concerns]

### Recommendations  
[List any security improvements or policy updates needed]

---

*Security Testing | Manual Validation | RLS Policy Verification*