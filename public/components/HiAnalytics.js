/**
 * 📊 HiAnalytics.js — Analytics v2.0 Component
 * 
 * **Architecture:**
 * - ES6 class singleton (same pattern as ProfileManager)
 * - Respects existing tier system (HiMembership, TIER_CONFIG)
 * - Cache-first (5min TTL, prevents unnecessary RPC calls)
 * - Non-breaking (graceful degradation if RPCs unavailable)
 * 
 * **Data Flow:**
 * 1. Check user tier (HiMembership.get().tier)
 * 2. Enforce frontend gating (redirect if locked)
 * 3. Query RPCs with cache
 * 4. Render with existing design system
 * 
 * **Privacy:**
 * - All RPCs use auth.uid() (only YOUR data)
 * - No cross-user analytics
 * - Data stays encrypted
 * 
 * @version 2.0.0
 * @date 2026-01-18
 */

class HiAnalytics {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes
    this.currentTab = 'overview';
    this.userId = null;
    this.tier = 'anonymous';
    this.supabase = null;
  }

  /**
   * Initialize analytics system
   * @returns {Promise<void>}
   */
  async init() {
    console.log('[HiAnalytics] Initializing Analytics v2.0...');
    
    try {
      // Get Supabase client (respects HiSupabase architecture)
      this.supabase = window.HiSupabase?.getClient?.() || window.supabase;
      if (!this.supabase) {
        console.warn('[HiAnalytics] Supabase client unavailable - analytics disabled');
        return;
      }

      // Wait for auth (respects ProfileManager flow)
      await this.waitForAuth();
      
      // Setup tab navigation
      this.setupTabs();
      
      console.log('[HiAnalytics] ✅ Initialized', {
        userId: this.userId,
        tier: this.tier
      });
    } catch (err) {
      console.error('[HiAnalytics] Initialization failed:', err);
    }
  }

  /**
   * Wait for authentication (respects existing architecture)
   * @private
   */
  async waitForAuth() {
    return new Promise((resolve) => {
      // Check if already authenticated
      if (window.__hiAuthReady?.session) {
        this.userId = window.__hiAuthReady.session.user?.id;
        this.tier = window.HiMembership?.get?.()?.tier || 'anonymous';
        resolve();
        return;
      }

      // Listen for auth-ready event
      const listener = (e) => {
        const session = window.__hiAuthReady?.session;
        this.userId = session?.user?.id;
        this.tier = window.HiMembership?.get?.()?.tier || 'anonymous';
        resolve();
        window.removeEventListener('hi:auth-ready', listener);
      };

      window.addEventListener('hi:auth-ready', listener);

      // Timeout after 3 seconds (fallback)
      setTimeout(() => {
        resolve();
        window.removeEventListener('hi:auth-ready', listener);
      }, 3000);
    });
  }

  /**
   * Setup tab click handlers
   * @private
   */
  setupTabs() {
    const tabs = document.querySelectorAll('.analytics-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        const tierRequired = tab.dataset.tierRequired;
        
        // Check tier access
        if (tierRequired && !this.hasAccess(tierRequired)) {
          this.showUpgradePrompt(tabName, tierRequired);
          return;
        }

        // Switch tab
        this.switchTab(tabName);
      });
    });

    // Unlock tabs based on user tier
    this.updateTabAccess();
  }

  /**
   * Update tab lock states based on user tier
   * @private
   */
  updateTabAccess() {
    const tabs = document.querySelectorAll('.analytics-tab');
    
    tabs.forEach(tab => {
      const tierRequired = tab.dataset.tierRequired;
      
      if (!tierRequired) {
        // Overview tab - always accessible
        tab.classList.remove('locked');
        return;
      }

      if (this.hasAccess(tierRequired)) {
        tab.classList.remove('locked');
        tab.querySelector('.lock-icon')?.remove();
      }
    });
  }

  /**
   * Check if user has access to tier-gated feature
   * @param {string} requiredTier - 'silver' | 'gold'
   * @returns {boolean}
   * @private
   */
  hasAccess(requiredTier) {
    if (!this.userId) return false; // Must be authenticated
    
    // Tier hierarchy from TIER_CONFIG.js
    const tierHierarchy = {
      'anonymous': 0,
      'free': 1,
      'bronze': 2,
      'pathfinder': 2,  // Bronze alias
      'silver': 3,
      'trailblazer': 3,  // Silver alias
      'gold': 4,
      'champion': 4,  // Gold alias
      'premium': 5,
      'pioneer': 5,  // Premium alias
      'collective': 6  // Highest tier (admin + community)
    };

    const requiredLevel = tierHierarchy[requiredTier.toLowerCase()] || 999;
    const userLevel = tierHierarchy[this.tier.toLowerCase()] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Switch active tab
   * @param {string} tabName
   * @private
   */
  switchTab(tabName) {
    console.log('[HiAnalytics] Switching to tab:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.analytics-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update content sections
    document.querySelectorAll('.analytics-content').forEach(content => {
      if (content.dataset.content === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    this.currentTab = tabName;

    // Load content if needed
    if (tabName === 'journey') {
      this.loadJourneyContent();
    } else if (tabName === 'patterns') {
      this.loadPatternsContent();
    } else if (tabName === 'milestones') {
      this.loadMilestonesContent();
    }
  }

  /**
   * Show upgrade prompt for locked features
   * @param {string} feature
   * @param {string} tierRequired
   * @private
   */
  showUpgradePrompt(feature, tierRequired) {
    const tierNames = {
      silver: 'Hi Pathfinder',
      gold: 'Hi Champion'
    };

    const featureNames = {
      journey: 'Your emotional journey (30 days)',
      patterns: 'Pattern analysis & insights',
      milestones: 'Streak calendar & achievements'
    };

    // Use existing toast system if available
    if (window.HiToast?.show) {
      window.HiToast.show({
        message: `Upgrade to ${tierNames[tierRequired]} to unlock ${featureNames[feature]}`,
        type: 'info',
        duration: 4000
      });
    } else {
      alert(`Upgrade to ${tierNames[tierRequired]} to unlock ${featureNames[feature]}`);
    }
  }

  /**
   * Load Journey tab content (Silver+)
   * @private
   */
  async loadJourneyContent() {
    const container = document.getElementById('journeyContent');
    if (!container) return;

    // Check if already loaded
    if (container.querySelector('.journey-loaded')) {
      return;
    }

    // Determine days based on tier
    const maxDays = this.getMaxDays();
    const days = Math.min(this.options?.defaultDays || 7, maxDays);

    // Show loading state
    container.innerHTML = `
      <div class="journey-loaded">
        <div class="stats-section-title">📈 Your Emotional Journey (Last ${days} Days)</div>
        <div id="emotionalJourneyChartContainer" style="padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; margin-top: 16px;">
          <div style="text-align: center; color: rgba(232, 235, 255, 0.6);">Loading...</div>
        </div>
      </div>
    `;

    try {
      // Query RPC
      const data = await this.getCached(`journey_${days}`, async () => {
        const { data, error } = await this.supabase.rpc('get_user_emotional_journey', {
          p_user_id: this.userId,
          p_days: days
        });

        if (error) {
          console.error('[HiAnalytics] Error loading journey:', error);
          return [];
        }

        return data || [];
      });

      // Render chart
      const chart = new window.EmotionalJourneyChart('emotionalJourneyChartContainer', {
        days,
        tier: this.tier
      });
      
      await chart.render(data);

      console.log('[HiAnalytics] Journey chart rendered', { dataPoints: data.length });
    } catch (err) {
      console.error('[HiAnalytics] Failed to load journey:', err);
      container.querySelector('#emotionalJourneyChartContainer').innerHTML = `
        <div style="text-align: center; color: rgba(232, 235, 255, 0.6);">
          Unable to load data. Try refreshing the page.
        </div>
      `;
    }
  }

  /**
   * Load Patterns tab content (Gold+)
   * @private
   */
  async loadPatternsContent() {
    const container = document.getElementById('patternsContent');
    if (!container) return;

    if (container.querySelector('.patterns-loaded')) {
      return;
    }

    container.innerHTML = `
      <div class="upgrade-prompt">
        <h3>🔍 Your Patterns</h3>
        <p>Discover when you feel your best and what activities boost your wellbeing.</p>
        <p style="opacity: 0.6; font-size: 0.9rem; margin-top: 16px;">
          Coming soon in Analytics v2.0! Backend is ready, building the insights engine now.
        </p>
      </div>
    `;
  }

  /**
   * Load Milestones tab content (Silver+)
   * @private
   */
  async loadMilestonesContent() {
    const container = document.getElementById('milestonesContent');
    if (!container) return;

    if (container.querySelector('.milestones-loaded')) {
      return;
    }

    container.innerHTML = `
      <div class="upgrade-prompt">
        <h3>🏆 Your Milestones</h3>
        <p>See your streak calendar, Hi Points progress, and achievements.</p>
        <p style="opacity: 0.6; font-size: 0.9rem; margin-top: 16px;">
          Coming soon in Analytics v2.0! Backend is ready, building the heatmap now.
        </p>
      </div>
    `;
  }

  /**
   * Get cached data or fetch fresh
   * @param {string} key
   * @param {Function} fetcher
   * @returns {Promise<any>}
   * @private
   */
  async getCached(key, fetcher) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('[HiAnalytics] Using cached data:', key);
      return cached.data;
    }

    console.log('[HiAnalytics] Fetching fresh data:', key);
    const data = await fetcher();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear cache (call on auth state change)
   */
  clearCache() {
    console.log('[HiAnalytics] Cache cleared');
    this.cache.clear();
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.HiAnalytics = new HiAnalytics();
    window.HiAnalytics.init();
  });
} else {
  window.HiAnalytics = new HiAnalytics();
  window.HiAnalytics.init();
}

console.log('✅ HiAnalytics.js loaded');
