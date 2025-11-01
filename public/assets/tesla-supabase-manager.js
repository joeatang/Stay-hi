/**
 * 🚀 TESLA-GRADE SUPABASE CLIENT MANAGER
 * 
 * Bulletproof Supabase initialization with:
 * - Incognito mode compatibility
 * - CDN fallback loading
 * - Session persistence optimization
 * - Health monitoring
 * - Error recovery
 */

(function() {
    'use strict';

    console.log('🚀 Tesla Supabase Manager loading...');

    // Configuration - Tesla-grade reliability
    const CONFIG = {
        url: 'https://gfcubvroxgfvjhacinic.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g',
        cdn: [
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
            'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js'
        ],
        timeout: 15000,
        retries: 3
    };

    // State management
    let clientInstance = null;
    let initializationPromise = null;
    let isIncognitoMode = null;
    let healthMonitor = null;

    /**
     * Detect incognito mode with Tesla-grade accuracy
     */
    async function detectIncognitoMode() {
        if (isIncognitoMode !== null) return isIncognitoMode;

        try {
            // Method 1: Storage quota (most reliable)
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                if (estimate.quota < 120000000) { // < 120MB typical for incognito
                    isIncognitoMode = true;
                    return true;
                }
            }

            // Method 2: indexedDB test
            const testDB = await new Promise((resolve) => {
                const request = indexedDB.open('incognito-test');
                request.onsuccess = () => resolve(true);
                request.onerror = () => resolve(false);
                setTimeout(() => resolve(false), 100);
            });

            if (!testDB) {
                isIncognitoMode = true;
                return true;
            }

            // Method 3: localStorage limit test
            try {
                const testKey = 'incognito-test-' + Date.now();
                const testData = 'x'.repeat(1024 * 1024); // 1MB
                localStorage.setItem(testKey, testData);
                localStorage.removeItem(testKey);
                isIncognitoMode = false;
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    isIncognitoMode = true;
                    return true;
                }
            }

        } catch (error) {
            console.warn('🕵️ Incognito detection failed, assuming incognito for safety:', error.message);
            isIncognitoMode = true;
        }

        isIncognitoMode = isIncognitoMode ?? false;
        console.log(`🕵️ Incognito mode: ${isIncognitoMode ? 'DETECTED' : 'Normal browsing'}`);
        return isIncognitoMode;
    }

    /**
     * Load Supabase CDN with fallback and retry logic
     */
    async function loadSupabaseCDN() {
        if (window.supabase) {
            console.log('✅ Supabase already loaded');
            return true;
        }

        for (let cdnIndex = 0; cdnIndex < CONFIG.cdn.length; cdnIndex++) {
            const cdnUrl = CONFIG.cdn[cdnIndex];
            
            for (let retry = 0; retry < CONFIG.retries; retry++) {
                try {
                    console.log(`📥 Loading Supabase from ${cdnUrl} (attempt ${retry + 1})`);
                    
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = cdnUrl;
                        script.async = true;
                        
                        const timeout = setTimeout(() => {
                            reject(new Error('CDN load timeout'));
                        }, CONFIG.timeout);
                        
                        script.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        
                        script.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('CDN load failed'));
                        };
                        
                        document.head.appendChild(script);
                    });

                    // Wait for Supabase to be available
                    await new Promise((resolve, reject) => {
                        let checks = 0;
                        const checkInterval = setInterval(() => {
                            checks++;
                            if (window.supabase) {
                                clearInterval(checkInterval);
                                resolve();
                            } else if (checks > 50) { // 5 second timeout
                                clearInterval(checkInterval);
                                reject(new Error('Supabase object not available after load'));
                            }
                        }, 100);
                    });

                    console.log(`✅ Supabase loaded successfully from ${cdnUrl}`);
                    return true;

                } catch (error) {
                    console.warn(`⚠️ CDN ${cdnUrl} failed (attempt ${retry + 1}):`, error.message);
                    
                    if (retry === CONFIG.retries - 1 && cdnIndex === CONFIG.cdn.length - 1) {
                        throw new Error('All CDN sources failed to load Supabase');
                    }
                }
            }
        }

        return false;
    }

    /**
     * Create Supabase client with incognito-optimized settings
     */
    function createClient() {
        console.log('🔧 Creating Supabase client...');
        
        const clientOptions = {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'pkce' // More secure and reliable
            }
        };

        // Incognito mode optimizations
        if (isIncognitoMode) {
            console.log('🕵️ Applying incognito mode optimizations...');
            clientOptions.auth.storageKey = 'sb-incognito-' + Date.now(); // Unique key per session
            clientOptions.auth.storage = {
                // Custom storage that degrades gracefully
                getItem: (key) => {
                    try {
                        return sessionStorage.getItem(key) || localStorage.getItem(key);
                    } catch {
                        return null;
                    }
                },
                setItem: (key, value) => {
                    try {
                        sessionStorage.setItem(key, value);
                        localStorage.setItem(key, value);
                    } catch {
                        // Ignore storage errors in incognito
                    }
                },
                removeItem: (key) => {
                    try {
                        sessionStorage.removeItem(key);
                        localStorage.removeItem(key);
                    } catch {
                        // Ignore storage errors in incognito
                    }
                }
            };
        }

        const client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, clientOptions);
        
        // Add health monitoring
        client._teslaHealthCheck = async () => {
            try {
                const { data, error } = await client.auth.getSession();
                return { healthy: !error, session: !!data?.session, error: error?.message };
            } catch (error) {
                return { healthy: false, session: false, error: error.message };
            }
        };

        return client;
    }

    /**
     * Initialize health monitoring
     */
    function startHealthMonitor(client) {
        if (healthMonitor) {
            clearInterval(healthMonitor);
        }

        healthMonitor = setInterval(async () => {
            try {
                const health = await client._teslaHealthCheck();
                
                if (!health.healthy) {
                    console.warn('🚨 Supabase client health issue:', health.error);
                    
                    // Attempt recovery
                    if (health.error.includes('network') || health.error.includes('fetch')) {
                        console.log('🔄 Network issue detected, will retry on next operation');
                    }
                }
            } catch (error) {
                console.warn('🚨 Health monitor error:', error.message);
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Main initialization function
     */
    async function initialize() {
        if (clientInstance) {
            return clientInstance;
        }

        if (initializationPromise) {
            return initializationPromise;
        }

        initializationPromise = (async () => {
            try {
                console.log('🚀 Tesla Supabase Manager initializing...');
                
                // Step 1: Detect environment
                await detectIncognitoMode();
                
                // Step 2: Load Supabase library
                await loadSupabaseCDN();
                
                // Step 3: Create client
                clientInstance = createClient();
                
                // Step 4: Verify connection
                const health = await clientInstance._teslaHealthCheck();
                if (!health.healthy) {
                    throw new Error(`Initial health check failed: ${health.error}`);
                }
                
                // Step 5: Start monitoring
                startHealthMonitor(clientInstance);
                
                // Step 6: Set global references
                window.supabaseClient = clientInstance;
                window.sb = clientInstance;
                
                console.log('✅ Tesla Supabase Manager ready');
                console.log('   Client:', !!clientInstance);
                console.log('   Incognito:', isIncognitoMode);
                console.log('   Health:', health.healthy);
                
                // Step 7: Notify other scripts
                const event = new CustomEvent('supabase-ready', { 
                    detail: { 
                        client: clientInstance, 
                        incognito: isIncognitoMode,
                        health: health
                    } 
                });
                window.dispatchEvent(event);
                
                return clientInstance;
                
            } catch (error) {
                console.error('❌ Tesla Supabase Manager initialization failed:', error);
                initializationPromise = null; // Allow retry
                throw error;
            }
        })();

        return initializationPromise;
    }

    /**
     * Get client with lazy initialization
     */
    function getClient() {
        if (clientInstance) {
            return Promise.resolve(clientInstance);
        }
        return initialize();
    }

    /**
     * Utility functions
     */
    function isReady() {
        return !!clientInstance;
    }

    function getHealth() {
        if (!clientInstance) return null;
        return clientInstance._teslaHealthCheck();
    }

    function reset() {
        if (healthMonitor) {
            clearInterval(healthMonitor);
            healthMonitor = null;
        }
        clientInstance = null;
        initializationPromise = null;
        isIncognitoMode = null;
        window.supabaseClient = null;
        window.sb = null;
    }

    // Export Tesla Supabase Manager
    window.TeslaSupabaseManager = {
        initialize,
        getClient,
        isReady,
        getHealth,
        reset,
        get incognitoMode() { return isIncognitoMode; },
        get client() { return clientInstance; }
    };

    // Auto-initialize if Supabase is already loaded
    if (window.supabase) {
        initialize().catch(error => {
            console.error('Auto-initialization failed:', error);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initialize().catch(error => {
                console.error('DOMContentLoaded initialization failed:', error);
            });
        });
    } else {
        // DOM already loaded, initialize immediately
        initialize().catch(error => {
            console.error('Immediate initialization failed:', error);
        });
    }

    console.log('🚀 Tesla Supabase Manager loaded');

})();