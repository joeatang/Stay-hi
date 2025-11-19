/**
 * HiFlags - Tesla-grade feature flag system
 * 
 * Hi DEV Standard: Controlled rollouts with graceful fallbacks
 * Data Source: Supabase hi_flags table with local JSON fallback
 */

import { getClient } from '/lib/HiSupabase.js';
import { isEnabledFor, getIdentity, getRollout } from '../rollout/HiRollout.js';

class HiFlags {
    constructor() {
        this.flags = new Map();
        this.initialized = false;
        this.fallbackFlags = null;
        
        console.log('HiFlags active');
        
        // Initialize immediately
        this.initialize();
    }

    /**
     * Initialize flag system with Supabase connection
     */
    async initialize() {
        try {
            // Load local fallback flags
            await this.loadFallbackFlags();
            
            // Attempt remote flag loading
            await this.loadRemoteFlags();
            
            this.initialized = true;
            this.logCurrentFlags();
            
        } catch (error) {
            console.warn('HiFlags initialization failed, using fallback:', error);
            this.loadFromFallback();
            this.initialized = true;
        }
    }

    /**
     * Load local fallback flags from JSON
     */
    async loadFallbackFlags() {
        try {
            const url = new URL('./flags/flags.json', import.meta.url);
            const response = await fetch(url.href);
            this.fallbackFlags = await response.json();
        } catch (error) {
            console.warn('HiFlags: Could not load fallback flags:', error);
            this.fallbackFlags = this.getHardcodedDefaults();
        }
    }

    /**
     * Load flags from Supabase hi_flags table
     */
    async loadRemoteFlags() {
        try {
            const supa = getClient();
            const { data, error } = await supa.from('hi_flags').select('flag_name, enabled, description');

            if (error) {
                console.warn('HiFlags: remote load failed; using fallback');
                this.loadFromFallback();
                return;
            }

            // Convert array to Map for efficient lookup
            this.flags.clear();
            data.forEach(flag => {
                this.flags.set(flag.flag_name, {
                    enabled: flag.enabled,
                    description: flag.description,
                    lastUpdated: new Date().toISOString(),
                    source: 'remote'
                });
            });

            console.log(`HiFlags: remote flags loaded (${data.length})`);

        } catch (error) {
            console.warn('HiFlags: remote load failed; using fallback');
            this.loadFromFallback();
        }
    }

    /**
     * Load from local fallback when remote is unavailable
     */
    loadFromFallback() {
        if (!this.fallbackFlags) {
            this.fallbackFlags = this.getHardcodedDefaults();
        }

        this.flags.clear();
        Object.entries(this.fallbackFlags).forEach(([name, config]) => {
            this.flags.set(name, {
                enabled: config.enabled,
                description: config.description,
                lastUpdated: new Date().toISOString(),
                source: 'fallback'
            });
        });

        console.log(`HiFlags: Loaded ${this.flags.size} flags from fallback`);
    }

    /**
     * Get feature flag value
     * @param {string} name - Flag name
     * @param {boolean} defaultValue - Default if flag not found
     * @returns {boolean} - Flag enabled state
     */
    getFlag(name, defaultValue = false) {
        if (!this.initialized) {
            console.warn(`HiFlags: Not initialized, using default for ${name}`);
            return defaultValue;
        }

        const flag = this.flags.get(name);
        if (!flag) {
            console.warn(`HiFlags: Flag '${name}' not found, using default:`, defaultValue);
            return defaultValue;
        }

        return flag.enabled;
    }

    /**
     * Get all flag information (for debugging)
     * @returns {Object} - All flags with metadata
     */
    getAllFlags() {
        const result = {};
        this.flags.forEach((flag, name) => {
            result[name] = {
                enabled: flag.enabled,
                description: flag.description,
                source: flag.source,
                lastUpdated: flag.lastUpdated
            };
        });
        return result;
    }

