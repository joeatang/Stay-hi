/**
 * lib/hibase/streaks.js
 * Hi streak operations for user engagement tracking
 * 
 * Provides streak read/update operations with validation
 * Tracks daily Hi activity and maintains streak counters
 */

import hiBaseClient from './HiBaseClient.js';
import { withTelemetry } from './_telemetry.js';
import hiAuthCore from '../auth/HiAuthCore.js';

/**
 * Get streaks (alias for getUserStreak for backward compatibility)
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with streak data
 */
async function _getStreaks(userId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select(`
                id,
                username,
                current_streak,
                longest_streak,
                last_hi_date,
                streak_freeze_count,
                total_his,
                created_at
            `)
            .eq('id', userId)
            .single();

        if (error) {
            return { data: null, error };
        }

        const streakData = calculateStreakStatus(data);

        return {
            data: {
                ...streakData,
                user: {
                    id: data.id,
                    username: data.username,
                    memberSince: data.created_at
                }
            },
            error: null
        };
    });
}

/**
 * Update user streak with manual overrides and flexible signatures
 * @param {string|Object} userIdOrPayload - User ID or complete payload object  
 * @param {Object} options - Update options (when first param is userId)
 * @returns {Object} { data, error } with updated streak data
 */
async function _updateStreak(userIdOrPayload, options = {}) {
    const {
        hiDate = new Date().toISOString().split('T')[0], // Today's date
        freezeUsed = false,
        count = null,        // Manual streak count override
        last_hi = null       // Manual last Hi date override
    } = options;

    return hiBaseClient.execute(async (client) => {
        // Get current streak data
        const { data: current, error: getCurrentError } = await client
            .from('hi_users')
            .select('current_streak, longest_streak, last_hi_date, streak_freeze_count, total_his')
            .eq('id', userId)
            .single();

        if (getCurrentError) {
            return { data: null, error: getCurrentError };
        }

        // Calculate new streak values or use manual overrides
        let streakUpdate;
        let finalHiDate = hiDate;
        let finalCount = (current.total_his || 0) + 1;

        if (count !== null || last_hi !== null) {
            // Manual override mode
            console.log('📊 Manual streak update:', { count, last_hi, userId });
            
            streakUpdate = {
                currentStreak: count !== null ? count : current.current_streak,
                longestStreak: Math.max(
                    current.longest_streak || 0, 
                    count !== null ? count : current.current_streak
                ),
                freezeCount: current.streak_freeze_count,
                isNewRecord: count > (current.longest_streak || 0),
                streakChange: count !== null ? count - (current.current_streak || 0) : 0
            };
            
            if (last_hi !== null) {
                finalHiDate = last_hi;
            }
        } else {
            // Automatic streak calculation
            streakUpdate = calculateStreakUpdate(current, hiDate, freezeUsed);
        }

        // Update the database
        const { data, error } = await client
            .from('hi_users')
            .update({
                current_streak: streakUpdate.currentStreak,
                longest_streak: streakUpdate.longestStreak,
                last_hi_date: finalHiDate,
                streak_freeze_count: streakUpdate.freezeCount,
                total_his: finalCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                streak: {
                    current: data.current_streak,
                    longest: data.longest_streak,
                    isNewRecord: streakUpdate.isNewRecord,
                    streakChange: streakUpdate.streakChange
                },
                activity: {
                    lastHiDate: data.last_hi_date,
                    totalHis: data.total_his,
                    freezeCount: data.streak_freeze_count
                },
                message: getStreakMessage(streakUpdate)
            },
            error: null
        };
    });
}

/**
 * Use a streak freeze to maintain streak
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with freeze usage result
 */
export async function useStreakFreeze() {
    // Get authenticated user ID from HiAuthCore
    let userId;
    try {
        const { data: authData } = await hiAuthCore.getActiveIdentity();
        if (authData.isAnon || !authData.userId) {
            return {
                data: null,
                error: { message: 'Authentication required to use streak freeze', code: 'AUTH_REQUIRED' }
            };
        }
        userId = authData.userId;
    } catch (error) {
        return {
            data: null,
            error: { message: 'Authentication failed', code: 'AUTH_ERROR' }
        };
    }
    return hiBaseClient.execute(async (client) => {
        // Check if user has freezes available
        const { data: current, error: getCurrentError } = await client
            .from('hi_users')
            .select('streak_freeze_count, current_streak, last_hi_date')
            .eq('id', userId)
            .single();

        if (getCurrentError) {
            return { data: null, error: getCurrentError };
        }

        if ((current.streak_freeze_count || 0) < 1) {
            return {
                data: null,
                error: { message: 'No streak freezes available', code: 'NO_FREEZES' }
            };
        }

        // Use a freeze (extend last_hi_date by 1 day)
        const lastHiDate = new Date(current.last_hi_date);
        lastHiDate.setDate(lastHiDate.getDate() + 1);
        const newLastHiDate = lastHiDate.toISOString().split('T')[0];

        const { data, error } = await client
            .from('hi_users')
            .update({
                streak_freeze_count: current.streak_freeze_count - 1,
                last_hi_date: newLastHiDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                streak: {
                    current: data.current_streak,
                    freezesRemaining: data.streak_freeze_count
                },
                freeze: {
                    used: true,
                    extendedUntil: newLastHiDate,
                    message: 'Streak freeze used - your streak is safe!'
                }
            },
            error: null
        };
    });
}

