// 🚀 TESLA-GRADE INSTANT AUTH REDIRECT SYSTEM
// Eliminates content flash with pre-render detection

(function() {
  'use strict';
  
  // Check if this is an auth page that should redirect
  const isAuthPage = document.location.pathname.includes('signin') || 
                    document.location.pathname.includes('signup') ||
                    document.location.pathname.includes('auth-');
                    
  if (!isAuthPage) return;
  
  // Hide page immediately to prevent flash
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = 'none';
  
  // Auth detection with instant redirect
  function checkAuthAndRedirect() {
    // Check for magic link tokens in URL hash
    const hash = location.hash;
    if (hash && hash.includes('access_token') && hash.includes('refresh_token')) {
      console.log('🔐 Magic link detected - instant redirect');
      
      // Get intended destination
      const urlParams = new URLSearchParams(location.search);
      const next = urlParams.get('next') || 'hi-dashboard.html';
      
      // Instant redirect without visible page load
      const redirectUrl = `post-auth.html?next=${encodeURIComponent(next)}${hash}`;
      location.replace(redirectUrl);
      return true;
    }
    
    // Check for existing auth session
    try {
      const authSession = localStorage.getItem('sb-auth-token') || 
                         sessionStorage.getItem('supabase.auth.token');
      if (authSession) {
        console.log('🔐 Existing session - redirect to main app');
        location.replace('index.html');
        return true;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return false;
  }
  
  // Immediate check
  if (checkAuthAndRedirect()) {
    return; // Redirecting, don't show page
  }
  
  // Show page with smooth transition if no redirect needed
  setTimeout(() => {
    document.documentElement.style.transition = 'opacity 0.2s ease';
    document.documentElement.style.opacity = '1';
  }, 50);
  
  // Enhanced magic link handler for signin/signup pages
  if (window.location.pathname.includes('signin') || window.location.pathname.includes('signup')) {
    // Monitor for auth state changes
    let authCheckInterval = setInterval(() => {
      if (checkAuthAndRedirect()) {
        clearInterval(authCheckInterval);
      }
    }, 100);
    
    // Clear interval after 5 seconds
    setTimeout(() => clearInterval(authCheckInterval), 5000);
  }
  
})();