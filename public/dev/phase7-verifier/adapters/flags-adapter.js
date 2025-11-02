/**
 * flags-adapter.js - Unified flag system initialization and access
 * Ensures proper initialization order and prevents early-check warnings
 */

import { waitUntilReady as waitHiFlags } from '/lib/flags/HiFlags.js';

// Initialize flags with proper async sequencing
let flagsInitialized = false;
let initPromise = null;

export async function initAllFlags() {
    if (flagsInitialized) return;
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            // Load client feature flags first
            await import('/public/assets/feature-flags.js');
            
            // Wait for HiFlags system to be ready
            await waitHiFlags();
            
            flagsInitialized = true;
            console.log('🚩 Flag systems initialized');
        } catch (error) {
            console.warn('Flag initialization error:', error);
            throw error;
        }
    })();
    
    return initPromise;
}

export async function getFlag(key) {
    await initAllFlags();
    
    // Check HiFlags system first (server-side feature flags)
    if (window.HiFlags && typeof window.HiFlags.isEnabled === 'function') {
        try {
            const serverFlag = window.HiFlags.isEnabled(key);
            if (typeof serverFlag !== 'undefined') {
                return serverFlag;
            }
        } catch (error) {
            console.warn('HiFlags error for', key, ':', error);
        }
    }
    
    // Fallback to client feature flags
    if (window.hiFeatureFlags && window.hiFeatureFlags[key]) {
        return window.hiFeatureFlags[key].enabled || false;
    }
    
    return undefined;
}

export async function getFlagDetails() {
    await initAllFlags();
    
    const details = {};
    
    // Get HiFlags status
    if (window.HiFlags) {
        details.HiFlags = {
            available: true,
            getAllFlags: typeof window.HiFlags.getAllFlags === 'function' ? 
                window.HiFlags.getAllFlags() : 'method not available'
        };
    } else {
        details.HiFlags = { available: false };
    }
    
    // Get client flags status
    if (window.hiFeatureFlags) {
        details.hiFeatureFlags = {
            available: true,
            keys: Object.keys(window.hiFeatureFlags)
        };
    } else {
        details.hiFeatureFlags = { available: false };
    }
    
    return details;
}