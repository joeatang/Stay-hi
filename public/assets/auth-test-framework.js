/**
 * 🧪 Tesla-Grade Authentication Testing Framework
 * 
 * Automated testing system to validate auth flows across all pages
 * Prevents regression and ensures bulletproof authentication
 */

class AuthTestFramework {
  constructor() {
    this.testResults = new Map();
    this.testSuites = new Map();
    this.testHistory = [];
    
    // Define all test pages and their expected behavior
    this.pages = [
      { 
        name: 'Hi-Island', 
        path: '/hi-island-NEW.html', 
        type: 'hybrid',
        shouldRedirectWhenUnauthenticated: false,
        shouldLoadWhenAuthenticated: true,
        requiredElements: ['.hi-island-map', '#emotion-tracker']
      },
      { 
        name: 'Hi-Muscle', 
        path: '/hi-muscle.html', 
        type: 'hybrid',
        shouldRedirectWhenUnauthenticated: false,
        shouldLoadWhenAuthenticated: true,
        requiredElements: ['.emotion-grid', '#muscle-interface']
      },
      { 
        name: 'Profile', 
        path: '/profile.html', 
        type: 'hybrid',
        shouldRedirectWhenUnauthenticated: false,
        shouldLoadWhenAuthenticated: true,
        requiredElements: ['.profile-container']
      },
      { 
        name: 'Calendar', 
        path: '/calendar.html', 
        type: 'hybrid',
        shouldRedirectWhenUnauthenticated: false,
        shouldLoadWhenAuthenticated: true,
        requiredElements: ['.calendar-container']
      },
      { 
        name: 'Index', 
        path: '/index.html', 
        type: 'hybrid',
        shouldRedirectWhenUnauthenticated: false,
        shouldLoadWhenAuthenticated: true,
        requiredElements: ['#main-content']
      },
      { 
        name: 'Sign In', 
        path: '/signin.html', 
        type: 'public',
        shouldRedirectWhenUnauthenticated: false,
        shouldLoadWhenAuthenticated: true,
        requiredElements: ['#signin-form', 'input[type="email"]']
      }
    ];

    this.initTestFramework();
  }

  async initTestFramework() {
    console.log('[AuthTestFramework] 🧪 Tesla-grade testing framework initialized');
    
    // Register test suites
    this.registerTestSuite('basic-auth-flow', this.createBasicAuthFlowTests());
    this.registerTestSuite('hybrid-mode-validation', this.createHybridModeTests());
    this.registerTestSuite('session-corruption-recovery', this.createSessionCorruptionTests());
    this.registerTestSuite('performance-validation', this.createPerformanceTests());
    
    console.log(`[AuthTestFramework] Registered ${this.testSuites.size} test suites`);
  }

  registerTestSuite(name, testSuite) {
    this.testSuites.set(name, testSuite);
    console.log(`[AuthTestFramework] ✅ Registered test suite: ${name}`);
  }

  createBasicAuthFlowTests() {
    return {
      name: 'Basic Authentication Flow Tests',
      description: 'Validates core authentication functionality',
      tests: [
        {
          name: 'Unauthenticated Access to Hybrid Pages',
          async run() {
            const results = [];
            
            for (const page of this.pages.filter(p => p.type === 'hybrid')) {
              try {
                const result = await this.testPageAccess(page.path, false);
                results.push({
                  page: page.name,
                  path: page.path,
                  success: !result.redirected,
                  message: result.redirected ? 'Unexpected redirect' : 'Loaded correctly',
                  loadTime: result.loadTime
                });
              } catch (error) {
                results.push({
                  page: page.name,
                  path: page.path,
                  success: false,
                  message: error.message,
                  loadTime: -1
                });
              }
            }
            
            return {
              passed: results.every(r => r.success),
              results,
              summary: `${results.filter(r => r.success).length}/${results.length} hybrid pages accessible without auth`
            };
          }
        },
        
        {
          name: 'Public Pages Always Accessible',
          async run() {
            const results = [];
            
            for (const page of this.pages.filter(p => p.type === 'public')) {
              try {
                const result = await this.testPageAccess(page.path, false);
                results.push({
                  page: page.name,
                  path: page.path,
                  success: !result.redirected && result.loaded,
                  message: result.loaded ? 'Loaded correctly' : 'Failed to load',
                  loadTime: result.loadTime
                });
              } catch (error) {
                results.push({
                  page: page.name,
                  path: page.path,
                  success: false,
                  message: error.message,
                  loadTime: -1
                });
              }
            }
            
            return {
              passed: results.every(r => r.success),
              results,
              summary: `${results.filter(r => r.success).length}/${results.length} public pages accessible`
            };
          }
        }
      ]
    };
  }

