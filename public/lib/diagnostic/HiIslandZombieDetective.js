/**
 * 🔍 HI ISLAND ZOMBIE MODE DETECTIVE
 * Desktop-friendly debugging tool for mobile zombie/freeze issues
 * 
 * Features:
 * - Persistent on-screen log (stays visible during navigation)
 * - State tracking (shows what's happening when app "zombifies")
 * - Event monitoring (tracks all user interactions + system events)
 * - Performance tracking (detects main thread blocking)
 * - Export logs for analysis
 */

class HiIslandZombieDetective {
  constructor() {
    this.logs = [];
    this.maxLogs = 200;
    this.isActive = false;
    this.overlay = null;
    this.logContainer = null;
    this.stateIndicators = {};
    this.startTime = Date.now();
    
    // Track critical states
    this.states = {
      authReady: false,
      dbReady: false,
      feedReady: false,
      mapReady: false,
      lastInteraction: null,
      mainThreadBlocked: false,
      navigationInProgress: false
    };
    
    // Interaction tracking
    this.interactions = [];
    this.lastHeartbeat = Date.now();
    
    console.log('🔍 Zombie Detective initialized');
    
    // 🔥 Auto-restore if was active before navigation
    if (sessionStorage.getItem('zombieDetectiveActive') === 'true') {
      console.log('🔍 Zombie Detective: Restoring from previous session');
      setTimeout(() => this.start(), 100); // Delay to ensure DOM ready
    }
  }
  
  /**
   * Start detective mode
   */
  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    // 🔥 Mark as active in sessionStorage (survives navigation)
    sessionStorage.setItem('zombieDetectiveActive', 'true');
    
    this.createOverlay();
    this.setupMonitoring();
    this.startHeartbeat();
    this.setupDOMPersistence(); // NEW: Monitor if overlay gets removed
    
