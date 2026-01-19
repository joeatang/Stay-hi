/**
 * SIMPLE DIAGNOSTIC LOGGER
 * 
 * Captures navigation events to localStorage
 * No UI, no modals - just data collection
 * 
 * Usage:
 * 1. Navigate between pages normally
 * 2. In console, type: window.getDiagnostics()
 * 3. Copy the output
 * 4. Send to developer
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'hi_simple_diag';
  const MAX_EVENTS = 100;
  
  class SimpleLogger {
    constructor() {
      this.startTime = Date.now();
      this.events = this.loadEvents();
      this.currentPage = this.getPageName();
      
      // Log page load
      this.log('PAGE_LOAD', {
        page: this.currentPage,
        url: window.location.pathname,
        readyState: document.readyState
      });
      
      this.setupListeners();
      
      console.log('📋 Simple Logger active. Type window.getDiagnostics() to see report.');
    }
    
    getPageName() {
      const path = window.location.pathname;
      if (path.includes('dashboard')) return 'Dashboard';
      if (path.includes('island')) return 'Hi Island';
      if (path.includes('profile')) return 'Profile';
      if (path.includes('muscle')) return 'Hi Gym';
      return path.split('/').pop() || 'Unknown';
    }
    
    log(type, data = {}) {
      const event = {
        type,
        page: this.currentPage,
        time: Date.now() - this.startTime,
        data
      };
      
      this.events.push(event);
      
      // Keep only last MAX_EVENTS
      if (this.events.length > MAX_EVENTS) {
        this.events = this.events.slice(-MAX_EVENTS);
      }
      
      this.saveEvents();
    }
    
    saveEvents() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
      } catch (e) {
        console.warn('Failed to save events:', e);
      }
    }
    
    loadEvents() {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    
    setupListeners() {
      // Track ProfileManager
      window.addEventListener('hi:profile-ready', (e) => {
        this.log('PROFILE_READY', {
          userId: e.detail?.userId?.substring(0, 8),
          authenticated: e.detail?.authenticated
        });
      });
      
      // Track auth
      window.addEventListener('hi:auth-ready', (e) => {
        this.log('AUTH_READY', {
          authenticated: e.detail?.authenticated
        });
      });
      
      // Track navigation
      window.addEventListener('beforeunload', () => {
        this.log('PAGE_UNLOAD', {});
      });
      
      // Track DOMContentLoaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.log('DOM_READY', {});
        });
      }
      
      // Track 7-day pill (Dashboard only)
      if (this.currentPage === 'Dashboard') {
        this.track7DayPill();
      }
      
      // Track island init (Hi Island only)
      if (this.currentPage === 'Hi Island') {
        this.trackIslandInit();
      }
      
      // Track errors
      window.addEventListener('error', (e) => {
        this.log('ERROR', {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno
        });
      });
      
      // Track unhandled rejections
      window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason;
        this.log('UNHANDLED_REJECTION', {
          name: reason?.name,
          message: reason?.message
        });
      });
    }
    
    track7DayPill() {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        
        const pill = document.querySelector('[data-global-pill]') || 
                     document.querySelector('.global-pill') ||
                     document.querySelector('#hi-7day-pill');
        
        const visible = pill && pill.offsetParent !== null;
        
        this.log('PILL_CHECK', {
          check: checks,
          found: !!pill,
          visible: visible,
          display: pill?.style.display || 'default',
          opacity: pill?.style.opacity || 'default'
        });
        
        if (visible || checks >= 10) {
          clearInterval(interval);
          if (visible) {
            this.log('PILL_VISIBLE', { afterChecks: checks });
          } else {
            this.log('PILL_NEVER_VISIBLE', { totalChecks: checks });
          }
        }
      }, 500);
    }
    
    trackIslandInit() {
      // Watch for duplicate init
      const originalWarn = console.warn;
      console.warn = (...args) => {
        const message = String(args[0] || '');
        
        if (message.includes('Hi Island initializing')) {
          this.log('ISLAND_INIT_START', {});
        } else if (message.includes('already called, skipping')) {
          this.log('ISLAND_INIT_DUPLICATE_PREVENTED', {});
        } else if (message.includes('Profile query timeout')) {
          this.log('PROFILE_TIMEOUT', {});
        } else if (message.includes('Feed database load timed out')) {
          this.log('FEED_TIMEOUT', {});
        }
        
        originalWarn.apply(console, args);
      };
    }
    
    generateReport() {
      const lines = [];
      
      lines.push('=== HI DIAGNOSTIC REPORT ===');
      lines.push(`Total Events: ${this.events.length}`);
      lines.push(`Session Duration: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
      lines.push('');
      
      // Group by type
      const byType = {};
      this.events.forEach(e => {
        if (!byType[e.type]) byType[e.type] = [];
        byType[e.type].push(e);
      });
      
      lines.push('=== EVENT SUMMARY ===');
      Object.entries(byType).forEach(([type, events]) => {
        lines.push(`${type}: ${events.length}`);
      });
      lines.push('');
      
      // Critical issues
      lines.push('=== ISSUES DETECTED ===');
      
      const pillNeverVisible = byType['PILL_NEVER_VISIBLE']?.length > 0;
      const profileTimeouts = byType['PROFILE_TIMEOUT']?.length || 0;
      const feedTimeouts = byType['FEED_TIMEOUT']?.length || 0;
      const duplicateInits = byType['ISLAND_INIT_START']?.length > 1;
      const errors = byType['ERROR']?.length || 0;
      const rejections = byType['UNHANDLED_REJECTION']?.length || 0;
      
      if (pillNeverVisible) lines.push('❌ 7-day pill never became visible');
      if (profileTimeouts > 0) lines.push(`⚠️  Profile query timeout (${profileTimeouts}x)`);
      if (feedTimeouts > 0) lines.push(`⚠️  Feed query timeout (${feedTimeouts}x)`);
      if (duplicateInits) lines.push(`⚠️  Island initialized multiple times`);
      if (errors > 0) lines.push(`❌ ${errors} JavaScript errors`);
      if (rejections > 0) lines.push(`❌ ${rejections} unhandled promise rejections`);
      
      if (!pillNeverVisible && !profileTimeouts && !feedTimeouts && !duplicateInits && !errors && !rejections) {
        lines.push('✅ No issues detected');
      }
      lines.push('');
      
      // Detailed timeline
      lines.push('=== TIMELINE ===');
      this.events.forEach(e => {
        const time = `+${(e.time / 1000).toFixed(1)}s`;
        const dataStr = JSON.stringify(e.data);
        lines.push(`${time.padEnd(8)} | ${e.page.padEnd(12)} | ${e.type.padEnd(25)} | ${dataStr}`);
      });
      
      return lines.join('\n');
    }
    
    clear() {
      this.events = [];
      this.saveEvents();
      console.log('📋 Diagnostics cleared');
    }
  }
  
  // Create instance
  window.simpleLogger = new SimpleLogger();
  
  // Easy access functions
  window.getDiagnostics = () => {
    const report = window.simpleLogger.generateReport();
    console.log(report);
    return report;
  };
  
  window.clearDiagnostics = () => {
    window.simpleLogger.clear();
  };
  
})();
