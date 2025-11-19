/**
 * public/lib/monitoring/vendors/sentry.js
 * Unified Sentry vendor module (browser) with graceful fallback.
 * Aligns with HiMonitor import expectations: { initSentry, captureError }.
 */

let sentryInitAttempted = false;

export async function initSentry(dsn) {
    if (!dsn || sentryInitAttempted) return;
    sentryInitAttempted = true;
    if (window.Sentry) {
        console.log('🐛 Sentry already initialized (public)');
        return;
    }
    try {
        const mod = await import('https://browser.sentry-cdn.com/7.120.0/bundle.tracing.min.js');
        window.Sentry = mod.default;
        window.Sentry.init({
            dsn,
            integrations: [ new window.Sentry.BrowserTracing() ],
            tracesSampleRate: 0.1,
            environment: location.hostname === 'localhost' ? 'development' : 'production',
            beforeSend(event) {
                try {
                    if (event.exception) {
                        const err = event.exception.values?.[0];
                        if (err?.value?.includes('Non-Error promise rejection')) return null;
                    }
                } catch (_) {}
                return event;
            }
        });
        console.log('🐛 Sentry initialized (public)');
    } catch (e) {
        console.warn('🐛 Sentry CDN load failed (public stub active):', e.message || e);
    }
}

export function captureError(error, context) {
    if (!error) return;
    try {
        if (window.Sentry) {
            window.Sentry.captureException(error, { extra: context || {}, tags: { component: 'HiApp' } });
        } else {
            console.warn('🐛 (stub) captureError:', error, context);
        }
    } catch (e) {
        console.warn('🐛 captureError failed:', e);
    }
}

export function addBreadcrumb(message, category = 'app', level = 'info') {
    if (!message) return;
    try {
        if (window.Sentry) {
            window.Sentry.addBreadcrumb({ message, category, level, timestamp: Date.now() / 1000 });
        }
    } catch (e) {
        console.debug('🐛 breadcrumb failed:', e.message || e);
    }
}

export default { initSentry, captureError, addBreadcrumb };