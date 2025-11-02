/**
 * lib/hibase/users.js
 * User profile CRUD operations for Hi App
 * 
 * Provides create, read, update, delete operations for user profiles
 * All functions return structured { data, error } responses
 */

import hiBaseClient from './HiBaseClient.js';
import { withTelemetry } from './_telemetry.js';

/**
 * Create a new user profile
 * @param {Object} profileData - User profile data
 * @returns {Object} { data, error } with created profile or error
 */
export async function createProfile(profileData) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .insert([{
                ...profileData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                profile: data,
                message: 'Profile created successfully'
            },
            error: null
        };
    });
}

/**
 * Get user profile by ID
 * @param {string} userId - User ID to fetch
 * @returns {Object} { data, error } with profile data or error
 */
async function _getProfile(userId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                profile: data,
                exists: !!data
            },
            error: null
        };
    });
}

/**
 * Get user profile by email
 * @param {string} email - User email
 * @returns {Object} { data, error } with profile or error
 */
export async function getProfileByEmail(email) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                profile: data,
                exists: !!data
            },
            error: null
        };
    });
}

/**
 * Update user profile
 * @param {string} userId - User ID to update
 * @param {Object} updates - Profile updates
 * @returns {Object} { data, error } with updated profile or error
 */
async function _updateProfile(userId, updates) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .update({
                ...updates,
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
                profile: data,
                message: 'Profile updated successfully'
            },
            error: null
        };
    });
}

/**
 * Delete user profile
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with deletion confirmation
 */
export async function deleteProfile(userId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .delete()
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                deletedProfile: data,
                message: 'Profile deleted successfully',
                timestamp: new Date().toISOString()
            },
            error: null
        };
    });
}

/**
 * Check if user profile exists
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with existence check
 */
export async function profileExists(userId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select('id')
            .eq('id', userId)
            .single();

        return {
            data: {
                exists: !error && !!data,
                userId: userId
            },
            error: error?.code === 'PGRST116' ? null : error // PGRST116 is "not found"
        };
    });
}

/**
 * Get user's Hi stats and activity summary
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with user stats
 */
export async function getUserStats(userId) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select(`
                id,
                username,
                total_his,
                current_streak,
                longest_streak,
                level,
                points,
                total_shares,
                created_at
            `)
            .eq('id', userId)
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                stats: data,
                daysSinceJoined: Math.floor((new Date() - new Date(data.created_at)) / (1000 * 60 * 60 * 24))
            },
            error: null
        };
    });
}

/**
 * Search users by username or email
 * @param {string} query - Search query
 * @param {number} limit - Result limit (default 10)
 * @returns {Object} { data, error } with search results
 */
export async function searchUsers(query, limit = 10) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .select('id, username, email, level, points, avatar_url')
            .or(`username.ilike.%${query}%, email.ilike.%${query}%`)
            .limit(limit);

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                users: data,
                count: data.length,
                query: query
            },
            error: null
        };
    });
}

/**
 * Get user leaderboard position
 * @param {string} userId - User ID
 * @returns {Object} { data, error } with leaderboard position
 */
export async function getUserRank(userId) {
    return hiBaseClient.execute(async (client) => {
        // Get user's points first
        const { data: userData, error: userError } = await client
            .from('hi_users')
            .select('points, level')
            .eq('id', userId)
            .single();

        if (userError) {
            return { data: null, error: userError };
        }

        // Count users with higher points
        const { count, error: countError } = await client
            .from('hi_users')
            .select('*', { count: 'exact', head: true })
            .gt('points', userData.points);

        if (countError) {
            return { data: null, error: countError };
        }

        return {
            data: {
                rank: count + 1,
                points: userData.points,
                level: userData.level,
                message: `Ranked #${count + 1} on the leaderboard`
            },
            error: null
        };
    });
}

/**
 * Bulk update user activity (Hi counts, streaks, etc.)
 * @param {string} userId - User ID
 * @param {Object} activityData - Activity updates
 * @returns {Object} { data, error } with update confirmation
 */
export async function updateUserActivity(userId, activityData) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client
            .from('hi_users')
            .update({
                ...activityData,
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
                profile: data,
                message: 'User activity updated successfully'
            },
            error: null
        };
    });
}

/**
 * Upload user avatar to Supabase Storage
 * @param {File} file - Avatar image file
 * @param {string} userId - User ID for the avatar
 * @returns {Object} { data, error } with avatar URL or error
 */
async function _uploadAvatar(file, userId) {
    return hiBaseClient.execute(async (client) => {
        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name?.split('.').pop() || 'jpg';
        const fileName = `avatar_${userId}_${timestamp}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await client.storage
            .from('avatars')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            // Try fallback strategy for anonymous users
            if (uploadError.message?.includes('row-level security') || 
                uploadError.message?.includes('insufficient_privilege')) {
                
                const fallbackPath = `temp/${fileName}`;
                const { data: fallbackData, error: fallbackError } = await client.storage
                    .from('avatars')
                    .upload(fallbackPath, file, {
                        contentType: file.type,
                        upsert: true
                    });

                if (fallbackError) {
                    return { data: null, error: fallbackError };
                }
                
                // Get public URL for fallback
                const { data: urlData } = client.storage
                    .from('avatars')
                    .getPublicUrl(fallbackPath);

                return {
                    data: {
                        avatarUrl: urlData.publicUrl,
                        filePath: fallbackPath,
                        message: 'Avatar uploaded successfully (temporary)'
                    },
                    error: null
                };
            }
            
            return { data: null, error: uploadError };
        }

        // Get public URL
        const { data: urlData } = client.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update profile with new avatar URL
        const { error: updateError } = await client
            .from('hi_users')
            .update({ 
                avatar_url: urlData.publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            // Avatar uploaded but profile update failed - still return URL
            console.warn('Avatar uploaded but profile update failed:', updateError);
        }

        return {
            data: {
                avatarUrl: urlData.publicUrl,
                filePath: filePath,
                message: 'Avatar uploaded and profile updated successfully'
            },
            error: null
        };
    });
}

// Export top 3 functions with telemetry (80/20 rule)
export const getProfile = withTelemetry('users.getProfile', _getProfile);
export const updateProfile = withTelemetry('users.updateProfile', _updateProfile);
export const uploadAvatar = withTelemetry('users.uploadAvatar', _uploadAvatar);

// Export remaining functions without telemetry (keeping them as-is for now)