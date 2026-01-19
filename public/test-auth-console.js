/**
 * 🧪 SILENT LOGOUT FIX - CONSOLE TESTS
 * Run these in browser console on Hi Island (http://localhost:3030/hi-island-NEW.html)
 */

console.log('🧪 Loading AuthReady test suite...');

// ============================================================================
// TEST 1: Verify AuthReady timeout protection is active
// ============================================================================
async function test1_checkAuthReadyProtection() {
  console.log('\n🧪 TEST 1: Check AuthReady timeout protection');
  
  // Check if AuthReady has cached session
  if (window.__hiAuthReady) {
    console.log('✅ AuthReady cache exists:', {
      hasSession: !!window.__hiAuthReady.session,
      userId: window.__hiAuthReady.session?.user?.id,
      timestamp: window.__hiAuthReady._timestamp,
      age: window.__hiAuthReady._timestamp ? `${Date.now() - window.__hiAuthReady._timestamp}ms` : 'N/A'
    });
  } else {
    console.warn('⚠️ AuthReady cache NOT found - may not be initialized yet');
  }
  
  // Check auth ready status
  if (window.isAuthReady && typeof window.isAuthReady === 'function') {
    console.log('✅ isAuthReady():', window.isAuthReady());
  } else {
    console.warn('⚠️ isAuthReady() not available');
  }
  
  // Check auth state
  if (window.getAuthState && typeof window.getAuthState === 'function') {
    const state = window.getAuthState();
    console.log('✅ Auth state:', {
      hasSession: !!state?.session,
      hasMembership: !!state?.membership,
      tier: state?.membership?.tier,
      ready: state?.ready
    });
  }
}

