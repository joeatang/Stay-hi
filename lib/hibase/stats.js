/**
 * lib/hibase/stats.js - METRICS SEPARATION MODULE
 * Clean API for Hi Waves (medallion taps) vs Total Hi5s (share submissions)
 * 
 * Provides separated metrics with telemetry and HiBase {data, error} format
 * Eliminates cross-contamination between medallion taps and share submissions
 */

import hiBaseClient from './HiBaseClient.js';
import { withTelemetry } from './_telemetry.js';

/**
 * METRICS SEPARATION: Get Hi Waves count (medallion taps only)
 * @returns {Promise<{data: number|null, error: string|null}>}
 */
const getHiWaves = withTelemetry('getHiWaves', async () => {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.rpc('get_hi_waves');
        
        if (error) {
            return {
                data: null,
                error: `Failed to get Hi Waves: ${error.message}`
            };
        }
        
        // Extract count from database response
        const waveCount = data?.data || 0;
        
        return {
            data: waveCount,
            error: null
        };
    });
});

/**
 * METRICS SEPARATION: Get Total Hi5s count (share submissions, all visibilities)
 * @returns {Promise<{data: number|null, error: string|null}>}
 */
const getTotalHi5s = withTelemetry('getTotalHi5s', async () => {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.rpc('get_total_hi5s');
        
        if (error) {
            return {
                data: null,
                error: `Failed to get Total Hi5s: ${error.message}`
            };
        }
        
        // Extract count from database response
        const hi5Count = data?.data || 0;
        
        return {
            data: hi5Count,
            error: null
        };
    });
});

/**
 * METRICS SEPARATION: Insert medallion tap event (for medallion click handlers)
 * @param {string|null} userId - User ID or null for anonymous
 * @returns {Promise<{data: number|null, error: string|null}>}
 */
const insertMedallionTap = withTelemetry('insertMedallionTap', async (userId = null) => {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.rpc('insert_medallion_tap', {
            tap_user_id: userId
        });
        
        if (error) {
            return {
                data: null,
                error: `Failed to insert medallion tap: ${error.message}`
            };
        }
        
        // Extract new count from database response
        const newCount = data?.data || 0;
        
        return {
            data: newCount,
            error: null
        };
    });
});

/**
 * METRICS SEPARATION: Get both metrics efficiently (for dashboard)
 * @returns {Promise<{waves: {data: number|null, error: string|null}, hi5s: {data: number|null, error: string|null}}>}
 */
const getMetrics = withTelemetry('getMetrics', async () => {
    // Fetch both metrics in parallel for efficiency
    const [wavesResult, hi5sResult] = await Promise.all([
        getHiWaves(),
        getTotalHi5s()
    ]);
    
    return {
        waves: wavesResult,
        hi5s: hi5sResult
    };
});

// LEGACY COMPATIBILITY: Preserved for existing code that depends on it
async function _getGlobalStats(forceRefresh = false) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.rpc('get_global_stats');

        if (error) {
            return { data: null, error };
        }

        const enhancedStats = {
            activeUsers24h: data.active_users_24h || 0,
            totalHis: data.total_his || 0,
            hiWaves: data.hi_waves || 0,
            totalUsers: data.total_users || 0,
            averageHisPerUser: data.total_users > 0 ? Math.round(data.total_his / data.total_users) : 0,
            updatedAt: data.updated_at || new Date().toISOString(),
            fromCache: false
        };

        return {
            data: enhancedStats,
            error: null
        };
    });
}

/**
 * Get points-based leaderboard with caching
 * @param {number} limit - Number of top users to return
 * @param {Object} options - Additional options
 * @returns {Object} { data, error } with leaderboard data
 */
