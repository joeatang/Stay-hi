/**
 * monitoring/HiMonitor.js
 * Enhanced monitoring system with auth event telemetry
 * 
 * Provides comprehensive telemetry for rollout, feature flags, and authentication
 */

let analytics = null;

// Initialize analytics if available (graceful fallback)
try {
    if (typeof gtag !== 'undefined') {
        analytics = {
            track: (event, properties) => {
                gtag('event', event, properties);
            }
        };
    }
} catch (e) {
    // Analytics not available - continue with console logging
}

/**
 * Track general events with rollout context
 */
export function trackEvent(eventName, properties = {}) {
    const event = {
        event: eventName,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 200),
        ...properties
    };

    // Enhanced logging for dev environment
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        console.log('📊 HiMonitor Event:', eventName, event);
    }

    // Send to analytics if available
    if (analytics) {
        analytics.track(eventName, event);
    }

    // Store for potential batch sending
    try {
        const events = JSON.parse(localStorage.getItem('hi_pending_events') || '[]');
        events.push(event);
        
        // Keep last 50 events
        const recentEvents = events.slice(-50);
        localStorage.setItem('hi_pending_events', JSON.stringify(recentEvents));
    } catch (e) {
        // Storage not available
    }
}

/**
 * Log authentication events with enhanced security context
 */
export function logAuthEvent(eventType, details = {}) {
    const authEvent = {
        event: 'auth_event',
        auth_event_type: eventType,
        timestamp: Date.now(),
        session_id: getSessionId(),
        ...details
    };

    // Enhanced dev logging for auth events
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        console.log('🔐 HiAuth Event:', eventType, authEvent);
    }

    // Track with security-focused properties
    trackEvent('auth_event', authEvent);
}

/**
 * Log errors with enhanced context
 */
export function logError(error, context = {}) {
    const errorEvent = {
        event: 'error',
        error_message: error.message || String(error),
        error_stack: error.stack || '',
        error_name: error.name || 'Unknown',
        timestamp: Date.now(),
        url: window.location.href,
        session_id: getSessionId(),
        ...context
    };

    // Always log errors to console in dev
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        console.error('❌ HiMonitor Error:', error, errorEvent);
    }

    trackEvent('error', errorEvent);
}

/**
 * Get or create session ID for telemetry correlation
 */
function getSessionId() {
    try {
        let sessionId = sessionStorage.getItem('hi_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('hi_session_id', sessionId);
        }
        return sessionId;
    } catch (e) {
        return 'session_' + Date.now();
    }
}

// Common auth event types for reference
export const AUTH_EVENTS = {
    SIGN_IN_ATTEMPT: 'sign_in_attempt',
    SIGN_IN_SUCCESS: 'sign_in_success', 
    SIGN_IN_FAILURE: 'sign_in_failure',
    SIGN_OUT: 'sign_out',
    SESSION_REFRESH: 'session_refresh',
    SESSION_EXPIRED: 'session_expired',
    AUTH_STATE_CHANGE: 'auth_state_change',
    IDENTITY_CHECK: 'identity_check',
    AUTH_REQUIRED: 'auth_required'
};