/**
 * 🚀 NAVIGATION STATE CACHE - Gold Standard SPA Performance
 * 
 * WHY: Navigating between pages feels slow because we re-fetch everything
 * SOLUTION: Cache auth, tier, and profile state for instant page loads
 * 
 * Gold Standard Architecture:
 * - First load: Full fetch from database (1-2s)
 * - Navigate away: Save state to memory cache
 * - Navigate back: Instant load from cache (<100ms), refresh in background
 * - Tab visibility: Revalidate on focus (5 min cooldown)
 */

class NavigationStateCache {
  constructor() {
    this.cache = {
      auth: null,
      tier: null,
      profile: null,
      stats: null,
      lastUpdate: {}
    };
    
    this.TTL = {
      auth: 5 * 60 * 1000,      // 5 minutes
      tier: 10 * 60 * 1000,     // 10 minutes
      profile: 5 * 60 * 1000,   // 5 minutes
      stats: 2 * 60 * 1000      // 2 minutes
    };
    
    this.setupVisibilityListener();
    this.setupNavigationListener();
  }
  
  /**
   * Cache auth state (session + user ID)
   */
  setAuth(userId, session = null) {
    this.cache.auth = {
      userId,
      session,
      isAuthenticated: !!userId && userId !== 'anonymous',
      timestamp: Date.now()
    };
    this.cache.lastUpdate.auth = Date.now();
    console.log('💾 [NavCache] Auth cached:', { userId, isAuthenticated: this.cache.auth.isAuthenticated });
  }
  
  /**
   * Get cached auth (instant)
   */
  getAuth() {
    if (!this.cache.auth) return null;
    
    const age = Date.now() - this.cache.lastUpdate.auth;
    if (age > this.TTL.auth) {
      console.log('⏰ [NavCache] Auth cache expired, needs refresh');
      return { ...this.cache.auth, needsRefresh: true };
    }
    
    console.log('⚡ [NavCache] Auth from cache (instant)');
    return { ...this.cache.auth, needsRefresh: false };
  }
  
  /**
   * Cache tier data
   */
  setTier(tier, membership = null) {
    this.cache.tier = {
      tier,
      membership,
      timestamp: Date.now()
    };
    this.cache.lastUpdate.tier = Date.now();
    console.log('💾 [NavCache] Tier cached:', tier);
  }
  
  /**
   * Get cached tier (instant)
   */
  getTier() {
    if (!this.cache.tier) return null;
    
    const age = Date.now() - this.cache.lastUpdate.tier;
    if (age > this.TTL.tier) {
      console.log('⏰ [NavCache] Tier cache expired, needs refresh');
      return { ...this.cache.tier, needsRefresh: true };
    }
    
    console.log('⚡ [NavCache] Tier from cache (instant)');
    return { ...this.cache.tier, needsRefresh: false };
  }
  
  /**
   * Cache profile data
   */
  setProfile(profile) {
    this.cache.profile = {
      ...profile,
      timestamp: Date.now()
    };
    this.cache.lastUpdate.profile = Date.now();
    console.log('💾 [NavCache] Profile cached:', profile?.username);
  }
  
  /**
   * Get cached profile (instant)
   */
  getProfile() {
    if (!this.cache.profile) return null;
    
    const age = Date.now() - this.cache.lastUpdate.profile;
    if (age > this.TTL.profile) {
      console.log('⏰ [NavCache] Profile cache expired, needs refresh');
      return { ...this.cache.profile, needsRefresh: true };
    }
    
    console.log('⚡ [NavCache] Profile from cache (instant)');
    return { ...this.cache.profile, needsRefresh: false };
  }
  
  /**
   * Cache stats data
   */
  setStats(stats) {
    this.cache.stats = {
      ...stats,
      timestamp: Date.now()
    };
    this.cache.lastUpdate.stats = Date.now();
    console.log('💾 [NavCache] Stats cached');
  }
  