    /**
     * Set flag value (admin-only, stub for now)
     * @param {string} name - Flag name
     * @param {boolean} value - New flag value
     * @param {string} description - Flag description
     */
    async setFlag(name, value, description = '') {
        // Stub implementation - will be replaced with admin authentication
        console.warn('HiFlags.setFlag: Admin-only operation (stubbed)');
        
        if (!this.supabaseClient) {
            console.warn('HiFlags: Cannot set flag - Supabase not available');
            return { success: false, error: 'Supabase not available' };
        }

        try {
            // This would require service role authentication in production
            const { data, error } = await this.supabaseClient
                .from('hi_flags')
                .upsert({
                    flag_name: name,
                    enabled: value,
                    description: description,
                    last_updated: new Date().toISOString()
                });

            if (error) {
                console.error('HiFlags: Could not set flag:', error);
                return { success: false, error: error.message };
            }

            // Update local cache
            this.flags.set(name, {
                enabled: value,
                description: description,
                lastUpdated: new Date().toISOString(),
                source: 'remote'
            });

            console.log(`HiFlags: Set ${name} = ${value}`);
            return { success: true, data };

        } catch (error) {
            console.error('HiFlags: setFlag failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Refresh flags from remote source
     */
    async refresh() {
        if (this.supabaseClient) {
            await this.loadRemoteFlags();
        } else {
            await this.loadFallbackFlags();
            this.loadFromFallback();
        }
        this.logCurrentFlags();
    }

    /**
     * Check if specific flag is enabled (convenience method)
     */
    isEnabled(name) {
        return this.getFlag(name, false);
    }

    /**
     * Get hardcoded defaults as last resort
     */
    getHardcodedDefaults() {
        return {
            referrals_enabled: { enabled: false, description: 'Enable referral system' },
            token_rewire_mode: { enabled: false, description: 'Enable design tokens' },
            hi_map_animation: { enabled: true, description: 'Enable map animations' },
            premium_ux_effects: { enabled: true, description: 'Enable glassmorphism effects' },
            monitoring_analytics: { enabled: true, description: 'Enable analytics tracking' },
            hibase_shares_enabled: { enabled: false, description: 'Enable HiBase shares integration (unified API)' },
            hifeed_enabled: { enabled: true, description: 'Enable unified feed experience layer (HiFeed + HiStreaks) - TESTING ENABLED' }
        };
    }

    /**
     * Log current flags to console
     */
    logCurrentFlags() {
        console.log('HiFlags - Current configuration:');
        console.table(this.getAllFlags());
    }

    /**
     * Get flag with detailed info for debugging
     */
    getFlagDetails(name) {
        const flag = this.flags.get(name);
        if (!flag) {
            return { exists: false, name };
        }
        
        return {
            exists: true,
            name,
            enabled: flag.enabled,
            description: flag.description,
            source: flag.source,
            lastUpdated: flag.lastUpdated
        };
    }

    /**
     * Debug method - export only for development tools
     */
    debug() {
        console.group('🚩 HiFlags Debug Information');
        
        try {
            const allFlags = this.getAllFlags();
            if (allFlags && Object.keys(allFlags).length > 0) {
                console.table(allFlags);
                console.log(`📊 Total flags: ${Object.keys(allFlags).length}`);
            } else {
                console.warn('No flags available or getAllFlags() failed');
            }
            
            console.log('🔧 Available methods:');
            console.log('  • getFlag(name, default)');
            console.log('  • isEnabled(name)'); 
            console.log('  • getAllFlags()');
            console.log('  • getFlagDetails(name)');
            console.log('  • debug() (this method)');
            
        } catch (error) {
            console.error('Debug failed:', error);
        }
        
        console.groupEnd();
        return 'Debug complete. See output above.';
    }
}

// Create instance for module use only
const hiFlags = new HiFlags();

// Ready state management for verifier
let readyPromise = null;

export async function waitUntilReady() {
    if (!readyPromise) {
        readyPromise = (async () => {
            while (!hiFlags.initialized) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return true;
        })();
    }
    return readyPromise;
}

// Cohort-aware flag checks that defer to rollout decisions
export async function isEnabledForIdentity(flagKey, identity) {
    await waitUntilReady(); // existing init gate
    // If this flag participates in cohort rollout, use cohort gate; otherwise fallback to current logic.
    const percent = getRollout(flagKey);
    if (percent > 0 && percent < 100) {
        const enabled = isEnabledFor(identity || getIdentity(), flagKey);
        return enabled;
    }
    return hiFlags.isEnabled(flagKey); // existing per-flag switch
}

// Convenience wrapper using session/user identity auto-detection
export async function isEnabledCohort(flagKey) {
    return isEnabledForIdentity(flagKey, getIdentity());
}

// Export for ES6 modules - no global assignments
export default HiFlags;
export { hiFlags };