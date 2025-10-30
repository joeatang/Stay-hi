// 🚀 Tesla-Grade Auth Guard with Health Monitoring
(function() {
  'use strict';

  // Load health monitor first
  if (!window.AuthHealthMonitor) {
    console.warn('[auth-guard] ⚠️ Health monitor not loaded - loading now');
    const script = document.createElement('script');
    script.src = '/assets/auth-health-monitor.js';
    document.head.appendChild(script);
  }

  // Pages that don't need auth guards
  const PUBLIC_PAGES = [
    '/signin.html',
    '/signup.html',
    '/post-auth.html',
    '/session-nuke.html',
    '/tesla-auth-test.html',
    '/auth-debug.html',
    '/welcome.html' // Welcome page should always be public
    // 🚀 PRODUCTION: tesla-admin-dashboard.html REMOVED - now requires authentication
  ];

  // Check if current page needs protection
  function needsAuth() {
    const currentPath = location.pathname;
    const needs = !PUBLIC_PAGES.some(page => currentPath.endsWith(page));
    console.log(`[auth-guard] needsAuth() - path: ${currentPath}, needs: ${needs}`);
    return needs;
  }

  // Wait for Supabase to be ready
  async function waitForSupabase() {
    console.log('[auth-guard] waitForSupabase() - checking clients...');
    if (window.sb) {
      console.log('[auth-guard] Found window.sb immediately');
      return window.sb;
    }
    if (window.sbReady) {
      console.log('[auth-guard] Found window.sbReady, awaiting...');
      return await window.sbReady;
    }
    if (window.supabaseClient) {
      console.log('[auth-guard] Found window.supabaseClient immediately');
      return window.supabaseClient;
    }
    
    console.log('[auth-guard] No immediate client found, waiting for supabase-ready event...');
    
    // Wait for supabase-ready event with timeout
    return new Promise((resolve, reject) => {
      const checkGlobals = () => {
        if (window.sb) {
          console.log('[auth-guard] Found window.sb during wait');
          return resolve(window.sb);
        }
        if (window.supabaseClient) {
          console.log('[auth-guard] Found window.supabaseClient during wait');
          return resolve(window.supabaseClient);
        }
      };
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error('[auth-guard] Supabase client timeout after 10 seconds');
        reject(new Error('Supabase client initialization timeout'));
      }, 10000);
      
      checkGlobals();
      window.addEventListener('supabase-ready', (event) => {
        clearTimeout(timeout);
        const client = event.detail.client || window.sb || window.supabaseClient;
        console.log('[auth-guard] Got supabase-ready event, client:', !!client);
        resolve(client);
      });
    });
  }

  // Check if user is authenticated
  async function isAuthenticated() {
    try {
      console.log('[auth-guard] isAuthenticated() - starting check...');
      const sb = await waitForSupabase();
      
      if (!sb) {
        console.error('[auth-guard] No Supabase client available');
        return false;
      }
      
      console.log('[auth-guard] Got Supabase client, checking session...');
      const sessionResult = await sb.auth.getSession();
      console.log('[auth-guard] Raw session result:', sessionResult);
      
      const { data: { session }, error } = sessionResult;
      
      if (error) {
        console.error('[auth-guard] Session check error:', error);
        console.log('[auth-guard] Returning false due to session error');
        return false;
      }
      
      console.log('[auth-guard] Session check result:', {
        hasSession: !!session,
        sessionData: session ? 'present' : 'null',
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at
      });
      
      const isAuthenticated = !!session;
      console.log('[auth-guard] Final authentication result:', isAuthenticated);
      return isAuthenticated;
    } catch (error) {
      console.error('[auth-guard] Error checking auth:', error);
      return false;
    }
  }

  // Redirect to signin with current page as next parameter
  function redirectToSignin() {
    const currentPath = location.pathname + location.search;
    const signinUrl = `signin.html?next=${encodeURIComponent(currentPath)}`;
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

  // Main auth guard logic with Tesla-grade health monitoring
  async function authGuard() {
    console.log('[auth-guard] 🚀 Tesla-grade auth guard running for:', location.pathname);
    
    // Health check before anything else
    if (window.AuthHealthMonitor) {
      const healthReport = await window.AuthHealthMonitor.validateSessionHealth();
      if (healthReport.corruptionSignals.length > 0) {
        console.warn('[auth-guard] 🚨 Session corruption detected, attempting recovery...');
        const recovered = await window.AuthHealthMonitor.performRecovery(healthReport);
        if (!recovered && healthReport.corruptionSignals.length >= 3) {
          console.error('[auth-guard] 💥 Critical session corruption - performing surgical cleanup');
          // Use surgical cleanup instead of nuclear option to preserve user data
          await window.AuthHealthMonitor.surgicalSessionCleanup();
        }
      }
    }
    
    if (!needsAuth()) {
      console.log('[auth-guard] Public page, skipping');
      return; // Public pages don't need protection
    }

    // Check if this is a hybrid mode page BEFORE checking authentication
    const isHybridPage = location.pathname.endsWith('hi-island.html') || 
                         location.pathname.endsWith('hi-island-NEW.html') ||
                         location.pathname.endsWith('index.html') || 
                         location.pathname.endsWith('hi-muscle.html') ||
                         location.pathname.endsWith('profile.html') ||
                         location.pathname.endsWith('calendar.html') ||
                         location.pathname.endsWith('invite-admin.html') ||
                         location.pathname === '/';
    
    if (isHybridPage) {
      console.log('[auth-guard] ⭐ Hybrid mode page detected - allowing access regardless of auth');
      const authenticated = await isAuthenticated();
      console.log('[auth-guard] Auth status for hybrid page:', authenticated);
      
      if (authenticated) {
        console.log('[auth-guard] ✅ User authenticated - full features enabled');
        window.userAuthenticated = true;
      } else {
        console.log('[auth-guard] 🎭 No auth - hybrid mode with local features');
        window.userAuthenticated = false;
      }
      return; // Always allow hybrid pages
    }

    // For non-hybrid pages, require authentication
    const authenticated = await isAuthenticated();
    console.log('[auth-guard] Authenticated:', authenticated);
    
    if (!authenticated) {
      console.log('[auth-guard] ❌ Auth required but not authenticated - redirecting');
      redirectToSignin();
      return;
    }

    // User is authenticated, expose auth state globally
    console.log('[auth-guard] ✅ User authenticated for protected page');
    window.userAuthenticated = true;
  }

  // Run auth guard when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', authGuard);
  } else {
    authGuard();
  }
})();