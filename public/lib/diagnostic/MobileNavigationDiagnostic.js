/**
 * MOBILE NAVIGATION DIAGNOSTIC TOOL
 * 
 * Captures state during page navigation and displays results in modal
 * No need to watch console - just navigate, then view report
 * 
 * Usage:
 * 1. Tool auto-starts on page load
 * 2. Navigate between pages normally
 * 3. Press Ctrl+Shift+D (or add ?navdiag=show to URL) to view report
 * 4. Screenshot the report to share with developer
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'hi_nav_diagnostic_v1';
  const MAX_EVENTS = 50; // Keep last 50 events
  
  class MobileNavigationDiagnostic {
    constructor() {
      this.events = [];
      this.currentPage = this.getPageName();
      this.sessionStart = Date.now();
      this.isVisible = false;
      
      // Load existing events from sessionStorage
      this.loadEvents();
      
      // Record page load
      this.recordEvent('PAGE_LOAD', {
        page: this.currentPage,
        readyState: document.readyState,
        timestamp: new Date().toISOString()
      });
      
      // Setup listeners
      this.setupListeners();
      
      // Create floating diagnostic button (mobile-friendly)
      this.createFloatingButton();
      
      console.log('📊 Navigation Diagnostic Tool loaded. Tap the 📊 button to view report.');
    }
    
    getPageName() {
      const path = window.location.pathname;
      if (path.includes('dashboard')) return 'Dashboard';
      if (path.includes('island')) return 'Hi Island';
      if (path.includes('profile')) return 'Profile';
      if (path.includes('muscle')) return 'Hi Gym';
      if (path.includes('mission-control')) return 'Mission Control';
      return path.split('/').pop() || 'Unknown';
    }
    
    recordEvent(type, data = {}) {
      const event = {
        type,
        page: this.currentPage,
        timestamp: Date.now() - this.sessionStart,
        timestampISO: new Date().toISOString(),
        data
      };
      
      this.events.push(event);
      
      // Trim to max events
      if (this.events.length > MAX_EVENTS) {
        this.events = this.events.slice(-MAX_EVENTS);
      }
      
      // Save to sessionStorage
      this.saveEvents();
      
      // Log to console with special prefix
      console.log(`[NAV-DIAG] ${type}:`, data);
    }
    
    saveEvents() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
      } catch (e) {
        console.warn('Failed to save diagnostic events:', e);
      }
    }
    
    loadEvents() {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.events = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Failed to load diagnostic events:', e);
        this.events = [];
      }
    }
    
    setupListeners() {
      // Track ProfileManager state
      window.addEventListener('hi:profile-ready', (e) => {
        this.recordEvent('PROFILE_READY', {
          userId: e.detail?.userId,
          authenticated: e.detail?.authenticated,
          username: e.detail?.username
        });
      });
      
      // Track auth state
      window.addEventListener('hi:auth-ready', (e) => {
        this.recordEvent('AUTH_READY', {
          authenticated: e.detail?.authenticated,
          userId: e.detail?.userId?.substring(0, 8) + '...'
        });
      });
      
      // Track navigation
      window.addEventListener('beforeunload', () => {
        this.recordEvent('PAGE_UNLOAD', {
          nextHref: window.location.href
        });
      });
      
      // Track DOMContentLoaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.recordEvent('DOM_READY', {
            timeFromLoad: Date.now() - this.sessionStart
          });
        });
      }
      
      // Track visibility changes
      document.addEventListener('visibilitychange', () => {
        this.recordEvent('VISIBILITY_CHANGE', {
          visible: document.visibilityState === 'visible'
        });
      });
      
      // Track 7-day pill appearance (Dashboard specific)
      if (this.currentPage === 'Dashboard') {
        this.check7DayPill();
      }
      
      // Listen for timeout events (fired by other components)
      window.addEventListener('hi:profile-timeout', () => {
        this.recordEvent('PROFILE_TIMEOUT', {});
      });
      
      window.addEventListener('hi:feed-timeout', () => {
        this.recordEvent('FEED_TIMEOUT', {});
      });
      
      // Keyboard shortcut: Ctrl+Shift+D
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          this.toggle();
        }
      });
    }
    
    createFloatingButton() {
      // Create floating diagnostic button (bottom-right corner)
      const button = document.createElement('button');
      button.id = 'nav-diag-float-btn';
      button.innerHTML = '📊';
      button.title = 'Show Navigation Diagnostics';
      button.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: 3px solid rgba(255, 255, 255, 0.3);
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        -webkit-tap-highlight-color: transparent;
      `;
      
      // Add pulsing animation to attract attention
      button.style.animation = 'diagPulse 2s infinite';
      
      // Add animation keyframes
      if (!document.getElementById('diag-animations')) {
        const style = document.createElement('style');
        style.id = 'diag-animations';
        style.textContent = `
          @keyframes diagPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
            50% { transform: scale(1.1); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5); }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Button interactions
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        button.style.transform = 'scale(0.9)';
      });
      
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        button.style.transform = 'scale(1)';
        this.show();
      });
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.show();
      });
      
      // Add to page when DOM ready
      if (document.body) {
        document.body.appendChild(button);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(button);
        });
      }
    }
    
    check7DayPill() {
      // Check for 7-day pill every 500ms for first 5 seconds
      let checks = 0;
      const maxChecks = 10;
      
      const interval = setInterval(() => {
        checks++;
        
        const pill = document.querySelector('[data-global-pill]') || 
                     document.querySelector('.global-pill') ||
                     document.querySelector('#hi-7day-pill');
        
        const visible = pill && pill.offsetParent !== null;
        
        this.recordEvent('7DAY_PILL_CHECK', {
          checkNumber: checks,
          found: !!pill,
          visible,
          display: pill?.style.display,
          opacity: pill?.style.opacity
        });
        
        if (visible || checks >= maxChecks) {
          clearInterval(interval);
        }
      }, 500);
    }
    
    generateReport() {
      const report = {
        session: {
          start: new Date(Date.now() - this.sessionStart + this.sessionStart).toISOString(),
          duration: Math.round((Date.now() - this.sessionStart) / 1000) + 's',
          currentPage: this.currentPage,
          totalEvents: this.events.length
        },
        eventsByType: {},
        timeline: []
      };
      
      // Group events by type
      this.events.forEach(event => {
        if (!report.eventsByType[event.type]) {
          report.eventsByType[event.type] = [];
        }
        report.eventsByType[event.type].push(event);
      });
      
      // Create timeline (last 20 events)
      report.timeline = this.events.slice(-20).map(event => ({
        time: `+${(event.timestamp / 1000).toFixed(1)}s`,
        type: event.type,
        page: event.page,
        data: JSON.stringify(event.data).substring(0, 100)
      }));
      
      return report;
    }
    
    generateHTML() {
      const report = this.generateReport();
      
      // Check for issues
      const issues = [];
      
      // Issue: 7-day pill not visible
      const pillChecks = report.eventsByType['7DAY_PILL_CHECK'] || [];
      const pillVisible = pillChecks.some(e => e.data.visible);
      if (this.currentPage === 'Dashboard' && !pillVisible && pillChecks.length > 0) {
        issues.push('❌ 7-day pill never became visible');
      }
      
      // Issue: Profile timeouts
      const profileTimeouts = report.eventsByType['PROFILE_TIMEOUT'] || [];
      if (profileTimeouts.length > 0) {
        issues.push(`⚠️ Profile query timed out ${profileTimeouts.length} time(s)`);
      }
      
      // Issue: Feed timeouts
      const feedTimeouts = report.eventsByType['FEED_TIMEOUT'] || [];
      if (feedTimeouts.length > 0) {
        issues.push(`⚠️ Feed query timed out ${feedTimeouts.length} time(s)`);
      }
      
      // Issue: Multiple page loads (rapid navigation)
      const pageLoads = report.eventsByType['PAGE_LOAD'] || [];
      if (pageLoads.length > 3) {
        issues.push(`ℹ️ ${pageLoads.length} page loads (rapid navigation)`);
      }
      
      return `
        <div id="nav-diagnostic-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          color: #fff;
          z-index: 999999;
          overflow-y: auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.6;
        ">
          <div style="max-width: 800px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #4ECDC4;">📊 Navigation Diagnostic Report</h2>
              <button onclick="window.mobileNavDiag.hide()" style="
                background: #ff4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
              ">Close</button>
            </div>
            
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #4ECDC4;">Session Info</h3>
              <div><strong>Start:</strong> ${report.session.start.split('T')[1].split('.')[0]}</div>
              <div><strong>Duration:</strong> ${report.session.duration}</div>
              <div><strong>Current Page:</strong> ${report.session.currentPage}</div>
              <div><strong>Total Events:</strong> ${report.session.totalEvents}</div>
            </div>
            
            ${issues.length > 0 ? `
              <div style="background: #ff4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: white;">Issues Detected</h3>
                ${issues.map(issue => `<div>${issue}</div>`).join('')}
              </div>
            ` : `
              <div style="background: #44ff44; color: #000; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">✅ No Issues Detected</h3>
              </div>
            `}
            
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #4ECDC4;">Event Summary</h3>
              ${Object.entries(report.eventsByType).map(([type, events]) => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span>${type}</span>
                  <span style="color: #4ECDC4; font-weight: 600;">${events.length}</span>
                </div>
              `).join('')}
            </div>
            
      
      // Show floating button again
      const button = document.getElementById('nav-diag-float-btn');
      if (button) {
        button.style.display = 'flex';
      }
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #4ECDC4;">Timeline (Last 20 Events)</h3>
              <div style="font-family: 'Courier New', monospace; font-size: 12px;">
                ${report.timeline.map(event => `
                  <div style="margin-bottom: 8px; padding: 8px; background: #2a2a2a; border-radius: 4px;">
                    <div style="color: #4ECDC4;">${event.time} | ${event.page} | ${event.type}</div>
                    <div style="color: #999; margin-top: 4px;">${event.data}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #4ECDC4;">Dashboard-Specific Diagnostics</h3>
              ${this.getDashboardDiagnostics()}
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666;">
              <div>Take a screenshot of this report to share with developer</div>
              <div style="margin-top: 8px;">Press Ctrl+Shift+D to close</div>
            </div>
          </div>
        </div>
      `;
    }
    
    getDashboardDiagnostics() {
      const pillChecks = this.events.filter(e => e.type === '7DAY_PILL_CHECK');
      
      if (pillChecks.length === 0) {
        return '<div>No Dashboard diagnostics (not on Dashboard page)</div>';
      }
      
      return `
        <div><strong>7-Day Pill Checks:</strong> ${pillChecks.length}</div>
        <div><strong>First Check:</strong> +${(pillChecks[0]?.timestamp / 1000).toFixed(1)}s</div>
        <div><strong>Last Check:</strong> +${(pillChecks[pillChecks.length - 1]?.timestamp / 1000).toFixed(1)}s</div>
        <div><strong>Ever Found:</strong> ${pillChecks.some(e => e.data.found) ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Ever Visible:</strong> ${pillChecks.some(e => e.data.visible) ? '✅ Yes' : '❌ No'}</div>
        ${pillChecks.length > 0 ? `
          <div style="margin-top: 10px; font-family: 'Courier New', monospace; font-size: 11px;">
            ${pillChecks.map(check => `
              <div style="padding: 4px; background: #2a2a2a; margin: 2px 0; border-radius: 4px;">
                Check ${check.data.checkNumber}: 
                ${check.data.found ? '✅ Found' : '❌ Not Found'} | 
                ${check.data.visible ? '✅ Visible' : '❌ Hidden'}
                ${check.data.display ? ` (display: ${check.data.display})` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
    }
    
    show() {
      if (this.isVisible) return;
      
      // Hide floating button while modal is open
      const button = document.getElementById('nav-diag-float-btn');
      if (button) {
        button.style.display = 'none';
      }
      
      const html = this.generateHTML();
      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div.firstChild);
      this.isVisible = true;
    }
    
    hide() {
      const modal = document.getElementById('nav-diagnostic-modal');
      if (modal) {
        modal.remove();
        this.isVisible = false;
      }
    }
    
    toggle() {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
    
    clear() {
      this.events = [];
      this.saveEvents();
      console.log('📊 Diagnostic events cleared');
    }
  }
  
  // Create global instance
  window.mobileNavDiag = new MobileNavigationDiagnostic();
  
  // Expose helper functions
  window.showNavDiag = () => window.mobileNavDiag.show();
  window.clearNavDiag = () => window.mobileNavDiag.clear();
  
})();