async function _getPointsLeaderboard(limit = 10, options = {}) {
    const {
        timeframe = 'all_time', // 'all_time', 'monthly', 'weekly'
        includeAnonymous = false
    } = options;

    return hiBaseClient.execute(async (client) => {
        let query = client
            .from('hi_users')
            .select('id, username, points, level, total_his, current_streak, avatar_url')
            .order('points', { ascending: false })
            .limit(limit);

        // Filter out anonymous users if requested
        if (!includeAnonymous) {
            query = query.not('username', 'is', null);
        }

        // Add timeframe filters if needed
        if (timeframe === 'monthly') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            query = query.gte('updated_at', monthAgo.toISOString());
        } else if (timeframe === 'weekly') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            query = query.gte('updated_at', weekAgo.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            return { data: null, error };
        }

        const leaderboard = data.map((user, index) => ({
            rank: index + 1,
            ...user,
            isChampion: index === 0,
            pointsFormatted: formatNumber(user.points)
        }));

        return {
            data: {
                leaderboard,
                count: data.length,
                timeframe,
                topPoints: data[0]?.points || 0,
                averagePoints: data.length > 0 ? Math.round(data.reduce((sum, u) => sum + u.points, 0) / data.length) : 0
            },
            error: null
        };
    });
}

/**
 * Get Hi activity leaderboard
 * @param {number} limit - Number of top users to fetch
 * @returns {Object} { data, error } with activity leaderboard
 */
async function _getActivityLeaderboard(limit = 10) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select('id, username, total_his, total_shares, current_streak, level, avatar_url')
            .order('total_his', { ascending: false })
            .not('username', 'is', null)
            .limit(limit);

        if (error) {
            return { data: null, error };
        }

        const leaderboard = data.map((user, index) => ({
            rank: index + 1,
            ...user,
            isMostActive: index === 0,
            activityScore: user.total_his + (user.total_shares * 2) + (user.current_streak * 5)
        }));

        return {
            data: {
                leaderboard,
                count: data.length,
                topActivity: data[0]?.total_his || 0,
                totalCommunityHis: data.reduce((sum, u) => sum + u.total_his, 0)
            },
            error: null
        };
    });
}

/**
 * Get recent Hi activity feed
 * @param {number} limit - Number of recent activities to fetch
 * @returns {Object} { data, error } with recent activity
 */
