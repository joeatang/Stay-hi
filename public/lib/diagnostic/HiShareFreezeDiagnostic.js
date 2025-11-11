/**
 * 🚨 TESLA-GRADE FREEZE DIAGNOSTIC TOOL
 * Comprehensive performance monitoring for share submission freeze detection
 */

class HiShareFreezeDiagnostic {
  constructor() {
    this.freezeEvents = [];
    this.performanceMarks = [];
    this.isMonitoring = false;
    this.freezeThreshold = 100; // ms
    this.lastInteractionTime = Date.now();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    console.log('🔍 Starting Hi-Share freeze diagnostic monitoring...');
    
    // Monitor main thread blocking
    this.setupMainThreadMonitoring();
    
    // Monitor specific share operations  
    this.setupShareOperationMonitoring();
    
    // Monitor DOM mutations that might cause reflow
    this.setupDOMMonitoring();
    
    // Monitor network operations
    this.setupNetworkMonitoring();
  }

  setupMainThreadMonitoring() {
    // Use performance observer to detect long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > this.freezeThreshold) {
            this.logFreezeEvent('main-thread-block', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });
      
      try {
        observer.observe({entryTypes: ['longtask']});
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }
    
    // Fallback: Manual main thread monitoring
    setInterval(() => {
      const start = performance.now();
      setTimeout(() => {
        const delay = performance.now() - start;
        if (delay > this.freezeThreshold + 20) { // Account for timer precision
          this.logFreezeEvent('timer-delay', {
            expectedDelay: 0,
            actualDelay: delay,
            blocked: delay - 0
          });
        }
      }, 0);
    }, 1000);
  }

  setupShareOperationMonitoring() {
    // Intercept HiShareSheet operations
    if (window.HiShareSheet) {
      this.interceptMethod(window.HiShareSheet.prototype, 'persist', 'share-persist');
      this.interceptMethod(window.HiShareSheet.prototype, 'close', 'share-close');
      this.interceptMethod(window.HiShareSheet.prototype, 'handleShareAnonymous', 'share-anonymous');
    }
    
    // Intercept HiDB operations
    if (window.hiDB) {
      this.interceptAsyncMethod(window.hiDB, 'insertPublicShare', 'db-insert-public');
      this.interceptAsyncMethod(window.hiDB, 'insertArchive', 'db-insert-archive');
    }
    
    // Intercept tracking operations
    if (window.trackShareSubmission) {
      this.interceptAsyncFunction('trackShareSubmission', 'share-tracking');
    }
  }

  setupDOMMonitoring() {
    // Monitor DOM mutations that could cause layout thrashing
    const observer = new MutationObserver((mutations) => {
      const start = performance.now();
      
      let significantChanges = 0;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 5) {
          significantChanges++;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          significantChanges++;
        }
      });
      
      const processingTime = performance.now() - start;
      
      if (significantChanges > 10 || processingTime > 50) {
        this.logFreezeEvent('dom-mutations', {
          mutations: mutations.length,
          significantChanges,
          processingTime,
          target: mutations[0]?.target?.tagName
        });
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'class']
    });
  }

  setupNetworkMonitoring() {
    // Monitor fetch operations
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        if (duration > 1000) { // Slow network operations
          this.logFreezeEvent('slow-network', {
            url: typeof url === 'string' ? url : url.url,
            duration,
            status: response.status
          });
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.logFreezeEvent('network-error', {
          url: typeof url === 'string' ? url : url.url,
          duration,
          error: error.message
        });
        throw error;
      }
    };
  }

  interceptMethod(obj, methodName, operationName) {
    const original = obj[methodName];
    if (!original) return;
    
    obj[methodName] = function(...args) {
      const start = performance.now();
      
      try {
        const result = original.apply(this, args);
        const duration = performance.now() - start;
        
        if (duration > 50) {
          window.hiShareFreezeDiagnostic.logFreezeEvent('sync-method', {
            operation: operationName,
            duration,
            args: args.length
          });
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        window.hiShareFreezeDiagnostic.logFreezeEvent('method-error', {
          operation: operationName,
          duration,
          error: error.message
        });
        throw error;
      }
    };
  }

  interceptAsyncMethod(obj, methodName, operationName) {
    const original = obj[methodName];
    if (!original) return;
    
    obj[methodName] = async function(...args) {
      const start = performance.now();
      
      try {
        const result = await original.apply(this, args);
        const duration = performance.now() - start;
        
        if (duration > 100) {
          window.hiShareFreezeDiagnostic.logFreezeEvent('async-method', {
            operation: operationName,
            duration,
            args: args.length
          });
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        window.hiShareFreezeDiagnostic.logFreezeEvent('async-error', {
          operation: operationName,
          duration,
          error: error.message
        });
        throw error;
      }
    };
  }

  logFreezeEvent(type, data) {
    const event = {
      timestamp: Date.now(),
      type,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.freezeEvents.push(event);
    
    // Log significant freezes immediately
    if (data.duration > 200 || type === 'main-thread-block') {
      console.error('🚨 FREEZE DETECTED:', type, data);
    } else {
      console.warn('⚠️ Performance issue:', type, data);
    }
    
    // Keep only last 100 events
    if (this.freezeEvents.length > 100) {
      this.freezeEvents = this.freezeEvents.slice(-100);
    }
  }

  generateReport() {
    console.log('📊 Hi-Share Freeze Diagnostic Report');
    console.log('=====================================');
    
    const recent = this.freezeEvents.filter(e => Date.now() - e.timestamp < 60000);
    
    const byType = recent.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Event types (last 60s):', byType);
    
    const significantFreezes = recent.filter(e => 
      e.data.duration > 200 || e.type === 'main-thread-block'
    );
    
    if (significantFreezes.length > 0) {
      console.log('\n🚨 SIGNIFICANT FREEZES:');
      significantFreezes.forEach(freeze => {
        console.log(`  ${freeze.type}: ${freeze.data.duration}ms`, freeze.data);
      });
    }
    
    return {
      totalEvents: recent.length,
      eventsByType: byType,
      significantFreezes,
      recommendations: this.getRecommendations(byType, significantFreezes)
    };
  }

  getRecommendations(eventsByType, significantFreezes) {
    const recommendations = [];
    
    if (eventsByType['main-thread-block'] > 0) {
      recommendations.push('Main thread is being blocked - check for synchronous operations');
    }
    
    if (eventsByType['slow-network'] > 0) {
      recommendations.push('Slow network operations detected - add proper loading states');
    }
    
    if (eventsByType['dom-mutations'] > 0) {
      recommendations.push('Excessive DOM mutations - batch DOM updates');
    }
    
    if (eventsByType['sync-method'] > 0) {
      recommendations.push('Slow synchronous methods - consider making them async');
    }
    
    return recommendations;
  }
}

// Initialize diagnostic tool
window.hiShareFreezeDiagnostic = new HiShareFreezeDiagnostic();

// Auto-start monitoring
document.addEventListener('DOMContentLoaded', () => {
  window.hiShareFreezeDiagnostic.startMonitoring();
  
  // Add global function for manual reporting
  window.getFreezeReport = () => window.hiShareFreezeDiagnostic.generateReport();
  
  console.log('🔍 Hi-Share Freeze Diagnostic initialized');
  console.log('💡 Use getFreezeReport() to get performance analysis');
});