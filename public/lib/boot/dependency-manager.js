/**
 * Dependency Manager - Ensures all critical dependencies load before page init
 * Prevents race conditions on first navigation
 * 
 * Usage:
 *   await DependencyManager.waitForDependencies(['hiDB', 'HiSupabase', 'ProfileManager']);
 */

(function() {
  'use strict';

  class DependencyManager {
    constructor() {
      this.MAX_WAIT = 10000; // 10 seconds max wait
      this.CHECK_INTERVAL = 50; // Check every 50ms
      this.loadedDependencies = new Set();
    }

    /**
     * Wait for multiple dependencies to be available on window
     * @param {string[]} deps - Array of window property names to wait for
     * @param {number} timeout - Optional custom timeout in ms
     * @returns {Promise<{success: boolean, loaded: string[], missing: string[]}>}
     */
    async waitForDependencies(deps, timeout = this.MAX_WAIT) {
      const startTime = Date.now();
      const missing = [];
      const loaded = [];

      console.log(`⏳ DependencyManager: Waiting for [${deps.join(', ')}]`);

      for (const dep of deps) {
        const result = await this.waitForSingle(dep, timeout);
        
        if (result.success) {
          loaded.push(dep);
          this.loadedDependencies.add(dep);
        } else {
          missing.push(dep);
        }
      }

      const elapsed = Date.now() - startTime;
      
      if (missing.length === 0) {
        console.log(`✅ DependencyManager: All dependencies loaded in ${elapsed}ms`);
        return { success: true, loaded, missing: [] };
      } else {
        console.warn(`⚠️ DependencyManager: ${missing.length} dependencies failed to load:`, missing);
        return { success: false, loaded, missing };
      }
    }

    /**
     * Wait for a single dependency
     * @param {string} dep - Window property name
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<{success: boolean}>}
     */
    async waitForSingle(dep, timeout) {
      // Already loaded?
      if (this.isDependencyReady(dep)) {
        return { success: true };
      }

      const startTime = Date.now();
      
      return new Promise((resolve) => {
        const check = setInterval(() => {
          const elapsed = Date.now() - startTime;
          
          // Timeout reached
          if (elapsed >= timeout) {
            clearInterval(check);
            console.warn(`⚠️ DependencyManager: ${dep} timeout after ${elapsed}ms`);
            resolve({ success: false });
            return;
          }

          // Dependency ready
          if (this.isDependencyReady(dep)) {
            clearInterval(check);
            console.log(`✅ DependencyManager: ${dep} ready after ${elapsed}ms`);
            resolve({ success: true });
          }
        }, this.CHECK_INTERVAL);
      });
    }

    /**
     * Check if a dependency is ready
     * @param {string} dep - Window property name
     * @returns {boolean}
     */
    isDependencyReady(dep) {
      // Check if already marked as loaded
      if (this.loadedDependencies.has(dep)) {
        return true;
      }

      // Special checks for complex dependencies
      switch(dep) {
        case 'hiDB':
          return !!(window.hiDB && typeof window.hiDB.getUserProfile === 'function');
        
        case 'HiSupabase':
          return !!(window.HiSupabase && typeof window.HiSupabase.getClient === 'function');
        
        case 'ProfileManager':
          return !!(window.ProfileManager && typeof window.ProfileManager.isReady === 'function' && window.ProfileManager.isReady());
        
        case 'HiBrandTiers':
          return !!(window.HiBrandTiers && typeof window.HiBrandTiers.updateTierPill === 'function');
        
        case 'auth':
          // Auth is ready if either AuthReady is initialized OR we have a cached session
          return !!(window.isAuthReady && window.isAuthReady()) || 
                 !!(window.getAuthState && window.getAuthState()?.ready);
        
        default:
          // Generic check - just see if property exists and is truthy
          return !!(window[dep]);
      }
    }

    /**
     * Wait for auth to be ready (special case - very common)
     * @returns {Promise<{success: boolean}>}
     */
    async waitForAuth(timeout = 8000) {
      // Check if auth already ready (from previous page)
      if (window.getAuthState && window.getAuthState()?.ready) {
        console.log('✅ DependencyManager: Auth already ready (cached)');
        return { success: true };
      }

      console.log('⏳ DependencyManager: Waiting for auth...');
      
      return new Promise((resolve) => {
        let resolved = false;
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('⚠️ DependencyManager: Auth timeout - proceeding anyway');
            resolve({ success: false });
          }
        }, timeout);

        // Listen for auth-ready event
        window.addEventListener('hi:auth-ready', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            console.log('✅ DependencyManager: Auth ready via event');
            resolve({ success: true });
          }
        }, { once: true });

        // Also poll for auth state
        const pollInterval = setInterval(() => {
          if (this.isDependencyReady('auth')) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              clearInterval(pollInterval);
              console.log('✅ DependencyManager: Auth ready via poll');
              resolve({ success: true });
            }
          }
        }, 100);
      });
    }

    /**
     * Get list of currently loaded dependencies
     * @returns {string[]}
     */
    getLoadedDependencies() {
      return Array.from(this.loadedDependencies);
    }

    /**
     * Reset tracking (useful for testing)
     */
    reset() {
      this.loadedDependencies.clear();
    }
  }

  // Create singleton instance
  window.DependencyManager = new DependencyManager();

  console.log('📦 DependencyManager initialized');

})();
