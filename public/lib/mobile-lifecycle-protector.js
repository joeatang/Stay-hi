/**
 * Mobile Lifecycle Protector
 * 
 * iOS Safari AGGRESSIVELY manages memory when backgrounding apps.
 * This protector ensures critical globals are restored if wiped.
 */

(function() {
  'use strict';
  
  console.log('🛡️ Mobile Lifecycle Protector loading...');
  
  // Store references to critical globals
  const criticalGlobals = {};
  
  // Track the current page to detect navigation
  const currentPage = window.location.pathname;
  
  function captureGlobals() {
    if (window.hiDB) {
      criticalGlobals.hiDB = window.hiDB;
    }
    // ❌ DISABLED: ProfileManager restoration causes singleton corruption across navigation
    // Each page must initialize ProfileManager fresh to avoid stale state
    // if (window.ProfileManager) {
    //   criticalGlobals.ProfileManager = window.ProfileManager;
    // }
    if (window.HiSupabase) {
      criticalGlobals.HiSupabase = window.HiSupabase;
    }
    // ❌ DO NOT capture supabaseClient - it contains session state that should NOT be restored
    // Each page must create its own fresh client to avoid stale session bugs
    if (window.HiBrandTiers) {
      criticalGlobals.HiBrandTiers = window.HiBrandTiers;
    }
  }
  
  function restoreGlobals() {
    let restored = false;
    
    // Check if any critical global is missing
    if (!window.hiDB && criticalGlobals.hiDB) {
      console.warn('🚨 window.hiDB was wiped - restoring...');
      window.hiDB = criticalGlobals.hiDB;
      restored = true;
    }
    
    // ❌ DISABLED: ProfileManager restoration causes singleton corruption
    // if (!window.ProfileManager && criticalGlobals.ProfileManager) {
    //   console.warn('🚨 window.ProfileManager was wiped - restoring...');
    //   window.ProfileManager = criticalGlobals.ProfileManager;
    //   restored = true;
    // }
    
    if (!window.HiSupabase && criticalGlobals.HiSupabase) {
      console.warn('🚨 window.HiSupabase was wiped - restoring...');
      window.HiSupabase = criticalGlobals.HiSupabase;
      restored = true;
    }
    
    // ❌ DO NOT restore supabaseClient - let each page create fresh client
    // Restoring stale client causes session corruption and auth failures
    
    if (!window.HiBrandTiers && criticalGlobals.HiBrandTiers) {
      console.warn('🚨 window.HiBrandTiers was wiped - restoring...');
      window.HiBrandTiers = criticalGlobals.HiBrandTiers;
      restored = true;
    }
    
    if (restored) {
      console.log('✅ Critical globals restored');
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('hi:globals-restored'));
    }
    
    return restored;
  }
  
  // Capture globals after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      captureGlobals();
      console.log('📸 Captured critical globals:', Object.keys(criticalGlobals));
    }, 2000); // Wait for everything to initialize
  });
  
  // iOS Safari: Restore on pageshow if page came from bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Check if we're on the same page (bfcache restore) or navigated to different page
      const isNavigated = window.location.pathname !== currentPage;
      
      if (isNavigated) {
        console.log('🚫 Navigation detected - skipping restore (different page)');
        return;
      }
      
      console.log('🔄 Page restored from bfcache - checking globals...');
      const didRestore = restoreGlobals();
      
      if (didRestore) {
        // If we had to restore, recapture everything
        setTimeout(() => captureGlobals(), 100);
      }
    }
  });
  
  // Capture before page is hidden (ONLY if going to bfcache, not navigating away)
  window.addEventListener('pagehide', (event) => {
    // Only capture if page is being cached (backgrounding), not destroyed (navigation)
    if (event.persisted) {
      captureGlobals();
    }
  });
  
  // Also restore on visibilitychange (desktop browsers)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Only restore if we're still on the same page
      const isNavigated = window.location.pathname !== currentPage;
      if (!isNavigated) {
        restoreGlobals();
      }
    }
  });
  
  // Periodically check for wiped globals (aggressive mobile cleanup) - only on same page
  setInterval(() => {
    const isNavigated = window.location.pathname !== currentPage;
    if (!isNavigated) {
      restoreGlobals();
    }
  }, 5000);
  
  console.log('✅ Mobile Lifecycle Protector active');
  
})();
