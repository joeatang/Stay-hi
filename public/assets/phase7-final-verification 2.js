/**
 * Phase 7 Final Verification System
 * Complete testing suite for HiFeed rollout readiness
 */

console.log('🎯 Phase 7 Final Verification Starting...');

const verificationStart = performance.now();

// Results tracking
const results = {
    tests: {
        flagSystems: { passed: false, message: '', time: 0 },
        moduleLoading: { passed: false, message: '', time: 0 },
        componentInit: { passed: false, message: '', time: 0 },
        feedData: { passed: false, message: '', time: 0 },
        performance: { passed: false, message: '', time: 0 }
    },
    overallStatus: 'TESTING',
    readyForRollout: false,
    totalTime: 0
};

// Individual test functions
async function testFlagSystems() {
    const testStart = performance.now();
    console.log('📋 Testing flag systems...');
    
    try {
        // Check both flag systems
        const featureFlags = window.hiFeatureFlags?.hifeed_enabled;
        
        const { HiFlags } = await import('/lib/flags/HiFlags.js');
        const hiFlagsResult = HiFlags?.isEnabled('hifeed_enabled');
        
        if (featureFlags === true && hiFlagsResult === true) {
            results.tests.flagSystems = {
                passed: true,
                message: 'Both flag systems enabled correctly',
                time: performance.now() - testStart
            };
            console.log('✅ Flag systems verified');
        } else {
            results.tests.flagSystems = {
                passed: false,
                message: `Flag mismatch: hiFeatureFlags=${featureFlags}, HiFlags=${hiFlagsResult}`,
                time: performance.now() - testStart
            };
            console.log('❌ Flag systems failed');
        }
    } catch (error) {
        results.tests.flagSystems = {
            passed: false,
            message: `Error: ${error.message}`,
            time: performance.now() - testStart
        };
        console.error('❌ Flag test error:', error);
    }
}

async function testModuleLoading() {
    const testStart = performance.now();
    console.log('📦 Testing module loading...');
    
    try {
        // Load core modules
        const hifeedModule = await import('/lib/hifeed/index.js');
        const hiFeedComponent = await import('/ui/HiFeed/HiFeed.js');
        const hiStreaksComponent = await import('/ui/HiStreaks/HiStreaks.js');
        
        // Check exports
        const hasRequiredExports = 
            hifeedModule.getUnifiedFeed &&
            hiFeedComponent.HiFeed &&
            hiStreaksComponent.HiStreaks;
        
        if (hasRequiredExports) {
            results.tests.moduleLoading = {
                passed: true,
                message: 'All modules loaded with required exports',
                time: performance.now() - testStart
            };
            console.log('✅ Modules verified');
        } else {
            results.tests.moduleLoading = {
                passed: false,
                message: 'Missing required exports',
                time: performance.now() - testStart
            };
            console.log('❌ Module exports missing');
        }
    } catch (error) {
        results.tests.moduleLoading = {
            passed: false,
            message: `Error: ${error.message}`,
            time: performance.now() - testStart
        };
        console.error('❌ Module loading error:', error);
    }
}

async function testComponentInit() {
    const testStart = performance.now();
    console.log('🎨 Testing component initialization...');
    
    try {
        // Create test containers
        const hiFeedContainer = document.createElement('div');
        const hiStreaksContainer = document.createElement('div');
        hiFeedContainer.id = 'test-hifeed-container';
        hiStreaksContainer.id = 'test-histreaks-container';
        
        document.body.appendChild(hiFeedContainer);
        document.body.appendChild(hiStreaksContainer);
        
        // Test HiFeed
        const { HiFeed } = await import('/ui/HiFeed/HiFeed.js');
        await HiFeed.init(hiFeedContainer);
        
        // Test HiStreaks
        const { HiStreaks } = await import('/ui/HiStreaks/HiStreaks.js');
        await HiStreaks.init(hiStreaksContainer);
        
        // Verify rendering
        const hiFeedRendered = hiFeedContainer.children.length > 0;
        const hiStreaksRendered = hiStreaksContainer.children.length > 0;
        
        // Cleanup
        document.body.removeChild(hiFeedContainer);
        document.body.removeChild(hiStreaksContainer);
        
        if (hiFeedRendered && hiStreaksRendered) {
            results.tests.componentInit = {
                passed: true,
                message: 'Both components initialized and rendered',
                time: performance.now() - testStart
            };
            console.log('✅ Components verified');
        } else {
            results.tests.componentInit = {
                passed: false,
                message: `Render failure: HiFeed=${hiFeedRendered}, HiStreaks=${hiStreaksRendered}`,
                time: performance.now() - testStart
            };
            console.log('❌ Component rendering failed');
        }
    } catch (error) {
        results.tests.componentInit = {
            passed: false,
            message: `Error: ${error.message}`,
            time: performance.now() - testStart
        };
        console.error('❌ Component init error:', error);
    }
}

