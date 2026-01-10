/**
 * Abort-Safe Utilities for MPA Navigation
 * 
 * Provides standard helpers for handling AbortErrors in multi-page navigation.
 * AbortErrors are EXPECTED in MPA when navigating before async operations complete.
 * These utilities ensure aborts result in no-op behavior, not fallback/degraded states.
 * 
 * Usage:
 *   const result = await window.HiAbortUtils.ignoreAbort(supabase.from('table').select());
 *   if (result === null) return; // Aborted, no-op
 */

(function() {
  'use strict';

  /**
   * Check if an error is an AbortError (request cancelled by navigation)
   * @param {Error} error - Error object to check
   * @returns {boolean} True if error is an abort/cancellation
   */
  function isAbortError(error) {
    if (!error) return false;
    
    // Direct AbortError
    if (error.name === 'AbortError') return true;
    
    // Supabase wrapped AbortError
    if (error.message && error.message.includes('AbortError')) return true;
    if (error.message && error.message.includes('aborted')) return true;
    
    // Fetch cancellation
    if (error.code === 'ABORT_ERR') return true;
    if (error.code === 20) return true; // DOMException ABORT_ERR code
    
    return false;
  }

  /**
   * Wrap an async operation to silently handle AbortErrors
   * Returns null on abort (caller should treat as no-op), throws other errors
   * 
   * @param {Promise} promise - Async operation to wrap
   * @returns {Promise<any|null>} Result or null if aborted
   */
  async function ignoreAbort(promise) {
    try {
      return await promise;
    } catch (error) {
      if (isAbortError(error)) {
        // Expected abort during navigation - return null for no-op
        console.debug('[AbortUtils] Request cancelled (expected during navigation)');
        return null;
      }
      // Real error - propagate
      throw error;
    }
  }

  /**
   * Create an abort controller that auto-aborts on page hide
   * Use for long-running operations that should cancel on navigation
   * 
   * @returns {AbortController} Controller that aborts on pagehide/visibilitychange
   */
  function createPageAbortController() {
    const controller = new AbortController();
    
    const abort = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
    
    // iOS Safari reliable events
    window.addEventListener('pagehide', abort, { once: true });
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        abort();
      }
    }, { once: true });
    
    return controller;
  }

  // Attach to window for global access (Hi-OS pattern)
  window.HiAbortUtils = {
    isAbortError,
    ignoreAbort,
    createPageAbortController
  };

  console.debug('[HiAbortUtils] Loaded and ready');
})();
