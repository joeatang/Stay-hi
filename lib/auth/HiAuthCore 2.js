/**
 * lib/auth/HiAuthCore.js
 * Tesla-grade authentication core for HiBase integration
 * 
 * Provides unified identity management with Supabase integration
 * Zero UI changes, strict security guardrails maintained
 */

import { getClient } from '../HiSupabase.js';

class HiAuthCore {
    constructor() {
        this.supabase = null;
        this.authStateListeners = new Set();
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.supabase = getClient();
            
            // Set up auth state change listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                // Notify all registered listeners
                this.authStateListeners.forEach(callback => {
                    try {
                        callback(event, session);
                    } catch (error) {
                        console.warn('Auth state listener error:', error);
                    }
                });
            });
            
            this.initialized = true;
            console.log('HiAuthCore initialized');
        } catch (error) {
            console.error('HiAuthCore initialization failed:', error);
        }
    }

    /**
     * Get current active identity
     * Returns { data: { userId, email, isAnon, jwt }, error }
     */
    async getActiveIdentity() {
        await this.init();
        
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error) {
                return {
                    data: { userId: null, email: null, isAnon: true, jwt: null },
                    error: null // Offline bridging - return anon instead of error
                };
            }

            if (!user) {
                // No authenticated user - return anonymous identity
                return {
                    data: { userId: null, email: null, isAnon: true, jwt: null },
                    error: null
                };
            }

            // Get session for JWT
            const { data: { session } } = await this.supabase.auth.getSession();

            return {
                data: {
                    userId: user.id,
                    email: user.email,
                    isAnon: false,
                    jwt: session?.access_token || null
                },
                error: null
            };
        } catch (error) {
            // Offline bridging - never fail completely
            return {
                data: { userId: null, email: null, isAnon: true, jwt: null },
                error: error.message
            };
        }
    }

    /**
     * Require authentication - throws if no valid session
     */
    async requireAuth() {
        const { data, error } = await this.getActiveIdentity();
        
        if (error || data.isAnon || !data.userId) {
            throw new Error('Authentication required');
        }
        
        return data;
    }

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Auth state callback must be a function');
        }
        
        this.authStateListeners.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.authStateListeners.delete(callback);
        };
    }

    /**
     * Attempt silent session refresh
     */
    async refreshSession() {
        await this.init();
        
        try {
            const { data, error } = await this.supabase.auth.refreshSession();
            
            if (error) {
                return { data: null, error: error.message };
            }
            
            return { data: data.session, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }

    /**
     * Sign in with email/password or OTP
     */
    async signIn(email, otpOrPassword) {
        await this.init();
        
        try {
            let result;
            
            if (!otpOrPassword) {
                // Magic link / OTP sign in
                result = await this.supabase.auth.signInWithOtp({
                    email: email,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
            } else {
                // Password sign in
                result = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: otpOrPassword
                });
            }
            
            return {
                data: result.data,
                error: result.error?.message || null
            };
        } catch (error) {
            return {
                data: null,
                error: error.message
            };
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        await this.init();
        
        try {
            const { error } = await this.supabase.auth.signOut();
            
            return {
                data: !error,
                error: error?.message || null
            };
        } catch (error) {
            return {
                data: false,
                error: error.message
            };
        }
    }

    /**
     * Sign up new user
     */
    async signUp(email, password) {
        await this.init();
        
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            
            return {
                data: data,
                error: error?.message || null
            };
        } catch (error) {
            return {
                data: null,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const hiAuthCore = new HiAuthCore();

// Export singleton and class for different usage patterns
export default hiAuthCore;
export { HiAuthCore };