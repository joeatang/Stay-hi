/**
 * 🚀 TESLA-GRADE INCOGNITO-AWARE AUTHENTICATION SYSTEM
 * 
 * Bulletproof authentication that works in:
 * - Normal browsing mode
 * - Incognito/private mode
 * - With limited storage
 * - With network issues
 * - With CDN failures
 */

(function() {
    'use strict';

    console.log('🔐 Tesla Auth System loading...');

    // Tesla-grade configuration
    const AUTH_CONFIG = {
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        healthCheckInterval: 60000, // 1 minute
        retryDelays: [1000, 2000, 5000], // Exponential backoff
        maxRetries: 3,
        storageKeys: {
            session: 'tesla_auth_session',
            user: 'tesla_auth_user',
            lastCheck: 'tesla_auth_last_check',
            incognitoSession: 'tesla_incognito_session'
        }
    };

    // State management
    let authState = {
        initialized: false,
        authenticated: false,
        user: null,
        session: null,
        error: null,
        incognitoMode: false,
        lastHealthCheck: null
    };

    let supabaseClient = null;
    let authListeners = [];
    let healthMonitorInterval = null;

    /**
     * Wait for Tesla Supabase Manager to be ready
     */
    async function waitForSupabaseManager(timeout = 15000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Tesla Supabase Manager timeout'));
            }, timeout);

            const checkManager = () => {
                if (window.TeslaSupabaseManager && window.TeslaSupabaseManager.isReady()) {
                    clearTimeout(timeoutId);
                    resolve(window.TeslaSupabaseManager.client);
                } else if (window.TeslaSupabaseManager) {
                    // Manager exists but not ready, wait for it
                    window.TeslaSupabaseManager.getClient()
                        .then(client => {
                            clearTimeout(timeoutId);
                            resolve(client);
                        })
                        .catch(reject);
                } else {
                    // Manager not loaded, wait for it
                    setTimeout(checkManager, 100);
                }
            };

            checkManager();

            // Also listen for supabase-ready event
            window.addEventListener('supabase-ready', (event) => {
                clearTimeout(timeoutId);
                resolve(event.detail.client);
            }, { once: true });
        });
    }

    /**
     * Safe storage operations that work in incognito mode
     */
    const safeStorage = {
        get(key, fallbackToSession = true) {
            try {
                let value = localStorage.getItem(key);
                if (!value && fallbackToSession) {
                    value = sessionStorage.getItem(key);
                }
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.warn('Storage get error:', error.message);
                return null;
            }
        },

        set(key, value, useSessionStorage = false) {
            try {
                const serialized = JSON.stringify(value);
                
                if (useSessionStorage || authState.incognitoMode) {
                    sessionStorage.setItem(key, serialized);
                }
                
                // Always try localStorage as primary
                localStorage.setItem(key, serialized);
                return true;
            } catch (error) {
                console.warn('Storage set error:', error.message);
                // In incognito mode, this might fail - that's okay
                try {
                    sessionStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (sessionError) {
                    console.warn('Session storage also failed:', sessionError.message);
                    return false;
                }
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch (error) {
                console.warn('Storage remove error:', error.message);
            }
        },

        clear() {
            try {
                // Only clear our keys, not all storage
                Object.values(AUTH_CONFIG.storageKeys).forEach(key => {
                    this.remove(key);
                });
            } catch (error) {
                console.warn('Storage clear error:', error.message);
            }
        }
    };

    /**
     * Health check with retry logic
     */
    async function performHealthCheck() {
        if (!supabaseClient) return { healthy: false, error: 'No client' };

        for (let attempt = 0; attempt < AUTH_CONFIG.maxRetries; attempt++) {
            try {
                const { data, error } = await supabaseClient.auth.getSession();
                
                if (error) {
                    throw new Error(error.message);
                }

                const isHealthy = true;
                const hasSession = !!data?.session;
                
                // Update auth state
                authState.session = data.session;
                authState.user = data.session?.user || null;
                authState.authenticated = hasSession;
                authState.error = null;
                authState.lastHealthCheck = Date.now();

                // Cache session data
                if (hasSession) {
                    safeStorage.set(AUTH_CONFIG.storageKeys.session, data.session);
                    safeStorage.set(AUTH_CONFIG.storageKeys.user, data.session.user);
                } else {
                    safeStorage.remove(AUTH_CONFIG.storageKeys.session);
                    safeStorage.remove(AUTH_CONFIG.storageKeys.user);
                }

                safeStorage.set(AUTH_CONFIG.storageKeys.lastCheck, Date.now());

                return {
                    healthy: isHealthy,
                    authenticated: hasSession,
                    session: data.session,
                    user: data.session?.user,
                    attempt: attempt + 1
                };

            } catch (error) {
                console.warn(`Health check attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt < AUTH_CONFIG.maxRetries - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, AUTH_CONFIG.retryDelays[attempt])
                    );
                } else {
                    // Final attempt failed
                    authState.error = error.message;
                    return {
                        healthy: false,
                        authenticated: false,
                        error: error.message,
                        attempt: attempt + 1
                    };
                }
            }
        }
    }

    /**
     * Start periodic health monitoring
     */
    function startHealthMonitoring() {
        if (healthMonitorInterval) {
            clearInterval(healthMonitorInterval);
        }

        healthMonitorInterval = setInterval(async () => {
            try {
                const health = await performHealthCheck();
                
                if (!health.healthy) {
                    console.warn('🚨 Auth health check failed:', health.error);
                    
                    // Notify listeners of auth state change
                    notifyAuthStateChange('SIGNED_OUT', null);
                }
            } catch (error) {
                console.warn('Health monitor error:', error.message);
            }
        }, AUTH_CONFIG.healthCheckInterval);
    }

    /**
     * Notify auth state change listeners
     */
    function notifyAuthStateChange(event, session) {
        authListeners.forEach(listener => {
            try {
                listener(event, session);
            } catch (error) {
                console.warn('Auth listener error:', error.message);
            }
        });

        // Also dispatch global event
        window.dispatchEvent(new CustomEvent('tesla-auth-state-change', {
            detail: { event, session, authState }
        }));
    }

    /**
     * Initialize authentication system
     */
    async function initialize() {
        if (authState.initialized) {
            return authState;
        }

        try {
            console.log('🔐 Tesla Auth System initializing...');

            // Wait for Supabase manager
            supabaseClient = await waitForSupabaseManager();
            
            // Check if we're in incognito mode
            authState.incognitoMode = window.TeslaSupabaseManager?.incognitoMode || false;
            
            console.log(`🔐 Auth environment: ${authState.incognitoMode ? 'Incognito' : 'Normal'}`);

            // Set up auth state change listener
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state change:', event, !!session);
                
                authState.session = session;
                authState.user = session?.user || null;
                authState.authenticated = !!session;
                
                if (session) {
                    safeStorage.set(AUTH_CONFIG.storageKeys.session, session);
                    safeStorage.set(AUTH_CONFIG.storageKeys.user, session.user);
                } else {
                    safeStorage.remove(AUTH_CONFIG.storageKeys.session);
                    safeStorage.remove(AUTH_CONFIG.storageKeys.user);
                }

                notifyAuthStateChange(event, session);
            });

            // Perform initial health check
            const health = await performHealthCheck();
            console.log('🔐 Initial auth status:', {
                healthy: health.healthy,
                authenticated: health.authenticated,
                user: health.user?.email,
                incognito: authState.incognitoMode
            });

            // Start health monitoring
            startHealthMonitoring();

            authState.initialized = true;
            
            console.log('✅ Tesla Auth System ready');
            
            return authState;

        } catch (error) {
            console.error('❌ Tesla Auth System initialization failed:', error);
            authState.error = error.message;
            throw error;
        }
    }

    /**
     * Sign in with email (magic link)
     */
    async function signInWithEmail(email, options = {}) {
        try {
            console.log('📧 Sending magic link to:', email);

            if (!supabaseClient) {
                throw new Error('Auth system not initialized');
            }

            const redirectTo = options.redirectTo || (
                window.hiPostAuthPath?.getPostAuthURL
                    ? window.hiPostAuthPath.getPostAuthURL({ next: options.next || 'hi-dashboard.html' })
                    : `${window.location.origin}/post-auth.html?next=${encodeURIComponent(options.next || 'hi-dashboard.html')}`
            );

            const { data, error } = await supabaseClient.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: redirectTo
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            console.log('✅ Magic link sent successfully');
            return { data, error: null };

        } catch (error) {
            console.error('❌ Sign in error:', error);
            return { data: null, error };
        }
    }

    /**
     * Sign out user
     */
    async function signOut() {
        try {
            console.log('🚪 Signing out user...');

            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }

            // Clear cached auth data
            safeStorage.clear();

            // Update auth state
            authState.authenticated = false;
            authState.user = null;
            authState.session = null;

            console.log('✅ User signed out successfully');
            return { error: null };

        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { error };
        }
    }

    /**
     * Get current session
     */
    async function getSession() {
        try {
            if (!supabaseClient) {
                // Try to get from cache
                const cachedSession = safeStorage.get(AUTH_CONFIG.storageKeys.session);
                if (cachedSession) {
                    return { data: { session: cachedSession }, error: null };
                }
                throw new Error('Auth system not initialized');
            }

            const { data, error } = await supabaseClient.auth.getSession();
            return { data, error };

        } catch (error) {
            console.warn('Get session error:', error.message);
            return { data: { session: null }, error };
        }
    }

    /**
     * Get current user
     */
    async function getUser() {
        try {
            if (!supabaseClient) {
                // Try to get from cache
                const cachedUser = safeStorage.get(AUTH_CONFIG.storageKeys.user);
                if (cachedUser) {
                    return { data: { user: cachedUser }, error: null };
                }
                throw new Error('Auth system not initialized');
            }

            const { data, error } = await supabaseClient.auth.getUser();
            return { data, error };

        } catch (error) {
            console.warn('Get user error:', error.message);
            return { data: { user: null }, error };
        }
    }

    /**
     * Check if user is authenticated
     */
    async function isAuthenticated() {
        try {
            const { data } = await getSession();
            return !!data?.session;
        } catch {
            return false;
        }
    }

    /**
     * Add auth state change listener
     */
    function onAuthStateChange(callback) {
        authListeners.push(callback);

        // Return unsubscribe function
        return () => {
            const index = authListeners.indexOf(callback);
            if (index > -1) {
                authListeners.splice(index, 1);
            }
        };
    }

    /**
     * Require authentication (redirect if not authenticated)
     */
    async function requireAuth(redirectTo = '/signin.html') {
        const authenticated = await isAuthenticated();
        
        if (!authenticated) {
            const currentPath = encodeURIComponent(location.pathname + location.search);
            location.href = `${redirectTo}?next=${currentPath}`;
            return false;
        }
        
        return true;
    }

    // Export Tesla Auth System
    window.TeslaAuth = {
        // Core methods
        initialize,
        signInWithEmail,
        signOut,
        getSession,
        getUser,
        isAuthenticated,
        requireAuth,
        onAuthStateChange,

        // State accessors
        get state() { return { ...authState }; },
        get initialized() { return authState.initialized; },
        get authenticated() { return authState.authenticated; },
        get user() { return authState.user; },
        get session() { return authState.session; },
        get incognitoMode() { return authState.incognitoMode; },

        // Utilities
        performHealthCheck,
        clearCache: () => safeStorage.clear(),
        
        // Internal (for debugging)
        _authState: authState,
        _safeStorage: safeStorage,
        _config: AUTH_CONFIG
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Wait a bit for Supabase manager to load
            setTimeout(() => {
                initialize().catch(error => {
                    console.error('Tesla Auth auto-initialization failed:', error);
                });
            }, 500);
        });
    } else {
        // DOM already loaded
        setTimeout(() => {
            initialize().catch(error => {
                console.error('Tesla Auth immediate initialization failed:', error);
            });
        }, 100);
    }

    console.log('🔐 Tesla Auth System loaded');

})();