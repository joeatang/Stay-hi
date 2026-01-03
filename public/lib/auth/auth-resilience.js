/**
 * Auth Resilience Layer
 * Production-grade error handling inspired by X (Twitter) and Instagram
 * Handles network failures, retries, and graceful degradation
 */

(function() {
  'use strict';
  
  class AuthResilience {
    constructor(client) {
      this.client = client;
      this.retryCount = 0;
      this.maxRetries = 3;
      this.isOnline = navigator.onLine;
      this.refreshTimer = null;
      
      console.log('[AuthResilience] Initializing...');
    
    // 🔥 CRITICAL: Restore session immediately before anything else
    this.restoreSessionIfNeeded().then(() => {
      this.init();
    });
  }
  
  async restoreSessionIfNeeded() {
    try {
      console.log('[AuthResilience] Checking if session needs restoration...');
      const { data: { session }, error } = await this.client.auth.getSession();
      
      if (!session || error) {
        console.warn('[AuthResilience] No active session found - attempting restore from localStorage');
        
        // Try to restore from localStorage
        const token = localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');
        if (token) {
          try {
            const parsed = JSON.parse(token);
            if (parsed?.access_token && parsed?.refresh_token) {
              console.log('[AuthResilience] Found tokens in localStorage - restoring session');
              const { data, error: setError } = await this.client.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token
              });
              
              if (setError) {
                console.error('[AuthResilience] Session restore failed:', setError);
              } else if (data?.session) {
                console.log('[AuthResilience] ✅ Session restored successfully!');
              }
            }
          } catch (parseError) {
            console.error('[AuthResilience] Failed to parse stored token:', parseError);
          }
        } else {
          console.log('[AuthResilience] No stored tokens found');
        }
      } else {
        console.log('[AuthResilience] Active session found, no restoration needed');
      }
    } catch (err) {
      console.error('[AuthResilience] Session restoration check failed:', err);
    }
      this.client.auth.onAuthStateChange((event, session) => {
        if (window.__HI_DEBUG__) {
          console.log(`[AuthResilience] Auth event: ${event}`);
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthResilience] ✅ Token auto-refreshed');
          this.retryCount = 0;
          this.hideConnectionBanner();
          this.scheduleProactiveRefresh(session);
        }
        
        if (event === 'SIGNED_IN') {
          this.scheduleProactiveRefresh(session);
        }
      });
      
      // Handle online/offline events
      window.addEventListener('online', () => {
        console.log('[AuthResilience] ✅ Back online');
        this.isOnline = true;
        this.hideConnectionBanner();
        this.checkSession();
      });
      
      window.addEventListener('offline', () => {
        console.log('[AuthResilience] ⚠️ Offline');
        this.isOnline = false;
        this.showConnectionBanner('You\'re offline');
      });
      
      // Check session when tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (window.__HI_DEBUG__) {
            console.log('[AuthResilience] Tab visible - checking session');
          }
          this.checkSession();
        }
      });
      
      // 🔥 CRITICAL FIX: Check session on page load (handles browser close/reopen)
      // This catches the case when user closes browser and reopens after >60 min
      if (document.readyState === 'complete') {
        console.log('[AuthResilience] Page already loaded - checking session immediately');
        setTimeout(() => this.checkSession(), 500);
      } else {
        window.addEventListener('load', () => {
          console.log('[AuthResilience] Page loaded - checking session');
          setTimeout(() => this.checkSession(), 500);
        });
      }
    }
    
    async checkSession() {
      if (!this.isOnline) return;
      
      try {
        const { data: { session }, error } = await this.client.auth.getSession();
        
        if (error) {
          console.error('[AuthResilience] Session check failed:', error);
          return;
        }
        
        if (!session) {
          console.warn('[AuthResilience] No active session');
          return;
        }
        
        // Check if token expires soon (< 10 min)
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const minutesLeft = Math.round((expiresAt - now) / 60000);
        
        if (minutesLeft < 10) {
          console.log(`[AuthResilience] Token expires in ${minutesLeft} min - refreshing`);
          await this.refreshWithRetry();
        } else if (window.__HI_DEBUG__) {
          console.log(`[AuthResilience] ✅ Session valid for ${minutesLeft} min`);
        }
      } catch (err) {
        console.error('[AuthResilience] Check failed:', err);
      }
    }
    
    async refreshWithRetry() {
      const backoffs = [1000, 5000, 15000]; // Like X/Twitter
      
      for (let i = 0; i < this.maxRetries; i++) {
        try {
          if (window.__HI_DEBUG__) {
            console.log(`[AuthResilience] Refresh attempt ${i + 1}/${this.maxRetries}`);
          }
          
          const { data, error } = await this.client.auth.refreshSession();
          
          if (error) throw error;
          
          console.log('[AuthResilience] ✅ Refresh successful');
          this.retryCount = 0;
          this.hideConnectionBanner();
          return data;
          
        } catch (error) {
          this.retryCount = i + 1;
          console.warn(`[AuthResilience] Retry ${i + 1} failed:`, error.message);
          
          // Distinguish network errors from auth errors
          const isNetworkError = error.message?.includes('fetch') || 
                                 error.message?.includes('Network') ||
                                 error.message?.includes('Failed to');
          
          if (isNetworkError) {
            // Network error - show banner, retry
            this.showConnectionBanner('Trying to reconnect...');
            
            if (i < this.maxRetries - 1) {
              await this.sleep(backoffs[i]);
              continue;
            }
          } else {
            // Auth error (invalid token) - sign out
            console.error('[AuthResilience] Invalid token - signing out');
            this.showConnectionBanner('Session expired. Redirecting...');
            setTimeout(() => {
              window.location.href = '/signin.html?reason=session_expired';
            }, 2000);
            return;
          }
        }
      }
      
      // All retries failed - keep trying in background
      console.error('[AuthResilience] All retries failed - will retry in 60s');
      this.showConnectionBanner('Connection lost. Retrying...');
      setTimeout(() => this.refreshWithRetry(), 60000);
    }
    
    async scheduleProactiveRefresh(session) {
      if (!session) {
        const { data } = await this.client.auth.getSession();
        session = data?.session;
      }
      
      if (!session) return;
      
      // Refresh 5 min before expiration
      const BUFFER = 5 * 60 * 1000;
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const timeUntilRefresh = expiresAt - now - BUFFER;
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      
      if (timeUntilRefresh > 0) {
        if (window.__HI_DEBUG__) {
          console.log(`[AuthResilience] Proactive refresh in ${Math.round(timeUntilRefresh / 60000)} min`);
        }
        
        this.refreshTimer = setTimeout(async () => {
          console.log('[AuthResilience] Proactive refresh triggered');
          await this.refreshWithRetry();
        }, timeUntilRefresh);
      }
    }
    
    showConnectionBanner(message) {
      let banner = document.getElementById('hi-auth-banner');
      
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'hi-auth-banner';
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #FF7A18 0%, #FF6B09 100%);
          color: white;
          padding: 12px 20px;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          z-index: 999999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transform: translateY(-100%);
          transition: transform 0.3s ease-out;
        `;
        document.body.prepend(banner);
        
        // Animate in
        setTimeout(() => {
          banner.style.transform = 'translateY(0)';
        }, 10);
      }
      
      banner.textContent = message;
    }
    
    hideConnectionBanner() {
      const banner = document.getElementById('hi-auth-banner');
      if (banner) {
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => banner.remove(), 300);
      }
    }
    
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // Initialize when client is ready
  function initWhenReady() {
    const client = window.hiSupabase || window.__HI_SUPABASE_CLIENT || window.supabaseClient;
    
    if (client?.auth) {
      window.__hiAuthResilience = new AuthResilience(client);
      console.log('✅ Auth resilience initialized');
      return true;
    }
    
    return false;
  }
  
  // Try immediate init
  if (!initWhenReady()) {
    // Wait for client to be ready
    const checkInterval = setInterval(() => {
      if (initWhenReady()) {
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkInterval), 10000);
  }
  
})();
