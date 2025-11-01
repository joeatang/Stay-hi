// 🚀 Tesla-Grade Data Store
// Centralizes all data management, prevents UI sync issues, ensures bulletproof state

class TeslaDataStore {
  constructor() {
    this.state = {
      globalStats: {
        hiWaves: 0,
        totalHis: 0,
        activeUsers24h: 0,
        totalUsers: 0,
        lastUpdated: null
      },
      localStats: {
        todayHis: 0,
        streak: 0,
        lastDay: null
      },
      ui: {
        rotatorIndex: 0,
        isLoading: false,
        lastSync: null
      }
    };
    
    this.subscribers = new Map();
    this.syncTimer = null;
    
    console.log('🚀 Tesla Data Store initialized');
    this.startAutoSync();
  }
  
  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }
  
  // Notify subscribers of changes
  notify(key, data) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data, this.state);
        } catch (e) {
          console.error('📢 Subscriber error:', e);
        }
      });
    }
  }
  
  // Update global stats (single source of truth)
  async updateGlobalStats() {
    try {
      this.setState('ui.isLoading', true);
      
      const supa = window.getSupabase?.() || window.supabaseClient || window.sb;
      if (!supa) {
        throw new Error('Supabase client not available');
      }
      
      console.log('🔄 Fetching global stats from Supabase...');
      const { data, error } = await supa.rpc('get_global_stats');
      
      if (error) throw error;
      if (!data) throw new Error('No data received');
      
      // Handle array vs object response
      const stats = Array.isArray(data) ? data[0] : data;
      if (!stats) throw new Error('Empty stats response');
      
      // Update state atomically
      this.setState('globalStats', {
        hiWaves: Number(stats.hi_waves) || 0,
        totalHis: Number(stats.total_his) || 0,
        activeUsers24h: Number(stats.active_users_24h) || 0,
        totalUsers: Number(stats.total_users) || 0,
        lastUpdated: new Date().toISOString()
      });
      
      this.setState('ui.lastSync', new Date().toISOString());
      console.log('✅ Global stats updated:', this.state.globalStats);
      
      // Notify all UI components
      this.notify('globalStats', this.state.globalStats);
      this.notify('ui', this.state.ui);
      
      return this.state.globalStats;
      
    } catch (error) {
      console.error('❌ Failed to update global stats:', error);
      this.notify('error', { type: 'globalStats', error: error.message });
      return null;
    } finally {
      this.setState('ui.isLoading', false);
    }
  }
  
  // Increment Hi Wave with optimistic UI + server sync
  async incrementHiWave() {
    try {
      // Optimistic update
      const currentWaves = this.state.globalStats.hiWaves;
      this.setState('globalStats.hiWaves', currentWaves + 1);
      this.notify('globalStats', this.state.globalStats);
      
      // Server sync
      const supa = window.getSupabase?.() || window.supabaseClient || window.sb;
      if (!supa) throw new Error('Supabase client not available');
      
      const { data, error } = await supa.rpc('increment_hi_wave');
      if (error) throw error;
      
      // Verify server count matches our optimistic update
      const serverCount = Number(data);
      if (serverCount !== this.state.globalStats.hiWaves) {
        console.warn('⚠️ Server/client count mismatch, syncing...');
        await this.updateGlobalStats();
      }
      
      console.log(`✅ Hi Wave incremented: ${currentWaves} → ${serverCount}`);
      return serverCount;
      
    } catch (error) {
      // Revert optimistic update on error
      const currentWaves = this.state.globalStats.hiWaves;
      this.setState('globalStats.hiWaves', Math.max(0, currentWaves - 1));
      this.notify('globalStats', this.state.globalStats);
      
      console.error('❌ Hi Wave increment failed:', error);
      throw error;
    }
  }
  
  // Set nested state with dot notation
  setState(path, value) {
    const keys = path.split('.');
    let target = this.state;
    
    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Set final value
    target[keys[keys.length - 1]] = value;
  }
  
  // Get nested state with dot notation
  getState(path) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  // Auto-sync every 30 seconds
  startAutoSync() {
    this.syncTimer = setInterval(() => {
      if (!this.state.ui.isLoading) {
        this.updateGlobalStats();
      }
    }, 30000);
  }
  
  // Manual sync trigger
  async forceSync() {
    clearInterval(this.syncTimer);
    await this.updateGlobalStats();
    this.startAutoSync();
  }
  
  // Cleanup
  destroy() {
    clearInterval(this.syncTimer);
    this.subscribers.clear();
  }
  
  // Debug interface
  debug() {
    return {
      state: this.state,
      subscribers: Array.from(this.subscribers.keys()),
      isAutoSyncing: !!this.syncTimer
    };
  }
}

// Global instance
window.TeslaData = new TeslaDataStore();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeslaDataStore;
}