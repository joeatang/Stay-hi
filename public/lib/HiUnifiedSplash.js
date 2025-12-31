/**
 * 🎬 HI UNIFIED SPLASH - Single Source of Truth
 * Combines FOUC prevention + auth/data loading into one system
 * 
 * FEATURES:
 * - Instant visibility (prevents white flash)
 * - "Still warming things up..." message
 * - Premium gradient background
 * - Graceful timeout handling
 * - Auto-hide when ready
 */

class HiUnifiedSplash {
  constructor() {
    this.startTime = performance.now();
    this.authReady = false;
    this.flagsReady = false;
    this.minimumShowTime = 800; // Minimum 800ms display
    this.slowThreshold = 3000; // Show "still warming..." after 3s
    this.errorThreshold = 8000; // Show error after 8s
    
    // 🚀 WOZ FIX: Track if this is first page load or returning from background
    this.isFirstLoad = !sessionStorage.getItem('hi-app-initialized');
    
    this.splash = null;
    this.messageEl = null;
  }

  /**
   * Initialize splash - called immediately in <head>
   */
  init() {
    // 🚀 WOZ FIX: Skip splash entirely if returning from background
    if (!this.isFirstLoad) {
      console.log('🎬 Skipping splash - not first load');
      // Mark as initialized for future loads
      sessionStorage.setItem('hi-app-initialized', '1');
      // Fire auth-ready immediately if auth is already cached
      if (window.getAuthState) {
        setTimeout(() => {
          const state = window.getAuthState();
          if (state.ready) {
            window.dispatchEvent(new CustomEvent('hi:auth-ready', { detail: state }));
          }
        }, 0);
      }
      return;
    }
    
    // First load - mark as initialized and show splash
    sessionStorage.setItem('hi-app-initialized', '1');
    
    // Splash should already exist in HTML as first body element
    this.splash = document.getElementById('hi-unified-splash');
    this.messageEl = this.splash?.querySelector('[data-splash-message]');
    
    if (!this.splash) {
      console.warn('⚠️ Unified splash element not found');
      return;
    }

    console.log('🎬 Unified Splash initialized (first load)');
    
    // Set up event listeners
    this.setupListeners();
    
    // Start timeout watchers
    this.startTimeouts();
  }

  /**
   * Listen for readiness events
   */
  setupListeners() {
    // 🔥 CRITICAL FIX: Check if auth already ready (for returning from background)
    if (window.isAuthReady && window.isAuthReady()) {
      console.log('✅ Auth already ready (from cache)');
      this.authReady = true;
      this.checkIfReady();
    }
    
    // Auth ready event
    window.addEventListener('hi:auth-ready', () => {
      console.log('✅ Auth ready (from event)');
      this.authReady = true;
      this.checkIfReady();
    });

    // Flags ready (if applicable)
    if (globalThis.hiFlagsReady && typeof globalThis.hiFlagsReady.then === 'function') {
      globalThis.hiFlagsReady
        .then(() => {
          console.log('✅ Flags ready');
          this.flagsReady = true;
          this.checkIfReady();
        })
        .catch(() => {
          this.flagsReady = true; // Continue even if flags fail
          this.checkIfReady();
        });
    } else {
      this.flagsReady = true; // No flags system
    }

    // Fallback: DOM fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded');
        setTimeout(() => this.checkIfReady(), 100);
      });
    }
  }

  /**
   * Start timeout watchers for slow/error states
   */
  startTimeouts() {
    // Slow state: Show "still warming..." after 3s
    setTimeout(() => {
      if (!this.isComplete()) {
        this.setSlowState();
      }
    }, this.slowThreshold);

    // Error state: Show retry after 8s
    setTimeout(() => {
      if (!this.isComplete()) {
        this.setErrorState();
      }
    }, this.errorThreshold);
  }

  /**
   * Check if both gates are satisfied
   */
  checkIfReady() {
    if (this.authReady && this.flagsReady) {
      this.hide();
    }
  }

  /**
   * Check if splash has been removed
   */
  isComplete() {
    return !this.splash || !this.splash.isConnected;
  }

  /**
   * Update to "slow" state
   */
  setSlowState() {
    if (this.messageEl) {
      this.messageEl.textContent = 'Still warming things up…';
      this.splash.dataset.state = 'slow';
    }
  }

  /**
   * Update to "error" state
   */
  setErrorState() {
    if (!this.splash) return;
    
    this.splash.dataset.state = 'error';
    this.splash.innerHTML = `
      <div class="splash-error-content">
        <div class="splash-error-icon">⚠️</div>
        <div class="splash-error-text">Slow network or system hiccup</div>
        <button class="splash-retry-btn" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }

  /**
   * Hide splash with fade-out
   */
  async hide() {
    if (!this.splash) return;
    
    const elapsed = performance.now() - this.startTime;
    const remaining = Math.max(0, this.minimumShowTime - elapsed);
    
    console.log(`🎬 Hiding splash after ${elapsed + remaining}ms (min: ${this.minimumShowTime}ms)`);
    
    // Wait for minimum show time
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
    
    // Fade out
    this.splash.style.transition = 'opacity 0.3s ease-out';
    this.splash.style.opacity = '0';
    
    // Remove after transition
    setTimeout(() => {
      if (this.splash && this.splash.isConnected) {
        this.splash.remove();
        document.documentElement.classList.add('hi-loaded');
        console.log('✅ Splash removed');
      }
    }, 300);
  }
}

// ===================================================================
// AUTO-INITIALIZE
// ===================================================================
// Create global instance
window.hiSplash = new HiUnifiedSplash();

// Initialize as soon as DOM is interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.hiSplash.init();
  });
} else {
  window.hiSplash.init();
}

console.log('🎬 Hi Unified Splash loaded');
