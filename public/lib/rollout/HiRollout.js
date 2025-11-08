/**
 * HiRollout.js - Fallback rollout stub for metrics page
 * Simplified version to prevent 404 errors while loading metrics
 */

// Simple fallback identity generator
function getIdentity() {
    if (typeof window !== 'undefined' && window.localStorage) {
        let identity = localStorage.getItem('hi_identity');
        if (!identity) {
            identity = Math.random().toString(36).substr(2, 9);
            localStorage.setItem('hi_identity', identity);
        }
        return identity;
    }
    return 'anonymous';
}

// Simple rollout check - enable all features for now
function isEnabledFor(identity, flagKey) {
    return true; // Simplified: enable all features
}

// Get rollout percentage - return 100% for now
function getRollout(flagKey) {
    return 100;
}

// Set rollout percentage - no-op in this stub
function setRollout(flagKey, percentage) {
    console.log(`Rollout set: ${flagKey} = ${percentage}%`);
    return true;
}

export { isEnabledFor, getIdentity, getRollout, setRollout };