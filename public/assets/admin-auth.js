// Admin Authentication Module
// Tesla-grade: Clean, timing-safe, reusable
(function() {
  'use strict';

  // Wait for Supabase to be ready
  async function getSupabase() {
    if (window.sb) return window.sb;
    if (window.supabaseClient) return window.supabaseClient;
    
    return new Promise((resolve) => {
      const check = () => {
        if (window.sb) return resolve(window.sb);
        if (window.supabaseClient) return resolve(window.supabaseClient);
      };
      
      check();
      window.addEventListener('supabase-ready', () => {
        resolve(window.sb || window.supabaseClient);
      });
    });
  }

  // Check if user is authenticated
  async function checkAuth() {
    try {
      const sb = await getSupabase();
      const { data: { user }, error } = await sb.auth.getUser();
      
      if (error || !user) {
        return { authenticated: false, isAdmin: false, user: null };
      }

      return { authenticated: true, isAdmin: false, user };
    } catch (error) {
      console.error('[admin-auth] Auth check failed:', error);
      return { authenticated: false, isAdmin: false, user: null };
    }
  }

  // Check if user has admin role
  async function checkAdminRole(userId) {
    try {
      const sb = await getSupabase();
      const { data: profile, error } = await sb
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[admin-auth] Profile check failed:', error);
        return false;
      }

      return profile?.is_admin === true;
    } catch (error) {
      console.error('[admin-auth] Admin role check failed:', error);
      return false;
    }
  }

  // Main admin authentication check
  async function requireAdmin() {
    console.log('[admin-auth] Starting admin check...');
    
    const authResult = await checkAuth();
    
    if (!authResult.authenticated) {
      console.log('[admin-auth] Not authenticated, redirecting to signin');
      window.location.href = '/signin.html?next=' + encodeURIComponent(window.location.pathname);
      return null;
    }

    console.log('[admin-auth] User authenticated:', authResult.user.email);

    // Check admin role
    const isAdmin = await checkAdminRole(authResult.user.id);
    
    if (!isAdmin) {
      console.log('[admin-auth] User is not admin, redirecting to index');
      window.location.href = '/index.html';
      return null;
    }

    console.log('[admin-auth] ✅ Admin access granted');
    
    // Set global user for other modules
    window.currentUser = authResult.user;
    window.isAdmin = true;

    return authResult.user;
  }

  // Expose API
  window.AdminAuth = {
    requireAdmin,
    checkAuth,
    checkAdminRole
  };

  console.log('[admin-auth] Module loaded');
})();
