// Hi Island Zombie State Diagnostics
// Test for infinite loading, stuck states, and session issues
// Run in browser console on hi-island-NEW.html

const hiIslandDiagnostics = {
  results: [],
  
  log(test, status, message, data = null) {
    const result = { test, status, message, data, timestamp: new Date().toISOString() };
    this.results.push(result);
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} [${test}] ${message}`, data || '');
    return result;
  },

  async runAll() {
    console.log('🧪 Starting Hi Island Zombie Diagnostics...\n');
    this.results = [];
    
    await this.test1_checkAuthState();
    await this.test2_checkSupabaseClient();
    await this.test3_checkMapInitialization();
    await this.test4_checkShareLoading();
    await this.test5_checkEventListeners();
    await this.test6_simulateAuthTimeout();
    await this.test7_checkLeafletState();
    await this.test8_checkAbortControllers();
    
    this.printSummary();
    return this.results;
  },

  // Test 1: Check authentication state
  async test1_checkAuthState() {
    console.log('\n📋 Test 1: Authentication State');
    
    try {
      // Check if auth is ready
      const authReady = window.__hiAuthReady;
      if (!authReady) {
        return this.log('auth-state', 'fail', 'window.__hiAuthReady is undefined');
      }
      this.log('auth-state', 'pass', 'Auth ready object exists');
      
      // Check session
      const session = authReady.session;
      if (!session) {
        return this.log('auth-session', 'warn', 'No active session (anonymous user)');
      }
      
      const userId = session.user?.id;
      const email = session.user?.email;
      this.log('auth-session', 'pass', `Session valid: ${email}`, { userId });
      
      // Check session expiration
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresDate = new Date(expiresAt * 1000);
        const minutesUntilExpiry = (expiresDate - Date.now()) / 1000 / 60;
        
        if (minutesUntilExpiry < 0) {
          this.log('auth-expiry', 'fail', 'Session EXPIRED', { expiresDate });
        } else if (minutesUntilExpiry < 5) {
          this.log('auth-expiry', 'warn', `Session expires soon: ${minutesUntilExpiry.toFixed(1)} min`, { expiresDate });
        } else {
          this.log('auth-expiry', 'pass', `Session valid for ${minutesUntilExpiry.toFixed(0)} min`, { expiresDate });
        }
      }
      
      // Check AuthReady cache
      const cache = localStorage.getItem('authReady_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        const age = Date.now() - parsed.timestamp;
        const ageMinutes = age / 1000 / 60;
        this.log('auth-cache', 'pass', `AuthReady cache: ${ageMinutes.toFixed(1)} min old`, parsed);
      } else {
        this.log('auth-cache', 'warn', 'No AuthReady cache found');
      }
      
    } catch (error) {
      this.log('auth-state', 'fail', `Auth check error: ${error.message}`, error);
    }
  },

  // Test 2: Check Supabase client availability
  async test2_checkSupabaseClient() {
    console.log('\n📋 Test 2: Supabase Client');
    
    try {
      const clients = [
        { name: 'window.HiSupabase?.getClient()', get: () => window.HiSupabase?.getClient?.() },
        { name: 'window.getSupabase?.()', get: () => window.getSupabase?.() },
        { name: 'window.hiSupabase', get: () => window.hiSupabase },
        { name: 'window.supabaseClient', get: () => window.supabaseClient },
        { name: 'window.__HI_SUPABASE_CLIENT', get: () => window.__HI_SUPABASE_CLIENT }
      ];
      
      let foundClient = null;
      for (const { name, get } of clients) {
        const client = get();
        if (client) {
          this.log('supabase-client', 'pass', `Found: ${name}`, typeof client);
          foundClient = client;
          break;
        }
      }
      
      if (!foundClient) {
        return this.log('supabase-client', 'fail', 'No Supabase client found');
      }
      
      // Test client health
      try {
        const { data, error } = await foundClient.from('profiles').select('id').limit(1);
        if (error) {
          this.log('supabase-query', 'fail', `Query failed: ${error.message}`, error);
        } else {
          this.log('supabase-query', 'pass', 'Supabase client is functional');
        }
      } catch (queryError) {
        this.log('supabase-query', 'fail', `Query error: ${queryError.message}`, queryError);
      }
      
    } catch (error) {
      this.log('supabase-client', 'fail', `Client check error: ${error.message}`, error);
    }
  },

  // Test 3: Check map initialization
  async test3_checkMapInitialization() {
    console.log('\n📋 Test 3: Map Initialization');
    
    try {
      // Check if Leaflet is loaded
      if (typeof L === 'undefined') {
        return this.log('leaflet', 'fail', 'Leaflet library not loaded');
      }
      this.log('leaflet', 'pass', 'Leaflet library loaded', `v${L.version}`);
      
      // Check if map container exists
      const mapEl = document.getElementById('map');
      if (!mapEl) {
        return this.log('map-container', 'fail', 'Map container #map not found');
      }
      this.log('map-container', 'pass', 'Map container exists');
      
      // Check if map is initialized
      if (window.map) {
        this.log('map-init', 'pass', 'Map object exists', {
          center: window.map.getCenter(),
          zoom: window.map.getZoom()
        });
        
        // Check map layers
        const markerCount = Object.keys(window.map._layers).length;
        this.log('map-layers', 'pass', `Map has ${markerCount} layers`);
      } else {
        this.log('map-init', 'warn', 'window.map not found - may not be initialized yet');
      }
      
    } catch (error) {
      this.log('map-init', 'fail', `Map check error: ${error.message}`, error);
    }
  },

  // Test 4: Check share loading state
  async test4_checkShareLoading() {
    console.log('\n📋 Test 4: Share Loading');
    
    try {
      // Check if shares are being loaded
      const loadingEl = document.querySelector('[data-loading="true"]');
      if (loadingEl) {
        this.log('share-loading', 'warn', 'Page is currently in loading state', loadingEl);
      } else {
        this.log('share-loading', 'pass', 'No loading indicators found');
      }
      
      // Check for error messages
      const errorEls = document.querySelectorAll('.error-message, .error');
      if (errorEls.length > 0) {
        this.log('share-errors', 'fail', `Found ${errorEls.length} error messages`, 
          Array.from(errorEls).map(el => el.textContent));
      } else {
        this.log('share-errors', 'pass', 'No error messages displayed');
      }
      
      // Check if markers exist on map
      if (window.map) {
        let markerCount = 0;
        window.map.eachLayer(layer => {
          if (layer instanceof L.Marker) markerCount++;
        });
        
        if (markerCount === 0) {
          this.log('map-markers', 'warn', 'No markers on map - shares may not be loaded');
        } else {
          this.log('map-markers', 'pass', `Found ${markerCount} markers on map`);
        }
      }
      
    } catch (error) {
      this.log('share-loading', 'fail', `Loading check error: ${error.message}`, error);
    }
  },

  // Test 5: Check event listeners
  async test5_checkEventListeners() {
    console.log('\n📋 Test 5: Event Listeners');
    
    try {
      // Check for pageshow listener (BFCache handling)
      const pageshowListeners = getEventListeners(window).pageshow || [];
      if (pageshowListeners.length > 0) {
        this.log('pageshow-listener', 'pass', `Found ${pageshowListeners.length} pageshow listener(s)`);
      } else {
        this.log('pageshow-listener', 'warn', 'No pageshow listener - BFCache may cause stale data');
      }
      
      // Check for pagehide listener
      const pagehideListeners = getEventListeners(window).pagehide || [];
      if (pagehideListeners.length > 0) {
        this.log('pagehide-listener', 'pass', `Found ${pagehideListeners.length} pagehide listener(s)`);
      } else {
        this.log('pagehide-listener', 'warn', 'No pagehide listener - cleanup may not happen');
      }
      
      // Check for auth ready listener
      const authReadyListeners = getEventListeners(window)['auth-ready'] || [];
      if (authReadyListeners.length > 0) {
        this.log('auth-listener', 'pass', `Found ${authReadyListeners.length} auth-ready listener(s)`);
      } else {
        this.log('auth-listener', 'warn', 'No auth-ready listener found');
      }
      
    } catch (error) {
      // getEventListeners might not be available in all browsers
      this.log('event-listeners', 'warn', `Cannot inspect listeners: ${error.message}`);
    }
  },

  // Test 6: Simulate auth timeout scenario
  async test6_simulateAuthTimeout() {
    console.log('\n📋 Test 6: Auth Timeout Simulation');
    
    try {
      // Create a promise that races getSession with timeout
      const client = window.HiSupabase?.getClient?.() || window.hiSupabase;
      if (!client) {
        return this.log('auth-timeout', 'skip', 'No Supabase client to test');
      }
      
      const startTime = Date.now();
      try {
        const result = await Promise.race([
          client.auth.getSession(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), 3000)
          )
        ]);
        
        const elapsed = Date.now() - startTime;
        this.log('auth-timeout', 'pass', `getSession completed in ${elapsed}ms`, result.data);
        
      } catch (timeoutError) {
        const elapsed = Date.now() - startTime;
        if (timeoutError.message === 'Test timeout') {
          this.log('auth-timeout', 'fail', `getSession took > 3000ms (${elapsed}ms) - ZOMBIE RISK`, timeoutError);
        } else {
          throw timeoutError;
        }
      }
      
    } catch (error) {
      this.log('auth-timeout', 'fail', `Timeout test error: ${error.message}`, error);
    }
  },

  // Test 7: Check Leaflet internal state
  async test7_checkLeafletState() {
    console.log('\n📋 Test 7: Leaflet State');
    
    try {
      if (!window.map) {
        return this.log('leaflet-state', 'skip', 'Map not initialized yet');
      }
      
      // Check if map is in broken state
      const mapContainer = document.getElementById('map');
      const hasClass = mapContainer?.classList.contains('leaflet-container');
      
      if (!hasClass) {
        this.log('leaflet-state', 'fail', 'Map container missing leaflet-container class');
      } else {
        this.log('leaflet-state', 'pass', 'Map container has correct classes');
      }
      
      // Check map panes
      const panes = window.map._panes;
      if (!panes) {
        this.log('leaflet-panes', 'fail', 'Map panes not initialized');
      } else {
        this.log('leaflet-panes', 'pass', `Map panes exist: ${Object.keys(panes).length} panes`);
      }
      
      // Check if map is responsive
      try {
        window.map.invalidateSize();
        this.log('leaflet-responsive', 'pass', 'Map invalidateSize() successful');
      } catch (invalidateError) {
        this.log('leaflet-responsive', 'fail', `Cannot invalidate map: ${invalidateError.message}`);
      }
      
    } catch (error) {
      this.log('leaflet-state', 'fail', `Leaflet check error: ${error.message}`, error);
    }
  },

  // Test 8: Check for AbortController leaks
  async test8_checkAbortControllers() {
    console.log('\n📋 Test 8: AbortController State');
    
    try {
      // Check if there are global abort controllers
      const controllers = [];
      
      if (window.queryAbortController) {
        controllers.push({
          name: 'window.queryAbortController',
          aborted: window.queryAbortController.signal.aborted
        });
      }
      
      if (window.shareLoadController) {
        controllers.push({
          name: 'window.shareLoadController',
          aborted: window.shareLoadController.signal.aborted
        });
      }
      
      if (controllers.length === 0) {
        this.log('abort-controllers', 'pass', 'No global abort controllers found (clean state)');
      } else {
        const abortedCount = controllers.filter(c => c.aborted).length;
        const activeCount = controllers.filter(c => !c.aborted).length;
        
        this.log('abort-controllers', 'pass', 
          `Found ${controllers.length} controllers: ${activeCount} active, ${abortedCount} aborted`, 
          controllers);
        
        if (abortedCount > 0) {
          this.log('abort-leak', 'warn', 
            `${abortedCount} aborted controller(s) still in memory - potential leak`);
        }
      }
      
    } catch (error) {
      this.log('abort-controllers', 'fail', `Controller check error: ${error.message}`, error);
    }
  },

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warned = this.results.filter(r => r.status === 'warn').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warned: ${warned}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log('');
    
    if (failed > 0) {
      console.log('🚨 FAILURES:');
      this.results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`   - [${r.test}] ${r.message}`);
      });
      console.log('');
    }
    
    if (warned > 0) {
      console.log('⚠️  WARNINGS:');
      this.results.filter(r => r.status === 'warn').forEach(r => {
        console.log(`   - [${r.test}] ${r.message}`);
      });
      console.log('');
    }
    
    // Zombie state indicators
    const zombieIndicators = [];
    
    if (this.results.find(r => r.test === 'auth-expiry' && r.status === 'fail')) {
      zombieIndicators.push('Expired session detected');
    }
    
    if (this.results.find(r => r.test === 'auth-timeout' && r.status === 'fail')) {
      zombieIndicators.push('Auth timeout > 3 seconds');
    }
    
    if (this.results.find(r => r.test === 'share-loading' && r.status === 'warn')) {
      zombieIndicators.push('Page stuck in loading state');
    }
    
    if (this.results.find(r => r.test === 'map-markers' && r.status === 'warn')) {
      zombieIndicators.push('No markers loaded on map');
    }
    
    if (zombieIndicators.length > 0) {
      console.log('🧟 ZOMBIE STATE INDICATORS:');
      zombieIndicators.forEach(indicator => {
        console.log(`   🚩 ${indicator}`);
      });
      console.log('');
      console.log('💡 RECOMMENDED ACTIONS:');
      console.log('   1. Sign out and sign back in');
      console.log('   2. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)');
      console.log('   3. Clear localStorage and cookies');
      console.log('   4. Check network tab for stuck requests');
    } else {
      console.log('✅ No zombie state indicators detected');
      console.log('   System appears healthy');
    }
    
    console.log('='.repeat(50) + '\n');
  }
};

// Auto-expose to window
window.hiIslandDiagnostics = hiIslandDiagnostics;

console.log('🔧 Hi Island Diagnostics loaded!');
console.log('Run: hiIslandDiagnostics.runAll()');
console.log('');
