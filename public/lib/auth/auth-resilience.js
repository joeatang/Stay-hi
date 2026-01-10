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
      this.isReady = false; // Track if initial session check is complete
      this._sessionCheckPromise = null;
      
      console.log('[AuthResilience] Initializing...');
      
      // 🔥 NAVIGATION FIX: Update client reference when new client created
      window.addEventListener('hi:supabase-client-ready', (e) => {
        if (e.detail?.client && this.client !== e.detail.client) {
          console.log('[AuthResilience] 🔄 Updating to new Supabase client');
          this.client = e.detail.client;
          // Check session with new client
          this.checkSession().catch(err => {
            console.warn('[AuthResilience] Session check with new client failed:', err.message);
          });
        }
      });
      
      // Wait for actual client to be ready before allowing queries
      this.init();
    }
    
    // 🔥 WOZ FIX: Allow synchronous waiting for initial check
    async waitForInitialCheck() {
      if (this.isReady) return;
      if (this._sessionCheckPromise) {
        await this._sessionCheckPromise;
      }
    }
    
    init() {
      // Listen for auth state changes
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
      
      // 🔥 MOBILE FIX: Handle mobile-specific backgrounding events
      // iOS Safari uses pageshow/pagehide instead of visibilitychange
      window.addEventListener('pageshow', (event) => {
        // event.persisted = true means page was restored from bfcache (mobile backgrounding)
        if (event.persisted) {
          console.log('[AuthResilience] 📱 Mobile: Page restored from bfcache - checking session');
          // �️ WOZ SURGICAL FIX: DON'T block the UI by setting isReady = false
          // Check session in background without breaking the app
          this.checkSession().catch(err => {
            console.warn('[AuthResilience] Background session check failed:', err);
          });
        }
      });
      
      window.addEventListener('pagehide', () => {
        if (window.__HI_DEBUG__) {
          console.log('[AuthResilience] 📱 Mobile: Page about to be hidden/cached');
        }
      });
      
      // 🔥 MOBILE FIX: Handle app resume (Android/iOS)
      window.addEventListener('focus', () => {
        console.log('[AuthResilience] 📱 Mobile: Window focused - checking session');
        // �️ WOZ SURGICAL FIX: Always check session in background without blocking
        this.checkSession().catch(err => {
          console.warn('[AuthResilience] Background session check failed:', err);
        });
      });
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
          console.log('[AuthResilience] No session in memory - checking localStorage...');
          
          // 🔥 MOBILE FIX: Restore session from localStorage
          // When mobile browsers background the app, Supabase loses in-memory state
          // but localStorage still has the tokens
          
          // Use the same storage key as HiSupabase.v3.js (hardcoded for stability)
          const storageKey = 'sb-gfcubvroxgfvjhacinic-auth-token';
          const stored = localStorage.getItem(storageKey);
          
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              
              // Supabase v2 stores: { access_token, refresh_token, expires_at, ... }
              const accessToken = parsed.access_token;
              const refreshToken = parsed.refresh_token;
              
              if (accessToken && refreshToken) {
                console.log('[AuthResilience] 🔄 Restoring session from localStorage...');
                
                const { data, error } = await this.client.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
                
                if (error) {
                  console.error('[AuthResilience] ❌ Restore failed:', error.message);
                  // Token might be expired - let user sign in again
                  return;
                }
                
                console.log('[AuthResilience] ✅ Session restored successfully!');
                this.scheduleProactiveRefresh(data.session);
                return;
              }
            } catch (err) {
              console.error('[AuthResilience] Failed to parse stored session:', err);
            }
          }
          
          console.warn('[AuthResilience] No session available - user needs to sign in');
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
              window.location.href = (window.hiPaths?.page ? window.hiPaths.page('signin', {reason: 'session_expired'}) : '/signin.html?reason=session_expired');
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
      const resilience = new AuthResilience(client);
      window.__hiAuthResilience = resilience;
      
      // 🚀 CRITICAL: Fire ready IMMEDIATELY to unblock AuthReady
      // During navigation, getSession() may abort - don't wait for it
      resilience.isReady = true;
      window.dispatchEvent(new CustomEvent('auth-resilience-ready'));
      console.log('✅ Auth resilience ready - checking session in background');
      
      // Check session in background (non-blocking)
      resilience.checkSession()
        .then(() => console.log('[AuthResilience] Background session check complete'))
        .catch((err) => console.warn('[AuthResilience] Background check failed (non-critical):', err.message));
      
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
    
    // Timeout after 3 seconds (not 10 - fail fast)
    setTimeout(() => {
      clearInterval(checkInterval);
      
      // 🔥 CRITICAL FIX: Even if client never loads, fire ready event
      // This prevents AuthReady from waiting forever and treating user as anonymous
      if (!window.__hiAuthResilience) {
        console.warn('[AuthResilience] ⚠️ Client never loaded - creating stub to unblock AuthReady');
        window.__hiAuthResilience = { isReady: true };
        window.dispatchEvent(new CustomEvent('auth-resilience-ready'));
      }
    }, 3000);
  }
  
})();
