// 🚀 TESLA-GRADE NAVIGATION SYSTEM
// Hi Gold Standard Navigation - Bulletproof Session & State Management
// Solves: PWA session persistence, loading screen stuck states, navigation escape routes

class HiNavigationSystem {
  constructor() {
    this.appStates = {
      LOADING: 'loading',
      READY: 'ready', 
      ERROR: 'error',
      STUCK: 'stuck'
    };
    
    this.currentState = this.appStates.LOADING;
    this.lastActiveTime = Date.now();
    this.sessionRefreshTimeout = null;
    this.stateCheckInterval = null;
    
    // Tesla-grade configuration
    this.config = {
      maxLoadingTime: 15000,      // 15 seconds max loading
      stuckCheckInterval: 5000,   // Check every 5 seconds
      sessionRefreshDelay: 8000,  // 8 second refresh delay
      enableAutoRefresh: true,    // Auto-refresh stuck states
      enableDeepLinking: true,    // Preserve navigation intent
      enableEscapeRoutes: true    // Provide navigation alternatives
    };
    
    this.init();
  }
  
  init() {
    console.log('🧭 Tesla Navigation System initializing...');
    
    // 1. Session State Detection
    this.detectSessionState();
    
    // 2. PWA State Management
    this.initPWAHandlers();
    
    // 3. Loading Screen Protection
    this.initLoadingProtection();
    
    // 4. Navigation Escape Routes
    this.initEscapeRoutes();
    
    // 5. Back Button Standardization
    this.initBackButtonSystem();
    
    // 6. State Monitoring
    this.startStateMonitoring();
    
    console.log('✅ Tesla Navigation System ready');
  }
  
  // 🎯 CRITICAL: Detect if app opened in stuck state
  detectSessionState() {
    const lastState = localStorage.getItem('hi_app_state');
    const lastTime = parseInt(localStorage.getItem('hi_app_time') || '0');
    const timeDiff = Date.now() - lastTime;
    
    // If app was stuck for > 30 seconds, trigger refresh
    if (lastState === this.appStates.LOADING && timeDiff > 30000) {
      console.log('🚨 Detected stuck session, triggering fresh start...');
      this.refreshToHome();
      return;
    }
    
    // Normal initialization
    this.updateAppState(this.appStates.LOADING);
  }
  
