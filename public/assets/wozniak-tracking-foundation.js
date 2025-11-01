/**
 * 🚀 WOZNIAK-TESLA TRACKING FOUNDATION
 * 
 * Philosophy: Bulletproof Single Source of Truth
 * - Database is the ONLY source of truth
 * - Smart caching for instant UI updates
 * - Event-driven architecture
 * - Future-proof extensible design
 * - Zero tracking conflicts forever
 * 
 * Replaces: TeslaCounter, CounterIntegrity, gWaves/gStarts, localStorage chaos
 */

class WozniakTrackingFoundation {
    constructor(supabaseClient) {
        this.supa = supabaseClient;
        this.cache = new Map(); // Fast cache for UI responsiveness
        this.listeners = new Map(); // Event subscribers
        this.isInitialized = false;
        
        // Metrics we track
        this.METRICS = {
            HI_WAVES: 'hi_waves',
            TOTAL_HIS: 'total_his', 
            TOTAL_USERS: 'total_users',
            USER_STREAK: 'user_streak',
            USER_TODAY: 'user_today'
        };
        
        console.log('🏗️ Wozniak Tracking Foundation initialized');
    }

    /**
     * 🎯 INITIALIZE - Set up the foundation
     */
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('🚀 Wozniak Foundation: Booting...');
            
            // Load fresh data from database
            await this.loadFromDatabase();
            
            this.isInitialized = true;
            console.log('✅ Wozniak Foundation: Online and ready');
            
            // Notify all systems that tracking is ready
            this.emit('foundation:ready', this.getAllMetrics());
            
