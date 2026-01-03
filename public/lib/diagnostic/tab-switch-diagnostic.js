/**
 * 🔍 TAB SWITCH DIAGNOSTIC TOOL
 * 
 * PROBLEM: App breaks when user switches to other apps (TikTok/YouTube) then returns
 * PURPOSE: Track exactly what happens during tab visibility changes
 * 
 * USAGE: Add to Hi Island and watch console when switching tabs
 */

(function() {
  const diagnostics = {
    tabSwitches: 0,
    sessionChecks: [],
    errors: [],
    networkStatus: [],
    visibility: []
  };

  // Track visibility changes
  document.addEventListener('visibilitychange', async () => {
    const isVisible = !document.hidden;
    const timestamp = new Date().toISOString();
    
    diagnostics.visibility.push({
      timestamp,
      visible: isVisible,
      sessionState: await checkSession()
    });
    
    console.log(`👁️ [TAB SWITCH] Visibility: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`, {
      timestamp,
      totalSwitches: ++diagnostics.tabSwitches,
      sessionValid: diagnostics.visibility[diagnostics.visibility.length - 1].sessionState.valid
    });
    
    // If becoming visible, verify everything is working
    if (isVisible) {
      await verifyAppState();
    }
  });

  // Check current session state
  async function checkSession() {
    try {
      const client = window.hiSupabase || window.__HI_SUPABASE_CLIENT || window.supabaseClient;
      if (!client) {
        return { valid: false, reason: 'No Supabase client found' };
      }

      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        return { valid: false, reason: error.message, error };
      }
      
      if (!session) {
        return { valid: false, reason: 'No session found' };
      }
      
      // Check if token is about to expire
      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);
      
      return {
        valid: true,
        userId: session.user?.id,
        expiresIn: `${minutesUntilExpiry} minutes`,
        timeUntilExpiry,
        needsRefresh: timeUntilExpiry < 300000 // Less than 5 minutes
      };
    } catch (err) {
      return { valid: false, reason: err.message, error: err };
    }
  }

  // Verify app components are working
  async function verifyAppState() {
    console.log('🔍 [TAB SWITCH] Verifying app state after becoming visible...');
    
    const checks = {
      supabase: !!window.hiSupabase || !!window.__HI_SUPABASE_CLIENT,
      hiDB: !!window.HiDB,
      hiBase: !!window.HiBase,
      profileManager: !!window.ProfileManager,
      authResilience: typeof window.__hiAuthResilience !== 'undefined',
      feedController: !!window.UnifiedHiIslandController
    };
    
    const sessionState = await checkSession();
    
    console.log('✅ [TAB SWITCH] App state check:', {
      components: checks,
      session: sessionState,
      allComponentsLoaded: Object.values(checks).every(v => v)
    });
    
    // If session is invalid, try to recover
    if (!sessionState.valid && window.__hiAuthResilience?.checkSession) {
      console.warn('⚠️ [TAB SWITCH] Session invalid, attempting recovery...');
      try {
        await window.__hiAuthResilience.checkSession();
        console.log('✅ [TAB SWITCH] Session recovered!');
      } catch (err) {
        console.error('❌ [TAB SWITCH] Session recovery failed:', err);
        diagnostics.errors.push({
          timestamp: new Date().toISOString(),
          type: 'session_recovery_failed',
          error: err.message
        });
      }
    }
    
    // Check if feed is still working
    if (window.UnifiedHiIslandController) {
      try {
        const feedState = {
          hasShares: document.querySelectorAll('.share-card').length,
          feedLoaded: window.UnifiedHiIslandController.initialized || false
        };
        console.log('📰 [TAB SWITCH] Feed state:', feedState);
      } catch (err) {
        console.error('❌ [TAB SWITCH] Feed check failed:', err);
      }
    }
    
    return checks;
  }

  // Track network errors
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message) {
      diagnostics.errors.push({
        timestamp: new Date().toISOString(),
        message: event.error.message,
        stack: event.error.stack,
        visibility: document.hidden ? 'hidden' : 'visible'
      });
    }
  });

  // Expose diagnostics globally for debugging
  window.__tabSwitchDiagnostics = {
    getReport() {
      return {
        summary: {
          totalTabSwitches: diagnostics.tabSwitches,
          totalErrors: diagnostics.errors.length,
          currentVisibility: document.hidden ? 'hidden' : 'visible'
        },
        visibility: diagnostics.visibility.slice(-10), // Last 10
        errors: diagnostics.errors.slice(-10),
        currentSession: checkSession()
      };
    },
    
    printReport() {
      console.table(diagnostics.visibility.slice(-5));
      if (diagnostics.errors.length > 0) {
        console.warn('⚠️ Errors detected:', diagnostics.errors);
      }
    },
    
    clearHistory() {
      diagnostics.visibility = [];
      diagnostics.errors = [];
      diagnostics.tabSwitches = 0;
      console.log('🧹 Diagnostic history cleared');
    }
  };

  // Initial check on load
  setTimeout(async () => {
    console.log('🔍 [TAB SWITCH DIAGNOSTIC] Initialized');
    const initialState = await checkSession();
    console.log('📊 [TAB SWITCH] Initial session state:', initialState);
  }, 1000);

  console.log('✅ Tab Switch Diagnostic Tool loaded. Use window.__tabSwitchDiagnostics.printReport() to see history.');
})();
