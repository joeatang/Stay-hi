// DEV-ONLY: excluded from production flows; accessed with ?dev=1

/**
 * Phase 7 Verification Suite - ESM Version
 * 
 * Systematic testing of HiFeed system components using proper ES6 imports.
 * No CommonJS, no globals in production paths, clean isolation.
 */

// ESM imports - proper module resolution
import * as HiFlagsModule from '/lib/flags/HiFlags.js';
import { getUnifiedFeed, clearFeedCache, getCacheStats } from '/lib/hifeed/index.js';
import { HiFeed } from '/ui/HiFeed/HiFeed.js';
import { HiStreaks } from '/ui/HiStreaks/HiStreaks.js';
import { getClient } from '/lib/HiSupabase.js';

// Performance tracking
const verificationStart = performance.now();

// Results structure - HI DEV standard format
const verificationResults = {
    flags: 'PENDING',
    modules: 'PENDING', 
    components: 'PENDING',
    feed: 'PENDING',
    performance: 0,
    timestamp: new Date().toISOString(),
    details: {
        flags: { hiFeatureFlags: null, HiFlags: null },
        modules: { loaded: [], errors: [] },
        components: { HiFeed: null, HiStreaks: null },
        feed: { itemCount: 0, types: [] },
        performance: { totalTime: 0, moduleLoad: 0, componentInit: 0 }
    }
};

// Console capture for UI
const consoleOutput = document.getElementById('console-output');
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function addToConsole(type, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    if (consoleOutput) {
        consoleOutput.textContent += `[${timestamp}] ${type}: ${message}\n`;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    // Call original
    if (type === 'LOG') originalLog(...args);
    if (type === 'ERROR') originalError(...args);  
    if (type === 'WARN') originalWarn(...args);
}

console.log = (...args) => addToConsole('LOG', ...args);
console.error = (...args) => addToConsole('ERROR', ...args);
console.warn = (...args) => addToConsole('WARN', ...args);

// UI update functions
function updateTestStatus(testName, status, message, details = null) {
    const statusElement = document.getElementById(`${testName}-status`);
    const detailsElement = document.getElementById(`${testName}-details`);
    
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `test-status ${status.toLowerCase() === 'pass' ? 'pass' : 'fail'}`;
    }
    
    if (detailsElement && message) {
        detailsElement.textContent = message;
    }
    
    console.log(`${testName.toUpperCase()}: ${status} - ${message}`);
}

function updateOverallStatus(status, message) {
    const element = document.getElementById('overall-status');
    if (element) {
        const className = status.toLowerCase().includes('pass') || status.toLowerCase().includes('ready') ? 'success' : 
                         status.toLowerCase().includes('fail') ? 'error' : 'loading';
        element.className = `status ${className}`;
        element.textContent = message;
    }
}

function updateResultsDisplay() {
    const element = document.getElementById('results-display');
    if (element) {
        element.innerHTML = `
            <pre><code>window.phase7VerificationResults = ${JSON.stringify(verificationResults, null, 2)}</code></pre>
        `;
    }
}

// Test 1: Flag Systems with proper initialization
async function testFlagSystems() {
    console.log('🚩 Testing flag systems...');
    const testStart = performance.now();
    
    try {
        // Test client-side feature flags first
        await import('/public/assets/feature-flags.js');
        
        const hiFeatureFlags = window.hiFeatureFlags?.hifeed_enabled;
        verificationResults.details.flags.hiFeatureFlags = hiFeatureFlags;
        
        // Test HiFlags with proper initialization
        const HiFlags = HiFlagsModule.default || HiFlagsModule;
        
        // Ensure initialization if needed
        if (HiFlags.initialize && typeof HiFlags.initialize === 'function') {
            await HiFlags.initialize();
        }
        
        const hiFlagsEnabled = HiFlags.isEnabled ? HiFlags.isEnabled('hifeed_enabled') : null;
        verificationResults.details.flags.HiFlags = hiFlagsEnabled;
        
        const testTime = performance.now() - testStart;
        
        if (hiFeatureFlags === true && hiFlagsEnabled === true) {
            verificationResults.flags = 'PASS';
            updateTestStatus('flag', 'PASS', `Both systems enabled (${testTime.toFixed(1)}ms)`);
        } else {
            verificationResults.flags = 'FAIL';
            updateTestStatus('flag', 'FAIL', `Mismatch: hiFeatureFlags=${hiFeatureFlags}, HiFlags=${hiFlagsEnabled}`);
        }
        
    } catch (error) {
        verificationResults.flags = 'FAIL';
        verificationResults.details.flags.error = error.message;
        updateTestStatus('flag', 'FAIL', `Error: ${error.message}`);
        console.error('Flag test error:', error);
    }
}

