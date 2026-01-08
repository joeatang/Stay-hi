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

  // Pages that don't need auth guards - TESLA FORTRESS MODE
  const PUBLIC_PAGES = [
    '/welcome.html',
    '/signin.html', 
    '/signup.html',
    '/post-auth.html',
    '/auth-callback.html'
    // 🚀 TESLA FORTRESS: Only these 5 pages accessible to unauthenticated users
    // All other pages require authentication
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

  // Check if user is authenticated with Tesla-grade session validation + membership expiration
  async function isAuthenticated() {
    try {
      // 🔥 WOZ FIX: Wait for auth-resilience using direct promise (not event)
      // Events can be missed if fired before listener attached (mobile race condition)
      if (window.__hiAuthResilience) {
        if (!window.__hiAuthResilience.isReady) {
          console.log('[auth-guard] ⏳ Waiting for auth-resilience initial check...');
          
          // Try direct promise wait first (most reliable)
          if (typeof window.__hiAuthResilience.waitForInitialCheck === 'function') {
            await window.__hiAuthResilience.waitForInitialCheck();
            console.log('[auth-guard] ✅ Auth-resilience ready (via promise)');
          } else {
            // Fallback to event listener with timeout
            await new Promise((resolve) => {
              window.addEventListener('auth-resilience-ready', resolve, { once: true });
              setTimeout(resolve, 3000); // Timeout safety
            });
            console.log('[auth-guard] ✅ Auth-resilience ready (via event)');
          }
        } else {
          console.log('[auth-guard] ✅ Auth-resilience already ready');
        }
      }
      
      const sb = await waitForSupabase();
      if (!sb) {
        console.error('[auth-guard] No Supabase client available');
        return false;
      }
      
      console.log('[auth-guard] Getting session...');
      const { data: { session }, error } = await sb.auth.getSession();
      
      if (error) {
        console.error('[auth-guard] Session error:', error);
        return false;
      }
      
      if (!session) {
        console.log('[auth-guard] No active session found');
        return false;
      }
      
      console.log('[auth-guard] Session check result:', {
        hasSession: !!session,
        sessionData: session ? 'present' : 'null',
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at
      });
      
      // 🚀 TESLA-GRADE MEMBERSHIP EXPIRATION CHECK
      console.log('[auth-guard] 🔐 Validating membership access...');
      try {
        const membershipResult = await sb.rpc('get_my_membership');
        
        if (membershipResult.error) {
          console.error('[auth-guard] Membership check failed:', membershipResult.error);
          // Fallback to basic session validation for legacy users
          return !!session;
        }
        
        const membership = membershipResult.data;
        console.log('[auth-guard] Membership status:', membership);
        
        // Check for expired trial without subscription
        if (membership.status === 'expired' && membership.access_revoked) {
          console.warn('[auth-guard] 🚫 Trial membership expired, logging out...');
          
          // Show expiration notice before logout
          if (window.PremiumUX) {
            window.PremiumUX.showNotice(`
              <div style="text-align: center; padding: 20px;">
                <h3 style="color: #ff6b6b; margin-bottom: 12px;">⏰ Trial Membership Expired</h3>
                <p style="margin-bottom: 16px;">Your ${membership.tier} trial ended on ${new Date(membership.trial_ended_at).toLocaleDateString()}</p>
                <button onclick="location.href='upgrade.html'" style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  border: none; color: white; padding: 12px 24px; border-radius: 8px;
                  font-size: 16px; cursor: pointer; margin-right: 8px;
                ">⬆️ Upgrade Membership</button>
                <button onclick="location.href='signin.html'" style="
                  background: transparent; border: 1px solid #ccc; color: #666;
                  padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;
                ">Sign Out</button>
              </div>
            `, { duration: 0 });
          }
          
          // Auto-logout expired users after showing notice
          setTimeout(async () => {
            await sb.auth.signOut();
            location.replace('signin.html?expired=true');
          }, 5000);
          
          return false;
        }
        
        // Legacy users without membership get basic access
        if (membership.status === 'legacy') {
          console.log('[auth-guard] ✅ Legacy user validated');
          return true;
        }
        
        // Active membership validation
        if (membership.status === 'active' || membership.status === 'subscribed') {
          console.log('[auth-guard] ✅ Active membership validated');
          
          // Store membership info globally for features
          window.userMembership = membership;
          
          return true;
        }
        
        console.warn('[auth-guard] 🚫 Invalid membership status:', membership.status);
        return false;
        
      } catch (membershipError) {
        console.warn('[auth-guard] Membership validation failed, allowing basic session:', membershipError);
        // Fallback to session-only validation for compatibility
        return !!session;
      }
      
    } catch (error) {
      console.error('[auth-guard] Error checking auth:', error);
      return false;
    }
  }  // Redirect to welcome page - Tesla Fortress Mode
  async function redirectToWelcome() {
    console.log('[auth-guard] 🚀 Redirecting unauthenticated user to welcome page');
    
    // Use Tesla smooth redirect if available, fallback to instant
    if (window.teslaRedirect) {
      await window.teslaRedirect.redirectToWelcome();
    } else {
      // Direct redirect to welcome page
      location.replace('welcome.html');
    }
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

    // PRODUCTION AUTH: Hi-Island + Dashboard hybrid for public sharing
    const isHybridPage = location.pathname.endsWith('hi-island.html') || 
                         location.pathname.endsWith('hi-island-NEW.html') ||
                         location.pathname.endsWith('hi-muscle.html') ||
                         location.pathname.endsWith('82815_stayhi_index.html') ||
                         location.pathname.endsWith('index.html');
    
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

    // PRODUCTION: index.html, profile.html now REQUIRE authentication
    console.log('[auth-guard] 🔒 Protected page - authentication required');

    // For non-hybrid pages, require authentication
    const authenticated = await isAuthenticated();
    console.log('[auth-guard] Authenticated:', authenticated);
    
    // Start session monitoring if authenticated
    if (authenticated) {
      const session = await window.hiAuth?.getSession?.();
      if (session?.expires_at) {
        startSessionMonitor(session.expires_at);
      }
    }
    
    if (!authenticated) {
      console.log('[auth-guard] ❌ Auth required but not authenticated - redirecting to welcome');
      redirectToWelcome();
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

// Session expiry monitoring
function startSessionMonitor(expiresAt) {
  if (window.__sessionMonitorActive) return; // Prevent duplicate monitors
  window.__sessionMonitorActive = true;
  
  const expiryTime = typeof expiresAt === 'number' ? expiresAt * 1000 : new Date(expiresAt).getTime();
  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;
  
  if (timeUntilExpiry <= 0) return; // Already expired
  
  // Warn 5 minutes before expiry
  const warnTime = timeUntilExpiry - (5 * 60 * 1000);
  if (warnTime > 0) {
    setTimeout(() => {
      showSessionWarning(5);
    }, warnTime);
  }
  
  // Warn 1 minute before expiry
  const warnTime1 = timeUntilExpiry - (60 * 1000);
  if (warnTime1 > 0) {
    setTimeout(() => {
      showSessionWarning(1);
    }, warnTime1);
  }
  
  // Redirect on expiry
  setTimeout(() => {
    window.location.href = 'signin.html?session_expired=true';
  }, timeUntilExpiry);
}

function showSessionWarning(minutesLeft) {
  // Check if toast already exists
  if (document.getElementById('session-warning-toast')) return;
  
  const toast = document.createElement('div');
  toast.id = 'session-warning-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">⏰</span>
      <div class="toast-text">
        <p class="toast-title">Session Expiring Soon</p>
        <p class="toast-message">You'll be signed out in ${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'}</p>
      </div>
      <button onclick="extendSession()" class="toast-action">Extend</button>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #session-warning-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(22, 26, 51, 0.98);
      border: 1px solid rgba(255, 209, 102, 0.4);
      padding: 16px 20px;
      border-radius: 14px;
      backdrop-filter: blur(16px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      opacity: 0;
      transform: translateX(400px);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 360px;
    }
    #session-warning-toast.show {
      opacity: 1;
      transform: translateX(0);
    }
    #session-warning-toast .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
    }
    #session-warning-toast .toast-icon {
      font-size: 24px;
    }
    #session-warning-toast .toast-text {
      flex: 1;
    }
    #session-warning-toast .toast-title {
      font-weight: 700;
      margin: 0 0 4px;
      color: #FFD166;
    }
    #session-warning-toast .toast-message {
      margin: 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
    #session-warning-toast .toast-action {
      background: linear-gradient(135deg, #FFD166, #FF7B24);
      border: none;
      color: #111;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    #session-warning-toast .toast-action:hover {
      transform: scale(1.05);
    }
    @media (max-width: 480px) {
      #session-warning-toast {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 100);
}

window.extendSession = function() {
  // Reload page to refresh session
  window.location.reload();
};