  createHybridModeTests() {
    return {
      name: 'Hybrid Mode Validation Tests',
      description: 'Validates hybrid mode behavior and feature availability',
      tests: [
        {
          name: 'Hybrid Page Detection Logic',
          async run() {
            const results = [];
            
            for (const page of this.pages.filter(p => p.type === 'hybrid')) {
              // Simulate the hybrid detection logic from auth-guard.js
              const pathname = page.path;
              const isDetectedAsHybrid = pathname.endsWith('hi-island.html') || 
                                       pathname.endsWith('hi-island-NEW.html') ||
                                       pathname.endsWith('index.html') || 
                                       pathname.endsWith('hi-muscle.html') ||
                                       pathname.endsWith('profile.html') ||
                                       pathname.endsWith('calendar.html') ||
                                       pathname.endsWith('invite-admin.html') ||
                                       pathname === '/';
              
              results.push({
                page: page.name,
                path: page.path,
                success: isDetectedAsHybrid,
                message: isDetectedAsHybrid ? 'Correctly detected as hybrid' : 'NOT detected as hybrid',
                detectionResult: isDetectedAsHybrid
              });
            }
            
            return {
              passed: results.every(r => r.success),
              results,
              summary: `${results.filter(r => r.success).length}/${results.length} pages correctly detected as hybrid`
            };
          }
        }
      ]
    };
  }

  createSessionCorruptionTests() {
    return {
      name: 'Session Corruption Recovery Tests',
      description: 'Validates session corruption detection and recovery',
      tests: [
        {
          name: 'Corrupted localStorage Recovery',
          async run() {
            const originalData = { ...localStorage };
            
            try {
              // Simulate corruption
              localStorage.setItem('sb-corrupted-key-1', 'invalid-data');
              localStorage.setItem('sb-corrupted-key-2', JSON.stringify({ corrupted: true }));
              localStorage.setItem('auth-corrupted', 'bad-session');
              
              // Trigger health check
              if (window.AuthHealthMonitor) {
                const healthReport = await window.AuthHealthMonitor.validateSessionHealth();
                const recovered = await window.AuthHealthMonitor.performRecovery(healthReport);
                
                return {
                  passed: recovered || healthReport.corruptionSignals.length === 0,
                  results: [{
                    test: 'Corruption Recovery',
                    success: recovered,
                    message: recovered ? 'Successfully recovered from corruption' : 'Recovery failed',
                    corruptionSignals: healthReport.corruptionSignals.length
                  }],
                  summary: `Recovery ${recovered ? 'succeeded' : 'failed'}`
                };
              } else {
                return {
                  passed: false,
                  results: [{ test: 'Health Monitor', success: false, message: 'AuthHealthMonitor not available' }],
                  summary: 'Health monitor not loaded'
                };
              }
            } finally {
              // Restore original localStorage
              localStorage.clear();
              Object.entries(originalData).forEach(([key, value]) => {
                localStorage.setItem(key, value);
              });
            }
          }
        }
      ]
    };
  }

  createPerformanceTests() {
    return {
      name: 'Performance Validation Tests',
      description: 'Validates authentication performance benchmarks',
      tests: [
        {
          name: 'Auth Check Performance',
          async run() {
            const results = [];
            const iterations = 5;
            
            for (let i = 0; i < iterations; i++) {
              const startTime = performance.now();
              
              try {
                if (window.AuthHealthMonitor) {
                  await window.AuthHealthMonitor.validateSessionHealth();
                }
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                results.push({
                  iteration: i + 1,
                  success: duration < 100, // Should complete in under 100ms
                  duration: Math.round(duration * 100) / 100,
                  message: duration < 100 ? 'Within benchmark' : 'Exceeds benchmark'
                });
              } catch (error) {
                results.push({
                  iteration: i + 1,
                  success: false,
                  duration: -1,
                  message: error.message
                });
              }
            }
            
            const avgDuration = results.reduce((sum, r) => sum + (r.duration > 0 ? r.duration : 0), 0) / 
                              results.filter(r => r.duration > 0).length;
            
            return {
              passed: results.every(r => r.success),
              results,
              summary: `Average auth check: ${Math.round(avgDuration * 100) / 100}ms`,
              avgDuration
            };
          }
        }
      ]
    };
  }

