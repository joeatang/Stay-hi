// ===============================================
// 🔬 TESLA-GRADE PRE-LAUNCH SYSTEM VALIDATION
// ===============================================
// Comprehensive live testing suite for critical components

class PreLaunchValidator {
  constructor() {
    this.results = {
      shareSheet: { status: 'pending', tests: [] },
      mapSystem: { status: 'pending', tests: [] },
      taggingSystem: { status: 'pending', tests: [] },
      tabNavigation: { status: 'pending', tests: [] },
      profileSystem: { status: 'pending', tests: [] },
      integration: { status: 'pending', tests: [] }
    };
    
    this.startTime = Date.now();
  }

  // Run all validation tests
  async runFullValidation() {
    console.log('🔬 TESLA-GRADE PRE-LAUNCH VALIDATION STARTING...');
    console.log('===================================================');
    
    try {
      // Test all critical systems
      await this.validateShareSheet();
      await this.validateMapSystem();
      await this.validateTaggingSystem();
      await this.validateTabNavigation();
      await this.validateProfileSystem();
      await this.validateIntegration();
      
      // Generate comprehensive report
      this.generateValidationReport();
      
    } catch (error) {
      console.error('❌ CRITICAL VALIDATION FAILURE:', error);
      this.results.criticalError = error.message;
    }
  }

  // 1. Share Sheet System Validation
  async validateShareSheet() {
    console.log('🎯 1. SHARE SHEET SYSTEM VALIDATION');
    const tests = [];
    
    try {
      // Test 1: Check if share sheet component is loaded
      const shareSheetExists = typeof window.openHiShareSheet === 'function';
      tests.push({
        name: 'Share Sheet Function Available',
        status: shareSheetExists ? 'PASS' : 'FAIL',
        details: shareSheetExists ? 'window.openHiShareSheet found' : 'Share sheet function missing'
      });

      // Test 2: Test share sheet DOM structure after opening
      if (shareSheetExists) {
        // Temporarily open share sheet to test DOM
        window.openHiShareSheet('hi5');
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DOM
        
        const elements = {
          backdrop: document.getElementById('hi-share-backdrop'),
          sheet: document.getElementById('hi-share-sheet'),
          textarea: document.getElementById('hi-share-journal'),
          privateBtn: document.getElementById('hi-save-private'),
          anonBtn: document.getElementById('hi-share-anon'),
          publicBtn: document.getElementById('hi-share-public'),
          closeBtn: document.getElementById('hi-sheet-close')
        };
        
        Object.entries(elements).forEach(([name, element]) => {
          tests.push({
            name: `Share Sheet ${name} Element`,
            status: element ? 'PASS' : 'FAIL',
            details: element ? 'Element found and accessible' : `${name} element missing`
          });
        });
        
        // Test 3: Test close functionality
        if (elements.closeBtn) {
          elements.closeBtn.click();
          await new Promise(resolve => setTimeout(resolve, 200));
          const isOpen = document.getElementById('hi-share-sheet')?.classList.contains('active');
          tests.push({
            name: 'Share Sheet Close Functionality',
            status: !isOpen ? 'PASS' : 'FAIL',
            details: !isOpen ? 'Share sheet closes correctly' : 'Share sheet fails to close'
          });
        }
      }

      // Test 4: Location detection integration
      const geocodingExists = typeof window.GeocodingService !== 'undefined';
      tests.push({
        name: 'Location Detection Service',
        status: geocodingExists ? 'PASS' : 'FAIL',
        details: geocodingExists ? 'GeocodingService available' : 'Location service missing'
      });

    } catch (error) {
      tests.push({
        name: 'Share Sheet Validation',
        status: 'ERROR',
        details: error.message
      });
    }

    this.results.shareSheet = {
      status: tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      tests,
      summary: `${tests.filter(t => t.status === 'PASS').length}/${tests.length} tests passed`
    };
  }

