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

export default config;