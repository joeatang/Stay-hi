// 🧪 TESLA-GRADE DATA ISOLATION EVIDENCE TEST
// This script provides concrete evidence that data isolation works

(function() {
  'use strict';
  
  console.log('🧪 Starting Tesla-Grade Data Isolation Evidence Test...');
  
  // Function to simulate contaminated data injection
  function simulateDataContamination() {
    console.log('💾 Injecting simulated contaminated data...');
    
    const contaminatedData = {
      display_name: 'joeatang Test User',
      username: 'demo_user', 
      id: 'emergency-demo-user',
      email: 'joeatang7@gmail.com'
    };
    
    // Inject contaminated data into various storage keys
    const keysToContaminate = [
      'stayhi_profile',
      'user_profile', 
      'profile',
      'currentUser',
      'demo-profile'
    ];
    
    keysToContaminate.forEach(key => {
      localStorage.setItem(key, JSON.stringify(contaminatedData));
      console.log(`💉 Contaminated ${key}:`, contaminatedData);
    });
    
    return keysToContaminate;
  }
  
  // Function to check if data is cleaned
  function verifyDataCleaning(contaminatedKeys) {
    console.log('🔍 Verifying data cleaning...');
    
    const results = {
      cleaned: [],
      stillContaminated: [],
      totalKeys: contaminatedKeys.length
    };
    
    contaminatedKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.display_name === 'joeatang Test User' || 
              parsed.username === 'demo_user' ||
              parsed.id === 'emergency-demo-user' ||
              parsed.email === 'joeatang7@gmail.com') {
            results.stillContaminated.push(key);
            console.log(`❌ ${key} still contaminated:`, parsed);
          } else {
            results.cleaned.push(key);
            console.log(`✅ ${key} has different data (safe):`, parsed);
          }
        } catch (e) {
          results.cleaned.push(key);
          console.log(`✅ ${key} has invalid data (cleaned)`);
        }
      } else {
        results.cleaned.push(key);
        console.log(`✅ ${key} completely removed`);
      }
    });
    
    return results;
  }
  
  // Generate evidence report
  function generateEvidenceReport(beforeResults, afterResults) {
    const report = {
      timestamp: new Date().toISOString(),
      testType: 'Data Isolation Evidence',
      beforeCleaning: {
        totalContaminatedKeys: beforeResults.totalKeys,
        contaminatedKeys: beforeResults.stillContaminated.length + beforeResults.cleaned.length
      },
      afterCleaning: {
        cleanedKeys: afterResults.cleaned.length,
        stillContaminatedKeys: afterResults.stillContaminated.length,
        cleaningEffectiveness: `${Math.round((afterResults.cleaned.length / afterResults.totalKeys) * 100)}%`
      },
      verdict: afterResults.stillContaminated.length === 0 ? 'PASSED' : 'FAILED',
      evidence: {
        cleanedKeys: afterResults.cleaned,
        failedKeys: afterResults.stillContaminated
      }
    };
    
    console.log('📊 DATA ISOLATION EVIDENCE REPORT:');
    console.log('=====================================');
    console.log(`🕐 Test Time: ${report.timestamp}`);
    console.log(`🎯 Contaminated Keys: ${report.beforeCleaning.contaminatedKeys}`);
    console.log(`🧹 Cleaned Keys: ${report.afterCleaning.cleanedKeys}`);
    console.log(`💯 Effectiveness: ${report.afterCleaning.cleaningEffectiveness}`);
    console.log(`🏆 Verdict: ${report.verdict}`);
    
    if (report.verdict === 'PASSED') {
      console.log('✅ DATA ISOLATION SYSTEM WORKING CORRECTLY');
    } else {
      console.log('❌ DATA ISOLATION SYSTEM FAILED');
      console.log('Failed keys:', report.evidence.failedKeys);
    }
    
    return report;
  }
  
  // Run the complete evidence test
  function runEvidenceTest() {
    console.log('🚀 Running Complete Data Isolation Evidence Test...');
    
    // Step 1: Simulate contamination
    const contaminatedKeys = simulateDataContamination();
    
    // Step 2: Check contamination exists
    const beforeResults = verifyDataCleaning(contaminatedKeys);
    
    // Step 3: Trigger the Tesla data isolation system
    if (window.TeslaDataIsolation) {
      console.log('🛡️ Triggering Tesla Data Isolation cleanup...');
      window.TeslaDataIsolation.clearContaminatedData();
    } else {
      console.log('⚠️ Tesla Data Isolation system not found - checking if cleanup happened anyway...');
    }
    
    // Step 4: Wait and verify cleaning
    setTimeout(() => {
      const afterResults = verifyDataCleaning(contaminatedKeys);
      const report = generateEvidenceReport(beforeResults, afterResults);
      
      // Store evidence for external verification
      window.DataIsolationEvidence = report;
      
      return report;
    }, 1000);
  }
  
  // Auto-run test when loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEvidenceTest);
  } else {
    runEvidenceTest();
  }
  
  // Expose test function globally
  window.testDataIsolation = runEvidenceTest;
  
})();