/**
 * Get streak leaderboard
 * @param {number} limit - Number of users to fetch
 * @returns {Object} { data, error } with leaderboard
 */
export async function getStreakLeaderboard(limit = 10) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select('id, username, current_streak, longest_streak, total_his, avatar_url, level')
            .order('current_streak', { ascending: false })
            .limit(limit);

        if (error) {
            return { data: null, error };
        }

        const leaderboard = data.map((user, index) => ({
            rank: index + 1,
            ...user,
            streakDays: user.current_streak,
            isStreakKing: index === 0 && user.current_streak > 0
        }));

        return {
            data: {
                leaderboard,
                count: data.length,
                topStreak: data[0]?.current_streak || 0
            },
            error: null
        };
    });
}

/**
 * Get authenticated user's streak information (auth-aware)
 * @returns {Object} { data, error } with streak data
 */
export async function getMyStreaks() {
    // Get authenticated user ID from HiAuthCore
    let userId;
    try {
        const { data: authData } = await hiAuthCore.getActiveIdentity();
        if (authData.isAnon || !authData.userId) {
            return {
                data: null,
                error: { message: 'Authentication required to view streaks', code: 'AUTH_REQUIRED' }
            };
        }
        userId = authData.userId;
    } catch (error) {
        return {
            data: null,
            error: { message: 'Authentication failed', code: 'AUTH_ERROR' }
        };
    }

    return _getStreaks(userId);
}

/**
 * Get multiple users' streak information (backward compatibility - use getMyStreaks for auth-aware version)
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with streak data
 */
// Direct export removed to avoid duplicate - using telemetry-wrapped version below
// This function is now internal-only since the exported version is the telemetry-wrapped one
async function getStreaksInternal(userId) {
    return _getStreaks(userId);
}

/**
 * Insert new streak record or initialize streak for new user
 * @param {string|Object} userIdOrPayload - User ID or complete payload object
 * @param {Object} options - Initial streak options (when first param is userId)
 * @returns {Object} { data, error } with created streak
 */
