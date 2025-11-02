/**
 * HiMonitor - Lightweight production monitoring layer
 * 
 * Hi DEV Standard: Simple, stubbed endpoints for future analytics integration
 * Endpoints: Plausible (analytics) + Sentry (error tracking) - TBD post-MVP
 */

class HiMonitor {
    constructor() {
        this.analyticsEndpoint = '/api/analytics'; // Stub - will be replaced with Plausible
        this.errorEndpoint = '/api/errors';       // Stub - will be replaced with Sentry
        this.isActive = true;
        
        console.log('HiMonitor active');
    }

    /**
     * Track user events for analytics
     * @param {string} eventName - Name of the event (e.g., 'page_view', 'button_click')
     * @param {object} data - Event data payload
     */
    async trackEvent(eventName, data = {}) {
        if (!this.isActive) return;

        try {
            const payload = {
                event: eventName,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                data: data
            };

            // Stub implementation - will be replaced with Plausible API
            await fetch(this.analyticsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }).catch(() => {
                // Silently fail for now - analytics should not break app
                console.debug('Analytics endpoint not available (stubbed)');
            });

        } catch (error) {
            console.debug('HiMonitor trackEvent error:', error);
        }
    }

    /**
     * Log errors for tracking and debugging
     * @param {Error|string} error - Error object or error message
     * @param {object} context - Additional context about the error
     */
    async logError(error, context = {}) {
        if (!this.isActive) return;

        try {
            const errorPayload = {
                message: error.message || error.toString(),
                stack: error.stack || 'No stack trace available',
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                context: context
            };

            // Stub implementation - will be replaced with Sentry API
            await fetch(this.errorEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorPayload)
            }).catch(() => {
                // Silently fail for now - error tracking should not break app
                console.debug('Error tracking endpoint not available (stubbed)');
            });

            // Also log to console for development
            console.error('HiMonitor logged error:', error, context);

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

// Initialize global monitor instance
window.HiMonitor = new HiMonitor();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HiMonitor;
}