/**
 * StreakAuthority.js
 * Single source of truth for streak data
 * 
 * PROBLEM: 5 competing data sources (database, HiBase, cache, calendar, fallback)
 * SOLUTION: Always trust database, use cache as fast-path with TTL
 * 
 * Usage:
 *   const streak = await StreakAuthority.get(userId);
 *   console.log(streak.current); // Always accurate
 */

class StreakAuthority {
  static CACHE_TTL_MS = 60000; // 1 minute
  static CACHE_KEY = 'user_current_streak';
  static CACHE_TIMESTAMP_KEY = 'user_streak_timestamp';
  static CACHE_USER_KEY = 'user_streak_userid';

  /**
   * Get authoritative streak data (always from database)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { current, longest, lastHiDate }
   */
  static async get(userId) {
    if (!userId || userId === 'anonymous') {
      return { current: 0, longest: 0, lastHiDate: null };
    }

    // Try cache first (fast path)
    const cached = this.getCached(userId);
    if (cached !== null) {
      console.log('🚀 [StreakAuthority] Cache hit:', cached.current);
      return cached;
    }

    // Fetch from database (slow path, authoritative)
    try {
      const data = await this.#fetchFromDatabase(userId);
      this.#updateCache(userId, data);
      console.log('✅ [StreakAuthority] Database fetch:', data.current);
      return data;
    } catch (error) {
      console.error('❌ [StreakAuthority] Database fetch failed:', error);
      
      // Last resort: return stale cache if exists
      const stale = this.#getStaleCache(userId);
      if (stale) {
        console.warn('⚠️ [StreakAuthority] Using stale cache:', stale.current);
        return stale;
      }
      
      return { current: 0, longest: 0, lastHiDate: null };
    }
  }

  /**
   * Get cached streak if fresh (< 1 minute old)
   * @param {string} userId - User ID
   * @returns {Object|null} Cached streak or null
   */
  static getCached(userId) {
    const cachedUserId = localStorage.getItem(this.CACHE_USER_KEY);
    if (cachedUserId !== userId) {
      return null; // Cache is for different user
    }

    const value = localStorage.getItem(this.CACHE_KEY);
    const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
    
    if (!value || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > this.CACHE_TTL_MS) {
      console.log('🕐 [StreakAuthority] Cache expired (age:', Math.round(age / 1000), 'seconds)');
      return null; // Too old
    }
    
    return {
      current: Math.max(0, parseInt(value, 10) || 0),
      longest: Math.max(0, parseInt(localStorage.getItem('user_longest_streak') || '0', 10) || 0),
      lastHiDate: localStorage.getItem('user_last_hi_date'),
      source: 'cache'
    };
  }

  /**
   * Invalidate cache (force refresh on next get())
   */
  static invalidate() {
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
    localStorage.removeItem('user_longest_streak');
    localStorage.removeItem('user_last_hi_date');
    localStorage.removeItem(this.CACHE_USER_KEY);
    console.log('🧹 [StreakAuthority] Cache fully invalidated');
  }

  /**
   * Fetch streak from database (private)
   * @private
   */
  static async #fetchFromDatabase(userId) {
    const client = window.hiSupabase || window.supabaseClient || window.__HI_SUPABASE_CLIENT;
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const result = await window.HiAbortUtils.ignoreAbort(client
      .from('user_stats')
      .select('current_streak, longest_streak, last_hi_date')
      .eq('user_id', userId)
      .maybeSingle());
    
    // Aborted during navigation - keep last-known-good state (don't fallback to stale)
    if (result === null) {
      const cached = this.#getStaleCache(userId);
      if (cached) {
        console.debug('[StreakAuthority] Query aborted - keeping last-known-good cache');
        return cached;
      }
      // No cache available - return zero state
      return { current: 0, longest: 0, lastHiDate: null };
    }
    
    const { data, error } = result;
    if (error) throw error;
    
    if (!data) {
      // User has no stats yet (new user)
      return { current: 0, longest: 0, lastHiDate: null };
    }

    // Validate sanity
    const current = Math.max(0, data.current_streak || 0);
    const longest = Math.max(current, data.longest_streak || 0);

    if (current < 0 || current > 10000) {
      console.error('🚨 [StreakAuthority] INVALID STREAK:', current);
      return { current: 0, longest, lastHiDate: data.last_hi_date };
    }

    return {
      current,
      longest,
      lastHiDate: data.last_hi_date,
      source: 'database'
    };
  }

  /**
   * Update cache after successful database fetch (private)
   * @private
   */
  static #updateCache(userId, data) {
    localStorage.setItem(this.CACHE_KEY, data.current.toString());
    localStorage.setItem('user_longest_streak', data.longest.toString());
    localStorage.setItem('user_last_hi_date', data.lastHiDate || '');
    localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(this.CACHE_USER_KEY, userId);
  }

  /**
   * Get stale cache (ignoring TTL) as last resort (private)
   * @private
   */
  static #getStaleCache(userId) {
    const cachedUserId = localStorage.getItem(this.CACHE_USER_KEY);
    if (cachedUserId !== userId) return null;

    const value = localStorage.getItem(this.CACHE_KEY);
    if (!value) return null;

    return {
      current: Math.max(0, parseInt(value, 10) || 0),
      longest: Math.max(0, parseInt(localStorage.getItem('user_longest_streak') || '0', 10) || 0),
      lastHiDate: localStorage.getItem('user_last_hi_date'),
      source: 'stale-cache'
    };
  }

  /**
   * Force refresh from database (bypass cache)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Fresh streak data
   */
  static async refresh(userId) {
    this.invalidate();
    return this.get(userId);
  }
}

// Global export
window.StreakAuthority = StreakAuthority;
