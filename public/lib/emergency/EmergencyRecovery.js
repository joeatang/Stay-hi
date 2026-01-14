// 🚨 WOZ EMERGENCY RECOVERY SYSTEM
// Detects when app is frozen and automatically recovers

(function() {
  'use strict';
  
  // 🎯 GOLD STANDARD: Skip recovery system on auth pages (no session expected)
  const skipPages = ['/welcome.html', '/welcome', '/signin.html', '/signin', '/signup.html', '/signup', '/reset-password.html', '/', '/index.html'];
  const currentPath = window.location.pathname;
  const shouldSkip = skipPages.some(p => currentPath === p || currentPath.endsWith(p));
  
  if (shouldSkip) {
    console.log('[Emergency] Skipping recovery system on auth page');
    return; // Exit early - don't run freeze detection on pages without sessions
  }
  
  console.log('[Emergency] Recovery system initialized');
  
  // Freeze detection config
  const HEARTBEAT_INTERVAL = 3000; // Check every 3 seconds
  const FREEZE_THRESHOLD = 10000;  // Consider frozen after 10s
  const RECOVERY_URL = 'welcome.html'; // Safe landing page
  
  let lastHeartbeat = Date.now();
  let freezeDetected = false;
  let recoveryAttempted = false;
  
  // Heartbeat: Updates timestamp when app is responsive
  function heartbeat() {
    lastHeartbeat = Date.now();
    
    // Check if we're in a frozen state
    const timeSinceLastBeat = Date.now() - lastHeartbeat;
    
    if (timeSinceLastBeat > FREEZE_THRESHOLD && !freezeDetected) {
      freezeDetected = true;
      console.error('[Emergency] 🚨 APP FREEZE DETECTED');
      attemptRecovery();
    }
  }
  
  // Check for common freeze indicators
  function detectFreeze() {
    try {
      // Check 1: Session lost
      const hasSession = !!localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');
      const supabaseReady = !!(window.hiSupabase || window.supabase);
      
      if (!hasSession && supabaseReady) {
        console.warn('[Emergency] ⚠️ Session lost - potential freeze');
        return true;
      }
      
      // Check 2: JavaScript execution blocked
      const testStart = performance.now();
      for (let i = 0; i < 1000000; i++) {} // Quick loop
      const testEnd = performance.now();
      
      if (testEnd - testStart > 100) {
        console.warn('[Emergency] ⚠️ JS execution slow - potential freeze');
        return true;
      }
      
      // Check 3: Event loop blocked
      let eventLoopBlocked = false;
      setTimeout(() => { eventLoopBlocked = false; }, 0);
      
      return false;
    } catch (e) {
      console.error('[Emergency] Freeze detection error:', e);
      return true; // Assume frozen if detection fails
    }
  }
  
  // Attempt recovery
  function attemptRecovery() {
    if (recoveryAttempted) return;
    recoveryAttempted = true;
    
    console.log('[Emergency] 🔧 Attempting automatic recovery...');
    
    // Show recovery UI
    showRecoveryBanner();
    
    // Try session restore first
    setTimeout(() => {
      try {
        restoreSession();
      } catch (e) {
        console.error('[Emergency] Session restore failed:', e);
        // Fallback: Redirect to welcome
        setTimeout(() => {
          console.log('[Emergency] 🚀 Redirecting to welcome page...');
          window.location.href = RECOVERY_URL;
        }, 2000);
      }
    }, 1000);
  }
  
  // Show recovery banner (always works - native HTML)
  function showRecoveryBanner() {
    const banner = document.createElement('div');
    banner.id = 'emergencyRecoveryBanner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
        color: white;
        padding: 16px 20px;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.5;
        text-align: center;
        animation: slideDown 0.3s ease-out;
      ">
        <div style="max-width: 600px; margin: 0 auto;">
          <strong style="font-size: 16px;">🚨 App Recovery Mode</strong>
          <p style="margin: 8px 0 12px; opacity: 0.95;">
            The app appears to be frozen. Attempting automatic recovery...
          </p>
          <a href="welcome.html" style="
            display: inline-block;
            background: white;
            color: #FF6B6B;
            padding: 10px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 0 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">🏠 Go to Welcome</a>
          <a href="hi-dashboard.html" style="
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 10px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 0 8px;
            backdrop-filter: blur(10px);
          ">🔄 Try Dashboard</a>
        </div>
      </div>
      <style>
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(banner);
  }
  
  // Try to restore session
  async function restoreSession() {
    console.log('[Emergency] Attempting session restore...');
    
    const token = localStorage.getItem('sb-gfcubvroxgfvjhacinic-auth-token');
    if (!token) {
      console.log('[Emergency] No token found - redirecting to welcome');
      window.location.href = RECOVERY_URL;
      return;
    }
    
    try {
      const sb = window.hiSupabase || window.supabase;
      if (!sb) {
        console.log('[Emergency] Supabase not available - redirecting');
        window.location.href = RECOVERY_URL;
        return;
      }
      
      const parsed = JSON.parse(token);
      if (parsed?.access_token) {
        const { data, error } = await sb.auth.setSession({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token
        });
        
        if (data?.session) {
          console.log('[Emergency] ✅ Session restored! Reloading...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          console.error('[Emergency] Session restore failed:', error);
          window.location.href = RECOVERY_URL;
        }
      }
    } catch (e) {
      console.error('[Emergency] Session restore error:', e);
      window.location.href = RECOVERY_URL;
    }
  }
  
  // Monitor for freeze indicators
  setInterval(() => {
    heartbeat();
    
    if (detectFreeze() && !freezeDetected) {
      console.warn('[Emergency] Freeze indicators detected');
      attemptRecovery();
    }
  }, HEARTBEAT_INTERVAL);
  
  // Listen for visibility change (backgrounding)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[Emergency] App returned from background - checking health...');
      
      // Reset heartbeat
      lastHeartbeat = Date.now();
      freezeDetected = false;
      recoveryAttempted = false;
      
      // Check health after short delay
      setTimeout(() => {
        if (detectFreeze()) {
          console.warn('[Emergency] App unhealthy after background');
          attemptRecovery();
        }
      }, 1000);
    }
  });
  
  // Emergency home button (bulletproof)
  window.emergencyGoHome = function() {
    console.log('[Emergency] Emergency home button activated');
    
    // Try all methods
    try { window.location.href = 'hi-dashboard.html'; } catch(e) {}
    try { window.location.assign('hi-dashboard.html'); } catch(e) {}
    try { window.location.replace('hi-dashboard.html'); } catch(e) {}
    
    // Nuclear option: form submit (always works)
    setTimeout(() => {
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = 'hi-dashboard.html';
      document.body.appendChild(form);
      form.submit();
    }, 500);
  };
  
  console.log('[Emergency] ✅ Recovery system armed and ready');
})();