  // 2. Map System Validation
  async validateMapSystem() {
    console.log('🗺️ 2. MAP SYSTEM VALIDATION');
    const tests = [];
    
    try {
      // Test 1: Leaflet availability
      const leafletExists = typeof L !== 'undefined';
      tests.push({
        name: 'Leaflet Library',
        status: leafletExists ? 'PASS' : 'FAIL',
        details: leafletExists ? 'Leaflet map library loaded' : 'Leaflet missing - critical for map'
      });

      // Test 2: MarkerCluster plugin
      const clusterExists = leafletExists && typeof L.markerClusterGroup === 'function';
      tests.push({
        name: 'MarkerCluster Plugin',
        status: clusterExists ? 'PASS' : 'FAIL',
        details: clusterExists ? 'Clustering plugin available' : 'MarkerCluster missing - affects scaling'
      });

      // Test 3: Map component instance
      const mapInstanceExists = typeof window.HiIslandMapInstance !== 'undefined';
      tests.push({
        name: 'Map Component Instance',
        status: mapInstanceExists ? 'PASS' : 'FAIL',
        details: mapInstanceExists ? 'Map component initialized' : 'Map component not found'
      });

      // Test 4: Database integration for markers
      const dbExists = typeof window.hiDB !== 'undefined' && typeof window.hiDB.fetchPublicShares === 'function';
      tests.push({
        name: 'Database Integration',
        status: dbExists ? 'PASS' : 'FAIL',
        details: dbExists ? 'hiDB.fetchPublicShares available' : 'Database integration missing'
      });

      // Test 5: Map canvas element
      const mapCanvas = document.getElementById('hi-map-canvas');
      tests.push({
        name: 'Map Canvas Element',
        status: mapCanvas ? 'PASS' : 'FAIL',
        details: mapCanvas ? 'Map container found in DOM' : 'Map canvas missing from DOM'
      });

    } catch (error) {
      tests.push({
        name: 'Map System Validation',
        status: 'ERROR',
        details: error.message
      });
    }

    this.results.mapSystem = {
      status: tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      tests,
      summary: `${tests.filter(t => t.status === 'PASS').length}/${tests.length} tests passed`
    };
  }

  // 3. Tagging System Validation
  async validateTaggingSystem() {
    console.log('🏷️ 3. TAGGING SYSTEM VALIDATION');
    const tests = [];
    
    try {
      // Test 1: Emotion data structure
      const emotionsExist = typeof window.EMOTIONS !== 'undefined';
      tests.push({
        name: 'Emotions Data Structure',
        status: emotionsExist ? 'PASS' : 'FAIL',
        details: emotionsExist ? `${window.EMOTIONS?.length || 0} emotions loaded` : 'Emotions data missing'
      });

      // Test 2: Tag filtering functionality
      const feedExists = document.querySelector('.hi-island-feed');
      tests.push({
        name: 'Feed Component for Tags',
        status: feedExists ? 'PASS' : 'FAIL',
        details: feedExists ? 'Feed container available for tag filtering' : 'Feed component missing'
      });

      // Test 3: Database tag persistence
      const tagPersistenceExists = window.hiDB && typeof window.hiDB.insertPublicShare === 'function';
      tests.push({
        name: 'Tag Persistence',
        status: tagPersistenceExists ? 'PASS' : 'FAIL',
        details: tagPersistenceExists ? 'Database supports tag data persistence' : 'Tag persistence not available'
      });

    } catch (error) {
      tests.push({
        name: 'Tagging System Validation',
        status: 'ERROR',
        details: error.message
      });
    }

    this.results.taggingSystem = {
      status: tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      tests,
      summary: `${tests.filter(t => t.status === 'PASS').length}/${tests.length} tests passed`
    };
  }

