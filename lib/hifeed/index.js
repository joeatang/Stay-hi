/**
 * HiFeed - Unified Experience Layer
 * 
 * Combines HiBase.shares + HiBase.streaks into a unified, cached, paginated feed
 * for the Hi experience layer. Provides seamless integration of user activity
 * across shares and streak achievements.
 * 
 * Usage:
 *   import { getUnifiedFeed } from './lib/hifeed/index.js';
 *   const feed = await getUnifiedFeed(userId, { page: 1, limit: 20 });
 */

// Import dependencies
import { logError, trackEvent } from '/lib/monitoring/HiMonitor.js';

// Create HiMonitor wrapper for compatibility
const HiMonitor = { logError, trackEvent };

// Global fallbacks for demo data
let HiBase = null;

// Feed cache - simple in-memory cache for development
const feedCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get unified feed combining shares and streaks
 * @param {string} userId - User ID to get feed for
 * @param {Object} options - Pagination and filtering options
 * @param {number} options.page - Page number (1-based, default: 1)
 * @param {number} options.limit - Items per page (default: 20, max: 100)
 * @param {string} options.type - Filter by type: 'all', 'shares', 'streaks' (default: 'all')
 * @returns {Promise<{data: Array, error: string|null, pagination: Object}>}
 */
async function getUnifiedFeed(userId, options = {}) {
  try {
    const { page = 1, limit = 20, type = 'all' } = options;
    
    // Validate inputs
    if (!userId) {
      return { data: null, error: 'User ID is required' };
    }
    
    if (limit > 100) {
      return { data: null, error: 'Limit cannot exceed 100 items' };
    }

    // Check cache first
    const cacheKey = `feed:${userId}:${page}:${limit}:${type}`;
    const cached = feedCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      HiMonitor.trackEvent('hifeed_cache_hit', { userId, page, limit, type });
      return cached.data;
    }

    // Fetch data from HiBase
    const feedItems = [];
    
    // Get shares if requested
    if (type === 'all' || type === 'shares') {
      const sharesResult = await HiBase.shares.getUserShares(userId, {
        limit: type === 'shares' ? limit : Math.ceil(limit * 0.7), // 70% shares when mixed
        offset: (page - 1) * (type === 'shares' ? limit : Math.ceil(limit * 0.7))
      });
      
      if (sharesResult.data) {
        sharesResult.data.forEach(share => {
          feedItems.push({
            id: `share_${share.id}`,
            type: 'share',
            userId: share.user_id,
            content: share.content,
            emotion: share.emotion,
            location: share.location,
            createdAt: share.created_at,
            isPublic: share.is_public,
            originalData: share
          });
        });
      }
    }

    // Get streaks if requested  
    if (type === 'all' || type === 'streaks') {
      const streaksResult = await HiBase.streaks.getUserStreaks(userId);
      
      if (streaksResult.data) {
        streaksResult.data.forEach(streak => {
          // Convert streak milestones to feed items
          if (streak.current_count > 0) {
            feedItems.push({
              id: `streak_${streak.id}`,
              type: 'streak',
              userId: streak.user_id,
              content: `${streak.current_count} day ${streak.type} streak!`,
              streakType: streak.type,
              currentCount: streak.current_count,
              longestStreak: streak.longest_streak,
              createdAt: streak.updated_at || streak.created_at,
              originalData: streak
            });
          }
        });
      }
    }

    // Sort by creation date (newest first)
    feedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedItems = feedItems.slice(startIndex, startIndex + limit);

    // Build response
    const result = {
      data: paginatedItems,
      error: null,
      pagination: {
        page,
        limit,
        total: feedItems.length,
        hasMore: startIndex + limit < feedItems.length,
        totalPages: Math.ceil(feedItems.length / limit)
      },
      meta: {
        type,
        cached: false,
        timestamp: new Date().toISOString()
      }
    };

    // Cache the result
    feedCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    HiMonitor.trackEvent('hifeed_fetch_success', { 
      userId, 
      page, 
      limit, 
      type,
      itemCount: paginatedItems.length,
      totalItems: feedItems.length
    });

    return result;

  } catch (error) {
    HiMonitor.logError('HiFeed getUnifiedFeed error', { error, userId, options });
    return {
      data: null,
      error: 'Failed to fetch unified feed',
      pagination: null
    };
  }
}

/**
 * Clear cache for a specific user or all users
 * @param {string|null} userId - User ID to clear cache for (null = clear all)
 */
function clearFeedCache(userId = null) {
  if (userId) {
    // Clear all cache entries for specific user
    for (const key of feedCache.keys()) {
      if (key.startsWith(`feed:${userId}:`)) {
        feedCache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    feedCache.clear();
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  return {
    size: feedCache.size,
    keys: Array.from(feedCache.keys())
  };
}

// ES6 exports for browser compatibility
export { getUnifiedFeed, clearFeedCache, getCacheStats };