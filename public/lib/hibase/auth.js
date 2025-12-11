/**
 * lib/hibase/auth.js
 * Authentication operations for Hi App
 * 
 * Provides signup, login, logout, and session management
 * All functions return structured { data, error } responses
 */

import hiBaseClient from './HiBaseClient.js';
import { withTelemetry } from './_telemetry.js';

/**
 * Sign up a new user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @param {Object} metadata - Optional user metadata
 * @returns {Object} { data, error } with user data or error
 */
async function _signUp(email, password, metadata = {}) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                user: data.user,
                session: data.session,
                needsConfirmation: !data.session,
                message: data.session ? 'Sign up successful' : 'Please check your email for confirmation'
            },
            error: null
        };
    });
}

/**
 * Sign in an existing user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Object} { data, error } with session data or error
 */
async function _signIn(email, password) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                user: data.user,
                session: data.session,
                accessToken: data.session?.access_token,
                message: 'Sign in successful'
            },
            error: null
        };
    });
}

/**
 * Sign out the current user
 * @returns {Object} { data, error } with logout confirmation
 */
async function _signOut() {
    return hiBaseClient.execute(async (client) => {
        const { error } = await client.auth.signOut();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                message: 'Sign out successful',
                timestamp: new Date().toISOString()
            },
            error: null
        };
    });
}

/**
 * Get current user session
 * @returns {Object} { data, error } with current session or null
 */
export async function getCurrentSession() {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.getSession();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                session: data.session,
                user: data.session?.user || null,
                isAuthenticated: !!data.session,
                expiresAt: data.session?.expires_at
            },
            error: null
        };
    });
}

/**
 * Get current authenticated user
 * @returns {Object} { data, error } with user data or null
 */
export async function getCurrentUser() {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.getUser();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                user: data.user,
                isAuthenticated: !!data.user,
                email: data.user?.email,
                userId: data.user?.id,
                metadata: data.user?.user_metadata
            },
            error: null
        };
    });
}

/**
 * Reset password for user email
 * @param {string} email - User email address
 * @returns {Object} { data, error } with reset confirmation
 */
export async function resetPassword(email) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/public/reset-password.html`
        });

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                message: 'Password reset email sent',
                email: email,
                timestamp: new Date().toISOString()
            },
            error: null
        };
    });
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Object} { data, error } with update confirmation
 */
export async function updatePassword(newPassword) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.updateUser({
            password: newPassword
        });

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                user: data.user,
                message: 'Password updated successfully',
                timestamp: new Date().toISOString()
            },
            error: null
        };
    });
}

/**
 * Update user metadata
 * @param {Object} metadata - User metadata to update
 * @returns {Object} { data, error } with update confirmation
 */
export async function updateUserMetadata(metadata) {
    return hiBaseClient.execute(async (client) => {
        const { data, error } = await client.auth.updateUser({
            data: metadata
        });

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                user: data.user,
                metadata: data.user?.user_metadata,
                message: 'User metadata updated successfully'
            },
            error: null
        };
    });
}

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function for auth state changes
 * @returns {Object} Unsubscribe function
 */
export function onAuthStateChange(callback) {
    const client = hiBaseClient.getClient();
    if (!client) {
        console.warn('⚠️ HiBase.auth: Cannot set up auth listener, client not ready');
        return { unsubscribe: () => {} };
    }

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
        callback({
            event,
            session,
            user: session?.user || null,
            isAuthenticated: !!session
        });
    });

    return listener;
}

// Export top 3 functions with telemetry (80/20 rule)
export const signUp = withTelemetry('auth.signUp', _signUp);
export const signIn = withTelemetry('auth.signIn', _signIn);  
export const signOut = withTelemetry('auth.signOut', _signOut);

// Export remaining functions without telemetry (keeping them as-is for now)