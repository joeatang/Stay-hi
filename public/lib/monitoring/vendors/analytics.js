/**
 * monitoring/vendors/analytics.js - Fallback analytics stub
 */

export function trackEvent(name, data) {
    console.log('Analytics tracking (disabled):', name, data);
}

export function trackPageView(path) {
    console.log('Analytics page view (disabled):', path);
}

export default { trackEvent, trackPageView };