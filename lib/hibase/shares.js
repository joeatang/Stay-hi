/**
 * lib/hibase/shares.js
 * Hi shares operations for Hi App
 * 
 * Provides insert/get operations for public and private Hi shares
 * Both raw and friendly functions for flexible usage
 */

import hiBaseClient from './HiBaseClient.js';
import { withTelemetry } from './_telemetry.js';

/**
 * RAW: Insert a new Hi share (direct Supabase operation)
 * @param {Object} shareData - Hi share data
 * @returns {Object} { data, error } from Supabase
 */
async function _insertShare(shareData) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_shares')
            .insert([{
                ...shareData,
                created_at: new Date().toISOString()
            }])
            .select();

        return { data, error };
    });
}

/**
 * RAW: Get public Hi shares from feed (direct Supabase operation)
 * @param {number} limit - Number of shares to fetch
 * @returns {Object} { data, error } from Supabase
 */
async function _getPublicShares(limit = 50) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('public_hi_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        return { data, error };
    });
}

/**
 * RAW: Get user's private shares (direct Supabase operation)
 * @param {string} userId - User ID
 * @param {number} limit - Number of shares to fetch
 * @returns {Object} { data, error } from Supabase
 */
async function _getUserShares(userId, limit = 50) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_shares')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        return { data, error };
    });
}

/**
 * FRIENDLY: Create a new Hi share with validation and processing
 * @param {Object} shareData - Hi share data
 * @returns {Object} { data, error } with friendly response
 */
export async function createHiShare(shareData) {
    // Validate required fields
    if (!shareData.user_id) {
        return {
            data: null,
            error: { message: 'user_id is required', code: 'VALIDATION_ERROR' }
        };
    }

    if (!shareData.message && !shareData.location) {
        return {
            data: null,
            error: { message: 'Either message or location is required', code: 'VALIDATION_ERROR' }
        };
    }

    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_shares')
            .insert([{
                ...shareData,
                created_at: new Date().toISOString(),
                is_public: shareData.is_public ?? true, // Default to public
                engagement_count: 0
            }])
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                share: data,
                message: 'Hi share created successfully',
                shareId: data.id,
                isPublic: data.is_public
            },
            error: null
        };
    });
}

/**
 * FRIENDLY: Get community Hi feed with metadata
 * @param {Object} options - Fetch options
 * @returns {Object} { data, error } with formatted feed
 */
export async function getCommunityFeed(options = {}) {
    const {
        limit = 20,
        offset = 0,
        location = null,
        timeframe = null
    } = options;

    return hiBaseClient.execute(async (client) => {
        let query = client
            .from('public_hi_feed')
            .select(`
                id,
                message,
                location,
                location_name,
                latitude,
                longitude,
                created_at,
                engagement_count,
                user_id,
                username,
                avatar_url
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Add location filter if specified
        if (location) {
            query = query.eq('location_name', location);
        }

        // Add timeframe filter if specified
        if (timeframe) {
            const timeLimit = new Date();
            switch (timeframe) {
                case 'hour':
                    timeLimit.setHours(timeLimit.getHours() - 1);
                    break;
                case 'day':
                    timeLimit.setDate(timeLimit.getDate() - 1);
                    break;
                case 'week':
                    timeLimit.setDate(timeLimit.getDate() - 7);
                    break;
            }
            query = query.gte('created_at', timeLimit.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                shares: data,
                count: data.length,
                hasMore: data.length === limit,
                nextOffset: offset + limit,
                filters: { location, timeframe }
            },
            error: null
        };
    });
}

/**
 * FRIENDLY: Get user's Hi history with stats
 * @param {string} userId - User ID
 * @param {Object} options - Fetch options
 * @returns {Object} { data, error } with user's shares and stats
 */
export async function getUserHiHistory(userId, options = {}) {
    const {
        limit = 20,
        offset = 0,
        includePrivate = false
    } = options;

    return hiBaseClient.execute(async (client) => {
        let query = client
            .from('hi_shares')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by visibility if needed
        if (!includePrivate) {
            query = query.eq('is_public', true);
        }

        const { data: shares, error: sharesError } = await query;

        if (sharesError) {
            return { data: null, error: sharesError };
        }

        // Get user's share statistics
        const { data: stats, error: statsError } = await client
            .from('hi_users')
            .select('total_shares, total_his, current_streak')
            .eq('id', userId)
            .single();

        if (statsError) {
            console.warn('Could not fetch user stats:', statsError);
        }

        return {
            data: {
                shares: shares,
                count: shares.length,
                hasMore: shares.length === limit,
                nextOffset: offset + limit,
                stats: stats || { total_shares: 0, total_his: 0, current_streak: 0 }
            },
            error: null
        };
    });
}

/**
 * Update share engagement (likes, views, etc.)
 * @param {string} shareId - Share ID
 * @param {string} action - Engagement action ('like', 'view', etc.)
 * @returns {Object} { data, error } with update confirmation
 */
export async function updateShareEngagement(shareId, action = 'like') {
    return hiBaseClient.execute(async (client) => {
        // First, get current engagement count
        const { data: currentShare, error: getError } = await client
            .from('hi_shares')
            .select('engagement_count')
            .eq('id', shareId)
            .single();

        if (getError) {
            return { data: null, error: getError };
        }

        // Increment engagement count
        const { data, error } = await client
            .from('hi_shares')
            .update({
                engagement_count: (currentShare.engagement_count || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', shareId)
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                share: data,
                action: action,
                newEngagementCount: data.engagement_count,
                message: `Share ${action} recorded`
            },
            error: null
        };
    });
}

/**
 * Delete a Hi share
 * @param {string} shareId - Share ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} { data, error } with deletion confirmation
 */
export async function deleteShare(shareId, userId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_shares')
            .delete()
            .eq('id', shareId)
            .eq('user_id', userId) // Ensure user owns the share
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                deletedShare: data,
                message: 'Hi share deleted successfully',
                timestamp: new Date().toISOString()
            },
            error: null
        };
    });
}

/**
 * Get share by ID with full details
 * @param {string} shareId - Share ID
 * @returns {Object} { data, error } with share details
 */
export async function getShareById(shareId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_shares')
            .select(`
                *,
                hi_users!inner(username, avatar_url, level)
            `)
            .eq('id', shareId)
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                share: data,
                user: data.hi_users,
                timeAgo: getTimeAgo(data.created_at)
            },
            error: null
        };
    });
}

/**
 * Helper: Get time ago string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Human-readable time ago
 */
function getTimeAgo(timestamp) {
    const now = new Date();
    const shareTime = new Date(timestamp);
    const diffMs = now - shareTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return shareTime.toLocaleDateString();
}

// Export top 3 functions with telemetry (80/20 rule)
export const insertShare = withTelemetry('shares.insertShare', _insertShare);
export const getPublicShares = withTelemetry('shares.getPublicShares', _getPublicShares);
export const getUserShares = withTelemetry('shares.getUserShares', _getUserShares);

// Export remaining functions without telemetry (keeping them as-is for now)