// ============================================================================
// TEST 2: Check session validity before share submission
// ============================================================================
async function test2_checkSessionBeforeShare() {
  console.log('\n🧪 TEST 2: Session validity check (like share submission would)');
  
  try {
    const sb = window.HiSupabase?.getClient() || window.supabaseClient;
    if (!sb) {
      console.error('❌ Supabase client not available');
      return;
    }
    
    console.log('⏱️ Calling getSession() with 2s timeout...');
    const start = Date.now();
    
    const sessionPromise = sb.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 2000)
    );
    
    try {
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      const elapsed = Date.now() - start;
      
      if (error) {
        console.error('❌ Session check failed:', error);
      } else if (session?.user) {
        console.log(`✅ Session valid (${elapsed}ms):`, {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: new Date(session.expires_at * 1000).toLocaleString()
        });
      } else {
        console.warn('⚠️ No session found - user appears logged out');
      }
    } catch (timeoutError) {
      const elapsed = Date.now() - start;
      console.warn(`⚠️ Session check timeout (${elapsed}ms) - would use cached fallback`);
      
      // Check if cache exists
      if (window.__hiAuthReady?.session) {
        console.log('✅ Cache fallback available:', {
          userId: window.__hiAuthReady.session.user?.id,
          cacheAge: `${Date.now() - (window.__hiAuthReady._timestamp || 0)}ms`
        });
      } else {
        console.error('❌ No cache fallback - user would be logged out!');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// ============================================================================
// TEST 3: Simulate navigation stress test
// ============================================================================
async function test3_navigationStressTest() {
  console.log('\n🧪 TEST 3: Navigation stress test (simulate rapid nav)');
  
  console.log('📊 Before navigation:');
  console.log('  - Load count:', window.__ISLAND_LOAD_COUNT);
  console.log('  - Auth ready:', window.isAuthReady?.());
  console.log('  - Session cached:', !!window.__hiAuthReady?.session);
  
  // Simulate pageshow event (like BFCache restore)
  console.log('\n🔄 Simulating pageshow event (BFCache restore)...');
  const event = new PageTransitionEvent('pageshow', { persisted: true });
  window.dispatchEvent(event);
  
  await new Promise(r => setTimeout(r, 100));
  
  console.log('📊 After navigation:');
  console.log('  - Auth ready:', window.isAuthReady?.());
  console.log('  - Session cached:', !!window.__hiAuthReady?.session);
  console.log('  - Profile cached:', !!window.ProfileManager?.getProfile());
  
  if (window.isAuthReady?.() && window.__hiAuthReady?.session) {
    console.log('✅ Auth state preserved after navigation');
  } else {
    console.warn('⚠️ Auth state may have been reset');
  }
}

// ============================================================================
// TEST 4: Test share submission flow (dry run)
// ============================================================================
async function test4_shareSubmissionDryRun() {
  console.log('\n🧪 TEST 4: Share submission dry run');
  
  // Check if share dependencies exist
  const checks = {
    'window.hiDB': !!window.hiDB,
    'hiDB.insertPublicShare': !!(window.hiDB?.insertPublicShare),
    'Supabase client': !!(window.HiSupabase?.getClient() || window.supabaseClient),
    'HiShareSheet': !!window.HiShareSheet,
    'Auth session': !!window.__hiAuthReady?.session
  };
  
  console.log('📋 Dependency checks:');
  Object.entries(checks).forEach(([name, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${name}`);
  });
  
  if (checks['Auth session']) {
    const session = window.__hiAuthReady.session;
    console.log('\n✅ Session details:', {
      userId: session.user?.id,
      email: session.user?.email,
      expiresAt: new Date(session.expires_at * 1000).toLocaleString(),
      timeUntilExpiry: Math.round((session.expires_at * 1000 - Date.now()) / 1000 / 60) + ' minutes'
    });
    
    // Check if session is expired
    if (session.expires_at * 1000 < Date.now()) {
      console.error('❌ SESSION EXPIRED - shares will fail!');
    } else {
      console.log('✅ Session valid - shares should work');
    }
  } else {
    console.error('❌ No session - shares will fail with auth.uid() = NULL');
  }
  
  // Test RPC availability (don't actually call it)
  if (window.HiSupabase?.getClient()) {
    const sb = window.HiSupabase.getClient();
    console.log('\n📡 RPC check:');
    console.log('  - Supabase RPC available:', typeof sb.rpc === 'function');
    console.log('  - Can call create_public_share:', typeof sb.rpc === 'function');
  }
}

// ============================================================================
// TEST 5: Check for zombie states
// ============================================================================
function test5_checkZombieStates() {
  console.log('\n🧪 TEST 5: Check for zombie states (cached vs actual)');
  
  const profileCached = window.ProfileManager?.getProfile();
  const sessionCached = window.__hiAuthReady?.session;
  const authReady = window.isAuthReady?.();
  
  console.log('🔍 State comparison:');
  console.log('  ProfileManager:', {
    exists: !!profileCached,
    userId: profileCached?.id,
    tier: profileCached?.tier
  });
  console.log('  Session cache:', {
    exists: !!sessionCached,
    userId: sessionCached?.user?.id,
    expired: sessionCached ? (sessionCached.expires_at * 1000 < Date.now()) : null
  });
  console.log('  Auth ready:', authReady);
  
  // Check for mismatches (zombie state)
  if (profileCached && !sessionCached) {
    console.error('❌ ZOMBIE STATE: ProfileManager has data but no session!');
    console.error('   This is the silent logout bug - user appears logged in but can\'t do anything');
  } else if (profileCached?.id !== sessionCached?.user?.id) {
    console.error('❌ MISMATCH: ProfileManager userId doesn\'t match session userId!');
  } else if (profileCached && sessionCached) {
    console.log('✅ States match - no zombie state detected');
  } else {
    console.log('ℹ️ Both empty - user is anonymous (expected if not logged in)');
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  console.log('🚀 Starting AuthReady diagnostic tests...\n');
  console.log('═══════════════════════════════════════════════════════════');
  
  await test1_checkAuthReadyProtection();
  await new Promise(r => setTimeout(r, 500));
  
  await test2_checkSessionBeforeShare();
  await new Promise(r => setTimeout(r, 500));
  
  await test3_navigationStressTest();
  await new Promise(r => setTimeout(r, 500));
  
  await test4_shareSubmissionDryRun();
  await new Promise(r => setTimeout(r, 500));
  
  test5_checkZombieStates();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ All tests complete!');
  console.log('\n💡 To run individual tests:');
  console.log('   test1_checkAuthReadyProtection()');
  console.log('   test2_checkSessionBeforeShare()');
  console.log('   test3_navigationStressTest()');
  console.log('   test4_shareSubmissionDryRun()');
  console.log('   test5_checkZombieStates()');
}

// Auto-run if ?test=1 in URL
if (window.location.search.includes('test=1')) {
  console.log('🔬 Auto-running tests (remove ?test=1 to disable)');
  setTimeout(runAllTests, 2000); // Wait for page to fully load
} else {
  console.log('💡 Run runAllTests() to start all diagnostic tests');
  console.log('   Or add ?test=1 to URL to auto-run on page load');
}

// Expose to window for easy console access
window.authTests = {
  runAll: runAllTests,
  test1: test1_checkAuthReadyProtection,
  test2: test2_checkSessionBeforeShare,
  test3: test3_navigationStressTest,
  test4: test4_shareSubmissionDryRun,
  test5: test5_checkZombieStates
};

console.log('✅ Test suite loaded! Type authTests.runAll() to begin');