// Test 2: Module Loading
async function testModuleLoading() {
    console.log('📦 Testing module loading...');
    const testStart = performance.now();
    
    try {
        const modules = [];
        
        // Test HiFeed API module
        if (getUnifiedFeed && clearFeedCache && getCacheStats) {
            modules.push('HiFeed API');
            verificationResults.details.modules.loaded.push('lib/hifeed/index.js');
        }
        
        // Test HiFeed component
        if (HiFeed && typeof HiFeed === 'function') {
            modules.push('HiFeed Component');
            verificationResults.details.modules.loaded.push('ui/HiFeed/HiFeed.js');
        }
        
        // Test HiStreaks component  
        if (HiStreaks && typeof HiStreaks === 'function') {
            modules.push('HiStreaks Component');
            verificationResults.details.modules.loaded.push('ui/HiStreaks/HiStreaks.js');
        }
        
        // Test Supabase client
        try {
            const supabase = getClient();
            if (supabase) {
                modules.push('Supabase Client');
                verificationResults.details.modules.loaded.push('lib/HiSupabase.js');
            }
        } catch (supabaseError) {
            console.warn('Supabase client not available:', supabaseError.message);
        }
        
        const testTime = performance.now() - testStart;
        verificationResults.details.performance.moduleLoad = testTime;
        
        if (modules.length >= 3) { // At least HiFeed API + both components
            verificationResults.modules = 'PASS';
            updateTestStatus('module', 'PASS', `${modules.length} modules loaded (${testTime.toFixed(1)}ms)`);
        } else {
            verificationResults.modules = 'FAIL';
            updateTestStatus('module', 'FAIL', `Only ${modules.length} modules loaded: ${modules.join(', ')}`);
        }
        
    } catch (error) {
        verificationResults.modules = 'FAIL';
        verificationResults.details.modules.errors.push(error.message);
        updateTestStatus('module', 'FAIL', `Error: ${error.message}`);
        console.error('Module loading error:', error);
    }
}

// Test 3: Component Initialization
async function testComponentInit() {
    console.log('🎨 Testing component initialization...');
    const testStart = performance.now();
    
    try {
        const results = {};
        
        // Test HiFeed component initialization
        try {
            const testContainer1 = document.createElement('div');
            testContainer1.style.display = 'none';
            document.body.appendChild(testContainer1);
            
            const hiFeedInstance = new HiFeed(testContainer1);
            if (hiFeedInstance && hiFeedInstance.container === testContainer1) {
                results.HiFeed = 'PASS';
                verificationResults.details.components.HiFeed = 'initialized';
            } else {
                results.HiFeed = 'FAIL';
                verificationResults.details.components.HiFeed = 'failed_init';
            }
            
            document.body.removeChild(testContainer1);
        } catch (hiFeedError) {
            results.HiFeed = 'FAIL';
            verificationResults.details.components.HiFeed = hiFeedError.message;
            console.error('HiFeed init error:', hiFeedError);
        }
        
        // Test HiStreaks component initialization
        try {
            const testContainer2 = document.createElement('div');
            testContainer2.style.display = 'none';
            document.body.appendChild(testContainer2);
            
            const hiStreaksInstance = new HiStreaks(testContainer2);
            if (hiStreaksInstance && hiStreaksInstance.container === testContainer2) {
                results.HiStreaks = 'PASS';
                verificationResults.details.components.HiStreaks = 'initialized';
            } else {
                results.HiStreaks = 'FAIL';
                verificationResults.details.components.HiStreaks = 'failed_init';
            }
            
            document.body.removeChild(testContainer2);
        } catch (hiStreaksError) {
            results.HiStreaks = 'FAIL';
            verificationResults.details.components.HiStreaks = hiStreaksError.message;
            console.error('HiStreaks init error:', hiStreaksError);
        }
        
        const testTime = performance.now() - testStart;
        verificationResults.details.performance.componentInit = testTime;
        
        const passCount = Object.values(results).filter(r => r === 'PASS').length;
        
        if (passCount === 2) {
            verificationResults.components = 'PASS';
            updateTestStatus('component', 'PASS', `Both components initialized (${testTime.toFixed(1)}ms)`);
        } else {
            verificationResults.components = 'FAIL';
            updateTestStatus('component', 'FAIL', `Only ${passCount}/2 components working: ${JSON.stringify(results)}`);
        }
        
    } catch (error) {
        verificationResults.components = 'FAIL';
        updateTestStatus('component', 'FAIL', `Error: ${error.message}`);
        console.error('Component init error:', error);
    }
}

