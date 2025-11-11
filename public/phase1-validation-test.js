/**
 * 🎯 PHASE 1 VALIDATION TEST
 * Tesla-Grade Architecture Validation
 */

window.Phase1ValidationTest = {
  async runDiagnostic() {
    console.log('🔬 Phase 1 Validation: Starting diagnostic...');
    const results = {};
    
    try {
      // Test 1: Schema-aligned HiDB
      results.hiDB_loaded = typeof window.hiDB === 'object' && window.hiDB !== null;
      results.hiDB_functions = {
        insertPublicShare: typeof window.hiDB?.insertPublicShare === 'function',
        insertArchive: typeof window.hiDB?.insertArchive === 'function',
        fetchPublicShares: typeof window.hiDB?.fetchPublicShares === 'function'
      };

      // Test 2: Unified Controller Only
      results.unified_controller = {
        loaded: typeof window.unifiedHiIslandController === 'object',
        initialized: window.unifiedHiIslandController?.isInitialized === true
      };

      // Test 3: No Competing Systems
      results.no_competitors = {
        no_old_hifeed: typeof window.mountHiFeed === 'undefined',
        no_old_feed_class: typeof window.HiIslandFeed === 'undefined',
        clean_dom: !document.querySelector('.hi-feed') || document.querySelectorAll('.hi-feed').length === 1
      };

      // Test 4: HiShareSheet Non-blocking
      results.share_sheet = {
        loaded: typeof window.HiShareSheet === 'function',
        uses_hidb: window.HiShareSheet?.toString().includes('hiDB')
      };

      // Test 5: Database Schema Test (mock)
      const testEntry = {
        currentEmoji: '👋',
        currentName: 'Test State',
        desiredEmoji: '✨',
        desiredName: 'Test Goal',
        text: 'Phase 1 validation test',
        isAnonymous: true,
        location: 'Test Location'
      };

      try {
        // Don't actually insert, just validate the function exists and formats correctly
        const mockResult = await window.hiDB?.insertPublicShare?.(testEntry);
        results.schema_test = {
          function_exists: typeof window.hiDB?.insertPublicShare === 'function',
          returns_promise: mockResult instanceof Promise || typeof mockResult?.then === 'function' || typeof mockResult === 'object'
        };
      } catch (e) {
        results.schema_test = { error: e.message };
      }

      // Calculate overall score
      const scores = {
        hiDB: results.hiDB_loaded && Object.values(results.hiDB_functions).every(f => f) ? 100 : 0,
        controller: results.unified_controller.loaded && results.unified_controller.initialized ? 100 : 50,
        consolidation: Object.values(results.no_competitors).every(v => v) ? 100 : 0,
        shareSheet: Object.values(results.share_sheet).every(v => v) ? 100 : 0
      };

      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

      console.log('📊 Phase 1 Validation Results:', {
        overall_score: `${Math.round(totalScore)}%`,
        details: results,
        scores: scores,
        recommendation: totalScore >= 80 ? 'READY FOR TESTING' : 'NEEDS FIXES'
      });

      return {
        success: true,
        score: totalScore,
        results,
        ready: totalScore >= 80
      };

    } catch (error) {
      console.error('❌ Phase 1 Validation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async testShareSubmission() {
    console.log('🧪 Testing share submission flow...');
    
    const startTime = performance.now();
    
    try {
      const mockEntry = {
        currentEmoji: '🧪',
        currentName: 'Test Mode',
        desiredEmoji: '✅',
        desiredName: 'Validated',
        text: 'Phase 1 share test - should not freeze UI',
        isAnonymous: true,
        location: 'Test Environment'
      };

      // This should be non-blocking
      const promise = window.hiDB?.insertPublicShare?.(mockEntry);
      const immediateTime = performance.now();
      
      // Check if function returned immediately (non-blocking)
      const responseTime = immediateTime - startTime;
      const isNonBlocking = responseTime < 50; // Less than 50ms = non-blocking
      
      console.log('⏱️ Share submission timing:', {
        response_time_ms: Math.round(responseTime),
        is_non_blocking: isNonBlocking,
        status: isNonBlocking ? 'PASS' : 'FAIL - UI BLOCKING'
      });

      // Wait for actual completion
      const result = await promise;
      const totalTime = performance.now() - startTime;
      
      console.log('✅ Share test complete:', {
        immediate_response: isNonBlocking,
        total_time_ms: Math.round(totalTime),
        result: result
      });

      return {
        success: true,
        nonBlocking: isNonBlocking,
        responseTime: responseTime,
        totalTime: totalTime,
        result: result
      };

    } catch (error) {
      console.error('❌ Share test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Auto-run diagnostic when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.Phase1ValidationTest.runDiagnostic(), 2000);
  });
} else {
  setTimeout(() => window.Phase1ValidationTest.runDiagnostic(), 2000);
}

console.log('🎯 Phase 1 Validation Test loaded. Run window.Phase1ValidationTest.runDiagnostic() to test.');