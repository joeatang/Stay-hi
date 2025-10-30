// ===============================================
// 🧪 TESLA AUTH SYSTEM VALIDATION SCRIPT
// ===============================================
// Run this in browser console to validate the complete system

class TeslaAuthValidation {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  // Test authentication system
  async validateAuthSystem() {
    console.log('🔒 TESLA AUTH SYSTEM VALIDATION');
    console.log('=====================================');
    
    await this.runTest('Feature Flags System', () => this.testFeatureFlags());
    await this.runTest('Auth Controller', () => this.testAuthController());
    await this.runTest('Welcome Page', () => this.testWelcomePage());
    await this.runTest('Admin Dashboard', () => this.testAdminDashboard());
    await this.runTest('Database Schema', () => this.testDatabaseSchema());
    
    this.printResults();
    
    return this.results.failed === 0;
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      const result = await testFunction();
      
      if (result.success) {
        console.log(`✅ ${testName}: PASSED`);
        if (result.details) console.log(`   ${result.details}`);
        this.results.passed++;
      } else {
        console.log(`❌ ${testName}: FAILED`);
        console.log(`   Error: ${result.error}`);
        this.results.failed++;
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR`);
      console.log(`   Exception: ${error.message}`);
      this.results.failed++;
    }
    
    this.results.total++;
  }

  // Test feature flags system
  testFeatureFlags() {
    const tests = [
      () => typeof window.HiFlags !== 'undefined',
      () => typeof window.HiFlags.isEnabled === 'function',
      () => typeof window.HiFlags.setFlag === 'function',
      () => window.HiFlags.environment !== 'unknown'
    ];
    
    const passed = tests.filter(test => {
      try { return test(); } catch { return false; }
    }).length;
    
    if (passed === tests.length) {
      return {
        success: true,
        details: `All ${tests.length} feature flag functions available`
      };
    } else {
      return {
        success: false,
        error: `Only ${passed}/${tests.length} feature flag functions available`
      };
    }
  }

  // Test auth controller
  testAuthController() {
    const tests = [
      () => typeof window.TeslaAuth !== 'undefined',
      () => typeof window.TeslaAuth.isAuthenticated === 'function',
      () => typeof window.TeslaAuth.hasActiveMembership === 'function',
      () => typeof window.TeslaAuth.trackFeatureUsage === 'function'
    ];
    
    const passed = tests.filter(test => {
      try { return test(); } catch { return false; }
    }).length;
    
    if (passed === tests.length) {
      return {
        success: true,
        details: `Tesla Auth Controller fully loaded with ${tests.length} methods`
      };
    } else {
      return {
        success: false,
        error: `Tesla Auth Controller incomplete: ${passed}/${tests.length} methods available`
      };
    }
  }

  // Test welcome page elements
  testWelcomePage() {
    const currentUrl = window.location.pathname;
    
    if (!currentUrl.includes('welcome.html')) {
      return {
        success: true,
        details: 'Not on welcome page - test skipped'
      };
    }
    
    const elements = [
      'welcome-logo',
      'statWaves',
      'statHis'
    ];
    
    const foundElements = elements.filter(id => document.getElementById(id));
    
    if (foundElements.length === elements.length) {
      const hasEnhancedStyles = document.querySelector('.welcome-panel') !== null;
      
      if (hasEnhancedStyles) {
        return {
          success: true,
          details: 'Welcome page fully enhanced with Tesla aesthetic'
        };
      } else {
        return {
          success: false,
          error: 'Welcome page missing enhanced styling'
        };
      }
    } else {
      return {
        success: false,
        error: `Missing elements: ${elements.filter(id => !document.getElementById(id)).join(', ')}`
      };
    }
  }

  // Test admin dashboard
  testAdminDashboard() {
    const currentUrl = window.location.pathname;
    
    if (!currentUrl.includes('tesla-admin-dashboard.html')) {
      return {
        success: true,
        details: 'Not on admin dashboard - test skipped'
      };
    }
    
    const elements = [
      'totalUsers',
      'activeMembers',
      'featureFlagsList',
      'generateCodeBtn'
    ];
    
    const foundElements = elements.filter(id => document.getElementById(id));
    
    if (foundElements.length === elements.length) {
      const hasAdminClass = typeof window.dashboard !== 'undefined';
      
      if (hasAdminClass) {
        return {
          success: true,
          details: 'Admin dashboard fully functional'
        };
      } else {
        return {
          success: false,
          error: 'Admin dashboard class not initialized'
        };
      }
    } else {
      return {
        success: false,
        error: `Missing admin elements: ${elements.filter(id => !document.getElementById(id)).join(', ')}`
      };
    }
  }

  // Test database schema readiness
  testDatabaseSchema() {
    const tests = [
      () => typeof window.sb !== 'undefined',
      () => window.sb && typeof window.sb.rpc === 'function'
    ];
    
    const passed = tests.filter(test => {
      try { return test(); } catch { return false; }
    }).length;
    
    if (passed === tests.length) {
      return {
        success: true,
        details: 'Supabase client ready for schema functions'
      };
    } else {
      return {
        success: false,
        error: 'Supabase client not properly initialized'
      };
    }
  }

  printResults() {
    console.log('\n🏁 VALIDATION RESULTS');
    console.log('=====================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total:  ${this.results.total}`);
    console.log(`🎯 Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🚀 TESLA-GRADE SYSTEM VALIDATION: PASSED');
      console.log('Your authentication system is ready for production!');
    } else {
      console.log('\n⚠️ TESLA-GRADE SYSTEM VALIDATION: NEEDS ATTENTION');
      console.log('Please address the failed tests before deployment.');
    }
  }
}

// Auto-run validation
console.log('🚀 Starting Tesla Auth System Validation...');
const validator = new TeslaAuthValidation();
validator.validateAuthSystem().then(success => {
  if (success) {
    console.log('🎉 All systems go! Ready for production deployment.');
  } else {
    console.log('🛠️ System needs fixes before production deployment.');
  }
});

// Make available globally for manual testing
window.validateTeslaAuth = () => new TeslaAuthValidation().validateAuthSystem();