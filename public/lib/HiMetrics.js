/**
 * HiMetrics.js - Tesla-Grade Single Metrics Adapter
 * 30s TTL caching, subscriber pattern, console tracing
 */

import HiBase from './hibase/index.js';

// Internal state management
const STATE = {
  ready: false,
  timestamp: 0,
  cache: null,
  subscribers: new Set(),
  ttlMs: 30_000
};

function log(...args) {
  console.log('[HiMetrics]', ...args);
}

/**
 * Load metrics with intelligent caching
 * @param {boolean} force - Force fresh fetch, bypass cache
 * @returns {Promise<Object>} - Metrics object with waves, hi5s properties
 */
export async function load(force = false) {
  const now = Date.now();
  const isFromCache = !force && STATE.ready && (now - STATE.timestamp) < STATE.ttlMs;
  
  if (isFromCache) {
    log('✅ Cache hit - returning cached metrics', STATE.cache);
    return STATE.cache;
  }
  
  try {
    log('🔄 Fetching fresh metrics...');
    const metrics = await HiBase.stats.getMetrics();
    
    if (metrics.waves?.error || metrics.hi5s?.error) {
      console.warn('[HiMetrics] API errors:', {
        waves: metrics.waves?.error,
        hi5s: metrics.hi5s?.error
      });
    }
    
    // Extract clean data for cached format
    const cleanData = {
      waves: metrics.waves?.data ?? null,
      hi5s: metrics.hi5s?.data ?? null
    };
    
    STATE.cache = cleanData;
    STATE.ready = true;
    STATE.timestamp = now;
    
    // Notify all subscribers with cache info
    const cacheInfo = {
      fromCache: false,
      ageSeconds: 0,
      timestamp: STATE.timestamp
    };
    
    STATE.subscribers.forEach(callback => {
      try {
        callback(cleanData, cacheInfo);
      } catch (error) {
        console.error('[HiMetrics] Subscriber error:', error);
      }
    });
    
    log('✅ Fresh metrics loaded and distributed', cleanData);
    return cleanData;
    
  } catch (error) {
    console.error('[HiMetrics] Load failed:', error);
    return STATE.cache || { waves: null, hi5s: null };
  }
}

/**
 * Subscribe to metric updates
 * @param {string} subscriberId - Identifier for debugging
 * @param {Function} callback - Called with (metrics, cacheInfo)
 * @returns {Function} - Unsubscribe function
 */
export function subscribe(subscriberId, callback) {
  log(`📡 New subscriber: ${subscriberId}`);
  
  const wrappedCallback = (data, cacheInfo) => {
    try {
      callback(data, cacheInfo);
    } catch (error) {
      console.error(`[HiMetrics] Subscriber ${subscriberId} error:`, error);
    }
  };
  
  STATE.subscribers.add(wrappedCallback);
  
  // Send current data immediately if available
  if (STATE.ready && STATE.cache) {
    const ageSeconds = Math.floor((Date.now() - STATE.timestamp) / 1000);
    wrappedCallback(STATE.cache, {
      fromCache: true,
      ageSeconds,
      timestamp: STATE.timestamp
    });
  }
  
  // Return unsubscribe function
  return () => {
    STATE.subscribers.delete(wrappedCallback);
    log(`📡 Unsubscribed: ${subscriberId}`);
  };
}

/**
 * Get current cached metrics without triggering load
 * @returns {Object|null} - Current cached metrics or null
 */
export function current() {
  return STATE.cache;
}

/**
 * Reset cache state (for testing/debugging)
 */
export function reset() {
  STATE.ready = false;
  STATE.timestamp = 0;
  STATE.cache = null;
  STATE.subscribers.clear();
  log('🔄 State reset');
}

// Default export for import HiMetrics from syntax
export default {
  load,
  subscribe,
  current,
  reset
};