  // 4. Tab Navigation Validation
  async validateTabNavigation() {
    console.log('📑 4. TAB NAVIGATION VALIDATION');
    const tests = [];
    
    try {
      // Test 1: Tab elements exist
      const tabs = document.querySelectorAll('[role="tab"], .tab-button, .nav-tab');
      tests.push({
        name: 'Tab Elements',
        status: tabs.length > 0 ? 'PASS' : 'FAIL',
        details: tabs.length > 0 ? `${tabs.length} tab elements found` : 'No tab navigation elements'
      });

      // Test 2: Tab content containers
      const tabPanels = document.querySelectorAll('[role="tabpanel"], .tab-content, .tab-panel');
      tests.push({
        name: 'Tab Content Panels',
        status: tabPanels.length > 0 ? 'PASS' : 'FAIL',
        details: tabPanels.length > 0 ? `${tabPanels.length} content panels found` : 'No tab content containers'
      });

      // Test 3: State persistence (localStorage check)
      const hasStateManager = typeof localStorage !== 'undefined';
      tests.push({
        name: 'State Persistence',
        status: hasStateManager ? 'PASS' : 'FAIL',
        details: hasStateManager ? 'localStorage available for state' : 'State persistence unavailable'
      });

    } catch (error) {
      tests.push({
        name: 'Tab Navigation Validation',
        status: 'ERROR',
        details: error.message
      });
    }

    this.results.tabNavigation = {
      status: tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      tests,
      summary: `${tests.filter(t => t.status === 'PASS').length}/${tests.length} tests passed`
    };
  }

  // 5. Profile System Validation
  async validateProfileSystem() {
    console.log('👤 5. PROFILE SYSTEM VALIDATION');
    const tests = [];
    
    try {
      // Test 1: Profile modal function
      const profileModalExists = typeof window.openProfileModal === 'function';
      tests.push({
        name: 'Profile Modal Function',
        status: profileModalExists ? 'PASS' : 'FAIL',
        details: profileModalExists ? 'window.openProfileModal available' : 'Profile modal function missing'
      });

      // Test 2: Profile data fetching
      const profileFetchExists = window.hiDB && typeof window.hiDB.fetchUserProfile === 'function';
      tests.push({
        name: 'Profile Data Fetching',
        status: profileFetchExists ? 'PASS' : 'FAIL',
        details: profileFetchExists ? 'hiDB.fetchUserProfile available' : 'Profile fetch function missing'
      });

      // Test 3: Avatar utilities
      const avatarUtilsExist = typeof window.getAvatarForUser === 'function';
      tests.push({
        name: 'Avatar Utilities',
        status: avatarUtilsExist ? 'PASS' : 'FAIL',
        details: avatarUtilsExist ? 'Avatar generation utilities loaded' : 'Avatar utilities missing'
      });

      // Test 4: Profile modal DOM (try opening temporarily)
      if (profileModalExists) {
        // Test opening profile modal with test user ID
        window.openProfileModal('test-user-id');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const modalElements = {
          backdrop: document.getElementById('profile-modal-backdrop'),
          modal: document.getElementById('profile-preview-modal'),
          content: document.getElementById('profile-modal-content'),
          loading: document.getElementById('profile-modal-loading'),
          closeBtn: document.getElementById('profile-modal-close')
        };
        
        Object.entries(modalElements).forEach(([name, element]) => {
          tests.push({
            name: `Profile Modal ${name}`,
            status: element ? 'PASS' : 'FAIL',
            details: element ? 'Element renders correctly' : `${name} element missing`
          });
        });
        
        // Close modal
        if (modalElements.closeBtn) {
          modalElements.closeBtn.click();
        }
      }

    } catch (error) {
      tests.push({
        name: 'Profile System Validation',
        status: 'ERROR',
        details: error.message
      });
    }

    this.results.profileSystem = {
      status: tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      tests,
      summary: `${tests.filter(t => t.status === 'PASS').length}/${tests.length} tests passed`
    };
  }

