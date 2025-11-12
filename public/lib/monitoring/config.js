/**
 * monitoring/config.js - Fallback monitoring config stub
 */

// Fallback monitoring configuration
export const config = {
    enabled: false,
    analytics: {
        enabled: false,
        provider: 'none'
    },
    sentry: {
        enabled: false,
        dsn: ''
    }
};

// Alias for backward compatibility with HiMonitor.js
export const MONITORING = config;

export default config;