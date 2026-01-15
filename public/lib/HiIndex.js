/**
 * 🌟 HiIndex.js — Hi Index Calculation Engine
 * 
 * Client-side wrapper for Hi Index RPCs.
 * Handles caching, loading states, and error recovery.
 * 
 * Usage:
 *   const hiIndex = new HiIndex(supabaseClient);
 *   const personal = await hiIndex.getPersonal();
 *   const community = await hiIndex.getCommunity();
 *   const history = await hiIndex.getHistory('personal', 30);
 */

(function() {
  'use strict';

  // Cache TTL (5 minutes for index, 1 hour for history)
  const INDEX_CACHE_TTL = 5 * 60 * 1000;
  const HISTORY_CACHE_TTL = 60 * 60 * 1000;

  class HiIndex {
    constructor(supabase) {
      this.supabase = supabase;
      this.cache = {
        personal: null,
        community: null,
        personalHistory: null,
        communityHistory: null
      };
      this.cacheTimestamps = {};
      this.loading = {
        personal: false,
        community: false,
        history: false
      };
    }

    /**
     * Get personal Hi Index (7-day rolling score)
     * @param {boolean} forceRefresh - Bypass cache
     * @returns {Promise<Object>} Personal index data
     */
    async getPersonal(forceRefresh = false) {
      const cacheKey = 'personal';
      
      // Check cache
      if (!forceRefresh && this._isCacheValid(cacheKey, INDEX_CACHE_TTL)) {
        console.log('[HiIndex] Using cached personal index');
        return this.cache.personal;
      }

      // Prevent duplicate requests
      if (this.loading.personal) {
        console.log('[HiIndex] Personal index already loading, waiting...');
        return this._waitForLoading('personal');
      }

      this.loading.personal = true;

      try {
        const { data, error } = await this.supabase.rpc('get_personal_hi_index', { p_days: 7 });
        
        if (error) {
          console.error('[HiIndex] Personal index error:', error);
          throw error;
        }

        // Handle not authenticated
        if (data?.error === 'not_authenticated') {
          console.log('[HiIndex] User not authenticated');
          return this._getEmptyPersonal();
        }

        this.cache.personal = this._formatIndexData(data, 'personal');
        this.cacheTimestamps.personal = Date.now();
        
        console.log('[HiIndex] Personal index loaded:', this.cache.personal);
        return this.cache.personal;

      } catch (err) {
        console.error('[HiIndex] Failed to load personal index:', err);
        return this._getEmptyPersonal();
      } finally {
        this.loading.personal = false;
      }
    }

    /**
     * Get community Hi Index (7-day rolling score)
     * @param {boolean} forceRefresh - Bypass cache
     * @returns {Promise<Object>} Community index data
     */
    async getCommunity(forceRefresh = false) {
      const cacheKey = 'community';
      
      // Check cache
      if (!forceRefresh && this._isCacheValid(cacheKey, INDEX_CACHE_TTL)) {
        console.log('[HiIndex] Using cached community index');
        return this.cache.community;
      }

      // Prevent duplicate requests
      if (this.loading.community) {
        console.log('[HiIndex] Community index already loading, waiting...');
        return this._waitForLoading('community');
      }

      this.loading.community = true;

      try {
        const { data, error } = await this.supabase.rpc('get_community_hi_index', { p_days: 7 });
        
        if (error) {
          console.error('[HiIndex] Community index error:', error);
          throw error;
        }

        this.cache.community = this._formatIndexData(data, 'community');
        this.cacheTimestamps.community = Date.now();
        
        console.log('[HiIndex] Community index loaded:', this.cache.community);
        return this.cache.community;

      } catch (err) {
        console.error('[HiIndex] Failed to load community index:', err);
        return this._getEmptyCommunity();
      } finally {
        this.loading.community = false;
      }
    }

    /**
     * Get historical index data for charts
     * @param {string} scope - 'personal' or 'community'
     * @param {number} days - Number of days (default 30)
     * @returns {Promise<Object>} Historical data
     */
    async getHistory(scope = 'personal', days = 30) {
      const cacheKey = scope === 'community' ? 'communityHistory' : 'personalHistory';
      
      // Check cache
      if (this._isCacheValid(cacheKey, HISTORY_CACHE_TTL)) {
        console.log(`[HiIndex] Using cached ${scope} history`);
        return this.cache[cacheKey];
      }

      try {
        const { data, error } = await this.supabase.rpc('get_hi_index_history', { 
          p_scope: scope, 
          p_days: days 
        });
        
        if (error) {
          console.error('[HiIndex] History error:', error);
          throw error;
        }

        if (data?.error === 'not_authenticated') {
          return { scope, days, data: [] };
        }

        const formatted = {
          scope: data.scope,
          days: data.days,
          data: data.data || []
        };

        this.cache[cacheKey] = formatted;
        this.cacheTimestamps[cacheKey] = Date.now();
        
        console.log(`[HiIndex] ${scope} history loaded:`, formatted.data.length, 'days');
        return formatted;

      } catch (err) {
        console.error('[HiIndex] Failed to load history:', err);
        return { scope, days, data: [] };
      }
    }

    /**
     * Get both personal and community index in parallel
     * @returns {Promise<Object>} Combined index data
     */
    async getBoth() {
      const [personal, community] = await Promise.all([
        this.getPersonal(),
        this.getCommunity()
      ]);

      return { personal, community };
    }

    /**
     * Format index data with UI-friendly properties
     * Handles streak multiplier data for personal index
     */
    _formatIndexData(data, scope) {
      const index = parseFloat(data.index) || 1.0;
      const percentChange = parseFloat(data.percent_change) || 0;
      
      // Base result for both community and personal
      const result = {
        index: index,
        indexDisplay: index.toFixed(1),
        rawScore: parseFloat(data.raw_score) || 0,
        shareCount: parseInt(data.share_count) || 0,
        tapCount: parseInt(data.tap_count) || 0,
        percentChange: percentChange,
        percentChangeDisplay: this._formatPercentChange(percentChange),
        trend: data.trend || 'stable',
        trendLabel: this._getTrendLabel(data.trend),
        trendIcon: this._getTrendIcon(data.trend),
        periodDays: data.period_days || 7,
        asOf: data.as_of,
        dots: this._getIndexDots(index),
        levelLabel: this._getLevelLabel(index),
        scope: scope,
        isEmpty: false
      };
      
      // Personal-specific fields
      if (scope === 'personal') {
        // Percentile
        result.percentile = parseInt(data.percentile) || 0;
        result.percentileDisplay = this._formatPercentile(data.percentile);
        
        // Streak multiplier data (new!)
        const streak = data.streak || {};
        result.streak = {
          current: parseInt(streak.current) || 0,
          multiplier: parseFloat(streak.multiplier) || 1.0,
          bonusPercent: parseInt(streak.bonus_percent) || 0,
          label: streak.label || 'Build a 7-day streak for bonus!',
          daysToNextTier: streak.next_tier !== null ? parseInt(streak.next_tier) : null,
          hasBonus: (parseFloat(streak.multiplier) || 1.0) > 1.0
        };
        
        // Base index (before multiplier) for transparency
        result.baseIndex = parseFloat(data.base_index) || index;
        result.baseIndexDisplay = (parseFloat(data.base_index) || index).toFixed(1);
        
        // Bonus display (e.g., "+10%")
        result.streak.bonusDisplay = result.streak.bonusPercent > 0 
          ? `+${result.streak.bonusPercent}%` 
          : null;
        
        // Next tier messaging
        if (result.streak.daysToNextTier !== null) {
          const days = result.streak.daysToNextTier;
          result.streak.nextTierMessage = days === 1 
            ? '1 more day to unlock next bonus!' 
            : `${days} more days to unlock next bonus!`;
        } else {
          result.streak.nextTierMessage = 'Maximum streak bonus achieved! 🏆';
        }
      } else {
        // Community doesn't have these fields
        result.percentile = null;
        result.percentileDisplay = null;
        result.streak = null;
        result.baseIndex = null;
      }
      
      return result;
    }

    /**
     * Format percent change for display
     */
    _formatPercentChange(value) {
      if (value === 0) return 'No change';
      const sign = value > 0 ? '↑' : '↓';
      return `${sign}${Math.abs(value).toFixed(1)}%`;
    }

    /**
     * Get trend label (positive framing)
     */
    _getTrendLabel(trend) {
      switch (trend) {
        case 'up': return 'Hi Inspiration';
        case 'down': return 'Hi Opportunity';
        default: return 'Steady';
      }
    }

    /**
     * Get trend icon
     */
    _getTrendIcon(trend) {
      switch (trend) {
        case 'up': return '✨';
        case 'down': return '🌱';
        default: return '⚡';
      }
    }

    /**
     * Get visual dots for index (●○ style)
     */
    _getIndexDots(index) {
      const filled = Math.round(index);
      const dots = [];
      for (let i = 1; i <= 5; i++) {
        dots.push(i <= filled ? '●' : '○');
      }
      return dots.join('');
    }

    /**
     * Get level label based on index
     */
    _getLevelLabel(index) {
      if (index >= 4.5) return 'Hi Master';
      if (index >= 3.5) return 'Flourishing';
      if (index >= 2.5) return 'Growing Strong';
      if (index >= 1.5) return 'Taking Root';
      return 'Planting Seeds';
    }

    /**
     * Format percentile for display
     */
    _formatPercentile(percentile) {
      const p = parseInt(percentile) || 0;
      if (p >= 90) return 'Top 10%';
      if (p >= 75) return 'Top 25%';
      if (p >= 50) return 'Top 50%';
      if (p >= 25) return 'Top 75%';
      return 'Getting started';
    }

    /**
     * Check if cache is still valid
     */
    _isCacheValid(key, ttl) {
      const timestamp = this.cacheTimestamps[key];
      if (!timestamp) return false;
      return (Date.now() - timestamp) < ttl && this.cache[key] !== null;
    }

    /**
     * Wait for loading to complete
     */
    async _waitForLoading(key) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.loading[key]) {
            clearInterval(checkInterval);
            resolve(this.cache[key]);
          }
        }, 100);
        // Timeout after 5s
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(this.cache[key] || this._getEmptyPersonal());
        }, 5000);
      });
    }

    /**
     * Empty personal index (for unauthenticated or errors)
     */
    _getEmptyPersonal() {
      return {
        index: 0,
        indexDisplay: '—',
        rawScore: 0,
        shareCount: 0,
        tapCount: 0,
        percentChange: 0,
        percentChangeDisplay: 'Start your journey',
        trend: 'stable',
        trendLabel: 'Welcome',
        trendIcon: '👋',
        percentile: null,
        percentileDisplay: 'Share or tap to begin',
        periodDays: 7,
        asOf: null,
        dots: '○○○○○',
        levelLabel: 'New Explorer',
        scope: 'personal',
        isEmpty: true,
        // Streak fields (empty defaults)
        streak: {
          current: 0,
          multiplier: 1.0,
          bonusPercent: 0,
          label: 'Build a 7-day streak for bonus!',
          daysToNextTier: 7,
          hasBonus: false,
          bonusDisplay: null,
          nextTierMessage: '7 more days to unlock your first bonus!'
        },
        baseIndex: 0,
        baseIndexDisplay: '—'
      };
    }

    /**
     * Empty community index (for errors)
     */
    _getEmptyCommunity() {
      return {
        index: 1.0,
        indexDisplay: '1.0',
        rawScore: 0,
        shareCount: 0,
        tapCount: 0,
        percentChange: 0,
        percentChangeDisplay: 'No data',
        trend: 'stable',
        trendLabel: 'Growing',
        trendIcon: '🌱',
        percentile: null,
        percentileDisplay: null,
        periodDays: 7,
        asOf: null,
        dots: '●○○○○',
        levelLabel: 'Planting Seeds',
        scope: 'community',
        isEmpty: true
      };
    }

    /**
     * Clear all caches (call after user action like share/tap)
     */
    clearCache() {
      this.cache = {
        personal: null,
        community: null,
        personalHistory: null,
        communityHistory: null
      };
      this.cacheTimestamps = {};
      console.log('[HiIndex] Cache cleared');
    }
  }

  // Helper to get Supabase client (multiple fallbacks)
  function getSupabaseClient() {
    // Try HiSupabase.getClient() first (primary method)
    if (window.HiSupabase?.getClient) {
      return window.HiSupabase.getClient();
    }
    // Fallback to window.hiSupabase
    if (window.hiSupabase) {
      return window.hiSupabase;
    }
    // Fallback to supabase global
    if (window.supabase) {
      return window.supabase;
    }
    return null;
  }

  // Export to window
  window.HiIndex = HiIndex;

  // Auto-initialize when Supabase is ready
  window.addEventListener('hi:supabase-ready', (e) => {
    const client = e.detail?.client || getSupabaseClient();
    if (client && !window.hiIndexInstance) {
      window.hiIndexInstance = new HiIndex(client);
      console.log('[HiIndex] ✅ Auto-initialized (supabase-ready event)');
    }
  });

  // Also listen to auth-ready (fires after supabase is definitely ready)
  window.addEventListener('hi:auth-ready', () => {
    if (!window.hiIndexInstance) {
      const client = getSupabaseClient();
      if (client) {
        window.hiIndexInstance = new HiIndex(client);
        console.log('[HiIndex] ✅ Auto-initialized (auth-ready event)');
      }
    }
  });

  // Immediate init if Supabase already exists
  setTimeout(() => {
    if (!window.hiIndexInstance) {
      const client = getSupabaseClient();
      if (client) {
        window.hiIndexInstance = new HiIndex(client);
        console.log('[HiIndex] ✅ Initialized (immediate fallback)');
      }
    }
  }, 100);

  console.log('[HiIndex] Module loaded');
})();