    this.log('🚀 Detective mode activated', 'system');
    console.log('🔍 Zombie Detective: ACTIVE');
  }
  
  /**
   * Stop detective mode
   */
  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    
    // 🔥 Clear sessionStorage flag
    sessionStorage.removeItem('zombieDetectiveActive');
    
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.remove();
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    this.log('🛑 Detective mode deactivated', 'system');
  }
  
  /**
   * Toggle detective mode
   */
  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
  }
  
  /**
   * Create persistent on-screen overlay
   */
  createOverlay() {
    // Remove old overlay if it exists
    const existing = document.getElementById('zombie-detective-overlay');
    if (existing) existing.remove();
    
    // Create container
    this.overlay = document.createElement('div');
    this.overlay.id = 'zombie-detective-overlay';
    this.overlay.style.cssText = `
      position: fixed !important;
      top: 70px !important;
      right: 10px !important;
      width: 400px !important;
      max-height: calc(100vh - 80px) !important;
      background: rgba(0, 0, 0, 0.95) !important;
      color: #0f0 !important;
      font-family: 'Monaco', 'Courier New', monospace !important;
      font-size: 11px !important;
      line-height: 1.4 !important;
      z-index: 2147483647 !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3) !important;
      border: 2px solid #0f0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      pointer-events: auto !important;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 10px;
      background: #0f0;
      color: #000;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f0;
    `;
    header.innerHTML = `
      <span>🔍 ZOMBIE DETECTIVE</span>
      <button id="zombie-detective-close" style="
        background: #000;
        color: #0f0;
        border: 1px solid #0f0;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
      ">CLOSE</button>
    `;
    
    // Create state indicators
    const statePanel = document.createElement('div');
    statePanel.id = 'zombie-detective-states';
    statePanel.style.cssText = `
      padding: 8px 10px;
      background: rgba(0, 255, 0, 0.1);
      border-bottom: 1px solid #0f0;
      font-size: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    `;
    
    // Create log container
    this.logContainer = document.createElement('div');
    this.logContainer.id = 'zombie-detective-logs';
    this.logContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      font-size: 10px;
    `;
    
    // Create footer with export button
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 6px 10px;
      background: rgba(0, 255, 0, 0.1);
      border-top: 1px solid #0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    `;
    footer.innerHTML = `
      <button id="zombie-detective-export" style="
        background: #0f0;
        color: #000;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
      ">EXPORT LOGS</button>
      <button id="zombie-detective-clear" style="
        background: transparent;
        color: #0f0;
        border: 1px solid #0f0;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
      ">CLEAR</button>
      <span id="zombie-detective-heartbeat" style="color: #0f0;">❤️</span>
    `;
    
    // Assemble overlay
    this.overlay.appendChild(header);
    this.overlay.appendChild(statePanel);
    this.overlay.appendChild(this.logContainer);
    this.overlay.appendChild(footer);
    document.body.appendChild(this.overlay);
    
    // Setup event listeners
    document.getElementById('zombie-detective-close').addEventListener('click', () => this.stop());
    document.getElementById('zombie-detective-export').addEventListener('click', () => this.exportLogs());
    document.getElementById('zombie-detective-clear').addEventListener('click', () => this.clearLogs());
    
    // Update state indicators
    this.updateStateIndicators();
  }
  
  /**
   * Setup comprehensive monitoring
   */
  setupMonitoring() {
    // Monitor clicks
    document.addEventListener('click', (e) => {
      const target = e.target;
      const targetInfo = `${target.tagName}${target.id ? '#' + target.id : ''}${target.className ? '.' + target.className.split(' ')[0] : ''}`;
      this.log(`👆 CLICK: ${targetInfo}`, 'interaction');
      this.states.lastInteraction = 'click';
      this.interactions.push({
        type: 'click',
        target: targetInfo,
        time: Date.now() - this.startTime
      });
    }, true);
    
    // Monitor scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.log(`📜 SCROLL: Y=${window.scrollY}`, 'interaction');
        this.states.lastInteraction = 'scroll';
      }, 200);
    }, { passive: true });
    
    // Monitor navigation events
    window.addEventListener('beforeunload', () => {
      this.log('🚪 BEFOREUNLOAD fired', 'navigation');
      this.states.navigationInProgress = true;
    });
    
    window.addEventListener('pagehide', (e) => {
      this.log(`🚪 PAGEHIDE (persisted: ${e.persisted})`, 'navigation');
    });
    
    window.addEventListener('pageshow', (e) => {
      this.log(`👋 PAGESHOW (persisted: ${e.persisted})`, 'navigation');
      this.states.navigationInProgress = false;
    });
    
    // Monitor visibility changes
    document.addEventListener('visibilitychange', () => {
      this.log(`👁️ VISIBILITY: ${document.hidden ? 'HIDDEN' : 'VISIBLE'}`, 'system');
    });
    
    // Monitor auth state
    window.addEventListener('hi:auth-ready', () => {
      this.states.authReady = true;
      this.log('✅ AUTH READY', 'system');
      this.updateStateIndicators();
    });
    
    window.addEventListener('hi:auth-state-changed', (e) => {
      this.log(`🔐 AUTH STATE: ${e.detail?.event || 'unknown'}`, 'system');
    });
    
    // Monitor errors
    window.addEventListener('error', (e) => {
      this.log(`❌ ERROR: ${e.message} (${e.filename}:${e.lineno})`, 'error');
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      this.log(`❌ UNHANDLED PROMISE: ${e.reason}`, 'error');
    });
    
    // Monitor main thread blocking
    this.monitorMainThread();
    
    // Monitor database readiness
    this.checkDatabaseReady();
    
    // Monitor feed readiness
    this.checkFeedReady();
    
    // Monitor map readiness
    this.checkMapReady();
  }
  
  /**
   * Monitor main thread for blocking
   */
  monitorMainThread() {
    let lastCheck = performance.now();
    
    setInterval(() => {
      const now = performance.now();
      const gap = now - lastCheck;
      
      // If gap > 200ms, main thread was blocked
      if (gap > 200) {
        const blocked = Math.round(gap);
        this.log(`⚠️ MAIN THREAD BLOCKED: ${blocked}ms`, 'performance');
        this.states.mainThreadBlocked = true;
        
        setTimeout(() => {
          this.states.mainThreadBlocked = false;
          this.updateStateIndicators();
        }, 1000);
      }
      
      lastCheck = now;
    }, 100);
  }
  
  /**
   * Check if database is ready
   */
  checkDatabaseReady() {
    const check = () => {
      if (window.hiDB && typeof window.hiDB.query === 'function') {
        this.states.dbReady = true;
        this.log('✅ DATABASE READY', 'system');
        this.updateStateIndicators();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }
  
  /**
   * Check if feed is ready
   */
  checkFeedReady() {
    const check = () => {
      const feedRoot = document.getElementById('hi-island-feed-root');
      if (feedRoot && feedRoot.children.length > 0) {
        this.states.feedReady = true;
        this.log('✅ FEED READY', 'system');
        this.updateStateIndicators();
      } else {
        setTimeout(check, 100);
      }
    };
    setTimeout(check, 500); // Give feed time to initialize
  }
  
  /**
   * Check if map is ready
   */
  checkMapReady() {
    const check = () => {
      if (window.hiIslandMap || document.querySelector('.leaflet-container')) {
        this.states.mapReady = true;
        this.log('✅ MAP READY', 'system');
        this.updateStateIndicators();
      } else {
        setTimeout(check, 100);
      }
    };
    setTimeout(check, 500);
  }
  
  /**
   * Heartbeat to detect if JS is still running
   */
  startHeartbeat() {
    setInterval(() => {
      const heartbeat = document.getElementById('zombie-detective-heartbeat');
      if (heartbeat) {
        const now = Date.now();
        const gap = now - this.lastHeartbeat;
        
        if (gap > 1500) {
          // Heartbeat was delayed - possible freeze
          this.log(`⚠️ HEARTBEAT DELAYED: ${gap}ms`, 'performance');
          heartbeat.textContent = '💀'; // Zombie indicator
          heartbeat.style.color = '#ff0';
        } else {
          heartbeat.textContent = '❤️';
          heartbeat.style.color = '#0f0';
        }
        
        this.lastHeartbeat = now;
      }
    }, 1000);
  }
  
  /**
   * Setup DOM persistence - reattach if overlay gets removed
   */
  setupDOMPersistence() {
    // Monitor navigation events BEFORE overlay might be removed
    const handleNavigation = () => {
      this.log('🚨 NAVIGATION DETECTED - Saving state...', 'navigation');
      this.states.navigationInProgress = true;
      this.updateStateIndicators();
      
      // 🔥 Ensure sessionStorage flag is set before navigation
      sessionStorage.setItem('zombieDetectiveActive', 'true');
    };
    
    // Listen for ALL navigation types
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('beforeunload', handleNavigation);
    
    // Monitor if overlay gets removed from DOM
    const checkOverlay = () => {
      if (!this.isActive) return;
      
      if (this.overlay && !document.body.contains(this.overlay)) {
        this.log('⚠️ OVERLAY REMOVED - Re-attaching NOW!', 'system');
        console.warn('🔍 Zombie Detective: Overlay removed, forcing re-attach');
        
        try {
          // Re-create overlay from scratch
          this.createOverlay();
          this.updateStateIndicators();
          this.log('✅ Overlay restored', 'system');
        } catch (e) {
          console.error('🔍 Failed to restore overlay:', e);
        }
      }
    };
    
    // 🔥 Check VERY frequently (every 100ms) for faster recovery
    setInterval(checkOverlay, 100);
    
    // Also use MutationObserver for immediate detection
    const observer = new MutationObserver(() => {
      checkOverlay();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: false
    });
    
    this.domObserver = observer;
    
    this.log('🛡️ DOM persistence active (100ms checks)', 'system');
  }
  
  /**
   * Reattach event listeners after DOM restoration
   */
  reattachEventListeners() {
    const closeBtn = document.getElementById('zombie-detective-close');
    const exportBtn = document.getElementById('zombie-detective-export');
    const clearBtn = document.getElementById('zombie-detective-clear');
    
    if (closeBtn) {
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      document.getElementById('zombie-detective-close').addEventListener('click', () => this.stop());
    }
    
    if (exportBtn) {
      exportBtn.replaceWith(exportBtn.cloneNode(true));
      document.getElementById('zombie-detective-export').addEventListener('click', () => this.exportLogs());
    }
    
    if (clearBtn) {
      clearBtn.replaceWith(clearBtn.cloneNode(true));
      document.getElementById('zombie-detective-clear').addEventListener('click', () => this.clearLogs());
    }
    
    this.log('✅ Event listeners re-attached', 'system');
  }
  
  /**
   * Update state indicators in overlay
   */
  updateStateIndicators() {
    const statePanel = document.getElementById('zombie-detective-states');
    if (!statePanel) return;
    
    const makeIndicator = (label, value) => {
      const color = value ? '#0f0' : '#f00';
      const symbol = value ? '✓' : '✗';
      return `<div style="color: ${color};">${symbol} ${label}</div>`;
    };
    
    statePanel.innerHTML = `
      ${makeIndicator('Auth', this.states.authReady)}
      ${makeIndicator('DB', this.states.dbReady)}
      ${makeIndicator('Feed', this.states.feedReady)}
      ${makeIndicator('Map', this.states.mapReady)}
      ${makeIndicator('Thread OK', !this.states.mainThreadBlocked)}
      ${makeIndicator('Nav OK', !this.states.navigationInProgress)}
    `;
  }
  
  /**
   * Log a message
   */
  log(message, type = 'info') {
    const timestamp = Date.now() - this.startTime;
    const entry = {
      time: timestamp,
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
    
    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Update UI
    if (this.logContainer) {
      const typeColors = {
        system: '#0ff',
        interaction: '#ff0',
        navigation: '#f0f',
        performance: '#f80',
        error: '#f00',
        info: '#0f0'
      };
      
      const color = typeColors[type] || '#0f0';
      const formattedTime = (timestamp / 1000).toFixed(2) + 's';
      
      const logLine = document.createElement('div');
      logLine.style.color = color;
      logLine.style.marginBottom = '2px';
      logLine.textContent = `[${formattedTime}] ${message}`;
      
      this.logContainer.appendChild(logLine);
      
      // Auto-scroll to bottom
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
    
    // Also console log
    console.log(`🔍 [${type.toUpperCase()}] ${message}`);
  }
  
  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
    if (this.logContainer) {
      this.logContainer.innerHTML = '';
    }
    this.log('🧹 Logs cleared', 'system');
  }
  
  /**
   * Export logs to downloadable file
   */
  exportLogs() {
    const exportData = {
      session: {
        startTime: new Date(this.startTime).toISOString(),
        duration: Date.now() - this.startTime,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      states: this.states,
      interactions: this.interactions,
      logs: this.logs
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zombie-detective-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.log('📦 Logs exported', 'system');
  }
}

// Initialize global detective
window.zombieDetective = new HiIslandZombieDetective();

// Auto-start if ?debug=zombie in URL
if (window.location.search.includes('debug=zombie')) {
  window.zombieDetective.start();
  console.log('🔍 Zombie Detective auto-started from URL parameter');
}

// Keyboard shortcut: Ctrl+Shift+Z to toggle
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
    window.zombieDetective.toggle();
  }
});

console.log('🔍 Zombie Detective loaded. Press Ctrl+Shift+Z to activate or add ?debug=zombie to URL');