  // 🔄 PWA-specific state persistence handlers
  initPWAHandlers() {
    // Handle PWA app visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onAppResume();
      } else {
        this.onAppPause();
      }
    });
    
    // Handle PWA beforeunload
    window.addEventListener('beforeunload', () => {
      this.onAppClose();
    });
    
    // Handle page show/hide events
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        console.log('🔄 App restored from cache, checking state...');
        this.onAppResume();
      }
    });
    
    // Detect PWA standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 Running in PWA mode - enhanced state management active');
      document.documentElement.classList.add('pwa-mode');
    }
  }
  
  // 🛡️ Loading screen protection system
  initLoadingProtection() {
    const loadingElements = [
      '.loading',
      '.loader', 
      '[data-loading="true"]',
      '.hi-loading',
      '.spinner'
    ];
    
    // Monitor for stuck loading states
    setTimeout(() => {
      loadingElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.style.display !== 'none' && !el.hidden) {
            console.log('⚠️ Detected potentially stuck loading element:', selector);
            this.handleStuckLoading(el);
          }
        });
      });
    }, this.config.maxLoadingTime);
  }
  
  // 🚪 Navigation escape routes system
  initEscapeRoutes() {
    // Add universal escape route button
    if (this.config.enableEscapeRoutes) {
      this.injectEscapeButton();
    }
    
    // Keyboard escape routes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeAction();
      }
      
      // Cmd/Ctrl + R for refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        console.log('🔄 Manual refresh detected');
        this.handleManualRefresh();
      }
    });
    
    // Double-tap escape for mobile
    let tapCount = 0;
    document.addEventListener('touchstart', () => {
      tapCount++;
      if (tapCount === 1) {
        setTimeout(() => tapCount = 0, 500);
      } else if (tapCount === 2) {
        const currentTime = Date.now();
        if (currentTime - this.lastActiveTime > 10000) {
          console.log('📱 Double-tap escape detected');
          this.handleEscapeAction();
        }
        tapCount = 0;
      }
    });
  }
  
  // ⬅️ Standardized back button system
  initBackButtonSystem() {
    // Override browser back button
    window.addEventListener('popstate', (event) => {
      console.log('⬅️ Back button navigation detected');
      this.handleBackNavigation(event);
    });
    
    // Add navigation history tracking
    this.trackNavigation();
  }
  
  // 📊 State monitoring system
  startStateMonitoring() {
    this.stateCheckInterval = setInterval(() => {
      this.checkAppHealth();
    }, this.config.stuckCheckInterval);
  }
  
  // 🎯 Core Methods
  
  updateAppState(newState) {
    this.currentState = newState;
    this.lastActiveTime = Date.now();
    
    localStorage.setItem('hi_app_state', newState);
    localStorage.setItem('hi_app_time', this.lastActiveTime.toString());
    
    // Dispatch custom event for other systems
    window.dispatchEvent(new CustomEvent('hiAppStateChange', {
      detail: { state: newState, timestamp: this.lastActiveTime }
    }));
  }
  
  onAppResume() {
    console.log('📱 App resumed');
    const timeDiff = Date.now() - this.lastActiveTime;
    
    // If app was inactive for > 5 minutes, check for stuck states
    if (timeDiff > 300000) {
      this.checkForStuckStates();
    }
    
    this.updateAppState(this.appStates.READY);
  }
  
  onAppPause() {
    console.log('⏸️ App paused');
    this.updateAppState(this.currentState); // Save current state
  }
  
  onAppClose() {
    console.log('❌ App closing');
    // Clean up session flags to prevent false positives
    localStorage.removeItem('hi_app_state');
    localStorage.removeItem('hi_app_time');
  }
  
  checkForStuckStates() {
    // Check for loading screens still visible
    const loadingElements = document.querySelectorAll('.loading, .loader, [data-loading="true"]');
    const hasLoadingElements = Array.from(loadingElements).some(el => 
      el.style.display !== 'none' && !el.hidden
    );
    
    if (hasLoadingElements) {
      console.log('🚨 Stuck loading state detected after app resume');
      this.handleStuckLoading();
    }
  }
  
  handleStuckLoading(element = null) {
    console.log('🛠️ Handling stuck loading state...');
    
    if (element) {
      element.style.display = 'none';
    }
    
    // Show escape options modal
    this.showEscapeModal();
  }
  
  showEscapeModal() {
    const modal = document.createElement('div');
    modal.id = 'hiEscapeModal';
    modal.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.9); z-index: 999999; 
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(10px);
      ">
        <div style="
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 20px; padding: 40px; text-align: center;
          max-width: 400px; width: 90vw; color: white;
          box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        ">
          <h3 style="color: #fbbf24; margin-bottom: 16px;">🚨 App Stuck?</h3>
          <p style="margin-bottom: 24px; color: #e2e8f0;">
            The app seems to be stuck. Choose an option to continue:
          </p>
          
          <button onclick="window.hiNavSystem.refreshToHome()" style="
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; border: none; padding: 12px 24px;
            border-radius: 12px; font-weight: 600; cursor: pointer;
            width: 100%; margin-bottom: 12px; font-size: 16px;
          ">
            🏠 Go Home (Recommended)
          </button>
          
          <button onclick="window.hiNavSystem.forceRefresh()" style="
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white; border: none; padding: 12px 24px;
            border-radius: 12px; font-weight: 600; cursor: pointer;
            width: 100%; margin-bottom: 12px; font-size: 16px;
          ">
            🔄 Refresh Current Page
          </button>
          
          <button onclick="document.getElementById('hiEscapeModal').remove()" style="
            background: rgba(255,255,255,0.1); color: #e2e8f0; 
            border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px;
            border-radius: 8px; cursor: pointer; width: 100%; font-size: 14px;
          ">
            Continue (Close This)
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (document.getElementById('hiEscapeModal')) {
        document.getElementById('hiEscapeModal').remove();
      }
    }, 10000);
  }
  
  injectEscapeButton() {
    const escapeBtn = document.createElement('button');
    escapeBtn.id = 'hiEscapeButton';
    escapeBtn.innerHTML = '🏠';
    escapeBtn.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 999998;
      width: 44px; height: 44px; border-radius: 22px;
      background: rgba(0,0,0,0.7); color: white; border: none;
      font-size: 18px; cursor: pointer; backdrop-filter: blur(10px);
      transition: all 0.2s ease; opacity: 0.3;
    `;
    
    escapeBtn.addEventListener('click', () => this.refreshToHome());
    escapeBtn.addEventListener('mouseenter', () => escapeBtn.style.opacity = '1');
    escapeBtn.addEventListener('mouseleave', () => escapeBtn.style.opacity = '0.3');
    
    document.body.appendChild(escapeBtn);
  }
  
  handleEscapeAction() {
    console.log('🚪 Escape action triggered');
    
    // First try to close modals/overlays
    const modals = document.querySelectorAll('.modal, .overlay, .popup, [data-modal]');
    if (modals.length > 0) {
      modals.forEach(modal => modal.style.display = 'none');
      return;
    }
    
    // If no modals, show escape options
    this.showEscapeModal();
  }
  
  handleBackNavigation(event) {
    // Implement smart back navigation
    const currentPath = window.location.pathname;
    
    // Prevent infinite loops on certain pages
    const problematicPaths = ['/welcome.html', '/signin.html', '/signup.html'];
    if (problematicPaths.some(path => currentPath.includes(path))) {
      event.preventDefault();
      this.refreshToHome();
      return;
    }
    
    // Track navigation for analytics
    this.trackNavigation('back_button');
  }
  
  trackNavigation(type = 'page_view') {
    try {
      const navEvent = {
        type,
        path: window.location.pathname,
        timestamp: Date.now(),
        state: this.currentState
      };
      
      let navHistory = JSON.parse(localStorage.getItem('hi_nav_history') || '[]');
      navHistory.unshift(navEvent);
      navHistory.splice(10); // Keep last 10
      localStorage.setItem('hi_nav_history', JSON.stringify(navHistory));
    } catch (error) {
      console.log('Navigation tracking failed:', error);
    }
  }
  
  checkAppHealth() {
    const timeDiff = Date.now() - this.lastActiveTime;
    
    // If no activity for too long, check for issues
    if (timeDiff > 60000) { // 1 minute
      const loadingElements = document.querySelectorAll('.loading:not([style*="display: none"])');
      if (loadingElements.length > 0) {
        console.log('🩺 Health check: Found persistent loading elements');
        this.updateAppState(this.appStates.STUCK);
      }
    }
  }
  
  handleManualRefresh() {
    console.log('🔄 Manual refresh detected, cleaning state...');
    this.onAppClose(); // Clean up before refresh
  }
  
  // 🎯 Public API Methods
  
  refreshToHome() {
    console.log('🏠 Refreshing to home...');
    this.onAppClose(); // Clean state
    window.location.href = '/public/hi-dashboard.html';
  }
  
  forceRefresh() {
    console.log('🔄 Force refreshing current page...');
    this.onAppClose(); // Clean state
    window.location.reload();
  }
  
  clearAllState() {
    console.log('🧹 Clearing all app state...');
    localStorage.removeItem('hi_app_state');
    localStorage.removeItem('hi_app_time'); 
    localStorage.removeItem('hi_nav_history');
    sessionStorage.clear();
    this.updateAppState(this.appStates.READY);
  }
  
  getNavigationHealth() {
    return {
      currentState: this.currentState,
      lastActiveTime: this.lastActiveTime,
      timeSinceActivity: Date.now() - this.lastActiveTime,
      navigationHistory: JSON.parse(localStorage.getItem('hi_nav_history') || '[]')
    };
  }
  
  // Cleanup method
  destroy() {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
    }
    if (this.sessionRefreshTimeout) {
      clearTimeout(this.sessionRefreshTimeout);
    }
    
    const escapeBtn = document.getElementById('hiEscapeButton');
    if (escapeBtn) {
      escapeBtn.remove();
    }
  }
}

// Initialize Tesla Navigation System
window.hiNavSystem = new HiNavigationSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HiNavigationSystem;
}

console.log('🚀 Tesla Navigation System loaded and ready');