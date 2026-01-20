/**
 * 🔍 PROFILE DATA DIAGNOSTIC TOOL
 * 
 * Purpose: Help diagnose why profile data disappears after sign out/in
 * Run this in browser console on profile page
 * 
 * Usage:
 * 1. Open profile page
 * 2. Paste this entire script in browser console
 * 3. Run: await diagnoseProfileData()
 * 4. Copy the output and share with developer
 */

async function diagnoseProfileData() {
  console.log('🔍 STARTING PROFILE DATA DIAGNOSIS\n');
  console.log('=' .repeat(60));
  
  const report = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    checks: {}
  };
  
  // ============================================
  // CHECK 1: Current User Session
  // ============================================
  console.log('\n📋 CHECK 1: Current User Session');
  console.log('-'.repeat(60));
  
  try {
    const session = await window.hiAuth?.getCurrentUser?.();
    report.checks.session = {
      exists: !!session,
      userId: session?.id || 'none',
      email: session?.email || 'none',
      isAnonymous: session?.id === 'anonymous',
      source: 'hiAuth.getCurrentUser()'
    };
    
    console.log('Session:', report.checks.session);
  } catch (error) {
    report.checks.session = { error: error.message };
    console.error('❌ Session check failed:', error);
  }
  
  // ============================================
  // CHECK 2: Supabase Client
  // ============================================
  console.log('\n📋 CHECK 2: Supabase Client');
  console.log('-'.repeat(60));
  
  try {
    const supaClient = window.hiSupabase?.getClient?.() || window.supabase?.createClient?.(
      window.SUPABASE_URL || window.__supabaseConfig?.url,
      window.SUPABASE_ANON_KEY || window.__supabaseConfig?.anonKey
    );
    
    report.checks.supabase = {
      clientExists: !!supaClient,
      hasUrl: !!(window.SUPABASE_URL || window.__supabaseConfig?.url),
      hasKey: !!(window.SUPABASE_ANON_KEY || window.__supabaseConfig?.anonKey)
    };
    
    if (supaClient) {
      const { data: sessionData } = await supaClient.auth.getSession();
      report.checks.supabase.session = {
        exists: !!sessionData?.session,
        userId: sessionData?.session?.user?.id || 'none',
        email: sessionData?.session?.user?.email || 'none'
      };
    }
    
    console.log('Supabase:', report.checks.supabase);
  } catch (error) {
    report.checks.supabase = { error: error.message };
    console.error('❌ Supabase check failed:', error);
  }
  
  // ============================================
  // CHECK 3: LocalStorage Profile Data
  // ============================================
  console.log('\n📋 CHECK 3: LocalStorage Profile Data');
  console.log('-'.repeat(60));
  
  report.checks.localStorage = {};
  
  const lsKeys = [
    'currentProfile',
    'hi_profile',
    'profile_data',
    'userProfile',
    'user_data'
  ];
  
  lsKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        report.checks.localStorage[key] = {
          exists: true,
          hasDisplayName: !!parsed.displayName || !!parsed.display_name,
          hasBio: !!parsed.bio,
          hasAvatar: !!parsed.avatarUrl || !!parsed.avatar_url,
          size: value.length
        };
        console.log(`✓ ${key}:`, report.checks.localStorage[key]);
      } else {
        report.checks.localStorage[key] = { exists: false };
      }
    } catch (error) {
      report.checks.localStorage[key] = { error: error.message };
    }
  });
  
  // ============================================
  // CHECK 4: Database Profile Query
  // ============================================
  console.log('\n📋 CHECK 4: Database Profile Query');
  console.log('-'.repeat(60));
  
  try {
    const userId = report.checks.session?.userId || report.checks.supabase?.session?.userId;
    
    if (userId && userId !== 'none' && userId !== 'anonymous') {
      const supaClient = window.hiSupabase?.getClient?.() || window.supabase?.createClient?.(
        window.SUPABASE_URL || window.__supabaseConfig?.url,
        window.SUPABASE_ANON_KEY || window.__supabaseConfig?.anonKey
      );
      
      if (supaClient) {
        const { data: profileData, error: profileError } = await supaClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        report.checks.databaseProfile = {
          querySucceeded: !profileError,
          profileExists: !!profileData,
          hasDisplayName: !!profileData?.display_name,
          hasBio: !!profileData?.bio,
          hasAvatar: !!profileData?.avatar_url,
          hasLocation: !!profileData?.location,
          data: profileError ? null : {
            username: profileData?.username,
            display_name: profileData?.display_name,
            bio: profileData?.bio ? `${profileData.bio.substring(0, 50)}...` : null,
            location: profileData?.location,
            created_at: profileData?.created_at,
            updated_at: profileData?.updated_at
          },
          error: profileError?.message
        };
        
        console.log('Database Profile:', report.checks.databaseProfile);
      }
    } else {
      report.checks.databaseProfile = { 
        skipped: true, 
        reason: 'No authenticated user ID' 
      };
      console.log('⚠️ Skipped - no authenticated user');
    }
  } catch (error) {
    report.checks.databaseProfile = { error: error.message };
    console.error('❌ Database profile check failed:', error);
  }
  
  // ============================================
  // CHECK 5: Window Global Variables
  // ============================================
  console.log('\n📋 CHECK 5: Window Global Variables');
  console.log('-'.repeat(60));
  
  report.checks.globals = {
    currentProfile: !!window.currentProfile,
    userStats: !!window.userStats,
    ProfileManager: !!window.ProfileManager,
    hiDB: !!window.hiDB,
    hiAuth: !!window.hiAuth,
    hiSupabase: !!window.hiSupabase
  };
  
  if (window.currentProfile) {
    report.checks.globals.currentProfileData = {
      hasDisplayName: !!window.currentProfile.displayName,
      hasBio: !!window.currentProfile.bio,
      hasAvatar: !!window.currentProfile.avatarUrl
    };
  }
  
  console.log('Globals:', report.checks.globals);
  
  // ============================================
  // CHECK 6: ProfileManager State
  // ============================================
  console.log('\n📋 CHECK 6: ProfileManager State');
  console.log('-'.repeat(60));
  
  try {
    if (window.ProfileManager) {
      const pmState = window.ProfileManager.getState?.();
      report.checks.profileManager = {
        exists: true,
        hasGetState: typeof window.ProfileManager.getState === 'function',
        state: pmState ? {
          userId: pmState.userId,
          displayName: pmState.displayName,
          hasData: !!pmState.displayName || !!pmState.bio
        } : 'no getState method'
      };
      
      console.log('ProfileManager:', report.checks.profileManager);
    } else {
      report.checks.profileManager = { exists: false };
      console.log('⚠️ ProfileManager not found');
    }
  } catch (error) {
    report.checks.profileManager = { error: error.message };
    console.error('❌ ProfileManager check failed:', error);
  }
  
  // ============================================
  // CHECK 7: DOM Elements
  // ============================================
  console.log('\n📋 CHECK 7: DOM Elements (Current Display)');
  console.log('-'.repeat(60));
  
  report.checks.domElements = {
    displayName: document.querySelector('.profile-display-name, [data-profile-name]')?.textContent?.trim() || 'not found',
    bio: document.querySelector('.profile-bio, [data-profile-bio]')?.textContent?.trim()?.substring(0, 50) || 'not found',
    avatar: document.querySelector('.profile-avatar, [data-profile-avatar]')?.src || 'not found',
    location: document.querySelector('.profile-location, [data-profile-location]')?.textContent?.trim() || 'not found'
  };
  
  console.log('DOM Display:', report.checks.domElements);
  
  // ============================================
  // DIAGNOSIS SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  
  const issues = [];
  
  // Analyze findings
  if (!report.checks.session?.exists) {
    issues.push('⚠️ No active session found');
  }
  
  if (!report.checks.databaseProfile?.profileExists) {
    issues.push('❌ CRITICAL: Profile not found in database');
  }
  
  if (report.checks.databaseProfile?.profileExists && 
      !report.checks.databaseProfile?.hasDisplayName) {
    issues.push('⚠️ Profile exists but missing display_name');
  }
  
  const hasLocalStorage = Object.values(report.checks.localStorage || {})
    .some(v => v.exists);
  if (!hasLocalStorage) {
    issues.push('⚠️ No profile data in localStorage');
  }
  
  if (report.checks.domElements?.displayName === 'not found' ||
      report.checks.domElements?.displayName === '') {
    issues.push('⚠️ Display name not showing in UI');
  }
  
  if (issues.length === 0) {
    console.log('✅ No issues detected - profile data looks healthy');
  } else {
    console.log('\n⚠️ ISSUES FOUND:');
    issues.forEach(issue => console.log(issue));
  }
  
  // ============================================
  // RECOMMENDATIONS
  // ============================================
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('-'.repeat(60));
  
  if (!report.checks.databaseProfile?.profileExists) {
    console.log('1. Profile needs to be re-created in database');
    console.log('   → Run SQL: SELECT * FROM profiles WHERE email = \'user@email.com\'');
  }
  
  if (!hasLocalStorage && report.checks.databaseProfile?.profileExists) {
    console.log('2. LocalStorage not syncing from database');
    console.log('   → Check loadProfileData() function');
  }
  
  if (report.checks.databaseProfile?.profileExists && 
      report.checks.domElements?.displayName === 'not found') {
    console.log('3. Database has data but UI not displaying it');
    console.log('   → Check updateProfileDisplay() function');
  }
  
  // ============================================
  // EXPORT REPORT
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📤 FULL REPORT (Copy this for developer):');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));
  
  // Also copy to clipboard if possible
  try {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    console.log('\n✅ Report copied to clipboard!');
  } catch {
    console.log('\n⚠️ Could not copy to clipboard automatically');
  }
  
  return report;
}

