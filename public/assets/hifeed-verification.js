/**
 * HiFeed Verification Script
 * 
 * Tests the Hi Experience Layer implementation
 * Verifies feed population, performance, and error handling
 */

// Performance tracking
const performanceStart = performance.now();

// Verification checklist
const verificationResults = {
  flagEnabled: false,
  componentsVisible: false,
  feedPopulated: false,
  streaksVisible: false,
  consoleErrors: [],
  loadTime: 0,
  passed: false
};

// Capture console errors
const originalError = console.error;
console.error = function(...args) {
  verificationResults.consoleErrors.push(args.join(' '));
  originalError.apply(console, arguments);
};

// Main verification function
async function verifyHiFeedImplementation() {
  console.log('🔍 Starting HiFeed Verification...');
  
  try {
    // 1. Check if flag is enabled
    await checkFlagStatus();
    
    // 2. Wait for components to initialize
    await waitForComponents();
    
    // 3. Verify component visibility
    checkComponentVisibility();
    
    // 4. Check feed population
    await checkFeedPopulation();
    
    // 5. Check streaks visualization
    checkStreaksVisualization();
    
    // 6. Calculate load time
    verificationResults.loadTime = performance.now() - performanceStart;
    
    // 7. Generate final report
    generateVerificationReport();
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    verificationResults.consoleErrors.push(`Verification error: ${error.message}`);
  }
}

async function checkFlagStatus() {
  // Check HiFlags system
  if (window.HiFlags) {
    const flag = await window.HiFlags.getFlag('hifeed_enabled');
    verificationResults.flagEnabled = flag;
    console.log('🚩 HiFlags hifeed_enabled:', flag);
  }
  
  // Check feature flags system
  if (window.hiFeatureFlags) {
    const enabled = await window.hiFeatureFlags.isEnabled('hifeed_enabled');
    console.log('🚩 hiFeatureFlags hifeed_enabled:', enabled);
    verificationResults.flagEnabled = verificationResults.flagEnabled || enabled;
  }
}

async function waitForComponents() {
  console.log('⏳ Waiting for components to initialize...');
  
  // Wait up to 5 seconds for components
  const maxWait = 5000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    const experienceLayer = document.getElementById('hiExperienceLayer');
    if (experienceLayer && experienceLayer.style.display !== 'none') {
      console.log('✅ Experience layer visible');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('⚠️ Components did not initialize within timeout');
}

function checkComponentVisibility() {
  const experienceLayer = document.getElementById('hiExperienceLayer');
  const feedContainer = document.getElementById('hiFeedContainer');
  const streaksContainer = document.getElementById('hiStreaksContainer');
  
  verificationResults.componentsVisible = 
    experienceLayer && experienceLayer.style.display !== 'none' &&
    feedContainer && streaksContainer;
    
  console.log('👀 Components visible:', verificationResults.componentsVisible);
}

async function checkFeedPopulation() {
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for feed to load
  
  const feedItems = document.querySelectorAll('.hi-feed-item');
  const hasSharesAndStreaks = 
    Array.from(feedItems).some(item => item.classList.contains('hi-feed-share')) &&
    Array.from(feedItems).some(item => item.classList.contains('hi-feed-streak'));
    
  verificationResults.feedPopulated = feedItems.length > 0;
  
  console.log('📰 Feed items found:', feedItems.length);
  console.log('🔄 Mixed content (shares + streaks):', hasSharesAndStreaks);
}

function checkStreaksVisualization() {
  const streakCards = document.querySelectorAll('.hi-streak-card');
  const overviewStats = document.querySelectorAll('.hi-overview-stat');
  
  verificationResults.streaksVisible = streakCards.length > 0 && overviewStats.length > 0;
  
  console.log('🔥 Streak cards found:', streakCards.length);
  console.log('📊 Overview stats found:', overviewStats.length);
}

function generateVerificationReport() {
  const loadTimeSeconds = (verificationResults.loadTime / 1000).toFixed(2);
  
  // Determine pass/fail
  verificationResults.passed = 
    verificationResults.flagEnabled &&
    verificationResults.componentsVisible &&
    verificationResults.loadTime < 3000 && // < 3 seconds
    verificationResults.consoleErrors.length === 0;
  
  console.log('\n📋 HIFEED VERIFICATION REPORT');
  console.log('================================');
  console.log('🚩 Flag Enabled:', verificationResults.flagEnabled ? '✅' : '❌');
  console.log('👀 Components Visible:', verificationResults.componentsVisible ? '✅' : '❌');
  console.log('📰 Feed Populated:', verificationResults.feedPopulated ? '✅' : '❌');
  console.log('🔥 Streaks Visible:', verificationResults.streaksVisible ? '✅' : '❌');
  console.log('⚡ Load Time:', `${loadTimeSeconds}s`, loadTimeSeconds < 3 ? '✅' : '❌');
  console.log('🐛 Console Errors:', verificationResults.consoleErrors.length, verificationResults.consoleErrors.length === 0 ? '✅' : '❌');
  
  if (verificationResults.consoleErrors.length > 0) {
    console.log('\n❌ Errors Found:');
    verificationResults.consoleErrors.forEach(error => console.log('  -', error));
  }
  
  console.log('\n🎯 OVERALL STATUS:', verificationResults.passed ? '✅ PASSED' : '❌ FAILED');
  
  if (verificationResults.passed) {
    console.log('🚀 Ready for limited rollout (10% users)');
  } else {
    console.log('🔧 Issues need to be resolved before rollout');
  }
  
  return verificationResults;
}

// Auto-run verification when page loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(verifyHiFeedImplementation, 3000); // Wait 3 seconds for full initialization
  });
}

// Expose for manual testing
window.verifyHiFeed = verifyHiFeedImplementation;