async function _insertStreak(userIdOrPayload, options = {}) {
    // Handle both signatures: insertStreak(userId, options) and insertStreak(payload)
    let userId, initialStreak, hiDate, metadata;
    
    if (typeof userIdOrPayload === 'string') {
        // Traditional signature: insertStreak(userId, options)
        userId = userIdOrPayload;
        initialStreak = options.initialStreak || 1;
        hiDate = options.hiDate || new Date().toISOString().split('T')[0];
        metadata = options.metadata || {};
    } else {
        // New signature: insertStreak(payload)
        const payload = userIdOrPayload;
        userId = payload.user_id;
        initialStreak = payload.initialStreak || 1;
        hiDate = payload.hiDate || new Date(payload.timestamp || Date.now()).toISOString().split('T')[0];
        metadata = {
            type: payload.type,
            emotion: payload.emotion,
            source: payload.source || 'unknown',
            timestamp: payload.timestamp || Date.now(),
            ...payload.metadata
        };
    }

    return hiBaseClient.execute(async (client) => {
        // Check if user already has streak data
        const { data: existing } = await client
            .from('hi_users')
            .select('current_streak, longest_streak, last_hi_date')
            .eq('id', userId)
            .single();

        if (existing && existing.current_streak !== null) {
            // User already has streak data, use updateStreak instead
            return updateStreak(userId, { hiDate });
        }

        // Initialize streak for new user
        const { data, error } = await client
            .from('hi_users')
            .update({
                current_streak: initialStreak,
                longest_streak: initialStreak,
                last_hi_date: hiDate,
                streak_freeze_count: 3, // Default freeze count for new users
                total_his: 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        // Log streak activity with metadata if provided
        if (Object.keys(metadata).length > 0) {
            console.log('📊 Streak initialized with metadata:', {
                userId,
                streak: initialStreak,
                type: metadata.type,
                emotion: metadata.emotion,
                source: metadata.source
            });
        }

        const welcomeMessage = metadata.type === 'HiGYM' 
            ? '💪 HiGYM streak journey started! Keep building that emotional fitness!'
            : '🎉 Welcome! Your Hi streak journey begins now!';

        return {
            data: {
                streak: {
                    current: data.current_streak,
                    longest: data.longest_streak,
                    lastHiDate: data.last_hi_date,
                    freezesRemaining: data.streak_freeze_count
                },
                metadata: metadata,
                message: welcomeMessage
            },
            error: null
        };
    });
}

/**
 * Add streak freezes to user account
 * @param {string} userId - User ID
 * @param {number} freezesToAdd - Number of freezes to add
 * @param {string} reason - Reason for adding freezes
 * @returns {Object} { data, error } with updated freeze count
 */
export async function addStreakFreezes(userId, freezesToAdd, reason = 'Manual addition') {
    return hiBaseClient.execute(async (client) => {
        // Get current freeze count
        const { data: current, error: getCurrentError } = await client
            .from('hi_users')
            .select('streak_freeze_count')
            .eq('id', userId)
            .single();

        if (getCurrentError) {
            return { data: null, error: getCurrentError };
        }

        const newFreezeCount = (current.streak_freeze_count || 0) + freezesToAdd;

        const { data, error } = await client
            .from('hi_users')
            .update({
                streak_freeze_count: newFreezeCount,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                freezes: {
                    previous: current.streak_freeze_count || 0,
                    added: freezesToAdd,
                    new: newFreezeCount,
                    reason: reason
                },
                message: `Added ${freezesToAdd} streak freeze${freezesToAdd > 1 ? 's' : ''}`
            },
            error: null
        };
    });
}

/**
 * Helper: Calculate streak status from user data
 * @param {Object} userData - User data from database
 * @returns {Object} Calculated streak information
 */
function calculateStreakStatus(userData) {
    const today = new Date().toISOString().split('T')[0];
    const lastHiDate = userData.last_hi_date;
    
    if (!lastHiDate) {
        return {
            current: 0,
            longest: userData.longest_streak || 0,
            status: 'inactive',
            daysUntilBreak: 0,
            canUseFreeze: false,
            freezesAvailable: userData.streak_freeze_count || 0
        };
    }

    const daysSinceLastHi = Math.floor((new Date(today) - new Date(lastHiDate)) / (1000 * 60 * 60 * 24));
    
    let status = 'active';
    let canUseFreeze = false;
    
    if (daysSinceLastHi === 0) {
        status = 'completed_today';
    } else if (daysSinceLastHi === 1) {
        status = 'due_today';
    } else if (daysSinceLastHi === 2) {
        status = 'at_risk';
        canUseFreeze = (userData.streak_freeze_count || 0) > 0;
    } else if (daysSinceLastHi > 2) {
        status = 'broken';
    }

    return {
        current: userData.current_streak || 0,
        longest: userData.longest_streak || 0,
        status: status,
        daysSinceLastHi: daysSinceLastHi,
        daysUntilBreak: Math.max(0, 2 - daysSinceLastHi),
        canUseFreeze: canUseFreeze,
        freezesAvailable: userData.streak_freeze_count || 0,
        lastHiDate: lastHiDate
    };
}

/**
 * Helper: Calculate streak update values
 * @param {Object} current - Current streak data
 * @param {string} hiDate - Date of Hi activity
 * @param {boolean} freezeUsed - Whether freeze was used
 * @returns {Object} Updated streak values
 */
function calculateStreakUpdate(current, hiDate, freezeUsed) {
    const today = new Date().toISOString().split('T')[0];
    const lastHiDate = current.last_hi_date;
    
    let currentStreak = current.current_streak || 0;
    let longestStreak = current.longest_streak || 0;
    let freezeCount = current.streak_freeze_count || 0;
    let streakChange = 0;
    
    if (!lastHiDate) {
        // First Hi ever
        currentStreak = 1;
        streakChange = 1;
    } else {
        const daysSinceLastHi = Math.floor((new Date(hiDate) - new Date(lastHiDate)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastHi === 0) {
            // Same day - no change
            streakChange = 0;
        } else if (daysSinceLastHi === 1) {
            // Consecutive day - increment streak
            currentStreak += 1;
            streakChange = 1;
        } else if (daysSinceLastHi === 2 && freezeUsed) {
            // Used freeze to bridge gap
            currentStreak += 1;
            streakChange = 1;
            freezeCount -= 1;
        } else {
            // Streak broken
            currentStreak = 1;
            streakChange = -current.current_streak + 1;
        }
    }
    
    // Update longest streak if needed
    const isNewRecord = currentStreak > longestStreak;
    if (isNewRecord) {
        longestStreak = currentStreak;
    }
    
    return {
        currentStreak,
        longestStreak,
        freezeCount,
        streakChange,
        isNewRecord
    };
}

/**
 * Helper: Get streak message based on update
 * @param {Object} update - Streak update data
 * @returns {string} Human-readable message
 */
function getStreakMessage(update) {
    if (update.isNewRecord) {
        return `🔥 New personal record! ${update.currentStreak} days and counting!`;
    } else if (update.streakChange > 0) {
        return `⚡ Streak continued! Day ${update.currentStreak} of your Hi journey`;
    } else if (update.streakChange < 0) {
        return `💔 Streak broken, but starting fresh! Back to day 1`;
    } else {
        return `✅ Hi recorded for today - streak safe at ${update.currentStreak} days`;
    }
}

// Export top 3 functions with telemetry (80/20 rule)
export const getStreaks = withTelemetry('streaks.getStreaks', _getStreaks);
export const insertStreak = withTelemetry('streaks.insertStreak', _insertStreak);
export const updateStreak = withTelemetry('streaks.updateStreak', _updateStreak);

// Export remaining functions without telemetry (keeping them as-is for now)