// Test 4: Feed Data Population
async function testFeedData() {
    console.log('📊 Testing feed data...');
    const testStart = performance.now();
    
    try {
        const feedData = await getUnifiedFeed('test-user', { limit: 10 });
        
        if (feedData && Array.isArray(feedData) && feedData.length > 0) {
            const types = [...new Set(feedData.map(item => item.type))];
            
            verificationResults.details.feed.itemCount = feedData.length;
            verificationResults.details.feed.types = types;
            
            verificationResults.feed = 'PASS';
            updateTestStatus('feed', 'PASS', `${feedData.length} items, types: ${types.join(', ')}`);
        } else if (feedData && Array.isArray(feedData)) {
            verificationResults.feed = 'PASS';
            updateTestStatus('feed', 'PASS', 'Feed returns empty array (valid)');
        } else {
            verificationResults.feed = 'FAIL';
            updateTestStatus('feed', 'FAIL', 'Feed data invalid format or null');
        }
        
    } catch (error) {
        verificationResults.feed = 'FAIL';
        updateTestStatus('feed', 'FAIL', `Error: ${error.message}`);
        console.error('Feed data error:', error);
    }
}

// Test 5: Performance Validation
function testPerformance() {
    const totalTime = performance.now() - verificationStart;
    verificationResults.performance = Math.round(totalTime);
    verificationResults.details.performance.totalTime = totalTime;
    
    const targetTime = 3000; // 3 seconds
    
    if (totalTime < targetTime) {
        updateTestStatus('performance', 'PASS', `${totalTime.toFixed(1)}ms (target: <${targetTime}ms)`);
    } else {
        updateTestStatus('performance', 'FAIL', `${totalTime.toFixed(1)}ms exceeds ${targetTime}ms target`);
    }
}

// Main test runner
async function runFullTest() {
    console.log('🚀 Starting Phase 7 ESM Verification Suite...');
    updateOverallStatus('TESTING', '🔄 Running comprehensive tests...');
    
    try {
        await testFlagSystems();
        await testModuleLoading();
        await testComponentInit();
        await testFeedData();
        testPerformance();
        
        // Calculate overall result
        const results = [
            verificationResults.flags,
            verificationResults.modules, 
            verificationResults.components,
            verificationResults.feed
        ];
        
        const passCount = results.filter(r => r === 'PASS').length;
        const allPassed = passCount === 4;
        const performanceGood = verificationResults.performance < 3000;
        
        if (allPassed && performanceGood) {
            updateOverallStatus('READY FOR ROLLOUT', '🚀 All systems verified - Ready for 10% deployment');
        } else {
            updateOverallStatus('NOT READY', `⚠️ ${4 - passCount} critical issues detected`);
        }
        
        // Update global results
        window.phase7VerificationResults = verificationResults;
        updateResultsDisplay();
        
        console.log('✅ Verification complete');
        console.log('Results available in window.phase7VerificationResults');
        
    } catch (error) {
        updateOverallStatus('ERROR', `💥 Verification suite failed: ${error.message}`);
        console.error('Verification suite error:', error);
    }
}

// Individual test functions for manual controls
async function testFlags() {
    await testFlagSystems();
    updateResultsDisplay();
}

async function testModules() {
    await testModuleLoading();
    updateResultsDisplay();
}

async function testComponents() {
    await testComponentInit();
    updateResultsDisplay();
}

// Export to window for manual access (DEV-ONLY)
window.phase7 = {
    HiFlags: HiFlagsModule,
    HiFeedAPI: { getUnifiedFeed, clearFeedCache, getCacheStats },
    HiStreaks,
    HiFeed,
    getClient,
    runFullTest,
    testFlags,
    testModules, 
    testComponents
};

// Auto-run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runFullTest, 100); // Small delay to ensure UI is ready
    });
} else {
    setTimeout(runFullTest, 100);
}