async function testFeedData() {
    const testStart = performance.now();
    console.log('📊 Testing feed data...');
    
    try {
        const { getUnifiedFeed } = await import('/lib/hifeed/index.js');
        const feedData = await getUnifiedFeed();
        
        if (feedData && Array.isArray(feedData) && feedData.length > 0) {
            const shareCount = feedData.filter(item => item.type === 'share').length;
            const streakCount = feedData.filter(item => item.type === 'streak').length;
            
            results.tests.feedData = {
                passed: true,
                message: `Feed populated: ${feedData.length} items (${shareCount} shares, ${streakCount} streaks)`,
                time: performance.now() - testStart
            };
            console.log('✅ Feed data verified');
        } else {
            results.tests.feedData = {
                passed: false,
                message: 'Feed empty or invalid format',
                time: performance.now() - testStart
            };
            console.log('❌ Feed data failed');
        }
    } catch (error) {
        results.tests.feedData = {
            passed: false,
            message: `Error: ${error.message}`,
            time: performance.now() - testStart
        };
        console.error('❌ Feed data error:', error);
    }
}

async function testPerformance() {
    const totalTime = performance.now() - verificationStart;
    const targetTime = 3000; // 3 seconds
    
    if (totalTime < targetTime) {
        results.tests.performance = {
            passed: true,
            message: `Total time: ${totalTime.toFixed(1)}ms (target: <${targetTime}ms)`,
            time: totalTime
        };
        console.log('✅ Performance verified');
    } else {
        results.tests.performance = {
            passed: false,
            message: `Performance exceeded: ${totalTime.toFixed(1)}ms > ${targetTime}ms`,
            time: totalTime
        };
        console.log('❌ Performance failed');
    }
}

// Generate comprehensive report
function generateFinalReport() {
    results.totalTime = performance.now() - verificationStart;
    
    // Check if all tests passed
    const allTestsPassed = Object.values(results.tests).every(test => test.passed);
    results.readyForRollout = allTestsPassed;
    results.overallStatus = allTestsPassed ? 'READY' : 'NOT_READY';
    
    console.log('\n🎯 PHASE 7 FINAL VERIFICATION REPORT');
    console.log('=====================================');
    
    // Individual test results
    Object.entries(results.tests).forEach(([testName, result]) => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const time = result.time ? `(${result.time.toFixed(1)}ms)` : '';
        console.log(`${testName}: ${status} ${time}`);
        console.log(`  └─ ${result.message}`);
    });
    
    console.log(`\nTotal Verification Time: ${results.totalTime.toFixed(1)}ms`);
    
    // Final rollout decision
    console.log('\n🚀 ROLLOUT DECISION');
    console.log('==================');
    
    if (results.readyForRollout) {
        console.log('✅ APPROVED FOR 10% ROLLOUT');
        console.log('🎉 All Phase 7 criteria met!');
        console.log('\n📋 Pre-rollout checklist:');
        console.log('  ✅ Flag systems working correctly');
        console.log('  ✅ Modules loading without errors');
        console.log('  ✅ Components rendering properly');
        console.log('  ✅ Feed populating with mixed content');
        console.log('  ✅ Performance under 3 second target');
        console.log('\n📈 Next steps:');
        console.log('  1. Enable hifeed_enabled for 10% of users');
        console.log('  2. Monitor real-world performance');
        console.log('  3. Track user engagement metrics');
        console.log('  4. Plan gradual expansion to 25%, 50%, 100%');
    } else {
        console.log('❌ NOT READY FOR ROLLOUT');
        console.log('🔧 Critical issues must be resolved:');
        
        Object.entries(results.tests).forEach(([testName, result]) => {
            if (!result.passed) {
                console.log(`  ❌ ${testName}: ${result.message}`);
            }
        });
    }
    
    return results;
}

// Run all verification tests
async function runFinalVerification() {
    console.log('🚀 Starting Phase 7 Final Verification Suite...');
    
    try {
        await testFlagSystems();
        await testModuleLoading();
        await testComponentInit();
        await testFeedData();
        testPerformance();
        
        const finalReport = generateFinalReport();
        
        // Make results globally available
        window.phase7VerificationResults = finalReport;
        
        console.log('\n✅ Verification complete!');
        console.log('Results available at: window.phase7VerificationResults');
        
        return finalReport;
        
    } catch (error) {
        console.error('💥 Verification suite failed:', error);
        results.overallStatus = 'ERROR';
        results.readyForRollout = false;
        return results;
    }
}

// Export for external use
window.runPhase7Verification = runFinalVerification;

// Auto-run when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFinalVerification);
} else {
    // Small delay to ensure all systems are ready
    setTimeout(runFinalVerification, 200);
}