// Also create a function to test profile save
async function testProfileSave(testData = {}) {
  console.log('🧪 TESTING PROFILE SAVE\n');
  console.log('=' .repeat(60));
  
  const testProfile = {
    displayName: testData.displayName || 'Test Name ' + Date.now(),
    bio: testData.bio || 'Test bio',
    location: testData.location || 'Test Location',
    ...testData
  };
  
  console.log('Test profile data:', testProfile);
  
  try {
    // Try to get Supabase client
    const supaClient = window.hiSupabase?.getClient?.() || window.supabase?.createClient?.(
      window.SUPABASE_URL || window.__supabaseConfig?.url,
      window.SUPABASE_ANON_KEY || window.__supabaseConfig?.anonKey
    );
    
    if (!supaClient) {
      throw new Error('No Supabase client available');
    }
    
    // Get current user
    const { data: sessionData } = await supaClient.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      throw new Error('No authenticated user');
    }
    
    console.log('User ID:', userId);
    
    // Try to update profile
    console.log('\n📤 Attempting database update...');
    const { data, error } = await supaClient
      .from('profiles')
      .update({
        display_name: testProfile.displayName,
        bio: testProfile.bio,
        location: testProfile.location,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error('❌ Update failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Update succeeded:', data);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const { data: verifyData, error: verifyError } = await supaClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return { success: true, verified: false, error: verifyError.message };
    }
    
    console.log('✅ Verification succeeded:', verifyData);
    
    const matches = 
      verifyData.display_name === testProfile.displayName &&
      verifyData.bio === testProfile.bio &&
      verifyData.location === testProfile.location;
    
    if (matches) {
      console.log('✅ All fields match! Profile save working correctly.');
      return { success: true, verified: true, data: verifyData };
    } else {
      console.log('⚠️ Fields do not match after save:');
      console.log('Expected:', testProfile);
      console.log('Got:', verifyData);
      return { success: true, verified: false, mismatch: true };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Export functions to window for easy access
window.diagnoseProfileData = diagnoseProfileData;
window.testProfileSave = testProfileSave;

console.log(`
✅ Diagnostic tools loaded!

Run these commands in console:

1. Diagnose profile data issues:
   await diagnoseProfileData()

2. Test profile save functionality:
   await testProfileSave()

3. Test with custom data:
   await testProfileSave({ displayName: 'Cindy', bio: 'Test bio' })
`);
