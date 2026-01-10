/**
 * 🏆 PROFILE MANAGER - Gold Standard Single Source of Truth
 * 
 * WOZ PRINCIPLE: One class, one responsibility, zero ambiguity
 * 
 * WHAT IT SOLVES:
 * - 14 different ways to get user_id → NOW: ONE way
 * - 6 different profile storage locations → NOW: ONE source of truth
 * - Race conditions on auth → NOW: Guaranteed ready before any write
 * - Hardcoded defaults → NOW: Database-first loading
 * - Profile updates don't sync → NOW: Retroactive metadata updates
 * 
 * USAGE:
 *   await ProfileManager.init(); // Call once on app load
 *   const userId = await ProfileManager.ensureUserId(); // Never null
 *   const profile = ProfileManager.getProfile(); // Always current
 */

class ProfileManager {
  constructor() {
    if (ProfileManager.instance) {
      return ProfileManager.instance;
    }
    
    // Singleton state
    this._initialized = false;
    this._authReady = false;
    this._profile = null;
    this._userId = null;
    this._supabase = null;
    
    // Promise resolvers for blocking waits
    this._authReadyPromise = null;
    this._authReadyResolve = null;
    
    // 🔥 NAVIGATION FIX: Listen for new Supabase client creation
    // Update our client reference when navigating between pages
    window.addEventListener('hi:supabase-client-ready', (e) => {
      if (e.detail?.client && this._supabase !== e.detail.client) {
        console.log('🔄 ProfileManager: Updating to new Supabase client');
        this._supabase = e.detail.client;
      }
    });
    
    ProfileManager.instance = this;
  }