export async function getRecentActivity(limit = 20) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('public_hi_feed')
            .select(`
                id,
                message,
                location_name,
                created_at,
                engagement_count,
                username,
                avatar_url,
                level
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return { data: null, error };
        }

        const activities = data.map(activity => ({
            ...activity,
            timeAgo: getTimeAgo(activity.created_at),
            hasLocation: !!activity.location_name,
            hasMessage: !!activity.message
        }));

        return {
            data: {
                activities,
                count: data.length,
                latestActivity: data[0]?.created_at,
                totalEngagement: data.reduce((sum, a) => sum + (a.engagement_count || 0), 0)
            },
            error: null
        };
    });
}

/**
 * Get location-based statistics
 * @param {string} location - Location name (optional)
 * @returns {Object} { data, error } with location stats
 */
export async function getLocationStats(location = null) {
    return hiBaseClient.execute(async (client) => {
        let query = client
            .from('public_hi_feed')
            .select('location_name, created_at')
            .not('location_name', 'is', null);

        if (location) {
            query = query.eq('location_name', location);
        }

        const { data, error } = await query;

        if (error) {
            return { data: null, error };
        }

        if (location) {
            // Stats for specific location
            const today = new Date().toISOString().split('T')[0];
            const todayHis = data.filter(h => h.created_at.startsWith(today)).length;
            
            return {
                data: {
                    location: location,
                    totalHis: data.length,
                    hisToday: todayHis,
                    firstHi: data.length > 0 ? data[data.length - 1].created_at : null,
                    latestHi: data.length > 0 ? data[0].created_at : null
                },
                error: null
            };
        } else {
            // Global location statistics
            const locationCounts = {};
            data.forEach(hi => {
                const loc = hi.location_name;
                locationCounts[loc] = (locationCounts[loc] || 0) + 1;
            });

            const topLocations = Object.entries(locationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([location, count], index) => ({
                    rank: index + 1,
                    location,
                    hiCount: count,
                    isHotspot: index === 0
                }));

            return {
                data: {
                    totalLocations: Object.keys(locationCounts).length,
                    topLocations,
                    totalLocationHis: data.length,
                    hottestSpot: topLocations[0]?.location || null
                },
                error: null
            };
        }
    });
}

/**
 * Get user ranking for specific user
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with user's rankings
 */
export async function getUserRankings(userId) {
    return hiBaseClient.execute(async (client) => {
        // Get user data
        const { data: userData, error: userError } = await client
            .from('hi_users')
            .select('points, total_his, current_streak, level')
            .eq('id', userId)
            .single();

        if (userError) {
            return { data: null, error: userError };
        }

        // Get rankings
        const [pointsRank, activityRank, streakRank] = await Promise.all([
            // Points ranking
            client
                .from('hi_users')
                .select('*', { count: 'exact', head: true })
                .gt('points', userData.points),
            
            // Activity ranking
            client
                .from('hi_users')
                .select('*', { count: 'exact', head: true })
                .gt('total_his', userData.total_his),
            
            // Streak ranking
            client
                .from('hi_users')
                .select('*', { count: 'exact', head: true })
                .gt('current_streak', userData.current_streak)
        ]);

        return {
            data: {
                user: userData,
                rankings: {
                    points: {
                        rank: (pointsRank.count || 0) + 1,
                        value: userData.points,
                        category: 'Points'
                    },
                    activity: {
                        rank: (activityRank.count || 0) + 1,
                        value: userData.total_his,
                        category: 'Total His'
                    },
                    streak: {
                        rank: (streakRank.count || 0) + 1,
                        value: userData.current_streak,
                        category: 'Current Streak'
                    }
                },
                bestRanking: Math.min(
                    (pointsRank.count || 0) + 1,
                    (activityRank.count || 0) + 1,
                    (streakRank.count || 0) + 1
                )
            },
            error: null
        };
    });
}

/**
 * Get performance analytics for admins
 * @returns {Object} { data, error } with performance metrics
 */
export async function getPerformanceAnalytics() {
    return hiBaseClient.execute(async (client) => {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get various time-based metrics
        const [
            { count: hisLast24h },
            { count: hisLastWeek },
            { count: newUsersLast24h },
            { count: newUsersLastWeek }
        ] = await Promise.all([
            client
                .from('hi_shares')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', dayAgo.toISOString()),
            
            client
                .from('hi_shares')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', weekAgo.toISOString()),
            
            client
                .from('hi_users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', dayAgo.toISOString()),
            
            client
                .from('hi_users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', weekAgo.toISOString())
        ]);

        const dailyGrowthRate = newUsersLast24h > 0 ? ((newUsersLast24h / (newUsersLastWeek || 1)) * 100).toFixed(2) : 0;
        const hiVelocity = hisLast24h; // His per day

        return {
            data: {
                engagement: {
                    hisLast24h: hisLast24h || 0,
                    hisLastWeek: hisLastWeek || 0,
                    hiVelocity: hiVelocity,
                    weeklyAverage: Math.round((hisLastWeek || 0) / 7)
                },
                growth: {
                    newUsersLast24h: newUsersLast24h || 0,
                    newUsersLastWeek: newUsersLastWeek || 0,
                    dailyGrowthRate: parseFloat(dailyGrowthRate),
                    weeklyGrowthRate: newUsersLastWeek || 0
                },
                timestamp: now.toISOString()
            },
            error: null
        };
    });
}

/**
 * Clear stats cache
 */
export function clearStatsCache() {
    statsCache.data = null;
    statsCache.timestamp = null;
    console.log('📊 HiBase.stats: Cache cleared');
}

/**
 * Helper: Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

/**
 * Helper: Get time ago string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Human-readable time ago
 */
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
}

// METRICS SEPARATION: Export new clean API functions
export { getHiWaves, getTotalHi5s, insertMedallionTap, getMetrics };

// LEGACY: Export existing functions with telemetry (for gradual migration)
export const getGlobalStats = withTelemetry('stats.getGlobalStats', _getGlobalStats);
export const getPointsLeaderboard = withTelemetry('stats.getPointsLeaderboard', _getPointsLeaderboard);
export const getActivityLeaderboard = withTelemetry('stats.getActivityLeaderboard', _getActivityLeaderboard);

// Export remaining functions without telemetry (keeping them as-is for now)