// mobile-diag.js - Minimal gated diagnostics for iOS Safari issues
// Enabled ONLY via ?diag=1 OR localStorage.HI_DIAG=1
// Tracks: lifecycle, navigation, request storms, errors, timings

(function() {
  'use strict';
  
  // Check if diagnostics enabled
  const urlParams = new URLSearchParams(window.location.search);
  const diagEnabled = urlParams.get('diag') === '1' || localStorage.getItem('HI_DIAG') === '1';
  
  if (!diagEnabled) return;
  
  console.log('%c[DIAG] Mobile diagnostics ENABLED', 'background: #00ff00; color: black; font-weight: bold; padding: 4px;');
  
  // Timestamp helper
  function ts() {
    const now = new Date();
    return now.toISOString().split('T')[1].replace('Z', '');
  }
  
  function log(category, message, data = {}) {
    const prefix = `[DIAG:${category}]`;
    if (Object.keys(data).length > 0) {
      console.log(`${prefix} ${ts()} - ${message}`, data);
    } else {
      console.log(`${prefix} ${ts()} - ${message}`);
    }
  }
  
  // === 1) LIFECYCLE EVENTS ===
  
  // Page visibility changes
  document.addEventListener('visibilitychange', () => {
    log('LIFECYCLE', `visibilityState: ${document.visibilityState}`, {
      hidden: document.hidden,
      url: window.location.pathname
    });
  });
  
  // Page show (includes bfcache restoration)
  window.addEventListener('pageshow', (event) => {
    log('LIFECYCLE', 'pageshow', {
      persisted: event.persisted, // TRUE = restored from bfcache
      url: window.location.pathname,
      timestamp: Date.now()
    });
  });
  
  // Page hide (before unload/background)
  window.addEventListener('pagehide', (event) => {
    log('LIFECYCLE', 'pagehide', {
      persisted: event.persisted,
      url: window.location.pathname
    });
  });
  
  // Before unload
  window.addEventListener('beforeunload', () => {
    log('LIFECYCLE', 'beforeunload', { url: window.location.pathname });
  });
  
  // === 2) NAVIGATION CLICKS ===
  
  // Track all clicks on navigation elements
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a, button, [onclick]');
    if (!target) return;
    
    const href = target.href || target.getAttribute('onclick') || target.dataset.page;
    if (!href) return;
    
    // Only log nav-related clicks
    if (href.includes('.html') || target.closest('footer') || target.closest('nav') || target.closest('header')) {
      log('NAV', 'Click on navigation element', {
        tag: target.tagName,
        href: href,
        text: target.textContent?.trim().substring(0, 30),
        classes: target.className
      });
    }
  }, true);
  
  // === 3) REQUEST STORM COUNTER ===
  
  let requestCount = 0;
  let stormWindowActive = false;
  let stormStartTime = 0;
  
  // Start counting when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestCount = 0;
      stormWindowActive = true;
      stormStartTime = Date.now();
      
      setTimeout(() => {
        stormWindowActive = false;
        log('REQUESTS', `Request storm window closed: ${requestCount} requests in 5 seconds`, {
          count: requestCount,
          avgPerSec: (requestCount / 5).toFixed(1)
        });
      }, 5000);
    }
  });
  
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (stormWindowActive) {
      requestCount++;
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
      log('REQUESTS', `fetch #${requestCount}`, { 
        url: url.substring(0, 80),
        elapsed: Date.now() - stormStartTime
      });
    }
    return originalFetch.apply(this, args);
  };
  
  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (stormWindowActive) {
      requestCount++;
      log('REQUESTS', `XHR #${requestCount}`, { 
        method,
        url: url.substring(0, 80),
        elapsed: Date.now() - stormStartTime
      });
    }
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  // === 4) GLOBAL ERRORS ===
  
  window.addEventListener('error', (event) => {
    log('ERROR', 'window.error', {
      message: event.message,
      filename: event.filename?.split('/').pop(),
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack?.split('\n').slice(0, 3).join(' | ')
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    log('ERROR', 'unhandledrejection', {
      reason: event.reason?.message || String(event.reason).substring(0, 100),
      stack: event.reason?.stack?.split('\n').slice(0, 3).join(' | ')
    });
  });
  
  // === 5) KEY TIMINGS ===
  
  // Dashboard init timing (hook into existing code)
  const checkDashboardInit = setInterval(() => {
    if (window.location.pathname.includes('dashboard')) {
      // Try to hook into Dashboard initialization
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            log('TIMING', `Performance: ${entry.name}`, {
              duration: entry.duration.toFixed(2) + 'ms',
              startTime: entry.startTime.toFixed(2)
            });
          }
        }
      });
      observer.observe({ entryTypes: ['measure'] });
      clearInterval(checkDashboardInit);
    }
  }, 100);
  
  // ProfileManager timing
  const checkProfileManager = setInterval(() => {
    if (window.ProfileManager) {
      const original = window.ProfileManager._loadProfileFromDatabase;
      if (original) {
        window.ProfileManager._loadProfileFromDatabase = async function(...args) {
          const start = Date.now();
          log('TIMING', 'ProfileManager fetch START');
          try {
            const result = await original.apply(this, args);
            log('TIMING', 'ProfileManager fetch END', { 
              duration: Date.now() - start + 'ms',
              success: !!result
            });
            return result;
          } catch (err) {
            log('TIMING', 'ProfileManager fetch ERROR', { 
              duration: Date.now() - start + 'ms',
              error: err.message
            });
            throw err;
          }
        };
        clearInterval(checkProfileManager);
      }
    }
  }, 100);
  
  // Session/Auth fetch timing
  const checkAuthFetch = setInterval(() => {
    if (window.hiAuthCore || window.HiSupabase) {
      log('TIMING', 'Auth client detected, starting session timing');
      clearInterval(checkAuthFetch);
    }
  }, 100);
  
  // Report initial load
  window.addEventListener('load', () => {
    log('TIMING', 'window.load complete', {
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
      url: window.location.pathname
    });
  });
  
  // Memory snapshot (if available)
  if (performance.memory) {
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        log('MEMORY', 'Heap snapshot', {
          usedMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
          totalMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
          limitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
        });
      }
    }, 10000); // Every 10 seconds
  }
  
  // BFCache detection - log if page was restored
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      log('BFCACHE', '⚠️ Page restored from BFCache', {
        url: window.location.pathname,
        warning: 'Check for duplicate init or stale state'
      });
    }
  });
  
})();
