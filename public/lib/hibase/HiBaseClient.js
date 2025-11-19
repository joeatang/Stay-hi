/**
 * lib/hibase/HiBaseClient.js
 * Singleton Supabase client wrapper with connection validation
 * 
 * Provides unified access to Supabase client with error handling
 * and connection state management
 */

import { getClient } from '../HiSupabase.js';

class HiBaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.lastError = null;
        this.initialize();
    }

    /**
     * Initialize the Supabase client connection
     */
    initialize() {
        try {
            this.client = getClient();
            this.isConnected = true;
            this.lastError = null;
            console.log('🔥 HiBaseClient: Connection established');
        } catch (error) {
            console.error('❌ HiBaseClient: Connection failed', error);
            this.isConnected = false;
            this.lastError = error;
        }
    }

    /**
     * Get the Supabase client instance
     * @returns {Object} Supabase client or null if not connected
     */
    getClient() {
        if (!this.isConnected || !this.client) {
            console.warn('⚠️ HiBaseClient: Client not connected, attempting reconnect...');
            this.initialize();
        }
        return this.client;
    }

    /**
     * Check if client is ready for operations
     * @returns {Boolean} Connection status
     */
    isReady() {
        return this.isConnected && this.client !== null;
    }

    /**
     * Get connection status and diagnostics
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            connected: this.isConnected,
            hasClient: this.client !== null,
            lastError: this.lastError,
            clientUrl: this.client?.supabaseUrl || null
        };
    }

    /**
     * Execute a database operation with error handling
     * @param {Function} operation - Async function that performs DB operation
     * @returns {Object} { data, error } response
     */
    async execute(operation) {
        if (!this.isReady()) {
            return {
                data: null,
                error: { message: 'HiBaseClient not connected', code: 'CLIENT_NOT_READY' }
            };
        }

        try {
            const result = await operation(this.client);
            return result;
        } catch (error) {
            console.error('❌ HiBaseClient operation failed:', error);
            return {
                data: null,
                error: {
                    message: error.message,
                    code: error.code || 'OPERATION_FAILED',
                    details: error
                }
            };
        }
    }

    /**
     * Test the database connection
     * @returns {Object} { data, error } with connection test result
     */
    async testConnection() {
        return this.execute(async (client) => {
            // Connectivity probe against a known existing table
            try {
                const { data, error } = await client
                  .from('public_shares')
                  .select('id')
                  .limit(1);
                if (error) {
                    return { data: null, error };
                }
                return {
                    data: {
                        connected: true,
                        timestamp: new Date().toISOString(),
                        message: 'HiBase connection test successful'
                    },
                    error: null
                };
            } catch (err) {
                return { data: null, error: { message: err.message || String(err), code: 'TEST_FAILED' } };
            }
        });
    }
}

// Create and export singleton instance
const hiBaseClient = new HiBaseClient();

export default hiBaseClient;