// public/assets/auth.js
// Unified auth helper utilities

(function() {
  // Wait for Supabase client to be ready
  function waitForSupabase() {
    return new Promise((resolve) => {
      if (window.sb) {
        resolve(window.sb);
      } else {
        window.addEventListener('supabase-ready', (event) => {
          resolve(event.detail.client);
        });
      }
    });
  }

  // Export auth utilities to global scope
  window.hiAuth = {
    // Get current session
    async getSession() {
      const sb = await waitForSupabase();
      return sb.auth.getSession();
    },

    // Get current user
    async getUser() {
      const sb = await waitForSupabase();
      return sb.auth.getUser();
    },

    // Sign in with email (magic link)
    async signInWithEmail(email, options = {}) {
      const sb = await waitForSupabase();
      // Build robust redirect that works in dev/prod
      const next = (options && options.next) || 'hi-dashboard.html';
      const redirectTo = (window.hiPostAuthPath?.getPostAuthURL ? 
        window.hiPostAuthPath.getPostAuthURL({ next }) : 
        `${window.location.origin}/post-auth.html?next=${encodeURIComponent(next)}`);

      return sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });
    },

    // Sign out
    async signOut() {
      const sb = await waitForSupabase();
      return sb.auth.signOut();
    },

    // Check if user is authenticated
    async isAuthenticated() {
      try {
        const { data: { session } } = await this.getSession();
        return !!session;
      } catch {
        return false;
      }
    },

    // Redirect if not authenticated
    async requireAuth(redirectTo = '/signin.html') {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        const currentPath = encodeURIComponent(location.pathname + location.search);
        location.href = `${redirectTo}?next=${currentPath}`;
        return false;
      }
      return true;
    }
  };

  console.debug('[auth.js] Auth utilities ready');
})();