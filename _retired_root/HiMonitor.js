/**
 * HiMonitor - Tesla-grade production monitoring layer
 * 
 * Upgraded: Plausible Analytics + Sentry Error Tracking integration
 * Zero-config initialization with graceful fallbacks
 */

import { MONITORING } from './config.js';
import { initPlausible, trackPlausible } from './vendors/analytics.js';
import { initSentry, captureError } from './vendors/sentry.js';

class HiMonitor {
    constructor() {
        this.isActive = true;
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize monitoring services
            await Promise.all([
                initPlausible(MONITORING.domain),
                initSentry(MONITORING.sentryDsn)
            ]);
            
            console.log('HiMonitor active');
        } catch (error) {
            console.warn('HiMonitor initialization error:', error);
        }
    }

    /**
     * Track user events for analytics
     * @param {string} eventName - Name of the event (e.g., 'share_submit', 'gym_submit')
     * @param {object} data - Event data payload
     */
    trackEvent(eventName, data = {}) {
        if (!this.isActive || !eventName) return;

        try {
            // Route to Plausible Analytics
            trackPlausible(eventName, data);
        } catch (error) {
            // Silently fail - analytics should not break app
            console.debug('HiMonitor trackEvent error:', error);
        }
    }

    /**
     * Log errors for tracking and debugging
     * @param {Error|string} error - Error object or error message
     * @param {object} context - Additional context about the error
     */
    logError(error, context = {}) {
        if (!this.isActive || !error) return;

        try {
            // Route to Sentry Error Tracking
            captureError(error, context);
            
            // Also log to console for development visibility
            console.warn('HiError:', error, context);
        } catch (monitorError) {
            console.debug('HiMonitor logError failed:', monitorError);
        }
    }

    /**
     * Disable monitoring (for testing or privacy)
     */
    disable() {
        this.isActive = false;
        console.log('HiMonitor disabled');
    }

    /**
     * Enable monitoring
     */
    enable() {
        this.isActive = true;
        console.log('HiMonitor enabled');
    }
}

// Initialize monitor instance
const monitor = new HiMonitor();

// Export functions for module usage
export function trackEvent(eventName, data) {
    try {
        trackPlausible(eventName, data);
    } catch (error) {
        // Silently fail - analytics should not break app
    }
}

export function logError(error, context) {
    try {
        captureError(error, context);
        console.warn('HiError:', error, context);
    } catch (captureErr) {
        // Silently fail - error tracking should not break app
    }
}