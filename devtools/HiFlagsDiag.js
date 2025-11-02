/**
 * HiFlagsDiag.js - Development-only diagnostics tool
 * 
 * This module attaches HiFlags to window for browser console debugging.
 * Should ONLY be loaded in development environments.
 * 
 * Usage:
 *   import('/devtools/HiFlagsDiag.js');
 * 
 * Then use in console:
 *   window.HiFlags.debug()
 *   window.hiFlags.getFlag('flag_name')
 */

import HiFlags, { hiFlags } from '/lib/flags/HiFlags.js';

// Attach for local dev convenience
// eslint-disable-next-line no-underscore-dangle
window.HiFlags = HiFlags;
window.hiFlags = hiFlags;

// Add debug helper methods
window.hiFlags.debug = function() {
    console.group('🚩 HiFlags Debug Information');
    
    try {
        const allFlags = this.getAllFlags();
        if (allFlags && Object.keys(allFlags).length > 0) {
            console.table(allFlags);
            console.log(`📊 Total flags: ${Object.keys(allFlags).length}`);
        } else {
            console.warn('No flags available or getAllFlags() failed');
        }
        
        console.log('🔧 Available methods:');
        console.log('  • hiFlags.getFlag(name, default)');
        console.log('  • hiFlags.isEnabled(name)');
        console.log('  • hiFlags.getAllFlags()');
        console.log('  • hiFlags.debug() (this method)');
        
    } catch (error) {
        console.error('Debug failed:', error);
    }
    
    console.groupEnd();
    return 'Debug complete. See output above.';
};

console.info('🔧 HiFlagsDiag attached - window.HiFlags and window.hiFlags now available');
console.info('💡 Try: hiFlags.debug() or HiFlags.isEnabled("flag_name")');