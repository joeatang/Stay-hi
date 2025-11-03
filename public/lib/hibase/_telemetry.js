/**
 * lib/hibase/_telemetry.js
 * Micro-telemetry wrapper for HiBase operations
 * 
 * Provides performance tracking and error monitoring for HiBase functions
 * PII-safe: Only tracks function names, timing, and error types
 */

import { logError, trackEvent } from '../monitoring/HiMonitor.js';

/**
 * Wrap HiBase functions with telemetry tracking
 * @param {string} name - Function name for tracking (e.g., 'shares.insertShare')
 * @param {Function} fn - Function to wrap
 * @returns {Function} Wrapped function with telemetry
 */
export function withTelemetry(name, fn) {
    return async (...args) => {
        const startTime = performance.now?.() ?? 0;
        
        try {
            const result = await fn(...args);
            
            // Ensure result follows { data, error } pattern
            if (!result || typeof result !== 'object' || !('data' in result && 'error' in result)) {
                return result;
            }
            
            const duration = Math.round((performance.now?.() ?? startTime) - startTime);
            
            if (result.error) {
                // Log error without PII
                logError(`hibase.${name}: ${result.error.message || 'Unknown error'}`, {
                    function: name,
                    duration_ms: duration,
                    error_code: result.error.code || 'UNKNOWN'
                });
            } else {
                // Track success with timing
                trackEvent('hibase_operation_success', {
                    function: name,
                    duration_ms: duration,
                    via: 'hibase'
                });
            }
            
            return result;
            
        } catch (error) {
            const duration = Math.round((performance.now?.() ?? startTime) - startTime);
            
            // Log thrown errors
            logError(`hibase.${name}.exception: ${error.message || 'Function threw error'}`, {
                function: name,
                error_type: error.constructor.name,
                has_stack: Boolean(error.stack)
            });
            
            // Return standardized error format
            return { 
                data: null, 
                error: {
                    message: error.message || 'Operation failed',
                    code: error.code || 'INTERNAL_ERROR'
                }
            };
        }
    };
}

/**
 * Track HiBase function calls without wrapping
 * @param {string} name - Function name
 * @param {Object} metadata - Additional metadata (PII-safe)
 */
export function trackCall(name, metadata = {}) {
        trackEvent('hibase_function_called', {
        function: name,
        timestamp: new Date().toISOString()
    });
}

/**
 * Log HiBase errors in standardized format
 * @param {string} name - Function name where error occurred
 * @param {Error|Object} error - Error object
 * @param {Object} context - Additional context (PII-safe)
 */
export function logTelemetryError(name, error, context = {}) {
    logError(`hibase.${name}: ${error.message || 'Unknown error'}`, {
        function: name,
        error_code: error.code || 'UNKNOWN',
        ...context
    });
}