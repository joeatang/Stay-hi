/**
 * monitoring/vendors/analytics.js - Fallback analytics stub
 * Aligns with HiMonitor expectations (initPlausible, trackPlausible)
 */

export function trackEvent(name, data) {
    console.log('Analytics tracking (disabled):', name, data);
}

export function trackPageView(path) {
    console.log('Analytics page view (disabled):', path);
}

// Back-compat named exports expected by HiMonitor
export function initPlausible(domain) {
    console.log('Plausible init (disabled):', domain || '(none)');
}

export function trackPlausible(name, data) {
    return trackEvent(name, data);
}

export default { trackEvent, trackPageView, initPlausible, trackPlausible };