// Auth guard - protects pages that require authentication
(function() {
  'use strict';

  // Pages that don't need auth guards
  const PUBLIC_PAGES = [
    '/signin.html',
    '/post-auth.html'
  ];

  // Check if current page needs protection
  function needsAuth() {
    const currentPath = location.pathname;
    return !PUBLIC_PAGES.some(page => currentPath.endsWith(page));
  }

  // Wait for Supabase to be ready
  async function waitForSupabase() {
    if (window.sb) return window.sb;
    if (window.sbReady) return await window.sbReady;
    if (window.supabaseClient) return window.supabaseClient;
    
    // Wait for supabase-ready event
    return new Promise((resolve) => {
      const checkGlobals = () => {
        if (window.sb) return resolve(window.sb);
        if (window.supabaseClient) return resolve(window.supabaseClient);
      };
      
      checkGlobals();
      window.addEventListener('supabase-ready', (event) => {
        resolve(event.detail.client || window.sb || window.supabaseClient);
      });
    });
  }

  // Check if user is authenticated
  async function isAuthenticated() {
    try {
      const sb = await waitForSupabase();
      const { data: { session } } = await sb.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('[auth-guard] Error checking auth:', error);
      return false;
    }
  }

  // Redirect to signin with current page as next parameter
  function redirectToSignin() {
    const currentPath = location.pathname + location.search;
    const signinUrl = `/signin.html?next=${encodeURIComponent(currentPath)}`;
    location.replace(signinUrl);
  }

  // Special handling for demo mode
  function setupPublicPreview() {
    // Set up demo mode globally
    window.demoMode = true;
    console.log('🎭 Running in demo mode - data will be stored locally');
    
    // Add a subtle banner to indicate demo mode
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      background: linear-gradient(135deg, #ffd166, #ff7a18);
      color: white; text-align: center; padding: 6px;
      font-size: 13px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    banner.innerHTML = `
      🎭 Demo Mode • Data stored locally • <a href="signin.html" style="color: white; text-decoration: underline;">Sign in for full features</a>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Add margin to body to account for banner
    document.body.style.marginTop = '32px';
  }

  // Main auth guard logic
  async function authGuard() {
    if (!needsAuth()) return; // Public pages don't need protection

    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      // Special cases: these pages get full features with demo fallback
      if (location.pathname.endsWith('hi-island.html') || 
          location.pathname.endsWith('index.html') || 
          location.pathname === '/') {
        console.log('🌐 Enabling full features with Supabase + localStorage hybrid mode');
        // Don't force demo mode - let the app try Supabase first
        return;
      }
      
      // All other pages require authentication
      redirectToSignin();
      return;
    }

    // User is authenticated, expose auth state globally
    window.userAuthenticated = true;
  }

  // Run auth guard when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', authGuard);
  } else {
    authGuard();
  }
})();