  /**
   * Initialize ProfileManager - call once on app load
   * WOZ: Blocks until auth is ready, then loads profile from database
   * 🚀 GOLD STANDARD: Checks cache first for instant loads on navigation
   */
  async init() {
    // 🚀 CRITICAL: Allow re-init if previous init failed (for navigation recovery)
    // Check if we're already initialized AND initialization succeeded
    if (this._initialized && this._profile && this._userId) {
      console.log('✅ ProfileManager already initialized with valid data');
      return;
    }

    // If we were marked initialized but have no data, we failed - retry
    if (this._initialized && (!this._profile || !this._userId)) {
      console.warn('⚠️ ProfileManager marked initialized but has no data - resetting for retry');
      this._initialized = false;
    }

    console.log('🚀 ProfileManager initializing...');

    try {
      // 🚀 STEP 0: Check NavigationStateCache for instant load
      if (window.NavCache) {
        const cachedAuth = window.NavCache.getAuth();
        const cachedProfile = window.NavCache.getProfile();
        
        if (cachedAuth && cachedProfile && !cachedAuth.needsRefresh) {
          console.log('⚡ ProfileManager using cached data (instant load)');
          this._userId = cachedAuth.userId;
          this._authReady = true;
          this._profile = cachedProfile;
          this._initialized = true;
          
          // Fire auth-ready immediately with cached data
          window.dispatchEvent(new CustomEvent('hi:auth-ready', {
            detail: { 
              userId: this._userId, 
              authenticated: cachedAuth.isAuthenticated,
              profile: this._profile,
              fromCache: true
            }
          }));
          console.log('⚡ Fast path: ProfileManager ready from cache');
          
          // Refresh in background if needed
          if (cachedProfile.needsRefresh) {
            console.log('🔄 Refreshing profile in background...');
            this._refreshProfileInBackground();
          }
          
          return; // Skip slow database path
        }
      }
      
      // Step 1: Wait for Supabase client
      this._supabase = await this._waitForSupabase();
      
      // Step 2: Wait for auth to be ready
      await this._waitForAuth();
      
      // Step 3: Load profile from database (no hardcoded defaults)
      await this._loadProfileFromDatabase();
      
      // 🚀 Cache the loaded data for next navigation
      if (window.NavCache) {
        window.NavCache.setAuth(this._userId);
        if (this._profile) {
          window.NavCache.setProfile(this._profile);
        }
      }
      
      // Step 4: Set up event listeners
      this._setupEventListeners();
      
      this._initialized = true;
      console.log('✅ ProfileManager ready:', {
        userId: this._userId,
        username: this._profile?.username,
        authenticated: !!this._userId
      });

      // 🎯 FIX TIMEOUT: Always fire auth-ready event after init completes
      // This ensures HiUnifiedSplash knows auth is ready (anonymous or authenticated)
      window.dispatchEvent(new CustomEvent('hi:auth-ready', {
        detail: { 
          userId: this._userId, 
          authenticated: !!this._userId,
          profile: this._profile,
          fromCache: false
        }
      }));
      console.log('📢 Dispatched hi:auth-ready event');

      // Expose globally for legacy compatibility
      window.__ProfileManager = this;
      
    } catch (error) {
      console.error('❌ ProfileManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * WOZ CRITICAL: Ensures user_id exists before any database write
   * Blocks until auth is ready, never returns null
   */
  async ensureUserId() {
    if (this._userId) {
      return this._userId;
    }

    // Wait for auth to be ready
    if (!this._authReady) {
      console.log('⏳ Waiting for auth before getting user_id...');
      await this._waitForAuth();
    }

    if (!this._userId) {
      throw new Error('User ID not available - user may not be authenticated');
    }

    return this._userId;
  }

  /**
   * Get current profile (synchronous, always up-to-date)
   */
  getProfile() {
    return this._profile;
  }

  /**
   * Get user_id synchronously (may be null if not authenticated)
   */
  getUserId() {
    return this._userId;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this._userId && this._userId !== 'anonymous';
  }

  /**
   * Update profile (saves to database, updates all copies)
   * WOZ: Single write propagates everywhere
   */
  async updateProfile(updates) {
    if (!this._userId) {
      throw new Error('Cannot update profile - not authenticated');
    }

    console.log('💾 ProfileManager updating profile:', updates);

    try {
      // Update database
      const { data, error } = await this._supabase
        .from('profiles')
        .upsert({
          id: this._userId,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('❌ Profile update failed:', error);
        throw error;
      }

      // Update in-memory cache
      this._profile = { ...this._profile, ...updates };

      // Update localStorage
      const storageKey = `stayhi_profile_${this._userId}`;
      localStorage.setItem(storageKey, JSON.stringify(this._profile));

      // Update legacy currentProfile if it exists
      if (window.currentProfile) {
        Object.assign(window.currentProfile, updates);
      }

      // Fire profile:updated event for feed refresh
      window.dispatchEvent(new CustomEvent('profile:updated', {
        detail: {
          userId: this._userId,
          ...updates
        }
      }));

      console.log('✅ Profile updated across all systems');
      
      // WOZ CRITICAL: Update existing shares' metadata retroactively
      await this._updateExistingSharesMetadata(updates);

      return { success: true, data };

    } catch (error) {
      console.error('❌ ProfileManager update failed:', error);
      return { success: false, error };
    }
  }

  /**
   * WOZ INNOVATION: Update existing shares when profile changes
   * Ensures old shares show new avatar/name
   */
  async _updateExistingSharesMetadata(updates) {
    try {
      if (!updates.avatar_url && !updates.display_name) {
        return; // Nothing to update
      }

      console.log('🔄 Updating existing shares metadata...');

      // Build metadata update object
      const metadataUpdate = {};
      if (updates.avatar_url) metadataUpdate.avatar_url = updates.avatar_url;
      if (updates.display_name) metadataUpdate.display_name = updates.display_name;

      // Update public_shares metadata (JSONB column)
      const { error: publicError } = await this._supabase
        .from('public_shares')
        .update({
          metadata: this._supabase.raw(`metadata || '${JSON.stringify(metadataUpdate)}'::jsonb`)
        })
        .eq('user_id', this._userId);

      if (publicError) {
        console.warn('⚠️ Could not update public_shares metadata:', publicError);
      } else {
        console.log('✅ Updated public_shares metadata');
      }

      // Update hi_archives metadata
      const { error: archiveError } = await this._supabase
        .from('hi_archives')
        .update({
          metadata: metadataUpdate
        })
        .eq('user_id', this._userId);

      if (archiveError) {
        console.warn('⚠️ Could not update hi_archives metadata:', archiveError);
      } else {
        console.log('✅ Updated hi_archives metadata');
      }

    } catch (error) {
      console.warn('⚠️ Metadata update failed (non-critical):', error);
    }
  }

  /**
   * Wait for Supabase client to be available
   */
  async _waitForSupabase() {
    const maxAttempts = 100; // 5 seconds (50ms intervals)
    for (let i = 0; i < maxAttempts; i++) {
      const client = window.supabaseClient || window.hiSupabase || window.sb || window.__HI_SUPABASE_CLIENT;
      if (client && client.auth) {
        console.log('✅ Supabase client ready');
        return client;
      }
      // 🚀 WOZ OPTIMIZATION: Faster polling for snappier auth
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Supabase client not available after 5 seconds');
  }

  /**
   * Wait for auth to be ready (user_id available or confirmed anonymous)
   * 🔥 FIX: Check if AuthReady already finished, otherwise wait for event
   */
  async _waitForAuth() {
    if (this._authReady) {
      return;
    }

    // 🚀 CRITICAL: Check if AuthReady.js already finished (event already fired)
    // Import waitAuthReady from AuthReady.js if available
    if (window.waitAuthReady) {
      console.log('🔍 Checking if AuthReady already completed...');
      try {
        const authState = await window.waitAuthReady();
        const { session, membership } = authState || {};
        
        if (session?.user) {
          this._userId = session.user.id;
          this._authReady = true;
          console.log('✅ Auth ready (from AuthReady cache) - authenticated user:', this._userId);
          return;
        } else {
          this._userId = null;
          this._authReady = true;
          console.log('ℹ️ Auth ready (from AuthReady cache) - anonymous user');
          return;
        }
      } catch (error) {
        console.warn('⚠️ waitAuthReady failed, falling back to event listener:', error);
      }
    }

    // Fallback: Listen for event (if AuthReady hasn't fired yet)
    if (!this._authReadyPromise) {
      this._authReadyPromise = new Promise((resolve) => {
        this._authReadyResolve = resolve;

        const handleAuthReady = (event) => {
          const { session, membership } = event.detail || {};
          
          if (session?.user) {
            this._userId = session.user.id;
            this._authReady = true;
            console.log('✅ Auth ready (from event) - authenticated user:', this._userId);
          } else {
            this._userId = null;
            this._authReady = true;
            console.log('ℹ️ Auth ready (from event) - anonymous user');
          }

          if (this._authReadyResolve) {
            this._authReadyResolve();
          }
          
          window.removeEventListener('hi:auth-ready', handleAuthReady);
        };

        window.addEventListener('hi:auth-ready', handleAuthReady);
        
        // Emergency fallback: Check session directly after 500ms
        setTimeout(async () => {
          if (!this._authReady) {
            console.warn('⚠️ AuthReady event timeout, checking session directly...');
            try {
              const { data: { session } } = await this._supabase.auth.getSession();
              if (session?.user) {
                this._userId = session.user.id;
                this._authReady = true;
                console.log('✅ Auth ready (emergency fallback) - authenticated:', this._userId);
              } else {
                this._userId = null;
                this._authReady = true;
                console.log('ℹ️ Auth ready (emergency fallback) - anonymous');
              }

              if (this._authReadyResolve) {
                this._authReadyResolve();
              }
            } catch (error) {
              // AbortError is EXPECTED in MPA - treat as no-op
              if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                return; // Navigation abort - no-op
              }
              console.error('❌ Emergency auth check failed:', error);
              this._authReady = true;
              if (this._authReadyResolve) {
                this._authReadyResolve();
              }
            }
          }
        }, 500); // Reduced from 2000ms to 500ms
      });
    }

    return this._authReadyPromise;
  }

  /**
   * Load profile from database (database-first, no hardcoded defaults)
   */
  async _loadProfileFromDatabase() {
    if (!this._userId) {
      console.log('ℹ️ No user_id - skipping profile load');
      this._profile = this._getAnonymousProfile();
      return;
    }

    try {
      console.log('📥 Loading profile from database for user:', this._userId);

      const { data, error } = await this._supabase
        .from('profiles')
        .select('*')
        .eq('id', this._userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('❌ Database query failed:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Profile loaded from database:', {
          username: data.username,
          display_name: data.display_name,
          bio: data.bio
        });
        this._profile = data;
        // Cache for next navigation
        this._cacheProfile(data);

        // Update localStorage cache
        const storageKey = `stayhi_profile_${this._userId}`;
        localStorage.setItem(storageKey, JSON.stringify(data));

      } else {
        console.log('ℹ️ No profile in database, creating default');
        // Create minimal profile in database
        this._profile = {
          id: this._userId,
          username: `user_${this._userId.slice(-6)}`,
          display_name: 'Stay Hi User',
          bio: '', // NO hardcoded fallback
          location: '',
          avatar_url: null,
          created_at: new Date().toISOString()
        };

        // Save to database
        await this._supabase
          .from('profiles')
          .upsert(this._profile, { onConflict: 'id' });
      }

    } catch (error) {
      console.error('❌ Profile load failed:', error);
      // Fallback to localStorage
      const storageKey = `stayhi_profile_${this._userId}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        console.log('📦 Using cached profile from localStorage');
        this._profile = JSON.parse(cached);
      } else {
        this._profile = this._getAnonymousProfile();
      }
    }
  }

  /**
   * Get anonymous profile structure
   */
  _getAnonymousProfile() {
    return {
      id: null,
      username: 'Anonymous',
      display_name: 'Hi Friend',
      bio: '', // NO hardcoded default
      location: '',
      avatar_url: null,
      created_at: new Date().toISOString()
    };
  }
  
  /**
   * 🚀 GOLD STANDARD: Refresh profile in background (after instant load from cache)
   */
  async _refreshProfileInBackground() {
    try {
      console.log('🔄 Background refresh: Loading fresh profile from database...');
      
      if (!this._supabase) {
        this._supabase = await this._waitForSupabase();
      }
      
      const { data, error } = await this._supabase
        .from('profiles')
        .select('*')
        .eq('id', this._userId)
        .single();
      
      if (error) {
        console.warn('⚠️ Background refresh failed:', error);
        return;
      }
      
      if (data) {
        // Check if data actually changed
        const changed = JSON.stringify(this._profile) !== JSON.stringify(data);
        
        if (changed) {
          console.log('🔄 Profile data changed, updating...');
          this._profile = data;
          
          // Update cache
          if (window.NavCache) {
            window.NavCache.setProfile(data);
          }
          
          // Fire update event
          window.dispatchEvent(new CustomEvent('profile:updated', {
            detail: { userId: this._userId, ...data }
          }));
        } else {
          console.log('✅ Background refresh: Profile unchanged');
        }
      }
    } catch (error) {
      console.warn('⚠️ Background refresh error:', error);
    }
  }

  /**
   * Set up event listeners for auth changes
   */
  _setupEventListeners() {
    // Listen for auth state changes
    this._supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.id);
      
      if (event === 'INITIAL_SESSION' && session?.user) {
        // CRITICAL FIX: Update userId immediately on INITIAL_SESSION
        const previousUserId = this._userId;
        this._userId = session.user.id;
        this._authReady = true;
        
        console.log('🔐 INITIAL_SESSION detected - updating userId:', {
          previous: previousUserId,
          new: this._userId
        });
        
        // Load profile if user changed
        if (previousUserId !== this._userId) {
          await this._loadProfileFromDatabase();
          
          // Emit auth-ready event for components
          window.dispatchEvent(new CustomEvent('hi:auth-ready', {
            detail: { userId: this._userId, session: session }
          }));
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        this._userId = session.user.id;
        this._authReady = true;
        await this._loadProfileFromDatabase();
        
        // Emit auth-ready event
        window.dispatchEvent(new CustomEvent('hi:auth-ready', {
          detail: { userId: this._userId, session: session }
        }));
      } else if (event === 'SIGNED_OUT') {
        this._userId = null;
        this._authReady = true;
        this._profile = this._getAnonymousProfile();
        // Clear localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('stayhi_profile_') || key.startsWith('hi_profile_cache_')) {
            localStorage.removeItem(key);
          }
        });
      }
    });
  }

  /**
   * Cache profile for navigation recovery
   */
  _cacheProfile(profile) {
    try {
      if (profile && this._userId) {
        localStorage.setItem('hi_profile_cache_' + this._userId, JSON.stringify({
          profile,
          timestamp: Date.now()
        }));
      }
    } catch (e) {
      console.warn('Failed to cache profile:', e);
    }
  }

  /**
   * Get cached profile (for AbortError recovery)
   */
  _getCachedProfile() {
    try {
      if (!this._userId) return null;
      const cached = localStorage.getItem('hi_profile_cache_' + this._userId);
      if (cached) {
        const { profile, timestamp } = JSON.parse(cached);
        // Use cache if less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          console.log('✅ Using cached profile from', new Date(timestamp).toLocaleTimeString());
          return profile;
        }
      }
    } catch (e) {
      console.warn('Failed to read cached profile:', e);
    }
    return null;
  }

  /**
   * Check if ProfileManager is ready
   */
  isReady() {
    return this._initialized && this._authReady;
  }
}

// Create singleton instance
const profileManager = new ProfileManager();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = profileManager;
}

// Expose globally
window.ProfileManager = profileManager;

// 🚀 CRITICAL: Clear singleton on page unload to prevent corruption across navigation
window.addEventListener('pagehide', () => {
  console.log('🧹 Clearing ProfileManager singleton for next page');
  ProfileManager.instance = null;
  window.ProfileManager = null;
});

console.log('📦 ProfileManager class loaded (singleton pattern)');
