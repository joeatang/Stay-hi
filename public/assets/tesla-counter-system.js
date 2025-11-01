/**
 * 🚀 TESLA-GRADE COUNTER SYSTEM
 * 
 * Philosophy: Database as Single Source of Truth
 * - No localStorage complexity
 * - Real-time database sync
 * - Atomic operations
 * - Clean architecture
 */

class TeslaCounterSystem {
    constructor(supabaseClient) {
        this.supa = supabaseClient;
        this.elements = {};
        this.isInitialized = false;
        this.cache = null; // Simple cache for UI responsiveness
        
        console.log('🏗️ Tesla Counter System initialized');
    }

    /**
     * Initialize the counter system after DOM is ready
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🎯 Tesla Counter: DOM initialization starting...');
        
        // Get DOM elements
        this.elements = {
            todayCount: document.getElementById('todayCount'),
            totalCount: document.getElementById('totalCount'),
            streakCount: document.getElementById('streakLen'),
            hiMedal: document.getElementById('hiMedal')
        };
        
        // Verify elements exist
        const missing = Object.entries(this.elements)
            .filter(([key, el]) => !el)
            .map(([key]) => key);
            
        if (missing.length > 0) {
            console.error('❌ Tesla Counter: Missing elements:', missing);
            return false;
        }
        
        console.log('✅ Tesla Counter: All DOM elements found');
        
        // Load initial data from database
        await this.loadFromDatabase();
        
        // Set up medallion click handler
        this.setupMedallionHandler();
        
        this.isInitialized = true;
        console.log('🚀 Tesla Counter System fully initialized');
        return true;
    }

    /**
     * Load counter data directly from database
     */
    async loadFromDatabase() {
        try {
            console.log('📊 Tesla Counter: Fetching from database...');
            
            if (!this.supa) {
                throw new Error('Supabase client not available');
            }

            const { data, error } = await this.supa.rpc('get_global_stats');
            
            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                const stats = data[0];
                this.cache = {
                    totalHis: Number(stats.total_his) || 0,
                    hiWaves: Number(stats.hi_waves) || 0,
                    totalUsers: Number(stats.total_users) || 0,
                    todayCount: Number(stats.hi_waves) || 0, // Show Hi Waves as today count
                    streak: Number(stats.total_users) || 0      // Show total users as streak
                };
                
                console.log('✅ Tesla Counter: Database data loaded:', this.cache);
                this.updateDisplay();
            } else {
                console.warn('⚠️ Tesla Counter: No data returned from database');
                this.setDefaultValues();
            }
            
        } catch (error) {
            console.error('❌ Tesla Counter: Database load failed:', error);
            this.setDefaultValues();
        }
    }

    /**
     * Set default values if database fails
     */
    setDefaultValues() {
        this.cache = {
            totalHis: 0,
            hiWaves: 0,
            totalUsers: 0,
            todayCount: 0,
            streak: 0
        };
        this.updateDisplay();
    }

    /**
     * Update DOM display with current cache values
     */
    updateDisplay() {
        if (!this.cache) return;
        
        try {
            if (this.elements.todayCount) {
                this.elements.todayCount.textContent = this.cache.todayCount;
            }
            
            if (this.elements.totalCount) {
                this.elements.totalCount.textContent = this.cache.totalHis;
            }
            
            if (this.elements.streakCount) {
                this.elements.streakCount.textContent = this.cache.streak;
            }
            
            // 🔗 SYNC LEGACY VARIABLES FOR ROTATOR
            this.syncLegacyVariables();
            
            console.log('✅ Tesla Counter: Display updated', {
                today: this.cache.todayCount,
                total: this.cache.totalHis,
                streak: this.cache.streak
            });
            
        } catch (error) {
            console.error('❌ Tesla Counter: Display update failed:', error);
        }
    }

    /**
     * Sync Tesla cache with legacy global variables for rotator
     */
    syncLegacyVariables() {
        if (!this.cache) return;
        
        try {
            // Update legacy variables if they exist in global scope
            if (typeof window !== 'undefined') {
                if (typeof window.gWaves !== 'undefined') {
                    window.gWaves = this.cache.hiWaves || 0;
                }
                if (typeof window.gStarts !== 'undefined') {
                    window.gStarts = this.cache.totalHis || 0;
                }
                console.log('🔗 Tesla Counter: Legacy variables synced', {
                    gWaves: window.gWaves,
                    gStarts: window.gStarts
                });
            }
        } catch (error) {
            console.error('❌ Tesla Counter: Legacy sync failed:', error);
        }
    }

    /**
     * Set up clean medallion click handler
     */
    setupMedallionHandler() {
        if (!this.elements.hiMedal) {
            console.error('❌ Tesla Counter: Medallion element not found');
            return;
        }

        // Remove any existing handlers to avoid conflicts
        this.elements.hiMedal.replaceWith(this.elements.hiMedal.cloneNode(true));
        this.elements.hiMedal = document.getElementById('hiMedal');

        this.elements.hiMedal.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handleMedallionClick();
        });

        console.log('✅ Tesla Counter: Clean medallion handler installed');
    }

    /**
     * Handle medallion click with database-first approach
     */
    async handleMedallionClick() {
        try {
            console.log('🎯 Tesla Counter: Medallion tap detected');
            
            // Optimistic UI update
            this.cache.todayCount += 1;
            this.cache.totalHis += 1;
            this.updateDisplay();
            
            // Visual feedback
            this.showClickFeedback();
            
            // Update database
            await this.incrementInDatabase();
            
            // Refresh from database to ensure sync
            await this.loadFromDatabase();
            
            console.log('✅ Tesla Counter: Medallion tap complete');
            
        } catch (error) {
            console.error('❌ Tesla Counter: Medallion tap failed:', error);
            // Revert optimistic update on error
            if (this.cache) {
                this.cache.todayCount = Math.max(0, this.cache.todayCount - 1);
                this.cache.totalHis = Math.max(0, this.cache.totalHis - 1);
                this.updateDisplay();
            }
        }
    }

    /**
     * Increment counters in database
     */
    async incrementInDatabase() {
        try {
            // Try to increment hi wave (main counter)
            const { data: waveResult, error: waveError } = await this.supa.rpc('increment_hi_wave');
            
            if (waveError) {
                console.warn('⚠️ Tesla Counter: Hi wave increment failed:', waveError);
            } else {
                console.log('✅ Tesla Counter: Hi wave incremented');
            }

            // Try to increment total his if different function exists
            try {
                const { data: totalResult, error: totalError } = await this.supa.rpc('increment_total_hi');
                if (!totalError) {
                    console.log('✅ Tesla Counter: Total his incremented');
                }
            } catch (totalErr) {
                // Function might not exist, that's ok
                console.log('ℹ️ Tesla Counter: Using hi_wave as total counter');
            }

        } catch (error) {
            console.error('❌ Tesla Counter: Database increment failed:', error);
            throw error;
        }
    }

    /**
     * Show visual feedback for medallion click
     */
    showClickFeedback() {
        if (!this.elements.hiMedal) return;
        
        // Tesla-grade micro-interaction
        this.elements.hiMedal.style.transform = 'scale(0.95)';
        this.elements.hiMedal.style.transition = 'transform 0.15s ease-out';
        
        setTimeout(() => {
            this.elements.hiMedal.style.transform = '';
        }, 150);

        // Haptic feedback if available
        try {
            if (navigator.vibrate) {
                navigator.vibrate(25);
            }
        } catch (e) {}
    }

    /**
     * Get current counter values
     */
    getCurrentValues() {
        return this.cache ? { ...this.cache } : null;
    }

    /**
     * Force refresh from database
     */
    async refresh() {
        console.log('🔄 Tesla Counter: Manual refresh requested');
        await this.loadFromDatabase();
    }
}

// Export for global use
window.TeslaCounterSystem = TeslaCounterSystem;

console.log('📦 Tesla Counter System module loaded');