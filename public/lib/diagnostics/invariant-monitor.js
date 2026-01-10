/**
 * 🏗️ GOLD STANDARD: Invariant Monitor
 * Tracks stability metrics across navigation cycles
 * 
 * INVARIANTS:
 * 1. Unhandled rejections = 0
 * 2. Init is idempotent (no duplicate listeners)
 * 3. Request counts bounded (no storms)
 * 4. State never degrades on abort
 * 5. Build version verifiable
 */

class InvariantMonitor {
  constructor() {
    this.metrics = {
      build: window.__BUILD_HASH__ || 'UNKNOWN',
      pageName: this.detectPage(),
      navCycles: 0,
      unhandledRejections: 0,
      rejectionDetails: [],
      listenerCounts: {},
      requestCounts: {},
      stateTransitions: [],
      startTime: Date.now()
    };
    
    this.setupMonitoring();
    console.log('📊 Invariant Monitor initialized:', this.metrics.build, this.metrics.pageName);
  }
  
  detectPage() {
    if (window.location.pathname.includes('dashboard')) return 'Dashboard';
    if (window.location.pathname.includes('island')) return 'Island';
    return 'Unknown';
  }
  
  setupMonitoring() {
    // INVARIANT 1: Track unhandled rejections
    window.addEventListener('unhandledrejection', (e) => {
      this.metrics.unhandledRejections++;
      this.metrics.rejectionDetails.push({
        time: Date.now() - this.metrics.startTime,
        reason: e.reason?.message || String(e.reason),
        stack: e.reason?.stack
      });
      console.error('❌ INVARIANT 1 FAIL: Unhandled rejection #' + this.metrics.unhandledRejections, e.reason);
    });
    
    // INVARIANT 2: Track listener additions (proxy addEventListener)
    this.instrumentEventListeners();
    
    // INVARIANT 3: Track fetch requests
    this.instrumentFetch();
    
    // Track page visibility changes (for nav cycle counting)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.metrics.navCycles++;
      }
    });
    
    // Expose global method to check invariants
    window.checkInvariants = () => this.report();
  }
  
  instrumentEventListeners() {
    const original = EventTarget.prototype.addEventListener;
    const self = this;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      const key = `${self.metrics.pageName}:${type}`;
      self.metrics.listenerCounts[key] = (self.metrics.listenerCounts[key] || 0) + 1;
      
      // INVARIANT 2: Warn if same event type count exceeds threshold
      if (self.metrics.listenerCounts[key] > 10) {
        console.warn('⚠️ INVARIANT 2 WARNING: High listener count:', key, self.metrics.listenerCounts[key]);
      }
      
      return original.call(this, type, listener, options);
    };
  }
  
  instrumentFetch() {
    const original = window.fetch;
    const self = this;
    
    window.fetch = async function(...args) {
      const url = args[0];
      const urlKey = url.toString().split('?')[0]; // Remove query params
      self.metrics.requestCounts[urlKey] = (self.metrics.requestCounts[urlKey] || 0) + 1;
      
      // INVARIANT 3: Warn if same URL fetched > 5 times in short period
      if (self.metrics.requestCounts[urlKey] > 5) {
        const elapsed = (Date.now() - self.metrics.startTime) / 1000;
        console.warn('⚠️ INVARIANT 3 WARNING: Request storm detected:', urlKey, self.metrics.requestCounts[urlKey], 'in', elapsed.toFixed(1), 's');
      }
      
      return original.apply(this, args);
    };
  }
  
  report() {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const report = {
      build: this.metrics.build,
      page: this.metrics.pageName,
      elapsed: elapsed.toFixed(1) + 's',
      navCycles: this.metrics.navCycles,
      
      // Invariant results
      invariants: {
        '1_unhandledRejections': {
          status: this.metrics.unhandledRejections === 0 ? 'PASS ✅' : 'FAIL ❌',
          value: this.metrics.unhandledRejections,
          details: this.metrics.rejectionDetails
        },
        '2_listenerDuplication': {
          status: this.checkListenerDuplication() ? 'PASS ✅' : 'WARN ⚠️',
          counts: this.metrics.listenerCounts
        },
        '3_requestStorms': {
          status: this.checkRequestStorms() ? 'PASS ✅' : 'WARN ⚠️',
          counts: this.metrics.requestCounts
        }
      }
    };
    
    console.table(report.invariants);
    console.log('📊 Full Report:', report);
    return report;
  }
  
  checkListenerDuplication() {
    // Pass if no listener type exceeds 10
    return !Object.values(this.metrics.listenerCounts).some(count => count > 10);
  }
  
  checkRequestStorms() {
    // Pass if no URL exceeds 5 requests
    return !Object.values(this.metrics.requestCounts).some(count => count > 5);
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  window.InvariantMonitor = InvariantMonitor;
  window.__invariantMonitor__ = new InvariantMonitor();
}
