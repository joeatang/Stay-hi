/**
 * Phase 7 Testing Script: Enable HiFeed Flag
 * 
 * Temporarily enables hifeed_enabled flag for internal testing
 * and verification of the Hi Experience Layer components.
 */

// Simple flag enabler for development testing
function enableHiFeedForTesting() {
  // Check if we're in development environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('127.0.0.1') ||
                       window.location.hostname.includes('.local');
  
  if (!isDevelopment) {
    console.warn('🚫 HiFeed testing only available in development environment');
    return false;
  }

  // Enable flag locally for testing
  if (window.HiFlags) {
    // Update flag in memory
    window.HiFlags.flags.set('hifeed_enabled', {
      enabled: true,
      description: 'Internal rollout test - Phase 7 verification',
      source: 'test-override',
      lastUpdated: new Date().toISOString()
    });
    
    console.log('🔥 HiFeed flag enabled for testing session');
    console.log('🔄 Refresh page to see Hi Experience Layer components');
    return true;
  } else {
    console.warn('🚫 HiFlags system not available');
    return false;
  }
}

// Expose globally for console testing
window.enableHiFeedTesting = enableHiFeedForTesting;

// Also provide status check function
window.checkHiFeedStatus = function() {
  if (window.HiFlags) {
    const flag = window.HiFlags.flags.get('hifeed_enabled');
    console.log('🔍 HiFeed Status:', flag ? flag : 'Flag not found');
    return flag;
  } else {
    console.warn('🚫 HiFlags system not available');
    return null;
  }
};

// Auto-run status check
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      console.log('📋 Phase 7 Testing Commands Available:');
      console.log('   enableHiFeedTesting() - Enable flag for this session');
      console.log('   checkHiFeedStatus() - Check current flag status');
      
      // Show current status
      window.checkHiFeedStatus();
    }, 1000);
  });
}