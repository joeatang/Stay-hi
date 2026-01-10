// mobile-diag-overlay.js - On-screen failure report for mobile Safari (no console access)
// Activated ONLY via ?diag=1
// Zero impact when disabled

(function() {
  'use strict';
  
  const urlParams = new URLSearchParams(window.location.search);
  const diagEnabled = urlParams.get('diag') === '1';
  
  if (!diagEnabled) return;
  
  // Ring buffer (80 events max)
  const MAX_EVENTS = 80;
  window.__HI_DIAG_BUFFER = [];
  
  let requestCount5s = 0;
  let warnCount = 0;
  let errorCount = 0;
  let lastError = '';
  let stormWindowActive = false;
  let stormStartTime = 0;
  let lastBfcacheRestore = false;
  
  function ts() {
    return Date.now();
  }
  
  function addEvent(type, data) {
    const event = { ts: ts(), type, ...data };
    window.__HI_DIAG_BUFFER.push(event);
    if (window.__HI_DIAG_BUFFER.length > MAX_EVENTS) {
      window.__HI_DIAG_BUFFER.shift();
    }
  }
  
  // Heartbeat (detect freezes)
  setInterval(() => {
    addEvent('heartbeat', {});
  }, 1000);
  
  // Lifecycle events
  document.addEventListener('visibilitychange', () => {
    addEvent('lifecycle', {
      event: 'visibilitychange',
      state: document.visibilityState
    });
    
    // Start request storm counter
    if (document.visibilityState === 'visible') {
      requestCount5s = 0;
      stormWindowActive = true;
      stormStartTime = ts();
      
      setTimeout(() => {
        stormWindowActive = false;
        addEvent('network', {
          event: 'storm_window_end',
          count: requestCount5s,
          duration: 5000
        });
      }, 5000);
    }
  });
  
  window.addEventListener('pageshow', (e) => {
    lastBfcacheRestore = e.persisted;
    addEvent('lifecycle', {
      event: 'pageshow',
      persisted: e.persisted
    });
  });
  
  window.addEventListener('pagehide', (e) => {
    addEvent('lifecycle', {
      event: 'pagehide',
      persisted: e.persisted
    });
  });
  
  // Navigation clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, [onclick]');
    if (!target) return;
    
    const href = target.href || target.getAttribute('onclick') || target.dataset.page;
    if (!href) return;
    
    if (href.includes('.html') || target.closest('footer') || target.closest('nav')) {
      const from = window.location.pathname.split('/').pop();
      const to = href.split('/').pop().split('?')[0];
      addEvent('nav', { from, to });
    }
  }, true);
  
  // Splash timeouts
  const splashObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.id === 'hi-splash-screen') {
          addEvent('splash', { event: 'start' });
        }
      });
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.id === 'hi-splash-screen') {
          addEvent('splash', { event: 'end' });
        }
      });
    });
  });
  if (document.body) {
    splashObserver.observe(document.body, { childList: true, subtree: true });
  }
  
  // Network counter
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    if (stormWindowActive) requestCount5s++;
    return originalFetch.apply(this, args);
  };
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) {
    if (stormWindowActive) requestCount5s++;
    return originalXHROpen.apply(this, args);
  };
  
  // Error counters
  const originalWarn = console.warn;
  console.warn = function(...args) {
    warnCount++;
    return originalWarn.apply(this, args);
  };
  
  window.addEventListener('error', (e) => {
    errorCount++;
    lastError = `${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`;
    addEvent('error', { 
      msg: e.message.substring(0, 100),
      src: e.filename?.split('/').pop(),
      line: e.lineno
    });
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    errorCount++;
    const msg = e.reason?.message || String(e.reason).substring(0, 100);
    lastError = msg;
    addEvent('error', { 
      msg,
      type: 'unhandledrejection'
    });
  });
  
  // Generate failure report
  function generateReport() {
    const now = ts();
    const last10 = window.__HI_DIAG_BUFFER.slice(-10);
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      page: window.location.pathname.split('/').pop(),
      bfcache_restore: lastBfcacheRestore,
      request_count_last_5s: requestCount5s,
      warn_count: warnCount,
      error_count: errorCount,
      last_error: lastError || 'none',
      last_10_events: last10.map(e => ({
        ts_offset: now - e.ts,
        type: e.type,
        data: e.event || e.from || e.msg || e.state || ''
      })),
      full_buffer_size: window.__HI_DIAG_BUFFER.length
    };
    
    return report;
  }
  
  // Create overlay UI
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'hi-diag-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      color: #0f0;
      font: 11px monospace;
      padding: 8px;
      border-radius: 4px;
      z-index: 999999;
      max-width: 200px;
      backdrop-filter: blur(4px);
    `;
    
    const status = document.createElement('div');
    status.style.marginBottom = '6px';
    status.innerHTML = `
      <div>🔍 DIAG MODE</div>
      <div style="font-size:9px;opacity:0.7;">Events: <span id="diag-count">0</span></div>
      <div style="font-size:9px;opacity:0.7;">Errors: <span id="diag-errors">0</span></div>
    `;
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy Report';
    copyBtn.style.cssText = `
      width: 100%;
      padding: 6px;
      background: #0f0;
      color: #000;
      border: none;
      border-radius: 3px;
      font: 600 11px monospace;
      cursor: pointer;
      margin-top: 4px;
    `;
    
    copyBtn.onclick = async () => {
      const report = generateReport();
      const reportText = JSON.stringify(report, null, 2);
      
      // Persist to localStorage
      localStorage.setItem('HI_LAST_DIAG_REPORT', reportText);
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(reportText);
        copyBtn.textContent = '✓ Copied!';
        copyBtn.style.background = '#0f0';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Report';
          copyBtn.style.background = '#0f0';
        }, 2000);
      } catch (err) {
        // Fallback for clipboard API failure
        const textarea = document.createElement('textarea');
        textarea.value = reportText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Report';
        }, 2000);
      }
    };
    
    const retrieveBtn = document.createElement('button');
    retrieveBtn.textContent = 'Show Last Report';
    retrieveBtn.style.cssText = `
      width: 100%;
      padding: 4px;
      background: #666;
      color: #fff;
      border: none;
      border-radius: 3px;
      font: 600 9px monospace;
      cursor: pointer;
      margin-top: 4px;
    `;
    
    retrieveBtn.onclick = () => {
      const lastReport = localStorage.getItem('HI_LAST_DIAG_REPORT');
      if (lastReport) {
        alert('Report copied to clipboard!\n\nCheck your clipboard or localStorage.HI_LAST_DIAG_REPORT');
        navigator.clipboard.writeText(lastReport).catch(() => {});
      } else {
        alert('No previous report found');
      }
    };
    
    overlay.appendChild(status);
    overlay.appendChild(copyBtn);
    overlay.appendChild(retrieveBtn);
    document.body.appendChild(overlay);
    
    // Update counters
    setInterval(() => {
      document.getElementById('diag-count').textContent = window.__HI_DIAG_BUFFER.length;
      document.getElementById('diag-errors').textContent = errorCount;
    }, 1000);
  }
  
  // Initialize overlay when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOverlay);
  } else {
    createOverlay();
  }
  
  // Auto-save report on page unload
  window.addEventListener('beforeunload', () => {
    const report = generateReport();
    localStorage.setItem('HI_LAST_DIAG_REPORT', JSON.stringify(report, null, 2));
  });
  
  console.log('%c[HI-DIAG] On-screen overlay active - Check bottom-right corner', 'background: #0f0; color: #000; font-weight: bold; padding: 4px;');
  
})();
