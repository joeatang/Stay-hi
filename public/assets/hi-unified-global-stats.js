/**
 * 🌍 Hi Unified Global Stats System
 * Tesla-Grade stats architecture ensuring identical numbers across all pages
 * Tracks: 1) Global medallion taps, 2) Global shares (hi5/island/gym), 3) Total app users
 */

(function() {
  'use strict';

  class HiUnifiedGlobalStats {
    constructor() {
      this.cache = {
        data: null,
        timestamp: null,
        ttl: 30000 // 30 seconds cache
      };
      
      this.fallbacks = {
        hi_waves: 0,
        total_his: 0,
        total_users: 0,
        active_users_24h: 0
      };
      
      this.isInitialized = false;
      this.init();
    }
    
    init() {
      if (this.isInitialized) return;
      this.isInitialized = true;
      console.log('🌍 Hi Unified Global Stats initialized');
    }
    
    // Get Supabase client with surgical fallback
    getSupabaseClient() {
      console.log('🎯 SURGICAL: Getting Supabase client...');
      
      // Try window.db first (initialized by hi-dashboard.html)
      if (window.db && typeof window.db.rpc === 'function') {
        console.log('✅ SURGICAL: Using window.db client');
        return window.db;
      }
      
      // Try window.supabase client
      if (window.supabase && typeof window.supabase.rpc === 'function') {
        console.log('✅ SURGICAL: Using window.supabase client');
        return window.supabase;
      }
      
      // Try creating from global supabase UMD
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        try {
          console.log('🎯 SURGICAL: Creating fresh Supabase client from UMD...');
          const client = supabase.createClient(
            'https://gfcubvroxgfvjhacinic.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g'
          );
          window.db = client; // Cache for future use
          console.log('✅ SURGICAL: Fresh client created and cached');
          return client;
        } catch (error) {
          console.error('❌ SURGICAL ERROR: Could not create Supabase client:', error);
          return null;
        }
      }
      
      console.error('❌ SURGICAL ERROR: No Supabase client available');
      return null;
    }
    
    // Check if cache is valid
    isCacheValid() {
      if (!this.cache.data || !this.cache.timestamp) return false;
      return (Date.now() - this.cache.timestamp) < this.cache.ttl;
    }
    
    // Fetch fresh stats from Supabase
    async fetchFreshStats() {
      try {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
          console.error('❌ CRITICAL: No Supabase client available');
          throw new Error('No Supabase client - cannot fetch real data');
        }
        
        console.log('📊 Fetching fresh global stats from Supabase...');
        const { data, error } = await supabase.rpc('get_global_stats');
        
        if (error) {
          console.error('❌ RPC get_global_stats failed:', error);
          console.error('❌ CRITICAL: Cannot fetch stats from Supabase. This will cause data inconsistency!');
          throw new Error(`Supabase RPC failed: ${error.message}`);
        }
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.error('❌ No data returned from get_global_stats RPC');
          console.error('❌ CRITICAL: Database returned empty result. Check RPC function.');
          throw new Error('No data returned from Supabase RPC');
        }
        
        const rawStats = Array.isArray(data) ? data[0] : data;
        
        // 🎯 TESLA-GRADE: Unified field mapping for all RPC response formats
        const unifiedStats = {
          hi_waves: Number(rawStats.hi_waves) || Number(rawStats.total_hi_waves) || 0,
          total_his: Number(rawStats.total_his) || 0,
          total_users: Number(rawStats.total_users) || 0,
          active_users_24h: Number(rawStats.active_users_24h) || 0,
          updated_at: rawStats.updated_at || new Date().toISOString()
        };
        
        console.log('✅ Fresh global stats loaded:', unifiedStats);
        
        // Cache the result
        this.cache = {
          data: unifiedStats,
          timestamp: Date.now()
        };
        
        return unifiedStats;
        
      } catch (error) {
        console.error('❌ CRITICAL ERROR: Failed to fetch stats from Supabase:', error);
        
        // 🚨 NO FALLBACKS - we want identical data across all devices
        // If Supabase fails, we show an error state rather than inconsistent data
        return {
          hi_waves: 'ERROR',
          total_his: 'ERROR', 
          total_users: 'ERROR',
          active_users_24h: 'ERROR',
          updated_at: new Date().toISOString(),
          error: true,
          error_message: 'Unable to connect to database'
        };
      }
    }
    
    // Get fallback stats from localStorage
    getFallbackStats() {
      try {
        console.log('🔄 Using localStorage fallback stats...');
        
        const hiTotal = localStorage.getItem('hi_total') || '0';
        const generalShares = JSON.parse(localStorage.getItem('hi_general_shares') || '[]');
        
        const fallbackStats = {
          hi_waves: generalShares.length || 0,
          total_his: parseInt(hiTotal) || 0,
          total_users: 0, // Cannot determine from localStorage
          active_users_24h: 0,
          updated_at: new Date().toISOString()
        };
        
        console.log('📦 Fallback stats from localStorage:', fallbackStats);
        return fallbackStats;
        
      } catch (error) {
        console.warn('⚠️ Fallback stats failed, using hardcoded zeros:', error);
        return this.fallbacks;
      }
    }
    
    // Main method: Get unified global stats (cached or fresh)
    async getStats() {
      // Return cached data if valid
      if (this.isCacheValid()) {
        console.log('⚡ Using cached global stats');
        return this.cache.data;
      }
      
      // Fetch fresh data
      return await this.fetchFreshStats();
    }
    
    // 🎯 SURGICAL: Track medallion tap with debugging
    async trackMedallionTap() {
      try {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
          console.error('❌ SURGICAL ERROR: No Supabase client for medallion tap');
          throw new Error('Cannot track medallion tap - no Supabase client');
        }
        
        console.log('🎯 SURGICAL DEBUG: Starting medallion tap tracking...');
        
        // Get stats BEFORE increment 
        const statsBefore = await this.getStats();
        console.log('📊 BEFORE medallion tap - Global Waves:', statsBefore.hi_waves);
        
        // Call increment_hi_wave RPC (medallion tap = hi_wave)
        console.log('🎯 SURGICAL: Calling increment_hi_wave RPC...');
        const { data: newCount, error } = await supabase.rpc('increment_hi_wave');
        
        if (error) {
          console.error('❌ SURGICAL ERROR: increment_hi_wave failed:', error);
          throw new Error(`Medallion tap failed: ${error.message}`);
        }
        
        console.log('✅ SURGICAL SUCCESS: increment_hi_wave returned:', newCount);
        
        // Clear cache to force fresh fetch
        this.cache.data = null;
        this.cache.timestamp = null;
        
        // Get stats AFTER increment
        const statsAfter = await this.fetchFreshStats();
        console.log('📊 AFTER medallion tap - Global Waves:', statsAfter.hi_waves);
        console.log('🎯 SURGICAL RESULT: Change in Global Waves:', 
          statsAfter.hi_waves - statsBefore.hi_waves);
        
        // Update DOM immediately 
        await this.updateDOM();
        
        return newCount;
        
      } catch (error) {
        console.error('💥 SURGICAL FAILURE: Medallion tap tracking failed:', error);
        throw error;
      }
    }
    
    // Update DOM elements with unified stats
    async updateDOM(elementMappings = null) {
      try {
        const stats = await this.getStats();
        
        // Default element mappings for all pages
        const defaultMappings = {
          // welcome.html format
          'totalHis': stats.total_his,
          'globalWaves': stats.hi_waves,
          
          // hi-dashboard.html format
          'globalTotalHis': stats.total_his,
          'globalHiWaves': stats.hi_waves,
          'globalUsers': stats.total_users,
          
          // Alternative formats
          'hiWaves': stats.hi_waves,
          'totalUsers': stats.total_users,
          'activeUsers': stats.active_users_24h
        };
        
        const mappings = elementMappings || defaultMappings;
        
        // Update all matching DOM elements
        Object.entries(mappings).forEach(([elementId, value]) => {
          const element = document.getElementById(elementId);
          if (element) {
            element.textContent = Number(value).toLocaleString();
            console.log(`✅ Updated #${elementId} = ${value}`);
          }
        });
        
        console.log('🎯 DOM updated with unified global stats');
        return stats;
        
      } catch (error) {
        console.error('❌ Failed to update DOM with stats:', error);
      }
    }
    
    // Track Hi moment (increment total_his)
    async trackHiMoment(userUuid = null) {
      try {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
          console.warn('⚠️ Cannot track Hi moment - no Supabase client');
          return false;
        }
        
        console.log('📈 Tracking Hi moment...');
        const result = await supabase.rpc('increment_total_hi', { 
          user_uuid: userUuid 
        });
        
        if (result.error) {
          console.warn('⚠️ Failed to track Hi moment:', result.error);
          return false;
        }
        
        // Invalidate cache to force fresh fetch
        this.cache.data = null;
        
        console.log('✅ Hi moment tracked successfully');
        return true;
        
      } catch (error) {
        console.error('❌ Error tracking Hi moment:', error);
        return false;
      }
    }
    
    // Track Hi wave (increment hi_waves)
    async trackHiWave(userUuid = null, shareData = null) {
      try {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
          console.warn('⚠️ Cannot track Hi wave - no Supabase client');
          return false;
        }
        
        console.log('🌊 Tracking Hi wave with params:', { user_uuid: userUuid, share_data: shareData });
        const result = await supabase.rpc('increment_hi_wave', { 
          user_uuid: userUuid,
          share_data: shareData 
        });
        
        console.log('📊 RPC increment_hi_wave result:', result);
        
        if (result.error) {
          console.error('❌ Failed to track Hi wave - RPC ERROR:', result.error);
          console.error('❌ Error details:', result.error.message, result.error.details, result.error.hint);
          return false;
        }
        
        // Check if the function actually incremented (returned new count)
        const returnedCount = result.data;
        console.log('📈 RPC returned count:', returnedCount);
        
        if (returnedCount && returnedCount > 0) {
          console.log('✅ Hi wave tracked successfully, new count:', returnedCount);
        } else {
          console.warn('⚠️ RPC succeeded but returned unexpected count:', returnedCount);
        }
        
        // Invalidate cache to force fresh fetch
        this.cache.data = null;
        
        console.log('✅ Hi wave tracking completed');
        return true;
        
      } catch (error) {
        console.error('❌ Error tracking Hi wave:', error);
        return false;
      }
    }
    
    // Force refresh stats (bypass cache)
    async refresh() {
      console.log('🔄 Force refreshing global stats...');
      this.cache.data = null;
      return await this.getStats();
    }
    
    // Get current stats without fetching (cached only)
    getCurrentStats() {
      return this.cache.data || this.fallbacks;
    }
  }
  
  // Initialize global instance
  window.HiUnifiedGlobalStats = new HiUnifiedGlobalStats();
  
  // Expose convenient methods
  window.getGlobalStats = () => window.HiUnifiedGlobalStats.getStats();
  window.updateGlobalStats = (mappings) => window.HiUnifiedGlobalStats.updateDOM(mappings);
  window.trackHiMoment = (userUuid) => window.HiUnifiedGlobalStats.trackHiMoment(userUuid);
  window.trackHiWave = (userUuid, shareData) => window.HiUnifiedGlobalStats.trackHiWave(userUuid, shareData);
  
  // 🎯 SURGICAL: Expose medallion tap tracking (Global Waves = medallion taps 1:1)
  window.trackMedallionTap = () => window.HiUnifiedGlobalStats.trackMedallionTap();
  window.HiUnifiedStats = window.HiUnifiedGlobalStats; // Alternative alias
  
  // Auto-update DOM on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.updateGlobalStats(), 1000);
    });
  } else {
    setTimeout(() => window.updateGlobalStats(), 1000);
  }
  
  console.log('🌍 Hi Unified Global Stats service loaded');
  
})();