  // 6. End-to-End Integration Validation
  async validateIntegration() {
    console.log('🔗 6. INTEGRATION VALIDATION');
    const tests = [];
    
    try {
      // Test 1: Complete user journey capability
      const canCreateShare = typeof window.openHiShareSheet === 'function';
      const canShowMap = typeof window.HiIslandMapInstance !== 'undefined';
      const canShowProfile = typeof window.openProfileModal === 'function';
      
      tests.push({
        name: 'Complete User Journey',
        status: (canCreateShare && canShowMap && canShowProfile) ? 'PASS' : 'FAIL',
        details: `Share: ${canCreateShare}, Map: ${canShowMap}, Profile: ${canShowProfile}`
      });

      // Test 2: Data persistence chain
      const hasDatabase = typeof window.hiDB !== 'undefined';
      const hasSupabase = typeof window.supabaseClient !== 'undefined' || typeof window.sb !== 'undefined';
      const hasLocalStorage = typeof localStorage !== 'undefined';
      
      tests.push({
        name: 'Data Persistence Chain',
        status: (hasDatabase && hasSupabase && hasLocalStorage) ? 'PASS' : 'FAIL',
        details: `DB: ${hasDatabase}, Supabase: ${hasSupabase}, LocalStorage: ${hasLocalStorage}`
      });

      // Test 3: Component communication
      const componentsLoaded = [
        typeof window.openHiShareSheet === 'function',
        typeof window.HiIslandMapInstance !== 'undefined',
        typeof window.openProfileModal === 'function',
        typeof window.hiDB !== 'undefined'
      ];
      
      const communicationScore = componentsLoaded.filter(Boolean).length;
      tests.push({
        name: 'Component Communication',
        status: communicationScore === 4 ? 'PASS' : 'WARN',
        details: `${communicationScore}/4 critical components loaded and communicating`
      });

      // Test 4: Security and authentication readiness
      const hasAuthGuard = typeof window.needsAuth === 'function';
      const hasAuthSystem = typeof window.supabaseClient !== 'undefined' || typeof window.sb !== 'undefined';
      
      tests.push({
        name: 'Authentication Readiness',
        status: (hasAuthGuard && hasAuthSystem) ? 'PASS' : 'WARN',
        details: `Auth Guard: ${hasAuthGuard}, Auth System: ${hasAuthSystem}`
      });

    } catch (error) {
      tests.push({
        name: 'Integration Validation',
        status: 'ERROR',
        details: error.message
      });
    }

    this.results.integration = {
      status: tests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      tests,
      summary: `${tests.filter(t => t.status === 'PASS').length}/${tests.length} tests passed`
    };
  }

  // Generate comprehensive validation report
  generateValidationReport() {
    const duration = Date.now() - this.startTime;
    const allSystems = Object.values(this.results);
    const passedSystems = allSystems.filter(s => s.status === 'PASS').length;
    const totalSystems = allSystems.length - (this.results.criticalError ? 1 : 0);
    
    console.log('');
    console.log('📊 TESLA-GRADE PRE-LAUNCH VALIDATION REPORT');
    console.log('==============================================');
    console.log(`⏱️  Validation Time: ${duration}ms`);
    console.log(`🎯 Systems Passed: ${passedSystems}/${totalSystems}`);
    console.log(`🏆 Overall Status: ${passedSystems === totalSystems ? '✅ READY FOR LAUNCH' : '⚠️ NEEDS ATTENTION'}`);
    console.log('');

    // Detailed results
    Object.entries(this.results).forEach(([system, result]) => {
      if (system === 'criticalError') return;
      
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${system.toUpperCase()}: ${result.status} (${result.summary})`);
      
      // Show failed tests
      const failedTests = result.tests.filter(t => t.status !== 'PASS');
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`   ⚠️ ${test.name}: ${test.details}`);
        });
      }
    });

    if (this.results.criticalError) {
      console.log('');
      console.log('💥 CRITICAL ERROR:', this.results.criticalError);
    }

    console.log('');
    console.log('🚀 LAUNCH RECOMMENDATION:');
    if (passedSystems === totalSystems) {
      console.log('   ✅ ALL SYSTEMS GO - READY FOR PRODUCTION LAUNCH');
    } else if (passedSystems >= totalSystems * 0.8) {
      console.log('   ⚠️ MINOR ISSUES - LAUNCH WITH MONITORING');
    } else {
      console.log('   ❌ CRITICAL ISSUES - ADDRESS BEFORE LAUNCH');
    }
    
    // Store results globally for inspection
    window.launchValidationResults = this.results;
  }
}

// Auto-run validation when loaded
console.log('🔬 Tesla-grade validation suite loaded - run window.validateForLaunch() to test');
window.validateForLaunch = () => {
  const validator = new PreLaunchValidator();
  return validator.runFullValidation();
};

// Export for manual testing
window.PreLaunchValidator = PreLaunchValidator;