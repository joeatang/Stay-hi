// TESLA GRADE: Hi Waves Real-time System
// Ensures Hi Waves count is accurate BEFORE user interactions

class HiWavesRealtime {
  constructor() {
    this.isEnabled = false;
    this.refreshInterval = null;
    this.lastKnownCount = null;
    this.supabase = null;
    
    console.log('🌊 Hi Waves Real-time system initialized');
  }
  
  async initialize() {
    try {
      // Get Supabase client (avoid importing library object)
      this.supabase = (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
        || window.hiSupabase
        || window.__HI_SUPABASE_CLIENT
        || null;
      if (!this.supabase) {
        console.warn('⚠️ No Supabase client for Hi Waves real-time');
        return false;
      }
      
      this.isEnabled = true;
      console.log('✅ Hi Waves real-time system ready');
      return true;
      
    } catch (error) {
      console.error('❌ Hi Waves real-time initialization failed:', error);
      return false;
    }
  }
  
  // Start real-time polling for Hi Waves
  startRealTimeUpdates(intervalMs = 3000) { // Every 3 seconds (Gold standard smooth)
    if (!this.isEnabled) {
      console.warn('⚠️ Hi Waves real-time not enabled');
      return;
    }
    
    // Clear any existing interval
    this.stopRealTimeUpdates();
    
    console.log(`🌊 Starting Hi Waves real-time updates (${intervalMs}ms interval)`);
    
    // Immediate initial load for responsive UX
    setTimeout(() => this.refreshHiWaves(), 100);
    
    // Set up polling
    this.refreshInterval = setInterval(() => {
      this.refreshHiWaves();
    }, intervalMs);
  }
  
  stopRealTimeUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🛑 Hi Waves real-time updates stopped');
    }
  }
  
  // Core refresh function - gets latest Hi Waves count
  async refreshHiWaves() {
    if (!this.supabase) {
      // Attempt late binding if client became available after init
      this.supabase = (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
        || window.hiSupabase
        || window.__HI_SUPABASE_CLIENT
        || null;
      if (!this.supabase) return;
    }
    
    try {
      // Query for latest Hi Waves count
      const { data, error } = await this.supabase
        .from('global_stats')
        .select('hi_waves')
        .single();
      
      if (data && !error && data.hi_waves !== undefined) {
        const newCount = data.hi_waves;
        
        // Only update if count actually changed
        if (newCount !== this.lastKnownCount) {
          const oldCount = window.gWaves;
          window.gWaves = newCount;
          this.lastKnownCount = newCount;
          
          // Update UI immediately
          this.updateWavesUI(newCount);
          
          // Cache the new value with timestamp
          localStorage.setItem('dashboard_waves_cache', newCount.toString());
          localStorage.setItem('dashboard_waves_cache_time', Date.now().toString());
          
          console.log(`🌊 Hi Waves updated: ${oldCount || '...'} → ${newCount}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Hi Waves refresh failed:', error);
    }
  }
  
  // Update UI elements with new Hi Waves count
  updateWavesUI(count) {
    // Update global waves display with smooth transition
    const wavesEl = document.getElementById('globalWaves') || document.getElementById('globalHiWaves');
    if (wavesEl) {
      const formattedCount = count.toLocaleString();
      if (wavesEl.textContent !== formattedCount) {
        wavesEl.style.opacity = '0.7';
        setTimeout(() => {
          wavesEl.textContent = formattedCount;
          wavesEl.style.opacity = '1';
        }, 150);
      }
    }
    
    // Update any other waves displays
    const allWavesElements = document.querySelectorAll('[data-waves-count], #globalHiWaves');
    allWavesElements.forEach(el => {
      if (el !== wavesEl) el.textContent = count.toLocaleString();
    });
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('hiWavesUpdated', {
      detail: { count, timestamp: Date.now() }
    }));
  }
  
  // Force immediate refresh (for after user actions)
  async forceRefresh() {
    console.log('⚡ Forcing Hi Waves refresh...');
    await this.refreshHiWaves();
  }
  
  // Get current cached count
  getCurrentCount() {
    return this.lastKnownCount || window.gWaves || 0;
  }
}

// Global instance
window.hiWavesRealtime = new HiWavesRealtime();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await window.hiWavesRealtime.initialize();
  });
} else {
  // DOM already loaded
  setTimeout(async () => {
    await window.hiWavesRealtime.initialize();
  }, 100);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HiWavesRealtime;
}