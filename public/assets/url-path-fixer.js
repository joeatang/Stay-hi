// URL Path Fixer for Stay Hi
// Handles Supabase redirect issues with /public/ prefix

(function() {
  'use strict';
  
  const currentUrl = window.location.href;
  const pathname = window.location.pathname;
  
  // Debug logging
  console.log('🔧 URL Path Fixer loaded');
  console.log('Current URL:', currentUrl);
  console.log('Pathname:', pathname);
  
  // Fix /public/ prefix in URLs
  if (pathname.includes('/public/')) {
    console.log('❌ Detected /public/ prefix in URL - fixing...');
    
    // Create corrected URL by removing /public/
    const correctedUrl = currentUrl.replace('/public/', '/');
    console.log('✅ Redirecting to corrected URL:', correctedUrl);
    
    // Use replace to avoid adding to browser history
    window.location.replace(correctedUrl);
    return;
  }
  
  // Handle Supabase auth redirects that may include wrong paths
  if (window.location.hash && window.location.hash.includes('access_token')) {
    console.log('🔑 Auth tokens detected in URL');
    
    // If we're not already on post-auth or signin, redirect there
    if (!pathname.endsWith('post-auth.html') && !pathname.endsWith('signin.html')) {
      console.log('🔄 Redirecting auth tokens to post-auth handler');
      
      // Determine the intended destination
      const urlParams = new URLSearchParams(window.location.search);
      const next = urlParams.get('next') || 'hi-dashboard.html';
      
      const postAuthUrl = `/post-auth.html?next=${encodeURIComponent(next)}${window.location.hash}`;
      window.location.replace(postAuthUrl);
      return;
    }
  }
  
  console.log('✅ URL path is correct');
})();