// ===============================================
// 🚀 TESLA-GRADE FEATURE FLAG SYSTEM
// ===============================================
// Central feature flag management for Stay Hi

class HiFeatureFlags {
  constructor() {
    this.flags = new Map();
    this.userCohort = null;
    this.environment = this.detectEnvironment();
    this.initialized = false;
  }

  // Detect deployment environment
  detectEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      return 'development';
    } else if (hostname.includes('vercel.app') || hostname.includes('-preview-')) {
      return 'staging';
    } else if (hostname === 'stayhi.com' || hostname === 'www.stayhi.com') {
      return 'production';
    }
    
    return 'unknown';
  }

  // Initialize feature flags from multiple sources
  async initialize() {
    if (this.initialized) return;
    
    console.log(`🚀 Initializing Hi Feature Flags for ${this.environment}`);
    
    try {
      // Load flags in priority order: Remote → Local → Defaults
      await this.loadRemoteFlags();
      this.loadLocalFlags();
      this.setDefaultFlags();
      
      // Determine user cohort
      this.userCohort = await this.getUserCohort();
      
      this.initialized = true;
      console.log('✅ Feature flags initialized:', Object.fromEntries(this.flags));
      
      // Emit event for components to react
      window.dispatchEvent(new CustomEvent('hi-flags-ready', { 
        detail: { flags: Object.fromEntries(this.flags) }
      }));
      
    } catch (error) {
      console.error('❌ Feature flag initialization failed:', error);
      this.setDefaultFlags(); // Fallback to safe defaults
      this.initialized = true;
    }
  }

  // Load flags from Supabase (remote control)
  async loadRemoteFlags() {
    if (!window.sb) return;
    
    try {
      const { data: flags } = await window.sb
        .from('feature_flags')
        .select('flag_key, enabled, config, environments')
        .in('environments', [this.environment, 'all']);
      
      flags?.forEach(flag => {
        this.flags.set(flag.flag_key, {
          enabled: flag.enabled,
          config: flag.config || {},
          source: 'remote'
        });
      });
      
      console.log(`📡 Loaded ${flags?.length || 0} remote feature flags`);
    } catch (error) {
      console.warn('⚠️ Failed to load remote flags:', error);
    }
  }

  // Load flags from localStorage (developer overrides)
  loadLocalFlags() {
    try {
      const localFlags = JSON.parse(localStorage.getItem('hi_feature_flags') || '{}');
      
      Object.entries(localFlags).forEach(([key, value]) => {
        this.flags.set(key, {
          enabled: value.enabled,
          config: value.config || {},
          source: 'local'
        });
      });
      
      console.log(`💾 Loaded ${Object.keys(localFlags).length} local flag overrides`);
    } catch (error) {
      console.warn('⚠️ Failed to load local flags:', error);
    }
  }

  // Set safe default flags
  setDefaultFlags() {
    const defaults = {
      // Authentication & Core
      auth_enabled: { enabled: true, config: {}, source: 'default' },
      auth_hybrid_mode: { enabled: true, config: {}, source: 'default' },
      
      // Hi Rewards System
      rewards_enabled: { enabled: false, config: {}, source: 'default' },
      rewards_waves_enabled: { enabled: false, config: {}, source: 'default' },
      rewards_shares_enabled: { enabled: false, config: {}, source: 'default' },
      rewards_streaks_enabled: { enabled: false, config: {}, source: 'default' },
      rewards_global_events: { enabled: false, config: {}, source: 'default' },
      
      // Features
      location_sharing: { enabled: true, config: {}, source: 'default' },
      hi_island_map: { enabled: true, config: {}, source: 'default' },
      profile_system: { enabled: true, config: {}, source: 'default' },
      hi_gym: { enabled: true, config: {}, source: 'default' },
      
      // UI/UX
      premium_animations: { enabled: true, config: {}, source: 'default' },
      debug_mode: { enabled: this.environment === 'development', config: {}, source: 'default' },
      
      // Experience Layer
      hifeed_enabled: { enabled: false, config: {}, source: 'default' },
      
      // A/B Tests (placeholder)
      ab_new_onboarding: { enabled: false, config: { cohort: 'control' }, source: 'default' }
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!this.flags.has(key)) {
        this.flags.set(key, value);
      }
    });
  }

  // Determine user cohort for A/B testing
  async getUserCohort() {
    // Simple hash-based cohort assignment
    const userId = window.userAuthenticated ? 
      (await this.getUserId()) : 
      (localStorage.getItem('hi_anonymous_id') || this.generateAnonymousId());
    
    const hash = await this.simpleHash(userId);
    const cohort = hash % 100; // 0-99
    
    return {
      id: cohort,
      type: cohort < 10 ? 'beta' : (cohort < 20 ? 'early' : 'stable')
    };
  }

  // Check if a feature is enabled
  isEnabled(flagKey) {
    if (!this.initialized) {
      console.warn(`⚠️ Feature flag ${flagKey} checked before initialization`);
      return false;
    }
    
    const flag = this.flags.get(flagKey);
    return flag ? flag.enabled : false;
  }

  // Get feature flag configuration
  getConfig(flagKey) {
    const flag = this.flags.get(flagKey);
    return flag ? flag.config : {};
  }

  // Enable/disable flag locally (development)
  setFlag(flagKey, enabled, config = {}) {
    if (this.environment !== 'development') {
      console.warn('⚠️ Local flag changes only allowed in development');
      return;
    }
    
    this.flags.set(flagKey, {
      enabled,
      config,
      source: 'local'
    });
    
    // Persist to localStorage
    const localFlags = JSON.parse(localStorage.getItem('hi_feature_flags') || '{}');
    localFlags[flagKey] = { enabled, config };
    localStorage.setItem('hi_feature_flags', JSON.stringify(localFlags));
    
    console.log(`🔧 Set local flag: ${flagKey} = ${enabled}`);
    
    // Emit change event
    window.dispatchEvent(new CustomEvent('hi-flag-changed', {
      detail: { flag: flagKey, enabled, config }
    }));
  }

  // Helper methods
  async getUserId() {
    if (!window.sb) return null;
    const { data: { user } } = await window.sb.auth.getUser();
    return user?.id;
  }

  generateAnonymousId() {
    const id = 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('hi_anonymous_id', id);
    return id;
  }

  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.reduce((acc, byte) => acc + byte, 0);
  }

  // Debug methods (development only)
  debugFlags() {
    if (this.environment !== 'development') return;
    
    console.group('🚀 Hi Feature Flags Debug');
    console.log('Environment:', this.environment);
    console.log('User Cohort:', this.userCohort);
    console.log('Flags:');
    
    for (const [key, value] of this.flags.entries()) {
      console.log(`  ${key}: ${value.enabled} (${value.source})`);
    }
    
    console.groupEnd();
  }

  listFlags() {
    return Object.fromEntries(this.flags);
  }
}

// Global instance
window.HiFlags = new HiFeatureFlags();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.HiFlags.initialize());
} else {
  window.HiFlags.initialize();
}

// Development helpers
if (window.HiFlags.environment === 'development') {
  window.debugFlags = () => window.HiFlags.debugFlags();
  window.setFlag = (key, enabled, config) => window.HiFlags.setFlag(key, enabled, config);
  console.log('🔧 Development flag helpers available: debugFlags(), setFlag(key, enabled, config)');
}

// Global exposure for compatibility
window.HiFeatureFlags = HiFeatureFlags;