            return true;
        } catch (error) {
            console.error('❌ Wozniak Foundation: Boot failed', error);
            return false;
        }
    }

    /**
     * 📊 LOAD FROM DATABASE - Single source of truth
     */
    async loadFromDatabase() {
        try {
            console.log('📊 Wozniak Foundation: Loading from database...');
            
            if (!this.supa) {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await this.supa.rpc('get_global_stats');
            
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('No data returned');

            const stats = data[0];
            
            // Update cache with fresh database values
            this.setMetric(this.METRICS.HI_WAVES, Number(stats.hi_waves) || 0);
            this.setMetric(this.METRICS.TOTAL_HIS, Number(stats.total_his) || 0);
            this.setMetric(this.METRICS.TOTAL_USERS, Number(stats.total_users) || 0);
            
            // TODO: Add user-specific metrics when we have user context
            this.setMetric(this.METRICS.USER_TODAY, 0);
            this.setMetric(this.METRICS.USER_STREAK, 0);
            
            console.log('✅ Wozniak Foundation: Database loaded', this.getAllMetrics());
            
            // Notify subscribers of fresh data
            this.emit('metrics:updated', this.getAllMetrics());
            
        } catch (error) {
            console.error('❌ Wozniak Foundation: Database load failed', error);
            this.setDefaultMetrics();
        }
    }

    /**
     * 🎯 INCREMENT METRIC - Smart database + cache update
     */
    async incrementMetric(metricName, amount = 1) {
        try {
            console.log(`🚀 Wozniak Foundation: Incrementing ${metricName} by ${amount}`);
            
            // Optimistic UI update (instant feedback)
            const currentValue = this.getMetric(metricName) || 0;
            const newValue = currentValue + amount;
            this.setMetric(metricName, newValue);
            
            // Emit immediate update for UI
            this.emit('metrics:updated', this.getAllMetrics());
            this.emit(`metric:${metricName}:updated`, newValue);
            
            // Update database based on metric type
            let dbResult;
            switch(metricName) {
                case this.METRICS.HI_WAVES:
                    dbResult = await this.supa.rpc('increment_hi_wave');
                    break;
                    
                // TODO: Add other increment functions as needed
                default:
                    console.warn(`No database increment function for ${metricName}`);
                    return newValue;
            }
            
            if (dbResult.error) {
                throw dbResult.error;
            }
            
            // Verify with fresh database read
            setTimeout(() => this.loadFromDatabase(), 100);
            
            console.log(`✅ Wozniak Foundation: ${metricName} incremented successfully`);
            return newValue;
            
        } catch (error) {
            console.error(`❌ Wozniak Foundation: Failed to increment ${metricName}`, error);
            
            // Revert optimistic update on failure
            const originalValue = this.getMetric(metricName) - amount;
            this.setMetric(metricName, Math.max(0, originalValue));
            this.emit('metrics:updated', this.getAllMetrics());
            
            throw error;
        }
    }

    /**
     * 📈 GET METRIC - Fast cache lookup
     */
    getMetric(metricName) {
        return this.cache.get(metricName) || 0;
    }

    /**
     * 📝 SET METRIC - Update cache and notify
     */
    setMetric(metricName, value) {
        this.cache.set(metricName, value);
    }

    /**
     * 📊 GET ALL METRICS - Complete snapshot
     */
    getAllMetrics() {
        const metrics = {};
        for (const [key, metricName] of Object.entries(this.METRICS)) {
            metrics[metricName] = this.getMetric(metricName);
        }
        return metrics;
    }

    /**
     * 🔄 SET DEFAULT METRICS - Fallback values
     */
    setDefaultMetrics() {
        Object.values(this.METRICS).forEach(metric => {
            this.setMetric(metric, 0);
        });
        console.log('⚠️ Wozniak Foundation: Using default metrics');
    }

    /**
     * 🎧 EVENT SYSTEM - Subscribe to changes
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    }

    /**
     * 📢 EMIT EVENT - Notify subscribers
     */
    emit(eventName, data) {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Event callback error for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * 🧹 REFRESH - Force reload from database
     */
    async refresh() {
        console.log('🔄 Wozniak Foundation: Manual refresh requested');
        await this.loadFromDatabase();
    }

    /**
     * 🎯 CONVENIENCE METHODS - Easy access to common operations
     */
    
    // Get commonly used metrics
    getHiWaves() { return this.getMetric(this.METRICS.HI_WAVES); }
    getTotalHis() { return this.getMetric(this.METRICS.TOTAL_HIS); }
    getTotalUsers() { return this.getMetric(this.METRICS.TOTAL_USERS); }
    getUserToday() { return this.getMetric(this.METRICS.USER_TODAY); }
    getUserStreak() { return this.getMetric(this.METRICS.USER_STREAK); }
    
    // Increment commonly used metrics
    async incrementHiWaves() { return this.incrementMetric(this.METRICS.HI_WAVES); }
    
    // Format for display
    formatMetric(value) {
        return Number(value).toLocaleString();
    }
    
    /**
     * 🏥 HEALTH CHECK - Verify system status
     */
    getHealthStatus() {
        return {
            initialized: this.isInitialized,
            cacheSize: this.cache.size,
            listenerCount: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            metrics: this.getAllMetrics(),
            lastUpdate: new Date().toISOString()
        };
    }
}

/**
 * 🌍 GLOBAL INSTANCE - Single source of truth for entire app
 */
window.WozniakTracking = null;

/**
 * 🎯 INITIALIZE WOZNIAK TRACKING
 */
async function initializeWozniakTracking(supabaseClient) {
    if (window.WozniakTracking) {
        console.log('✅ Wozniak Tracking already initialized');
        return window.WozniakTracking;
    }
    
    try {
        console.log('🏗️ Initializing Wozniak Tracking Foundation...');
        
        window.WozniakTracking = new WozniakTrackingFoundation(supabaseClient);
        const success = await window.WozniakTracking.initialize();
        
        if (success) {
            console.log('🚀 Wozniak Tracking Foundation: ONLINE');
            return window.WozniakTracking;
        } else {
            throw new Error('Initialization failed');
        }
        
    } catch (error) {
        console.error('❌ Wozniak Tracking initialization failed:', error);
        return null;
    }
}

// 🚀 WOZNIAK FIX: Export to global window scope for browser access
window.WozniakTrackingFoundation = WozniakTrackingFoundation;
window.initializeWozniakTracking = initializeWozniakTracking;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WozniakTrackingFoundation, initializeWozniakTracking };
}