/**
 * monitor-adapter.js - Stable wrapper over HiMonitor
 * Provides consistent interface and graceful fallbacks
 */

import { trackEvent, logError } from '/lib/monitoring/HiMonitor.js';

// Create HiMonitor-compatible interface
export const HiMonitor = {
    trackEvent(eventName, props = {}) {
        try {
            return trackEvent(eventName, props);
        } catch (error) {
            console.warn('HiMonitor.trackEvent failed:', error);
            // Graceful fallback - don't break the app
        }
    },
    
    logError(err, ctx = {}) {
        try {
            return logError(err, ctx);
        } catch (error) {
            console.warn('HiMonitor.logError failed:', error);
            // Graceful fallback - still log to console
            console.error('Fallback error log:', err, ctx);
        }
    },
    
    // Telemetry helper for verification
    logTelemetryError(err, ctx = {}) {
        // Renamed to avoid recursion issues
        try {
            return logError(err, { ...ctx, source: 'telemetry' });
        } catch (error) {
            console.warn('HiMonitor telemetry error failed:', error);
        }
    }
};

export default HiMonitor;