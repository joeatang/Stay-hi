// ADMIN ACCESS TEST - Paste this in browser console on dashboard

(async function testAdminAccess() {
  console.log('🧪 TESTING ADMIN ACCESS CHAIN...\n');
  
  // Test 1: AdminAccessManager exists
  console.log('1️⃣ Testing AdminAccessManager...');
  if (!window.AdminAccessManager) {
    console.error('❌ FAIL: AdminAccessManager not found!');
    console.log('   Fix: Check if /lib/admin/AdminAccessManager.js loaded');
    return;
  }
  console.log('✅ AdminAccessManager exists');
  
  // Test 2: Get current state
  console.log('\n2️⃣ Getting admin state...');
  const state = window.AdminAccessManager.getState();
  console.log('State:', state);
  
  if (state.isAdmin === true) {
    console.log('✅ isAdmin: true');
    console.log('   Role Type:', state.roleType || 'not loaded yet');
    console.log('   User:', state.user?.email || state.user?.id || 'unknown');
  } else {
    console.log('❌ isAdmin: false');
    console.log('   Reason:', state.reason);
    console.log('   Status:', state.status);
    console.log('\n   TROUBLESHOOTING:');
    if (state.reason === 'no_session') {
      console.log('   → You are not signed in. Sign in first.');
    } else if (state.reason === 'unauthorized') {
      console.log('   → Your email is not in admin_roles table');
      console.log('   → Run SQL: SELECT * FROM admin_roles WHERE email = \'YOUR_EMAIL\';');
    } else {
      console.log('   → Unknown issue. Check Supabase logs.');
    }
  }
  
  // Test 3: Check DOM elements
  console.log('\n3️⃣ Checking DOM elements...');
  const adminSection = document.getElementById('adminSection');
  if (!adminSection) {
    console.error('❌ FAIL: adminSection element not found in DOM!');
    return;
  }
  console.log('✅ adminSection element exists');
  console.log('   Current display:', adminSection.style.display || 'default');
  
  const mcLink = adminSection.querySelector('a[href*="mission-control"]');
  if (!mcLink) {
    console.error('❌ FAIL: Mission Control link not found!');
    return;
  }
  console.log('✅ Mission Control link exists');
  console.log('   Text:', mcLink.textContent.trim());
  console.log('   Href:', mcLink.getAttribute('href'));
  
  // Test 4: Simulate opening menu
  console.log('\n4️⃣ Testing menu open logic...');
  const adminState = window.AdminAccessManager?.getState?.() || {};
  const isAdmin = adminState.isAdmin === true;
  console.log('   isAdmin check:', isAdmin);
  
  if (isAdmin) {
    console.log('✅ Menu would show admin section');
    adminSection.style.display = 'block';
  } else {
    console.log('❌ Menu would hide admin section');
    adminSection.style.display = 'none';
  }
  
  // Test 5: Force admin check
  console.log('\n5️⃣ Running fresh admin check...');
  try {
    const freshState = await window.AdminAccessManager.checkAdmin({ force: true });
    console.log('Fresh check result:', {
      isAdmin: freshState.isAdmin,
      status: freshState.status,
      reason: freshState.reason,
      user: freshState.user?.email || 'unknown'
    });
  } catch (err) {
    console.error('❌ Admin check failed:', err.message);
  }
  
  // Final summary
  console.log('\n📊 SUMMARY:');
  const finalState = window.AdminAccessManager.getState();
  if (finalState.isAdmin) {
    console.log('✅ You ARE an admin');
    console.log('✅ Mission Control link SHOULD be visible in menu');
    console.log('✅ You SHOULD be able to access hi-mission-control.html');
  } else {
    console.log('❌ You are NOT an admin');
    console.log('❌ Mission Control link will be HIDDEN');
    console.log('❌ You will see "Access Denied" on mission control page');
    console.log('\n🔧 TO FIX: Add your email to admin_roles table');
  }
})();
