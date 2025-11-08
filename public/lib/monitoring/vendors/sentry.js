/**
 * monitoring/vendors/sentry.js - Fallback sentry stub
 */

export function captureException(error) {
    console.log('Sentry error capture (disabled):', error);
}

export function captureMessage(message) {
    console.log('Sentry message (disabled):', message);
}

export function init(config) {
    console.log('Sentry init (disabled):', config);
}

export default { captureException, captureMessage, init };