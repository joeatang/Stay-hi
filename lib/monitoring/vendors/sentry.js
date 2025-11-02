/**
 * lib/monitoring/vendors/sentry.js
 * Sentry Error Tracking integration for Hi App
 * 
 * Provides comprehensive error monitoring and performance tracking
 * Dynamic CDN loading for minimal bundle impact
 */

/**
 * Initialize Sentry error tracking
 * @param {string} dsn - Sentry DSN (Data Source Name)
 */
export async function initSentry(dsn) {
  if (!dsn) return;
  
  // Check if already initialized
  if (window.Sentry) {
    console.log('🐛 Sentry already initialized');
    return;
  }
  
  try {
    // Dynamic import from Sentry CDN
    const sentryModule = await import('https://browser.sentry-cdn.com/7.120.0/bundle.tracing.min.js');
    window.Sentry = sentryModule.default;
    
    // Initialize Sentry with configuration
    window.Sentry.init({
      dsn: dsn,
      integrations: [
        new window.Sentry.BrowserTracing(),
      ],
      // Performance monitoring sample rate
      tracesSampleRate: 0.1,
      // Release tracking
      environment: window.location.hostname === 'localhost' ? 'development' : 'production',
      // Error filtering
      beforeSend(event) {
        // Filter out known noise
        if (event.exception) {
          const error = event.exception.values[0];
          if (error && error.value && error.value.includes('Non-Error promise rejection')) {
            return null; // Filter out promise rejection noise
          }
        }
        return event;
      }
    });
    
    console.log('🐛 Sentry Error Tracking initialized');
  } catch (error) {
    console.warn('🐛 Sentry initialization failed:', error);
  }
}

/**
 * Capture error to Sentry with context
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context for debugging
 */
export function captureError(error, context) {
  if (!error) return;
  
  try {
    if (window.Sentry) {
      window.Sentry.captureException(error, { 
        extra: context || {},
        tags: {
          component: 'HiApp',
          environment: window.location.hostname === 'localhost' ? 'development' : 'production'
        }
      });
      console.log('🐛 Sentry error captured:', error.message || error);
    } else {
      console.warn('🐛 Sentry not loaded, error logged locally:', error);
    }
  } catch (captureError) {
    console.warn('🐛 Sentry capture failed:', captureError);
  }
}

/**
 * Add breadcrumb for debugging context
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category (e.g., 'ui', 'auth', 'api')
 * @param {string} level - Level (info, warning, error)
 */
export function addBreadcrumb(message, category = 'app', level = 'info') {
  if (!message) return;
  
  try {
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        message,
        category,
        level,
        timestamp: Date.now() / 1000
      });
    }
  } catch (error) {
    console.warn('🐛 Sentry breadcrumb failed:', error);
  }
}