/**
 * lib/monitoring/config.js
 * Monitoring configuration bridge for Hi App
 * 
 * Centralizes monitoring service configuration from environment
 * Safe access to window.HI_ENV with fallbacks
 */

/**
 * Monitoring service configuration
 * Reads from window.HI_ENV if available, otherwise uses defaults
 */
export const MONITORING = {
  // Plausible Analytics domain
  // Set via window.HI_ENV.PLAUSIBLE_DOMAIN in HTML
  domain: window?.HI_ENV?.PLAUSIBLE_DOMAIN || undefined,
  
  // Sentry error tracking DSN
  // Set via window.HI_ENV.SENTRY_DSN in HTML  
  sentryDsn: window?.HI_ENV?.SENTRY_DSN || undefined,
  
  // Feature flags for monitoring services
  enableAnalytics: window?.HI_ENV?.ENABLE_ANALYTICS !== false, // Default enabled
  enableErrorTracking: window?.HI_ENV?.ENABLE_ERROR_TRACKING !== false, // Default enabled
  
  // Environment detection
  isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
  
  // Debug logging
  debugMode: window?.HI_ENV?.DEBUG_MONITORING || window.location.hostname === 'localhost'
};

/**
 * Get monitoring configuration with validation
 * @returns {Object} Validated monitoring configuration
 */
export function getMonitoringConfig() {
  const config = { ...MONITORING };
  
  // Validate configuration
  if (config.debugMode) {
    console.log('📊 Monitoring Config:', {
      domain: config.domain || 'not set',
      sentryDsn: config.sentryDsn ? '***configured***' : 'not set',
      analytics: config.enableAnalytics ? 'enabled' : 'disabled',
      errorTracking: config.enableErrorTracking ? 'enabled' : 'disabled',
      environment: config.isDevelopment ? 'development' : 'production'
    });
  }
  
  return config;
}

/**
 * Check if monitoring service should be initialized
 * @param {string} service - Service name ('analytics' or 'errorTracking')
 * @returns {boolean} Whether service should be enabled
 */
export function shouldInitializeService(service) {
  const config = getMonitoringConfig();
  
  switch (service) {
    case 'analytics':
      return config.enableAnalytics && !!config.domain;
    case 'errorTracking':
      return config.enableErrorTracking && !!config.sentryDsn;
    default:
      return false;
  }
}