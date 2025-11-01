// TEMPORARY BYPASS AUTH-GUARD for Hi-Muscle Testing
(function() {
  'use strict';
  
  console.log('🚨 BYPASS AUTH-GUARD loaded for:', location.pathname);
  
  // For hi-muscle, ALWAYS allow access
  if (location.pathname.endsWith('hi-muscle.html')) {
    console.log('✅ BYPASS: Hi-muscle detected - ALLOWING ACCESS');
    window.userAuthenticated = false; // Demo mode
    window.demoMode = true;
    return; // Exit without any auth checks
  }
  
  console.log('⚠️ BYPASS: Not hi-muscle, proceeding with normal logic...');
  // For other pages, use minimal logic
  window.userAuthenticated = false;
  window.demoMode = true;
})();