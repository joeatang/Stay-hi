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
      // 🚀 CRITICAL: Detect if this is a stale instance from previous page
      const now = Date.now();
      const instanceAge = ProfileManager.instance._createdAt ? now - ProfileManager.instance._createdAt : 0;
      
      // If instance is older than 5 seconds, it's from a previous page load - clear it
      if (instanceAge > 5000) {
        console.warn('🧹 Clearing stale ProfileManager instance (age: ' + Math.round(instanceAge/1000) + 's)');
        ProfileManager.instance = null;
        window.ProfileManager = null;
      } else {
        console.log('✅ Reusing recent ProfileManager instance');
        return ProfileManager.instance;
      }
    }
    
    // Singleton state
    this._initialized = false;
    this._authReady = false;
    this._profile = null;
    this._userId = null;
    this._supabase = null;
    this._createdAt = Date.now(); // Track creation time
    
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
    // 🚀 CRITICAL: Always validate Supabase client reference, even if already initialized
    // BFCache restoration means window.supabaseClient might be stale but ProfileManager persists
    await this._refreshSupabaseReference();
    
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
      console.warn('🔍 [ProfileManager] Step 1 complete, moving to Step 2...');
      
      // Step 2: Wait for auth to be ready
      await this._waitForAuth();
      console.warn('🔍 [ProfileManager] Step 2 complete, moving to Step 3...');
      
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
      console.warn('✅ ProfileManager ready:', {
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
   * Refresh Supabase client reference (handles BFCache staleness)
   * 🚀 CRITICAL: Must be called on every init() to detect stale client from previous page
   */
  async _refreshSupabaseReference() {
    // Force HiSupabase validation by calling getClient (triggers validateClientFreshness)
    if (window.HiSupabase?.getClient) {
      const freshClient = window.HiSupabase.getClient();
      if (freshClient && this._supabase !== freshClient) {
        console.warn('🔄 ProfileManager: Refreshing stale Supabase client reference');
        this._supabase = freshClient;
      }
    }
  }

  /**
   * Wait for Supabase client to be available
   * 🚀 WOZ FIX: ALWAYS get fresh client from HiSupabase.getClient(), never read window directly
   * 🚀 MOBILE FIX: Use requestAnimationFrame instead of setTimeout (Safari throttles setTimeout in background)
   */
  async _waitForSupabase() {
    console.warn('🔍 [ProfileManager] _waitForSupabase() starting...');
    const maxAttempts = 100; // 5 seconds (50ms intervals)
    
    // 🚀 Mobile Safari optimization: use rAF instead of setTimeout
    const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.warn(`📱 Mobile Safari detected: ${isMobileSafari}, rAF available: ${typeof requestAnimationFrame}`);
    
    const wait = () => new Promise(resolve => {
      if (isMobileSafari) {
        requestAnimationFrame(() => requestAnimationFrame(resolve)); // Double rAF = ~32ms
      } else {
        setTimeout(resolve, 50);
      }
    });
    
    console.warn(`🔄 About to start polling loop (maxAttempts=${maxAttempts})`);
    for (let i = 0; i < maxAttempts; i++) {
      console.warn(`🔄 Loop iteration ${i} starting`);
      let client = null;
      
      try {
        // 🚀 WOZ FIX: Wrap in try-catch to handle any synchronous errors
        if (window.HiSupabase?.getClient) {
          client = window.HiSupabase.getClient();
        } else if (window.getSupabase) {
          client = window.getSupabase();
        } else {
          // HiSupabase not loaded yet, wait and retry
          console.warn(`⏳ Poll ${i}: HiSupabase not loaded yet`);
          await wait();
          continue;
        }
      } catch (error) {
        console.warn(`❌ Poll ${i}: Error getting client:`, error);
        await wait();
        continue;
      }
      
      // Check if we got a valid client
      if (client && client.auth) {
        console.warn(`✅ Poll ${i}: Supabase client ready!`);
        return client;
      } else {
        console.warn(`⏳ Poll ${i}: Client not ready yet (client=${!!client}, auth=${!!client?.auth})`);
      }
      
      await wait();
    }
    
    throw new Error('Supabase client not available after 5 seconds');
  }

  /**
   * Get current Supabase client, refreshing if stale
   * 🚀 CRITICAL: Detect if window.__HI_SUPABASE_CLIENT changed (cross-page navigation)
   */
  _getSupabase() {
    const currentClient = window.supabaseClient || window.hiSupabase || window.sb || window.__HI_SUPABASE_CLIENT;
    
    // If cached client doesn't match current window client, update it
    if (this._supabase !== currentClient && currentClient) {
      console.warn('🔄 ProfileManager: Detected new Supabase client, updating reference');
      this._supabase = currentClient;
    }
    
    return this._supabase;
  }

  /**
   * Wait for auth to be ready (user_id available or confirmed anonymous)
   * 🔥 FIX: Check if AuthReady already finished, otherwise wait for event
   */
  async _waitForAuth() {
    console.warn('🔍 [ProfileManager] _waitForAuth() starting...');
    if (this._authReady) {
      console.warn('🔍 [ProfileManager] Auth already ready, skipping wait');
      return;
    }

    // 🚀 CRITICAL: Check if AuthReady.js already finished (event already fired)
    // Import waitAuthReady from AuthReady.js if available
    if (window.waitAuthReady) {
      console.warn('🔍 Checking if AuthReady already completed...');
      try {
        const authState = await window.waitAuthReady();
        console.warn('🔍 waitAuthReady returned:', !!authState);
        const { session, membership } = authState || {};
        
        if (session?.user) {
          this._userId = session.user.id;
          this._authReady = true;
          console.warn('✅ Auth ready (from AuthReady cache) - authenticated user:', this._userId);
          return;
        } else {
          this._userId = null;
          this._authReady = true;
          console.warn('ℹ️ Auth ready (from AuthReady cache) - anonymous user');
          return;
        }
      } catch (error) {
        console.warn('⚠️ waitAuthReady failed, falling back to event listener:', error);
      }
    }

    console.warn('🔍 [ProfileManager] Setting up auth event listener...');

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
              const { data: { session } } = await this._getSupabase().auth.getSession();
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
   * 🚀 MOBILE FIX: 3-second timeout prevents hanging on iOS Safari
   */
  async _loadProfileFromDatabase() {
    if (!this._userId) {
      console.warn('ℹ️ No user_id - skipping profile load');
      this._profile = this._getAnonymousProfile();
      return;
    }

    // 🚀 MOBILE FIX: Try localStorage FIRST for instant load, then refresh from DB
    const storageKey = `stayhi_profile_${this._userId}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        this._profile = JSON.parse(cached);
        console.warn('⚡ Using cached profile (instant load)');
        // Don't return - continue to refresh from DB in background
      } catch (e) {
        console.warn('⚠️ Cached profile parse failed');
      }
    }

    try {
      const supabase = this._getSupabase();
      
      // 🔍 ZOMBIE DEBUG: Log client state before query
      console.warn('🔍 [ZOMBIE DEBUG] About to query profiles:', {
        hasSupabase: !!supabase,
        hasFrom: !!supabase?.from,
        clientUrl: window.__HI_SUPABASE_CLIENT_URL,
        clientTimestamp: window.__HI_SUPABASE_CLIENT_TIMESTAMP,
        currentPath: window.location.pathname,
        navigatorOnline: navigator.onLine
      });
      
      // 🔥 SLEEP/WAKE FIX: Give network 500ms to reconnect after phone wake
      // Safari's network stack needs time to restore connections after sleep/app switch
      const clientAge = Date.now() - (window.__HI_SUPABASE_CLIENT_TIMESTAMP || 0);
      if (clientAge < 1000) {
        console.warn('📡 [ProfileManager] Fresh client (<1s old) - waiting 500ms for network to stabilize');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.warn('✅ [ProfileManager] Network stabilization wait complete');
      }
      
      // 🚀 ZOMBIE FIX: Use AbortController to properly cancel timed-out queries
      // This prevents AbortError when navigation happens during slow queries
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Profile query timeout (5s) - aborting');
        console.warn('🔍 [ZOMBIE DEBUG] Timeout details:', {
          controllerSignal: controller.signal,
          aborted: controller.signal.aborted,
          navigatorOnLine: navigator.onLine
        });
        controller.abort();
      }, 5000); // Increased from 3s to 5s for wake scenarios
      
      console.warn('🔍 [ZOMBIE DEBUG] Starting profile query...');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', this._userId)
          .abortSignal(controller.signal)
          .single();
        
        clearTimeout(timeoutId);

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          console.warn('✅ Profile loaded from database');
          this._profile = data;
          this._cacheProfile(data);
          localStorage.setItem(storageKey, JSON.stringify(data));
        } else if (!this._profile) {
          // No cache and no DB data - create default
          console.warn('ℹ️ No profile found, creating default');
          this._profile = {
            id: this._userId,
            username: `user_${this._userId.slice(-6)}`,
            display_name: 'Stay Hi User',
            bio: '',
            location: '',
            avatar_url: null,
            created_at: new Date().toISOString()
          };
          // Save in background (don't await)
          this._supabase.from('profiles').upsert(this._profile, { onConflict: 'id' });
        }
      } catch (queryError) {
        clearTimeout(timeoutId);
        if (queryError.name === 'AbortError') {
          console.warn('⚠️ Profile query timed out - using cache');
        } else {
          throw queryError;
        }
      }

    } catch (error) {
      console.warn('⚠️ Profile load error:', error.message);
      // Already have cache loaded above, or use anonymous
      if (!this._profile) {
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
    this._getSupabase().auth.onAuthStateChange(async (event, session) => {
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

// 🚀 WOZ FIX: Only create singleton if it doesn't exist
if (!window.ProfileManager || !window.ProfileManager._createdAt) {
  console.log('🆕 Creating fresh ProfileManager singleton');
  const profileManager = new ProfileManager();
  window.ProfileManager = profileManager;
  
  // Export for ES6 modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = profileManager;
  }
} else {
  console.log('♻️ Reusing existing ProfileManager singleton');
}

// 🚀 WOZ FIX: Removed pagehide listener - constructor age check handles stale instances
// The pagehide event fires too early on mobile Safari, clearing instance mid-init

console.log('📦 ProfileManager class loaded (singleton pattern)');