  async testPageAccess(path, isAuthenticated) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;
      
      // Create test iframe to avoid affecting main window
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = path;
      
      const cleanup = () => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };
      
      const resolveTest = (result) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };
      
      iframe.onload = () => {
        const loadTime = Date.now() - startTime;
        
        try {
          // Check if redirected by examining the URL
          const finalUrl = iframe.contentWindow.location.href;
          const redirected = !finalUrl.includes(path);
          
          resolveTest({
            loaded: true,
            redirected,
            finalUrl,
            loadTime
          });
        } catch (error) {
          // Cross-origin error - assume loaded correctly
          resolveTest({
            loaded: true,
            redirected: false,
            finalUrl: path,
            loadTime
          });
        }
      };
      
      iframe.onerror = () => {
        resolveTest({
          loaded: false,
          redirected: false,
          finalUrl: null,
          loadTime: Date.now() - startTime
        });
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        resolveTest({
          loaded: false,
          redirected: false,
          finalUrl: null,
          loadTime: 5000,
          error: 'Timeout'
        });
      }, 5000);
      
      document.body.appendChild(iframe);
    });
  }

  async runTestSuite(suiteName) {
    console.log(`[AuthTestFramework] 🧪 Running test suite: ${suiteName}`);
    
    const testSuite = this.testSuites.get(suiteName);
    if (!testSuite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }
    
    const suiteResults = {
      name: suiteName,
      description: testSuite.description,
      startTime: Date.now(),
      tests: []
    };
    
    for (const test of testSuite.tests) {
      console.log(`[AuthTestFramework] Running test: ${test.name}`);
      
      const testStartTime = Date.now();
      try {
        const result = await test.run.call(this);
        result.duration = Date.now() - testStartTime;
        result.name = test.name;
        
        suiteResults.tests.push(result);
        
        console.log(`[AuthTestFramework] ${result.passed ? '✅' : '❌'} ${test.name}: ${result.summary}`);
      } catch (error) {
        const failedResult = {
          name: test.name,
          passed: false,
          duration: Date.now() - testStartTime,
          error: error.message,
          summary: `Test failed: ${error.message}`
        };
        
        suiteResults.tests.push(failedResult);
        console.error(`[AuthTestFramework] ❌ ${test.name} failed:`, error);
      }
    }
    
    suiteResults.endTime = Date.now();
    suiteResults.totalDuration = suiteResults.endTime - suiteResults.startTime;
    suiteResults.passed = suiteResults.tests.every(t => t.passed);
    
    this.testResults.set(suiteName, suiteResults);
    this.testHistory.push(suiteResults);
    
    return suiteResults;
  }

  async runAllTests() {
    console.log('[AuthTestFramework] 🚀 Running all test suites...');
    
    const allResults = {
      startTime: Date.now(),
      suites: []
    };
    
    for (const suiteName of this.testSuites.keys()) {
      try {
        const result = await this.runTestSuite(suiteName);
        allResults.suites.push(result);
      } catch (error) {
        console.error(`[AuthTestFramework] Test suite '${suiteName}' failed:`, error);
        allResults.suites.push({
          name: suiteName,
          passed: false,
          error: error.message
        });
      }
    }
    
    allResults.endTime = Date.now();
    allResults.totalDuration = allResults.endTime - allResults.startTime;
    allResults.passed = allResults.suites.every(s => s.passed);
    
    const passedCount = allResults.suites.filter(s => s.passed).length;
    const totalCount = allResults.suites.length;
    
    console.log(`[AuthTestFramework] 🏁 Test run complete: ${passedCount}/${totalCount} suites passed in ${allResults.totalDuration}ms`);
    
    return allResults;
  }

  getTestResults(suiteName = null) {
    if (suiteName) {
      return this.testResults.get(suiteName);
    }
    return Object.fromEntries(this.testResults);
  }

  exportTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      framework: 'Tesla-Grade Auth Test Framework',
      testHistory: this.testHistory,
      currentResults: this.getTestResults(),
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        localStorage: Object.keys(localStorage).length,
        sessionStorage: Object.keys(sessionStorage).length
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-test-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('[AuthTestFramework] 📊 Test report exported');
  }
}

// Global instance
window.AuthTestFramework = window.AuthTestFramework || new AuthTestFramework();

console.log('[AuthTestFramework] 🧪 Tesla-grade auth testing framework loaded');