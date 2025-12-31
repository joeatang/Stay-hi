/**
 * lib/hibase/index.js
 * HiBase - Unified Supabase Access Layer for Hi App
 * 
 * Central export point for all HiBase modules
 * Provides clean importing: import { auth, users, shares } from '/lib/hibase'
 */

// Import all modules
import hiBaseClient from './HiBaseClient.js';
import * as auth from './auth.js';
import * as users from './users.js';
import * as shares from './shares.js';
import * as streaks from './streaks.js';
import * as referrals from './referrals.js';
import * as stats from './stats.js';

/**
 * HiBase - Unified API for all Hi App database operations
 * 
 * Usage Examples:
 * 
 * // Authentication
 * const { data, error } = await HiBase.auth.signIn(email, password);
 * 
 * // User Management
 * const profile = await HiBase.users.getProfile(userId);
 * await HiBase.users.updateProfile(userId, { username: 'newname' });
 * 
 * // Hi Shares
 * const feed = await HiBase.shares.getCommunityFeed({ limit: 20 });
 * await HiBase.shares.createHiShare({ user_id: userId, message: 'Hi!' });
 * 
 * // Streaks & Engagement
 * const streak = await HiBase.streaks.getUserStreak(userId);
 * await HiBase.streaks.updateStreak(userId);
 * 
 * // Referral System
 * await HiBase.referrals.redeemReferralCode(userId, 'HI123ABC');
 * const codes = await HiBase.referrals.getUserReferralStats(userId);
 * 
 * // Statistics & Leaderboards
 * const globalStats = await HiBase.stats.getGlobalStats();
 * const leaderboard = await HiBase.stats.getPointsLeaderboard(10);
 */
const HiBase = {
    // Core client for advanced operations
    client: hiBaseClient,

    // Authentication operations
    auth: {
        signUp: auth.signUp,
        signIn: auth.signIn,
        signOut: auth.signOut,
        getCurrentSession: auth.getCurrentSession,
        getCurrentUser: auth.getCurrentUser,
        resetPassword: auth.resetPassword,
        updatePassword: auth.updatePassword,
        updateUserMetadata: auth.updateUserMetadata,
        onAuthStateChange: auth.onAuthStateChange
    },

    // User management operations
    users: {
        createProfile: users.createProfile,
        getProfile: users.getProfile,
        getProfileByEmail: users.getProfileByEmail,
        updateProfile: users.updateProfile,
        deleteProfile: users.deleteProfile,
        profileExists: users.profileExists,
        getUserStats: users.getUserStats,
        searchUsers: users.searchUsers,
        getUserRank: users.getUserRank,
        updateUserActivity: users.updateUserActivity
    },

    // Hi shares operations
    shares: {
        // Raw operations
        insertShare: shares.insertShare,
        getPublicShares: shares.getPublicShares,
        getUserShares: shares.getUserShares,
        
        // Friendly operations
        createHiShare: shares.createHiShare,
        getCommunityFeed: shares.getCommunityFeed,
        getUserHiHistory: shares.getUserHiHistory,
        updateShareEngagement: shares.updateShareEngagement,
        deleteShare: shares.deleteShare,
        getShareById: shares.getShareById
    },

    // Streak management operations
    streaks: {
        getStreaks: streaks.getStreaks,
        getUserStreak: streaks.getUserStreak,
        getMyStreaks: streaks.getMyStreaks,
        insertStreak: streaks.insertStreak,
        updateStreak: streaks.updateStreak,
        useStreakFreeze: streaks.useStreakFreeze,
        getStreakLeaderboard: streaks.getStreakLeaderboard,
        addStreakFreezes: streaks.addStreakFreezes
    },

    // Direct function exports for convenience (as requested by user)
    getStreaks: streaks.getStreaks,
    insertStreak: streaks.insertStreak,
    updateStreak: streaks.updateStreak,

    // Referral system operations (server-safe with gift system)
    referrals: {
        createReferral: referrals.createReferral,
        redeemCode: referrals.redeemCode,
        giftHi: referrals.giftHi,
        getReferral: referrals.getReferral,
        getUserReferrals: referrals.getUserReferrals,
        getReferralStats: referrals.getReferralStats
    },

    // Statistics and analytics operations
    stats: {
        getGlobalStats: stats.getGlobalStats,
        insertMedallionTap: stats.insertMedallionTap,
        getPointsLeaderboard: stats.getPointsLeaderboard,
        getActivityLeaderboard: stats.getActivityLeaderboard,
        getRecentActivity: stats.getRecentActivity,
        getLocationStats: stats.getLocationStats,
        getUserRankings: stats.getUserRankings,
        getPerformanceAnalytics: stats.getPerformanceAnalytics,
        clearStatsCache: stats.clearStatsCache
    },

    // Utility methods
    utils: {
        /**
         * Test database connection across all modules
         * @returns {Object} Connection test results
         */
        async testConnection() {
            console.log('🔥 HiBase: Testing database connection...');
            
            const results = {
                client: await hiBaseClient.testConnection(),
                timestamp: new Date().toISOString()
            };

            if (results.client.error) {
                console.error('❌ HiBase connection test failed:', results.client.error);
            } else {
                console.log('✅ HiBase connection test passed');
            }

            return results;
        },

        /**
         * Get HiBase status and diagnostics
         * @returns {Object} Status information
         */
        getStatus() {
            return {
                client: hiBaseClient.getStatus(),
                modules: {
                    auth: 'loaded',
                    users: 'loaded', 
                    shares: 'loaded',
                    streaks: 'loaded',
                    referrals: 'loaded',
                    stats: 'loaded'
                },
                version: '1.0.0',
                initialized: new Date().toISOString()
            };
        },

        /**
         * Initialize HiBase and run diagnostics
         * @returns {Promise<Object>} Initialization result
         */
        async initialize() {
            console.log('🚀 HiBase: Initializing unified database access layer...');
            
            // Test connection
            const connectionTest = await this.testConnection();
            
            // Get status
            const status = this.getStatus();
            
            if (connectionTest.client.data) {
                console.log('✅ HiBase foundation active — unified API online.');
                
                // Make HiBase globally available for console testing
                if (typeof window !== 'undefined') {
                    window.HiBase = HiBase;
                    console.log('🧪 HiBase available globally for console testing: window.HiBase');
                    
                    // Dispatch event for components waiting for HiBase
                    try {
                        window.dispatchEvent(new CustomEvent('hibase:ready', { 
                            detail: { HiBase } 
                        }));
                    } catch (e) {
                        console.warn('⚠️ Failed to dispatch hibase:ready event:', e);
                    }
                }
            }
            
            return {
                success: !connectionTest.client.error,
                status,
                connectionTest
            };
        }
    }
};

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    // Browser environment - initialize after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            HiBase.utils.initialize();
        });
    } else {
        HiBase.utils.initialize();
    }
}

// Export individual modules for flexible importing
export { 
    hiBaseClient as client,
    auth, 
    users, 
    shares, 
    streaks, 
    referrals, 
    stats 
};

// Export unified HiBase object as default
export default HiBase;/* Export getMyStreaks 1765740071 */