  /**
   * Get cached stats (instant)
   */
  getStats() {
    if (!this.cache.stats) return null;
    
    const age = Date.now() - this.cache.lastUpdate.stats;
    if (age > this.TTL.stats) {
      console.log('⏰ [NavCache] Stats cache expired, needs refresh');
      return { ...this.cache.stats, needsRefresh: true };
    }
    
    console.log('⚡ [NavCache] Stats from cache (instant)');
    return { ...this.cache.stats, needsRefresh: false };
  }
  
  /**
   * Clear specific cache or all
   */
  clear(type = null) {
    if (type) {
      this.cache[type] = null;
      delete this.cache.lastUpdate[type];
      console.log('🗑️ [NavCache] Cleared:', type);
    } else {
      this.cache = {
        auth: null,
        tier: null,
        profile: null,
        stats: null,
        lastUpdate: {}
      };
      console.log('🗑️ [NavCache] Cleared all');
    }
  }
  
  /**
   * Revalidate on tab visibility (only if >5 min since last update)
   */
  setupVisibilityListener() {
    let lastRevalidate = Date.now();
    const REVALIDATE_COOLDOWN = 5 * 60 * 1000; // 5 minutes
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRevalidate = Date.now() - lastRevalidate;
        
        if (timeSinceLastRevalidate > REVALIDATE_COOLDOWN) {
          console.log('👁️ [NavCache] Tab visible after 5+ min, marking for revalidation');
          
          // Mark all caches as needing refresh (but keep data for instant display)
          Object.keys(this.cache.lastUpdate).forEach(key => {
            this.cache.lastUpdate[key] = Date.now() - this.TTL[key] - 1; // Force expired
          });
          
          lastRevalidate = Date.now();
          
          // Dispatch event for pages to refresh
          window.dispatchEvent(new CustomEvent('hi:cache-revalidate'));
        }
      }
    });
  }
  
  /**
   * Save state before navigation
   */
  setupNavigationListener() {
    // Save ProfileManager state before navigation
    window.addEventListener('beforeunload', () => {
      if (window.ProfileManager?.isAuthenticated?.()) {
        const userId = window.ProfileManager.getUserId();
        const profile = window.ProfileManager.getProfile();
        
        if (userId) this.setAuth(userId);
        if (profile) this.setProfile(profile);
      }
      
      // Save tier if available
      if (window.HiTier?.getTier) {
        const tier = window.HiTier.getTier();
        if (tier && tier !== 'anonymous') {
          this.setTier(tier);
        }
      }
    });
    
    console.log('🎯 [NavCache] Navigation listeners active');
  }
  
  /**
   * Get cache status (for debugging)
   */
  getStatus() {
    return {
      auth: {
        cached: !!this.cache.auth,
        age: this.cache.lastUpdate.auth ? Date.now() - this.cache.lastUpdate.auth : null,
        valid: this.cache.lastUpdate.auth ? (Date.now() - this.cache.lastUpdate.auth) < this.TTL.auth : false
      },
      tier: {
        cached: !!this.cache.tier,
        age: this.cache.lastUpdate.tier ? Date.now() - this.cache.lastUpdate.tier : null,
        valid: this.cache.lastUpdate.tier ? (Date.now() - this.cache.lastUpdate.tier) < this.TTL.tier : false
      },
      profile: {
        cached: !!this.cache.profile,
        age: this.cache.lastUpdate.profile ? Date.now() - this.cache.lastUpdate.profile : null,
        valid: this.cache.lastUpdate.profile ? (Date.now() - this.cache.lastUpdate.profile) < this.TTL.profile : false
      },
      stats: {
        cached: !!this.cache.stats,
        age: this.cache.lastUpdate.stats ? Date.now() - this.cache.lastUpdate.stats : null,
        valid: this.cache.lastUpdate.stats ? (Date.now() - this.cache.lastUpdate.stats) < this.TTL.stats : false
      }
    };
  }
}

// Create singleton
const navCache = new NavigationStateCache();

// Expose globally
window.NavCache = navCache;

// Debug helper
window.getNavCacheStatus = () => {
  const status = navCache.getStatus();
  console.table(status);
  return status;
};

console.log('🚀 Navigation State Cache initialized');
console.log('💡 Debug: window.getNavCacheStatus()');
