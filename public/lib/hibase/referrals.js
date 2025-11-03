/**
 * HiBase Referrals Module
 * Server-safe referral code generation with gift system integration
 * 
 * Features:
 * - Server-generated codes only (no client minting)
 * - Gift system: giftHi(fromUserId, toEmail)
 * - Extended schema: type, issued_by, redeemed_by, status, expires_at
 * - Stan signups and Gift-a-Hi use same secure backend
 * - All functions return { data, error } format
 */

import hiBaseClient from './HiBaseClient.js';
import { withTelemetry } from './_telemetry.js';
import hiAuthCore from '../auth/HiAuthCore.js';

/**
 * Create a referral code (server-generated only)
 * @param {Object} params - Referral parameters
 * @param {string} params.type - 'signup' or 'gift'
 * @param {string} params.issued_by - User ID who creates the referral
 * @param {string} [params.recipient_email] - For gift type referrals
 * @param {number} [params.expires_hours=168] - Hours until expiration (default: 7 days)
 * @returns {Promise<Object>} { data, error } with created referral
 */
async function _createReferral(params) {
    return hiBaseClient.execute(async (client) => {
        try {
            // Server-side function generates secure code
            const { data, error } = await client
                .rpc('create_referral_code', {
                    referral_type: params.type,
                    issuer_id: params.issued_by,
                    recipient_email: params.recipient_email || null,
                    expires_hours: params.expires_hours || 168 // 7 days default
                });

            if (error) {
                return { data: null, error };
            }

            return { data, error: null };

        } catch (error) {
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Create referral failed',
                    code: error.code || 'CREATE_REFERRAL_ERROR'
                }
            };
        }
    });
}

/**
 * Redeem a referral code
 * @param {Object} params - Redemption parameters
 * @param {string} params.code - Referral code to redeem
 * @param {string} params.redeemed_by - User ID redeeming the code
 * @returns {Promise<Object>} { data, error } with redemption result
 */
async function _redeemCode(params) {
    return hiBaseClient.execute(async (client) => {
        try {
            // Server-side validation and reward processing
            const { data, error } = await client
                .rpc('redeem_referral_code', {
                    referral_code: params.code,
                    redeemer_id: params.redeemed_by
                });

            if (error) {
                return { data: null, error };
            }

            return { data, error: null };

        } catch (error) {
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Redeem code failed',
                    code: error.code || 'REDEEM_CODE_ERROR'
                }
            };
        }
    });
}

/**
 * Gift a Hi invitation to someone (auth-aware)
 * @param {Object} params - Gift parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} [params.message] - Optional gift message
 * @returns {Promise<Object>} { data, error } with gift referral data
 */
async function _giftHi(params) {
    // Get authenticated user ID from HiAuthCore
    let fromUserId;
    try {
        const { data: authData } = await hiAuthCore.getActiveIdentity();
        if (authData.isAnon || !authData.userId) {
            return {
                data: null,
                error: { message: 'Authentication required to send gift', code: 'AUTH_REQUIRED' }
            };
        }
        fromUserId = authData.userId;
    } catch (error) {
        return {
            data: null,
            error: { message: 'Authentication failed', code: 'AUTH_ERROR' }
        };
    }

    try {
        // Create gift-type referral
        const referralResult = await _createReferral({
            type: 'gift',
            issued_by: fromUserId,
            recipient_email: params.toEmail,
            expires_hours: 720 // 30 days for gifts
        });

        if (referralResult.error) {
            return referralResult;
        }

        const referral = referralResult.data;

        // Generate gift share data
        const giftData = {
            referral_code: referral.code,
            share_url: `${window.location.origin}/welcome.html?gift=${referral.code}`,
            recipient_email: params.toEmail,
            sender_name: referral.issuer_name || 'A friend',
            message: params.message || 'Someone thought you might enjoy Hi!',
            expires_at: referral.expires_at
        };

        return { data: giftData, error: null };

    } catch (error) {
        return { 
            data: null, 
            error: { 
                message: error.message || 'Gift Hi failed',
                code: error.code || 'GIFT_HI_ERROR'
            }
        };
    }
}

/**
 * Get referral details by code
 * @param {string} code - Referral code to lookup
 * @returns {Promise<Object>} { data, error } with referral details
 */
async function _getReferral(code) {
    return hiBaseClient.execute(async (client) => {
        try {
            const { data, error } = await client
                .from('referrals')
                .select(`
                    id, code, type, status, expires_at,
                    issued_by, redeemed_by, created_at,
                    issuer:profiles!referrals_issued_by_fkey(display_name),
                    redeemer:profiles!referrals_redeemed_by_fkey(display_name)
                `)
                .eq('code', code)
                .single();

            if (error) {
                return { data: null, error };
            }

            return { data, error: null };

        } catch (error) {
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Get referral failed',
                    code: error.code || 'GET_REFERRAL_ERROR'
                }
            };
        }
    });
}

/**
 * Get user's referral history (codes they've created)
 * @param {string} userId - User ID to get referrals for
 * @returns {Promise<Object>} { data, error } with user's referral codes
 */
async function _getUserReferrals(userId) {
    return hiBaseClient.execute(async (client) => {
        try {
            const { data, error } = await client
                .from('referrals')
                .select(`
                    id, code, type, status, created_at, expires_at,
                    redeemer:profiles!referrals_redeemed_by_fkey(display_name)
                `)
                .eq('issued_by', userId)
                .order('created_at', { ascending: false });

            if (error) {
                return { data: null, error };
            }

            return { data: data || [], error: null };

        } catch (error) {
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Get user referrals failed',
                    code: error.code || 'GET_USER_REFERRALS_ERROR'
                }
            };
        }
    });
}

/**
 * Get referral stats for user (how many people they've referred)
 * @param {string} userId - User ID to get stats for
 * @returns {Promise<Object>} { data, error } with referral statistics
 */
async function _getReferralStats(userId) {
    return hiBaseClient.execute(async (client) => {
        try {
            const { data, error } = await client
                .rpc('get_referral_stats', {
                    user_id: userId
                });

            if (error) {
                return { data: null, error };
            }

            const stats = data || {
                total_referrals: 0,
                successful_referrals: 0,
                pending_referrals: 0,
                expired_referrals: 0,
                total_rewards: 0
            };

            return { data: stats, error: null };

        } catch (error) {
            return { 
                data: null, 
                error: { 
                    message: error.message || 'Get referral stats failed',
                    code: error.code || 'GET_REFERRAL_STATS_ERROR'
                }
            };
        }
    });
}

// Export functions wrapped with telemetry
export const createReferral = withTelemetry('referrals.createReferral', _createReferral);
export const redeemCode = withTelemetry('referrals.redeemCode', _redeemCode);
export const giftHi = withTelemetry('referrals.giftHi', _giftHi);
export const getReferral = withTelemetry('referrals.getReferral', _getReferral);
export const getUserReferrals = withTelemetry('referrals.getUserReferrals', _getUserReferrals);
export const getReferralStats = withTelemetry('referrals.getReferralStats', _getReferralStats);