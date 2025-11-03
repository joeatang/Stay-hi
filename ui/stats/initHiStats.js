/**
 * ui/stats/initHiStats.js - PAGE INIT GUARD
 * Prevents duplicate stats initialization across pages
 * 
 * METRICS SEPARATION: Ensures exactly ONE stats fetch per page-load
 */

let _hiStatsInit = false;

/**
 * Ensure stats initialization happens only once per page load
 * @param {Function} initFn - Async function to initialize stats
 * @returns {Promise<void>}
 */
export async function initHiStatsOnce(initFn) {
    if (_hiStatsInit) {
        console.warn('[HiStats] Init already called, skipping duplicate');
        return;
    }
    
    console.log('[HiStats] Initializing stats system (once per page)...');
    _hiStatsInit = true;
    
    try {
        await initFn();
        console.log('[HiStats] ✅ Stats initialization complete');
    } catch (error) {
        console.error('[HiStats] ❌ Stats initialization failed:', error);
        // Reset flag so retry is possible
        _hiStatsInit = false;
        throw error;
    }
}

/**
 * Reset the initialization flag (for testing or page navigation)
 */
export function resetHiStatsInit() {
    console.log('[HiStats] Resetting initialization flag');
    _hiStatsInit = false;
}

/**
 * Check if stats have been initialized
 */
export function isHiStatsInitialized() {
    return _hiStatsInit;
}

// HI-OS DEV: Set development environment flag for console tracing
if (typeof window !== 'undefined') {
    window.HI_ENV = window.HI_ENV || {};
    window.HI_ENV.DEV = true; // Enable dev tracing for stats calls
}