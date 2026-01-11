/**
 * 🔧 Hi-Island Feed: REAL Database Integration Fix
 * 
 * EVIDENCE-BASED SOLUTION:
 * - Share submissions go to: public_shares (public/anon) + hi_archives (all types)  
 * - Stats tracking uses: increment_total_hi() function on public_shares table
 * - Current hibase_shares_enabled flag = false, so system uses legacy hiDB
 * 
 * REAL DATA FLOW:
 * 1. HiShareSheet → hiDB.insertPublicShare() → public_shares table (if public/anon)
 * 2. HiShareSheet → hiDB.insertArchive() → hi_archives table (always)
 * 3. trackShareSubmission() → increment_total_hi() → updates total_his column in public_shares
 */

class HiIslandRealFeed {
  constructor() {
    this.currentTab = 'general';
    this.currentUserId = null;
    
    // Scroll state for auto-hide header
    this.scrollState = {
      lastScrollTop: 0,
      scrollDirection: 'none', // 'up' | 'down' | 'none'
      isHeaderHidden: false,
      scrollThreshold: 50 // pixels to scroll before triggering
    };
    
    // Simple internal storage
    this._feedDataInternal = {
      general: [],
      archives: []
    };
    
    // Simplified Proxy - removed Object.defineProperty that was causing interference
    this.feedData = new Proxy(this._feedDataInternal, {
      get: (target, prop) => {
        return target[prop];
      },
      set: (target, prop, value) => {
        if (prop === 'general') {
          console.log(`📦 [FEED DATA] Setting feedData.general to array with ${value?.length || 0} items`);
        }
        target[prop] = value;
        return true;
      }
    });
    
    this.isLoading = false;
    this.pagination = {
      general: { page: 0, hasMore: true },
      archives: { page: 0, hasMore: true }
    };
    
    // 🔧 CRITICAL FIX: Track resources for cleanup (prevent memory leaks)
    this._scrollHandlers = new Map(); // Store scroll handler references
    this._abortController = null; // Cancel in-flight requests
    this._documentClickHandler = null; // Track document click listener for cleanup
    
    // Origin filter state for General tab: 'all' | 'quick' | 'muscle' | 'island'
    this.originFilter = 'all';
    // Track locally waved shares to reflect UI state and reduce duplicates
    try {
      const cached = JSON.parse(localStorage.getItem('wavedShares') || '[]');
      this.wavedShares = new Set(Array.isArray(cached) ? cached : []);
    } catch {
      this.wavedShares = new Set();
    }
    
    // Track locally peaced shares (Send Peace reactions)
    try {
      const cachedPeace = JSON.parse(localStorage.getItem('peacedShares') || '[]');
      this.peacedShares = new Set(Array.isArray(cachedPeace) ? cachedPeace : []);
    } catch {
      this.peacedShares = new Set();
    }
    
    // 🔧 CRITICAL FIX: Listen for auth state changes to handle sign-in after page load
    this.setupAuthListener();
  }

  // Initialize the feed with REAL data sources
  // 🚀 MOBILE SAFARI FIX: Never block on database queries - use cache first
  async init() {
    console.log('🏝️ Initializing Hi-Island REAL Feed System...');
    
    const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    try {
      // 🚀 MOBILE FIX: Load cached feed data FIRST for instant render
      this._loadCachedFeed();
      
      // Render the interface immediately (with cached data or empty)
      this.render();
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Initialize auto-hide header scroll behavior
      this.initAutoHideHeader();
      
      // 🎯 Mark as initialized BEFORE any database calls
      this.isInitialized = true;
      console.log('✅ Hi-Island REAL Feed System ready (UI rendered)');
      
      // 🚀 MOBILE FIX: Load fresh data in background with timeout
      // Don't await - let it run async
      this._loadFreshDataWithTimeout(isMobileSafari ? 3000 : 10000);
      
    } catch (error) {
      console.error('❌ Hi-Island REAL Feed System initialization failed:', error);
      this.isInitialized = true;
    }
  }
  
  // 🚀 MOBILE FIX: Load cached feed from localStorage
  _loadCachedFeed() {
    try {
      const cached = localStorage.getItem('hi_feed_cache');
      if (cached) {
        const { general, archives, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        // Use cache if less than 5 minutes old
        if (age < 300000 && general?.length) {
          console.warn('⚡ Using cached feed data (' + general.length + ' items)');
          this.feedData.general = general;
          this.feedData.archives = archives || [];
          return true;
        }
      }
    } catch (e) {
      console.warn('⚠️ Feed cache read failed:', e);
    }
    return false;
  }
  
  // 🚀 MOBILE FIX: Save feed to localStorage cache
  _saveFeedCache() {
    try {
      localStorage.setItem('hi_feed_cache', JSON.stringify({
        general: this.feedData.general?.slice(0, 50) || [], // Cache first 50 items
        archives: this.feedData.archives?.slice(0, 50) || [],
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('⚠️ Feed cache write failed:', e);
    }
  }
  
  // 🚀 MOBILE FIX: Load fresh data with timeout protection
  async _loadFreshDataWithTimeout(timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    
    try {
      // Get current user (with timeout)
      await Promise.race([this.getCurrentUser(), timeoutPromise]);
      
      // Load feed data (with timeout)  
      await Promise.race([this.loadFeedData(), timeoutPromise]);
      
      // Cache the fresh data
      this._saveFeedCache();
      
      console.warn('✅ Feed loaded fresh data from database');
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        console.warn('⚠️ Feed database load timed out - using cache');
      } else if (error.name !== 'AbortError') {
        console.warn('⚠️ Feed load error:', error.message);
      }
    }
  }
  
  // Get display count - prefer fresh localStorage cache over stale database value
  getDisplayCount(type, shareId, dbCount) {
    try {
      const storageKey = type === 'wave' ? 'waveCounts' : 'peaceCounts';
      const cached = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const cachedData = cached[shareId];
      
      if (cachedData) {
        const age = Date.now() - cachedData.timestamp;
        const normalizedDbCount = typeof dbCount === 'number' ? dbCount : 0;
        // Use cache if < 30 seconds old AND higher than DB (DB trigger may not have completed yet)
        if (age < 30000 && cachedData.count > normalizedDbCount) {
          console.log(`📦 Using cached ${type}_count for ${shareId}:`, cachedData.count, '(DB:', dbCount, ')');
          return cachedData.count;
        }
      }
    } catch {}
    
    return typeof dbCount === 'number' ? dbCount : 0;
  }

  // Get current authenticated user
  async getCurrentUser() {
    try {
      const supabase = this.getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        this.currentUserId = user?.id || null;
      }
      
      console.log('👤 Current user ID:', this.currentUserId);
    } catch (error) {
      console.warn('⚠️ Could not get current user:', error);
      this.currentUserId = null;
    }
  }

  // 🔧 CRITICAL FIX: Listen for auth state changes (handles sign-in after init)
  setupAuthListener() {
    // Listen for Hi Island auth events
    document.addEventListener('hi:auth-ready', (e) => {
      const newUserId = e.detail?.user?.id || null;
      if (newUserId && newUserId !== this.currentUserId) {
        console.log('🔐 Auth state changed, updating user ID:', newUserId);
        this.currentUserId = newUserId;
        
        // If Archives tab is active, reload it with new auth state
        if (this.currentFeed === 'archives') {
          console.log('🔄 Reloading Archives tab with new auth state');
          this.loadFeedData();
        }
      }
    });
    
    // Also check ProfileManager periodically for first 5 seconds (handles race condition)
    if (window.ProfileManager) {
      const checkAuthState = async () => {
        const userId = window.ProfileManager.getUserId?.();
        if (userId && userId !== this.currentUserId) {
          console.log('🔐 ProfileManager auth detected, updating user ID:', userId);
          this.currentUserId = userId;
          
          // If Archives tab is active, reload it
          if (this.currentFeed === 'archives') {
            console.log('🔄 Reloading Archives tab with new auth state');
            this.loadFeedData();
          }
        }
      };
      
      // Check periodically with exponential backoff
      const intervals = [500, 1000, 2000, 5000];
      intervals.forEach(delay => setTimeout(checkAuthState, delay));
    }
  }

  // 🔧 CRITICAL FIX: Listen for auth state changes (handles sign-in after init)
  setupAuthListener() {
    // Listen for Hi Island auth events
    document.addEventListener('hi:auth-ready', (e) => {
      const newUserId = e.detail?.user?.id || null;
      if (newUserId && newUserId !== this.currentUserId) {
        console.log('🔐 Auth state changed, updating user ID:', newUserId);
        this.currentUserId = newUserId;
        
        // If Archives tab is active, reload it with new auth state
        if (this.currentFeed === 'archives') {
          console.log('🔄 Reloading Archives tab with new auth state');
          this.loadFeedData();
        }
      }
    });
    
    // Also listen for ProfileManager updates
    if (window.ProfileManager) {
      const checkAuthState = async () => {
        const userId = window.ProfileManager.getUserId?.();
        if (userId && userId !== this.currentUserId) {
          console.log('🔐 ProfileManager auth detected, updating user ID:', userId);
          this.currentUserId = userId;
          
          // If Archives tab is active, reload it
          if (this.currentFeed === 'archives') {
            console.log('🔄 Reloading Archives tab with new auth state');
            this.loadFeedData();
          }
        }
      };
      
      // Check periodically for first 5 seconds (handles race condition)
      const intervals = [500, 1000, 2000, 5000];
      intervals.forEach(delay => setTimeout(checkAuthState, delay));
    }
  }

  // Get Supabase client (using unified resolution from HiDB)
  getSupabase() {
    // Use the unified resolver from HiDB if available
    if (window.getSupabase) {
      const client = window.getSupabase();
      if (client) return client;
    }
    
    // 🚀 CRITICAL: Use HiSupabase.getClient() to trigger validation on every access
    // This ensures we never get stale client from BFCache navigation
    if (window.HiSupabase?.getClient) {
      return window.HiSupabase.getClient();
    }
    
    // Priority fallback chain (same as HiDB.js)
    if (window.__HI_SUPABASE_CLIENT) return window.__HI_SUPABASE_CLIENT;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.sb) return window.sb;
    
    // Last resort: CDN client
    if (window.supabase?.createClient) {
      console.warn('HiRealFeed: Using CDN fallback client');
      const url = "https://gfcubvroxgfvjhacinic.supabase.co";
      const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g";
      return window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,  // 🎯 FIX: Persist sessions across browser restarts
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    
    console.error('❌ HiRealFeed: No Supabase client found');
    return null;
  }

  // Load feed data from REAL database tables
  async loadFeedData(tabName = null) {
    const tabs = tabName ? [tabName] : ['general', 'archives'];
    
    // 🔧 CRITICAL FIX: Create new AbortController for this load operation
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    
    for (const tab of tabs) {
      try {
        if (tab === 'general') {
          await this.loadGeneralSharesFromPublicShares(signal);
        } else if (tab === 'archives') {
          // 🔧 CRITICAL FIX: Always attempt to load archives
          // loadUserArchivesFromHiArchives() will check LIVE auth state internally
          await this.loadUserArchivesFromHiArchives(signal);
        }
      } catch (error) {
        // Ignore abort errors (expected when tab switching)
        if (error.name === 'AbortError') {
          console.log(`🚫 ${tab} load cancelled (tab switch)`);
          return;
        }
        console.error(`❌ Failed to load ${tab} data:`, error);
        this.showErrorState(tab);
      }
    }
  }

  // Load general/public shares from public_shares table (REAL data source)
  async loadGeneralSharesFromPublicShares(signal = null) {
    const supabase = this.getSupabase();
    
    console.log('🔍 [FEED DEBUG] loadGeneralSharesFromPublicShares called');
    console.log('🔍 [FEED DEBUG] supabase client exists:', !!supabase);
    console.log('🔍 [FEED DEBUG] window.__HI_SUPABASE_CLIENT_URL:', window.__HI_SUPABASE_CLIENT_URL);
    console.log('🔍 [FEED DEBUG] current URL:', window.location.pathname);
    
    if (!supabase) {
      console.error('❌ HiRealFeed: No Supabase client available for general shares');
      console.error('❌ Available clients:', {
        getSupabase: !!window.getSupabase,
        __HI_SUPABASE_CLIENT: !!window.__HI_SUPABASE_CLIENT,
        supabaseClient: !!window.supabaseClient,
        sb: !!window.sb,
        supabase: !!window.supabase
      });
      this.showErrorState('general');
      return;
    }

    try {
      this.isLoading = true;
      
      console.log('🔍 [LOAD] loadGeneralSharesFromPublicShares called');
      console.log('🔍 [LOAD] pagination.general.page:', this.pagination.general.page);
      console.log('🔍 [LOAD] feedData.general BEFORE load:', this.feedData.general?.length || 0, 'items');
      
      console.log('🔍 HiRealFeed: Attempting to load from public_shares...');
      
      let shares, error;
      
      // Try normalized view first, fall back to direct table query
      // 🚀 PERFORMANCE: Include wave_count and peace_count in initial query
      try {
        const queryBuilder = supabase
          .from('public_shares_enriched')
          .select('*')
          .order('created_at', { ascending: false })
          .range(this.pagination.general.page * 20, (this.pagination.general.page + 1) * 20 - 1);
        
        console.log('🔍 [FEED DEBUG] About to execute query...');
        
        // 🔧 CRITICAL FIX: Support cancellation via AbortController
        const result = signal 
          ? await queryBuilder.abortSignal(signal)
          : await queryBuilder;
        
        console.log('🔍 [FEED DEBUG] Query complete. Error:', result.error, 'Data count:', result.data?.length);
        
        shares = result.data;
        error = result.error;
        
        if (!error && shares) {
          console.log('🏆 Loaded shares with LIVE profile data + reaction counts (view exists)');
          console.log('🔍 REACTION DEBUG: First share wave_count =', shares[0]?.wave_count, 'peace_count =', shares[0]?.peace_count);
        }
      } catch (viewError) {
        console.log('📊 View not available, using JOIN query');
      }
      
      // Fallback: Direct JOIN if view doesn't exist
      if (!shares || error) {
        const queryBuilder = supabase
          .from('public_shares')
          .select(`
            *,
            wave_count,
            peace_count,
            hi_intensity,
            profiles (
              username,
              display_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .range(this.pagination.general.page * 20, (this.pagination.general.page + 1) * 20 - 1);
        
        console.log('📡 Database query includes hi_intensity:', true);
        
        // 🔧 CRITICAL FIX: Support cancellation via AbortController
        const result = signal 
          ? await queryBuilder.abortSignal(signal)
          : await queryBuilder;
        
        shares = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Failed to load from public_shares:', error);
        console.error('❌ Query details:', {
          table: 'public_shares',
          supabaseClient: !!supabase,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details
        });
        throw error;
      }
      
      // 🔬 SURGICAL DEBUG: Log raw database response
      console.log('🗄️ Database returned', shares?.length || 0, 'shares from public_shares table');
      if (shares && shares.length > 0) {
        console.log('📊 Raw database sample:', {
          id: shares[0].id,
          content: shares[0].content,
          visibility: shares[0].visibility,
          metadata: shares[0].metadata,
          user_id: shares[0].user_id,
          username: shares[0].username,
          display_name: shares[0].display_name,
          avatar_url: shares[0].avatar_url,
          profiles: shares[0].profiles,
          created_at: shares[0].created_at,
          wave_count: shares[0].wave_count,
          peace_count: shares[0].peace_count
        });
        
        // Check if ANY shares in the batch have reactions
        const sharesWithReactions = shares.filter(s => s.wave_count > 0 || s.peace_count > 0);
        console.log(`🔍 REACTION SCAN: ${sharesWithReactions.length} out of ${shares.length} shares have reactions`);
        if (sharesWithReactions.length > 0) {
          console.log('📊 Sample share WITH reactions:', {
            id: sharesWithReactions[0].id,
            wave_count: sharesWithReactions[0].wave_count,
            peace_count: sharesWithReactions[0].peace_count
          });
        }
      } else {
        console.warn('⚠️ No shares found in public_shares table');
      }

      // 🎯 TESLA-GRADE: Process shares with ACTUAL SCHEMA
      const processedShares = (shares || []).map(share => {
        // 🏆 Gold Standard: Prioritize immutable metadata snapshot over profiles JOIN
        // This ensures avatar updates show immediately without waiting for JOIN refresh
        const username = share.username || share.profiles?.username || 'Anonymous';
        const displayName = share.metadata?.display_name || share.display_name || share.profiles?.display_name || username;
        const avatarUrl = share.metadata?.avatar_url || share.avatar_url || share.profiles?.avatar_url || null;
        
      // 🔬 Debug: Log first share to reveal ACTUAL schema from view
      if (!window.__publicShareSchemaLogged) {
        console.log('🔍 ACTUAL PUBLIC_SHARES SCHEMA:', Object.keys(share));
        window.__publicShareSchemaLogged = true;
      }
      
      // Derive pill/type: Check database pill field FIRST, then fall back to content detection
      // 🎯 AUTHORITATIVE SOURCE: Database pill field (set by share creation)
      let derivedType;
      let isGym = false;
      let hasGymOrigin = false;
      let hasGymMetadata = false;
      let hasGymContent = false;
      
      if (share.pill) {
        // Use explicit pill from database
        derivedType = share.pill;
        // Set isGym for logging
        isGym = (derivedType === 'higym');
      } else {
        // FALLBACK: Content-based detection for shares without explicit pill
        const originRaw = String(share.origin || '').toLowerCase();
        const contentRaw = String(share.content || share.text || '').toLowerCase();
        const metadata = share.metadata || {};
        
        // Check origin first for island shares
        const isIsland = originRaw.includes('island') || originRaw === 'hi-island';
        
        // Check multiple signals for gym detection
        hasGymOrigin = originRaw.includes('muscle') || originRaw.includes('gym') || originRaw.includes('higym');
        hasGymMetadata = String(metadata.type || '').toLowerCase().includes('gym');
        hasGymContent = contentRaw.includes('#higym') || contentRaw.includes('muscle journey') || 
                             (share.content || '').includes('→'); // Emoji arrow indicates emotional journey
        
        isGym = hasGymOrigin || hasGymMetadata || hasGymContent;
        
        // Derive type: island > gym > hi5 (order matters)
        if (isIsland) {
          derivedType = 'island';
        } else if (isGym) {
          derivedType = 'higym';
        } else {
          derivedType = 'hi5';
        }
      }

        // 🔬 DEBUG: Log pill derivation for first share
        if (!window.__pillDerivationLogged) {
          console.log('🔬 Pill derivation:', { 
            origin: share.origin, 
            content: (share.content || '').substring(0, 50), 
            derivedType, 
            isGym,
            signals: { hasGymOrigin, hasGymMetadata, hasGymContent }
          });
          window.__pillDerivationLogged = true;
        }

        const processed = {
          id: share.id,
          user_id: share.user_id,
          location: share.location || 'Location unavailable', // ACTUAL SCHEMA: 'location' column
          origin: share.origin || 'hi-island',
          // 🏆 Use LIVE profile data
          username,
          displayName,
          avatarUrl,
          type: share.pill || share.type || derivedType,
          // 🎯 CRITICAL: Display content from actual schema columns
          text: share.text || '', // Legacy text column
          content: share.content || share.text || 'Hi! 👋', // New content column OR text fallback
          visibility: share.visibility || (share.is_anonymous ? 'anonymous' : (share.is_public ? 'public' : 'private')),
          created_at: share.created_at,
          // 🎯 GOLD STANDARD: Reaction counts from database (always show counts, never null)
          // But use localStorage cache if fresher (within 30s) to handle trigger latency
          wave_count: this.getDisplayCount('wave', share.id, share.wave_count),
          peace_count: this.getDisplayCount('peace', share.id, share.peace_count),
          // 🔍 DEBUG: Log what we got from DB vs what we're displaying
          _debug_db_wave: share.wave_count,
          _debug_display_wave: this.getDisplayCount('wave', share.id, share.wave_count),
          // 🏆 Add medallion/emoji data for rendering
          currentEmoji: share.current_emoji || '👋',
          currentName: share.current_name || 'Hi',
          desiredEmoji: share.desired_emoji || '👋',
          desiredName: share.desired_name || 'Hi',
          // 🎯 Hi Scale intensity (1-5 or null)
          hi_intensity: share.hi_intensity || null
        };

        // 🎯 SCHEMA FIX: Support both top-level columns AND metadata storage
        // After CRITICAL_FIX_PUBLIC_SHARES_SCHEMA.sql runs, columns will be top-level
        // Until then, read from metadata
        if (share.visibility === 'anonymous' || share.is_anonymous) {
          processed.display_name = 'Hi Friend';
          processed.avatar_url = null;
        } else if (share.avatar_url || share.display_name) {
          // NEW SCHEMA: Use top-level columns (after migration)
          processed.display_name = share.display_name || 'Hi Friend';
          processed.avatar_url = share.avatar_url;
        } else if (share.metadata?.avatar_url || share.metadata?.display_name) {
          // TEMP SCHEMA: Read from metadata (current state)
          processed.display_name = share.metadata.display_name || 'Hi Friend';
          processed.avatar_url = share.metadata.avatar_url;
        } else if (share.profiles) {
          // FALLBACK: Use profile JOIN for old shares
          processed.display_name = share.profiles.display_name || share.profiles.username || 'Hi Friend';
          processed.avatar_url = share.profiles.avatar_url;
        } else {
          processed.display_name = 'Hi Friend';
          processed.avatar_url = null;
        }

        return processed;
      });

      // Update feed data
      if (this.pagination.general.page === 0) {
        console.log(`📦 [UPDATE] Setting feedData.general = processedShares (${processedShares.length} items) - page 0 REPLACE`);
        this.feedData.general = processedShares;
      } else {
        console.log(`📦 [UPDATE] Appending to feedData.general (+${processedShares.length} items) - page ${this.pagination.general.page}`);
        this.feedData.general = [...this.feedData.general, ...processedShares];
      }
      
      console.log(`📦 [UPDATE] feedData.general now has ${this.feedData.general?.length || 0} items total`);

      // Render with current filter applied
      this.renderFeedItems('general', this.getFilteredItems('general'));
      this.updateTabCount('general');

      // Update pagination
      this.pagination.general.hasMore = shares.length === 20;
      this.updateLoadMoreButton('general');

      console.log('✅ Loaded', processedShares.length, 'general shares from public_shares table');

    } catch (error) {
      console.error('❌ Error loading general shares:', error);
      this.showErrorState('general');
    } finally {
      this.isLoading = false;
    }
  }

  // Load user's personal archives from hi_archives table (REAL data source)
  async loadUserArchivesFromHiArchives(signal = null) {
    const supabase = this.getSupabase();
    if (!supabase) {
      console.warn('⚠️ No Supabase client available for archives');
      this.showArchivesAuthRequired();
      return;
    }

    try {
      this.isLoading = true;

      // 🔧 CRITICAL FIX: Check LIVE auth state, not cached value from init
      // This handles race condition where auth completes after HiRealFeed initializes
      let liveUserId = this.currentUserId;
      console.log('🔍 [AUTH CHECK] Starting auth check - cached user ID:', this.currentUserId);
      
      // Try to get live user ID from ProfileManager (most reliable)
      if (window.ProfileManager?.getUserId) {
        const profileUserId = window.ProfileManager.getUserId();
        console.log('🔍 [AUTH CHECK] ProfileManager.getUserId() returned:', profileUserId);
        if (profileUserId) {
          liveUserId = profileUserId;
          // Update cached value
          if (liveUserId !== this.currentUserId) {
            console.log('🔐 Updating cached user ID from ProfileManager:', liveUserId);
            this.currentUserId = liveUserId;
          }
        }
      } else {
        console.log('⚠️ [AUTH CHECK] ProfileManager.getUserId not available');
      }
      
      // If still no user ID, try fresh auth check
      if (!liveUserId) {
        console.log('🔍 [AUTH CHECK] No user ID from ProfileManager, trying fresh Supabase auth...');
        try {
          const { data: { user } } = await supabase.auth.getUser();
          liveUserId = user?.id || null;
          console.log('🔍 [AUTH CHECK] supabase.auth.getUser() returned user ID:', liveUserId);
          if (liveUserId !== this.currentUserId) {
            console.log('🔐 Updating cached user ID from fresh auth check:', liveUserId);
            this.currentUserId = liveUserId;
          }
        } catch (e) {
          console.warn('⚠️ Fresh auth check failed:', e);
        }
      }
      
      console.log('🔍 [AUTH CHECK] Final liveUserId:', liveUserId);
      
      // Now check if user is authenticated
      if (!liveUserId) {
        console.log('🔒 No authenticated user found, showing auth required message');
        this.isLoading = false; // 🔧 CRITICAL FIX: Reset loading state to enable scrolling
        this.showArchivesAuthRequired();
        return;
      }
      
      console.log('✅ Loading archives for authenticated user:', liveUserId);

      // Ensure archives container exists before rendering
      const containerCheck = document.getElementById('archivesFeed') || document.querySelector('.hi-feed-content');
      if (!containerCheck) {
        // Render archives tab content structure proactively to avoid race conditions
        try {
          this.renderTabContent('archives');
          // Allow DOM to settle
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (e) {
          console.warn('⚠️ Could not render archives tab content pre-query:', e);
        }
      }

      // 🔧 GOLD STANDARD: Query using SELECT * to handle schema variations across environments
      // This works regardless of which columns exist (content, journal, text, updated_at, etc.)
      const queryBuilder = supabase
        .from('hi_archives')
        .select('*')
        .eq('user_id', liveUserId)
        .order('created_at', { ascending: false })
        .range(this.pagination.archives.page * 20, (this.pagination.archives.page + 1) * 20 - 1);
      
      // 🔧 CRITICAL FIX: Support cancellation via AbortController
      const { data: archives, error } = signal 
        ? await queryBuilder.abortSignal(signal)
        : await queryBuilder;

      if (error) {
        // 🔧 GOLD STANDARD ERROR LOGGING: Log full error details for debugging
        console.error('❌ Failed to load from hi_archives:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          statusCode: error.status || error.statusCode
        });
        
        // 🔧 CRITICAL FIX: Handle 400 errors gracefully (table doesn't exist OR RLS blocking OR schema issues)
        // Check for table not existing
        if (error.code === '42P01' || 
            error.message?.toLowerCase().includes('relation') || 
            error.message?.toLowerCase().includes('does not exist') ||
            error.message?.toLowerCase().includes('table')) {
          console.error('🚨 hi_archives table does not exist in database. Run FIX_HI_ISLAND_STUCK_ARCHIVES_400.sql');
          this.showArchivesTableMissing();
          return;
        }
        
        // Check for RLS policy blocking
        if (error.code === 'PGRST116' || 
            error.code === '42501' || 
            error.message?.toLowerCase().includes('policy') ||
            error.message?.toLowerCase().includes('permission') ||
            error.message?.toLowerCase().includes('rls')) {
          console.warn('🔐 RLS policy blocking hi_archives access - user may not be properly authenticated');
          this.showArchivesAuthRequired();
          return;
        }
        
        // Check for authentication issues
        if (error.code === '401' || 
            error.status === 401 ||
            error.message?.toLowerCase().includes('unauthorized') ||
            error.message?.toLowerCase().includes('not authenticated')) {
          console.warn('🔐 User not authenticated - showing auth prompt');
          this.showArchivesAuthRequired();
          return;
        }
        
        // Generic error - show retry option
        throw error;
      }

      // 🎯 GOLD STANDARD: Process archive data schema-agnostically
      const processedArchives = (archives || []).map(archive => {
        // 🔬 Debug: log first archive to reveal ACTUAL schema (helps with schema drift diagnosis)
        if (!window.__archiveSchemaLogged) {
          console.log('🔍 ACTUAL hi_archives SCHEMA:', Object.keys(archive));
          console.log('📊 Sample archive data:', {
            has_content: !!archive.content,
            has_journal: !!archive.journal,
            has_text: !!archive.text,
            has_updated_at: !!archive.updated_at,
            has_metadata: !!archive.metadata
          });
          window.__archiveSchemaLogged = true;
        }
        
        // 🔬 DEBUG: Log type field for investigation
        if (!window.__archiveTypeLogged) {
          console.log('🔍 Archive Type Debug:', {
            raw_type: archive.type,
            raw_origin: archive.origin,
            content_preview: (archive.content || archive.journal || archive.text || '').substring(0, 50),
            created_at: archive.created_at
          });
          window.__archiveTypeLogged = true;
        }
        
        // 🔧 GOLD STANDARD: Handle all possible schema variations
        // Try content (new schema), journal (old schema), text (legacy schema)
        const textContent = archive.content || archive.journal || archive.text || 'Personal Hi 5 moment';
        
        // Extract location from either location field OR location_data JSONB
        const location = archive.location || archive.location_data?.location || 'Location unavailable';
        
        // Get metadata (could be JSONB or regular object)
        const meta = typeof archive.metadata === 'string' ? JSON.parse(archive.metadata) : (archive.metadata || {});
        
        return {
          id: archive.id,
          content: textContent,
          text: textContent, // Duplicate for backwards compatibility
          visibility: archive.visibility || (archive.is_anonymous ? 'anonymous' : 'private'),
          metadata: meta,
          created_at: archive.created_at,
          updated_at: archive.updated_at, // May be undefined, that's OK
          user_id: archive.user_id,
          location: location,
          origin: archive.origin || meta.origin || 'unknown',
          type: archive.type || archive.share_type || 'hi5',
          display_name: 'You', // User's own archives
          avatar_url: null, // Will be filled from user profile if needed
          // 🏆 Medallion/emoji data (try direct fields OR metadata)
          currentEmoji: archive.current_emoji || meta.currentEmoji || '👋',
          currentName: archive.current_name || meta.currentName || 'Hi',
          desiredEmoji: archive.desired_emoji || meta.desiredEmoji || '👋',
          desiredName: archive.desired_name || meta.desiredName || 'Hi',
          // 🎯 Hi Scale intensity (1-5 or null)
          hi_intensity: archive.hi_intensity || meta.hi_intensity || null
        };
      });

      // Update feed data
      if (this.pagination.archives.page === 0) {
        this.feedData.archives = processedArchives;
      } else {
        this.feedData.archives = [...this.feedData.archives, ...processedArchives];
      }

      // Render: archive container can be missing if DOM not yet built; ensure structure exists
      const hasArchivesContainer = !!document.getElementById('archivesFeed');
      if (!hasArchivesContainer) {
        this.renderTabContent('archives');
      }
      this.renderFeedItems('archives', processedArchives);
      this.updateTabCount('archives');

      // Update pagination
      this.pagination.archives.hasMore = archives.length === 20;
      this.updateLoadMoreButton('archives');

      console.log('✅ Loaded', processedArchives.length, 'archive entries from hi_archives table');

    } catch (error) {
      console.error('❌ Error loading user archives:', error);
      this.showErrorState('archives');
    } finally {
      this.isLoading = false;
    }
  }

  // 🔧 TESLA-GRADE FIX: Render content only (no conflicting tabs)
  render() {
    const container = document.getElementById('hi-island-feed-root');
    if (!container) {
      console.error('❌ Hi-Island feed container not found');
      return;
    }

    // 🎯 TESLA-GRADE FIX: Preserve glassmorphic styling + create content area
    container.innerHTML = `
      <div class="hi-real-feed" style="
        background: inherit;
        backdrop-filter: inherit;
        -webkit-backdrop-filter: inherit;
        border-radius: inherit;
        overflow: inherit;
      ">
        <!-- Feed Content (controlled by hi-island tabs) -->
        <div class="hi-feed-content" style="
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 0;
          margin: 0;
        ">
          <!-- General Shares Tab -->
          <div id="generalTab" class="hi-feed-tab-content active">
            <div class="tab-header">
              <h3>Community Hi 5s</h3>
              <p>Public and anonymous shares from the Hi community</p>
              <div id="hiFeedStats" style="margin-top:8px; font-size:12px; opacity:0.85;">
                ${typeof this.userPublicShareCount === 'number' ? `<span class="hi-feed-stats-badge" style="display:inline-block; padding:4px 8px; border-radius:10px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);">Your public shares: ${this.userPublicShareCount}</span>` : ''}
              </div>
            </div>
            
            <div id="generalFeed" class="hi-feed-container">
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading community shares...</p>
              </div>
            </div>
            
            <!-- 🔄 Gold-standard infinite scroll - auto-loads on scroll proximity -->
            <div id="loadMoreGeneral" class="infinite-scroll-indicator" style="display: none; padding: 20px; text-align: center;">
              <div class="loading-spinner" style="width: 24px; height: 24px; margin: 0 auto;"></div>
              <p style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">Loading more...</p>
            </div>
          </div>

          <!-- My Archives Tab -->
          <div id="archivesTab" class="hi-feed-tab-content">
            <div class="tab-header">
              <h3>My Hi 5 Archives</h3>
              <p>Your personal collection of Hi moments</p>
            </div>
            
            <div id="archivesFeed" class="hi-feed-container">
              ${this.currentUserId ? `
                <div class="loading-state">
                  <div class="loading-spinner"></div>
                  <p>Loading your archives...</p>
                </div>
              ` : `
                <div class="empty-state">
                  <div class="empty-icon">🔐</div>
                  <h4>Sign In Required</h4>
                  <p>Please sign in to view your personal Hi 5 archives</p>
                </div>
              `}
            </div>
            
            ${this.currentUserId ? `
              <!-- 🔄 Gold-standard infinite scroll - auto-loads on scroll proximity -->
              <div id="loadMoreArchives" class="infinite-scroll-indicator" style="display: none; padding: 20px; text-align: center;">
                <div class="loading-spinner" style="width: 24px; height: 24px; margin: 0 auto;"></div>
                <p style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">Loading more...</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Apply CSS styles
    this.injectStyles();
  }

  // Rest of the methods (attachEventListeners, renderFeedItems, etc.) remain the same
  // as they're UI-focused and don't depend on the data source

  // 🔧 TESLA-GRADE FIX: Simplified event listeners (no internal tabs)  
  attachEventListeners() {
    // 🛡️ GUARD: Prevent duplicate event listener attachment
    if (this._eventListenersAttached) {
      console.log('⚠️ Event listeners already attached, skipping duplicate');
      return;
    }
    this._eventListenersAttached = true;
    
    // Only attach load more listeners - tabs are handled by hi-island
    this.attachLoadMoreListeners();

    // Delegate share action events (e.g., Wave Back, Share External)
    const container = document.getElementById('hi-island-feed-root');
    if (container) {
      container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.share-action-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'wave') {
          e.preventDefault();
          await this.handleWaveAction(btn);
        } else if (action === 'send-peace') {
          e.preventDefault();
          await this.handlePeaceAction(btn);
        } else if (action === 'share-external') {
          e.preventDefault();
          await this.handleShareExternal(btn);
        }
      });
      
      // 🎯 X/INSTAGRAM GOLD STANDARD: Overflow menu handlers (Edit/Delete)
      container.addEventListener('click', (e) => {
        // Handle overflow button click (toggle dropdown)
        const overflowBtn = e.target.closest('.share-overflow-btn');
        if (overflowBtn) {
          e.preventDefault();
          e.stopPropagation();
          const shareId = overflowBtn.dataset.shareId;
          this.toggleOverflowMenu(shareId);
          return;
        }
        
        // Handle overflow item click (Edit/Delete)
        const overflowItem = e.target.closest('.share-overflow-item');
        if (overflowItem) {
          e.preventDefault();
          e.stopPropagation();
          const action = overflowItem.dataset.action;
          const shareId = overflowItem.dataset.shareId;
          const sourceTable = overflowItem.dataset.sourceTable || 'hi_archives';
          
          if (action === 'edit') {
            this.showEditModal(shareId, sourceTable);
          } else if (action === 'delete') {
            this.showDeleteConfirmation(shareId, sourceTable);
          }
          
          // Close dropdown after action
          this.closeAllOverflowMenus();
          return;
        }
        
        // Close overflow menus when clicking elsewhere
        if (!e.target.closest('.share-overflow-menu')) {
          this.closeAllOverflowMenus();
        }
      });
    }
    
    // 🎯 Close overflow menus when clicking outside (with cleanup tracking)
    if (this._documentClickHandler) {
      document.removeEventListener('click', this._documentClickHandler);
    }
    this._documentClickHandler = (e) => {
      if (!e.target.closest('.share-overflow-menu')) {
        this.closeAllOverflowMenus();
      }
    };
    document.addEventListener('click', this._documentClickHandler);
  }
  
  // 🎯 X/INSTAGRAM: Toggle overflow dropdown menu
  toggleOverflowMenu(shareId) {
    const dropdown = document.querySelector(`.share-overflow-dropdown[data-dropdown-for="${shareId}"]`);
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display !== 'none';
    
    // Close all other dropdowns first
    this.closeAllOverflowMenus();
    
    // Toggle this one
    if (!isVisible) {
      dropdown.style.display = 'block';
    }
  }
  
  // 🎯 Close all overflow menus
  closeAllOverflowMenus() {
    document.querySelectorAll('.share-overflow-dropdown').forEach(d => {
      d.style.display = 'none';
    });
  }
  
  // 🎯 Get current active tab
  getCurrentTab() {
    const activeTab = document.querySelector('.hi-feed-tab-btn.active, .feed-tab.active, [data-tab].active');
    if (activeTab) {
      return activeTab.dataset.tab || (activeTab.textContent.toLowerCase().includes('archive') ? 'archives' : 'general');
    }
    // Fallback: Check which feed container is visible
    const archivesContainer = document.querySelector('[data-feed="archives"], .archives-feed');
    if (archivesContainer && !archivesContainer.classList.contains('hidden')) {
      return 'archives';
    }
    return 'general';
  }
  
  // 🎯 X/INSTAGRAM GOLD STANDARD: Show edit modal (SINGLETON - only one modal at a time)
  async showEditModal(shareId, sourceTable = 'hi_archives') {
    console.log('✏️ [EDIT MODAL] Opening for share:', shareId, 'table:', sourceTable);
    
    // 🛡️ GUARD: Prevent multiple modals - close any existing first
    const existingModal = document.querySelector('[data-modal-type="hi-modal"]');
    if (existingModal) {
      console.log('⚠️ [EDIT MODAL] Closing existing modal first');
      existingModal.remove();
      document.body.style.overflow = '';
    }
    
    // 🛡️ GUARD: Prevent rapid double-clicks
    if (this._editModalLock) {
      console.log('⚠️ [EDIT MODAL] Lock active, ignoring duplicate');
      return;
    }
    this._editModalLock = true;
    setTimeout(() => { this._editModalLock = false; }, 300);
    
    // Find the share data (check both caches)
    let share = this.feedData.archives?.find(s => s.id === shareId);
    if (!share) {
      share = this.feedData.general?.find(s => s.id === shareId);
    }
    if (!share) {
      console.error('❌ [EDIT MODAL] Share not found:', shareId);
      alert('Could not find this post to edit. Please refresh and try again.');
      return;
    }
    
    console.log('✏️ [EDIT MODAL] Found share:', share.id);
    const content = share.content || share.text || '';
    
    // Create modal (SINGLETON) - Using INLINE STYLES because CSS classes don't apply to document.body elements
    const modal = document.createElement('div');
    modal.setAttribute('data-modal-type', 'hi-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Edit your post');
    
    // 🎯 INLINE STYLES - CSS classes don't work on document.body appended elements
    modal.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.92) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      padding: 20px;
      box-sizing: border-box;
      margin: 0 !important;
    `;
    
    modal.innerHTML = `
      <div style="
        position: relative;
        background: linear-gradient(180deg, #1e1e3f 0%, #151528 100%);
        border: 3px solid #FFD166;
        border-radius: 24px;
        width: 100%;
        max-width: 520px;
        max-height: 85vh;
        overflow: hidden;
        box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.3), 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 100px rgba(255, 209, 102, 0.25);
        animation: modalBounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin: auto;
      ">
        <style>
          @keyframes modalBounceIn {
            0% { transform: scale(0.8) translateY(40px); opacity: 0; }
            60% { transform: scale(1.03) translateY(-5px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
        </style>
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 209, 102, 0.05);
        ">
          <h3 style="margin: 0; color: #FFD166; font-size: 20px; font-weight: 700;">✏️ Edit Your Hi</h3>
          <button class="hi-edit-modal-close" style="
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 18px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 10px;
            font-weight: bold;
          " aria-label="Close">✕</button>
        </div>
        <div style="padding: 24px;">
          <textarea class="hi-edit-textarea" style="
            width: 100%;
            min-height: 160px;
            background: rgba(255, 255, 255, 0.08);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 14px;
            padding: 18px;
            color: white;
            font-size: 17px;
            font-family: inherit;
            line-height: 1.6;
            resize: vertical;
            box-sizing: border-box;
          " placeholder="What's on your mind?">${this.escapeHtml(content)}</textarea>
          <div style="text-align: right; margin-top: 10px; font-size: 13px; color: rgba(255, 255, 255, 0.5); font-weight: 500;">
            <span class="hi-edit-char-current">${content.length}</span>/500
          </div>
        </div>
        <div style="
          display: flex;
          gap: 14px;
          justify-content: flex-end;
          padding: 20px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        ">
          <button class="hi-edit-btn-cancel" style="
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
          ">Cancel</button>
          <button class="hi-edit-btn-save" style="
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, #FFD166 0%, #F0B429 100%);
            color: #1a1a2e;
            border: none;
            box-shadow: 0 4px 20px rgba(255, 209, 102, 0.4);
          ">💾 Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✏️ [EDIT MODAL] Modal appended to body WITH INLINE STYLES');
    document.body.style.overflow = 'hidden';
    
    // Focus textarea
    const textarea = modal.querySelector('.hi-edit-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    
    // Character count
    const charCount = modal.querySelector('.hi-edit-char-current');
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
      if (textarea.value.length > 500) {
        charCount.style.color = '#EF4444';
      } else {
        charCount.style.color = '';
      }
    });
    
    // Close handlers
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    
    modal.querySelector('.hi-edit-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.hi-edit-btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    // Save handler
    modal.querySelector('.hi-edit-btn-save').addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      if (!newContent) {
        alert('Content cannot be empty');
        return;
      }
      if (newContent.length > 500) {
        alert('Content is too long (max 500 characters)');
        return;
      }
      
      const saveBtn = modal.querySelector('.hi-edit-btn-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      
      // 🎯 CASCADE: Pass sourceTable for multi-table update
      const success = await this.updateShare(shareId, newContent, sourceTable);
      
      if (success) {
        closeModal();
      } else {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  }
  
  // 🎯 X/INSTAGRAM GOLD STANDARD: Show delete confirmation (SINGLETON - only one modal at a time)
  showDeleteConfirmation(shareId, sourceTable = 'hi_archives') {
    console.log('🗑️ [DELETE MODAL] Opening for share:', shareId, 'table:', sourceTable);
    
    // 🛡️ GUARD: Prevent multiple modals - close any existing first
    const existingModal = document.querySelector('[data-modal-type="hi-modal"]');
    if (existingModal) {
      console.log('⚠️ [DELETE MODAL] Closing existing modal first');
      existingModal.remove();
      document.body.style.overflow = '';
    }
    
    // 🛡️ GUARD: Prevent rapid double-clicks
    if (this._deleteModalLock) {
      console.log('⚠️ [DELETE MODAL] Lock active, ignoring duplicate');
      return;
    }
    this._deleteModalLock = true;
    setTimeout(() => { this._deleteModalLock = false; }, 300);
    
    // Determine the source text based on where the share came from
    const sourceText = sourceTable === 'public_shares' 
      ? 'This Hi will be permanently removed from the community feed and your archives.'
      : 'This Hi will be permanently removed from your archives.';
    
    const modal = document.createElement('div');
    modal.setAttribute('data-modal-type', 'hi-modal');
    
    // 🎯 INLINE STYLES - CSS classes don't work on document.body appended elements
    modal.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.92) !important;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      padding: 20px;
      box-sizing: border-box;
      margin: 0 !important;
    `;
    
    modal.innerHTML = `
      <div style="
        position: relative;
        background: linear-gradient(180deg, #2a1a1a 0%, #1a1015 100%);
        border: 3px solid #EF4444;
        border-radius: 24px;
        width: 100%;
        max-width: 400px;
        padding: 36px 28px;
        text-align: center;
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 100px rgba(239, 68, 68, 0.25);
        margin: auto;
      ">
        <div style="font-size: 56px; margin-bottom: 20px;">🗑️</div>
        <h3 style="margin: 0 0 14px 0; color: #EF4444; font-size: 22px; font-weight: 700;">Delete this Hi?</h3>
        <p style="margin: 0 0 28px 0; color: rgba(255, 255, 255, 0.6); font-size: 15px; line-height: 1.6;">
          This action cannot be undone. ${sourceText}
        </p>
        <div style="display: flex; gap: 16px; justify-content: center;">
          <button class="hi-delete-btn-cancel" style="
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 120px;
          ">Cancel</button>
          <button class="hi-delete-btn-confirm" style="
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
            color: white;
            border: none;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
            min-width: 120px;
          ">Delete</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    console.log('🗑️ [DELETE MODAL] Modal appended to body WITH INLINE STYLES');
    document.body.style.overflow = 'hidden';
    
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = '';
    };
    
    modal.querySelector('.hi-delete-btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    modal.querySelector('.hi-delete-btn-confirm').addEventListener('click', async () => {
      const confirmBtn = modal.querySelector('.hi-delete-btn-confirm');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';
      
      // 🎯 CASCADE: Pass sourceTable for multi-table delete
      const success = await this.deleteShare(shareId, sourceTable);
      
      if (success) {
        closeModal();
      } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete';
      }
    });
  }
  
  // 🎯 X/INSTAGRAM GOLD STANDARD: Update share with CASCADE to both tables
  // sourceTable tells us which table the share is FROM ('hi_archives' or 'public_shares')
  async updateShare(shareId, newContent, sourceTable = 'hi_archives') {
    try {
      const client = this.getSupabase();
      if (!client) {
        alert('Connection issue. Please refresh the page.');
        return false;
      }
      
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        alert('Please sign in to edit your shares.');
        return false;
      }
      
      // 🎯 Table-specific payloads (public_shares doesn't have updated_at column)
      const archivesPayload = { 
        content: newContent, 
        text: newContent,
        updated_at: new Date().toISOString() 
      };
      const publicSharesPayload = { 
        content: newContent, 
        text: newContent
      };
      
      const sourcePayload = sourceTable === 'hi_archives' ? archivesPayload : publicSharesPayload;
      
      // 🎯 CASCADE UPDATE: Update the source table first
      const { error: sourceError } = await client
        .from(sourceTable)
        .update(sourcePayload)
        .eq('id', shareId)
        .eq('user_id', user.id);
      
      if (sourceError) {
        console.error(`❌ Failed to update share in ${sourceTable}:`, sourceError);
        alert('Failed to save changes. Please try again.');
        return false;
      }
      
      // 🎯 CASCADE: Try to update the OTHER table too (silent fail - share may not exist there)
      const otherTable = sourceTable === 'hi_archives' ? 'public_shares' : 'hi_archives';
      const otherPayload = otherTable === 'hi_archives' ? archivesPayload : publicSharesPayload;
      try {
        await client
          .from(otherTable)
          .update(otherPayload)
          .eq('id', shareId)
          .eq('user_id', user.id);
        // Note: This may not find a match if share isn't in both tables - that's OK
        console.log(`📦 Cascade update attempted to ${otherTable}`);
      } catch (cascadeErr) {
        // Silent fail - the share may only exist in one table
        console.log(`ℹ️ Share not found in ${otherTable} (cascade skipped)`);
      }
      
      // Update local data in BOTH caches
      const archiveShare = this.feedData.archives?.find(s => s.id === shareId);
      if (archiveShare) {
        archiveShare.content = newContent;
        archiveShare.text = newContent;
      }
      
      const generalShare = this.feedData.general?.find(s => s.id === shareId);
      if (generalShare) {
        generalShare.content = newContent;
        generalShare.text = newContent;
      }
      
      // Re-render the current tab's feed
      const currentTab = this.getCurrentTab();
      if (currentTab === 'archives' && this.feedData.archives) {
        this.renderFeedItems('archives', this.feedData.archives);
      } else if (currentTab === 'general' && this.feedData.general) {
        this.renderFeedItems('general', this.feedData.general);
      }
      
      console.log('✅ Share updated successfully (cascade to both tables)');
      return true;
      
    } catch (err) {
      console.error('❌ Error updating share:', err);
      alert('An error occurred. Please try again.');
      return false;
    }
  }
  
  // 🎯 X/INSTAGRAM GOLD STANDARD: Delete share with CASCADE to both tables
  // sourceTable tells us which table the share is FROM ('hi_archives' or 'public_shares')
  async deleteShare(shareId, sourceTable = 'hi_archives') {
    try {
      const client = this.getSupabase();
      if (!client) {
        alert('Connection issue. Please refresh the page.');
        return false;
      }
      
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        alert('Please sign in to delete your shares.');
        return false;
      }
      
      // 🎯 CASCADE DELETE: Delete from source table first
      const { error: sourceError } = await client
        .from(sourceTable)
        .delete()
        .eq('id', shareId)
        .eq('user_id', user.id);
      
      if (sourceError) {
        console.error(`❌ Failed to delete share from ${sourceTable}:`, sourceError);
        alert('Failed to delete. Please try again.');
        return false;
      }
      
      // 🎯 CASCADE: Try to delete from the OTHER table too (silent fail - share may not exist there)
      const otherTable = sourceTable === 'hi_archives' ? 'public_shares' : 'hi_archives';
      try {
        await client
          .from(otherTable)
          .delete()
          .eq('id', shareId)
          .eq('user_id', user.id);
        // Note: This may not find a match if share isn't in both tables - that's OK
        console.log(`📦 Cascade delete attempted to ${otherTable}`);
      } catch (cascadeErr) {
        // Silent fail - the share may only exist in one table
        console.log(`ℹ️ Share not found in ${otherTable} (cascade skipped)`);
      }
      
      // Remove from BOTH local data caches
      this.feedData.archives = this.feedData.archives?.filter(s => s.id !== shareId) || [];
      this.feedData.general = this.feedData.general?.filter(s => s.id !== shareId) || [];
      
      // 🎯 Optimistic UI: Remove the element immediately
      const shareEl = document.querySelector(`.hi-share-item[data-share-id="${shareId}"]`);
      if (shareEl) {
        shareEl.style.transition = 'all 0.3s ease';
        shareEl.style.opacity = '0';
        shareEl.style.transform = 'translateX(-20px)';
        setTimeout(() => shareEl.remove(), 300);
      }
      
      console.log('✅ Share deleted successfully (cascade to both tables)');
      return true;
      
    } catch (err) {
      console.error('❌ Error deleting share:', err);
      alert('An error occurred. Please try again.');
      return false;
    }
  }

  // 🎯 WOZ FIX: Auto-hide header on scroll down, reveal on scroll up (immersive reading)
  // Now uses window scroll for Twitter/Instagram pattern
  initAutoHideHeader() {
    const header = document.querySelector('.tesla-header');
    
    if (!header) {
      console.warn('⚠️ Header not found for auto-hide feature');
      return;
    }
    
    // 🚀 GOLD STANDARD: Throttled + debounced scroll handler for buttery 60fps
    let ticking = false;
    let lastInfiniteScrollTrigger = 0;
    const INFINITE_SCROLL_DEBOUNCE = 500; // ms between load triggers
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // 🚀 WOZ FIX: Use window scroll properties (Twitter/Instagram pattern)
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = window.innerHeight;
          const scrollDelta = scrollTop - this.scrollState.lastScrollTop;
          
          // Determine scroll direction (with 5px debounce for smooth behavior)
          if (Math.abs(scrollDelta) > 5) {
            if (scrollDelta > 0 && scrollTop > this.scrollState.scrollThreshold) {
              // Scrolling down & past threshold → hide header for immersive reading
              if (!this.scrollState.isHeaderHidden) {
                this.hideHeader(header);
                this.scrollState.isHeaderHidden = true;
              }
            } else if (scrollDelta < 0) {
              // Scrolling up → show header for navigation
              if (this.scrollState.isHeaderHidden) {
                this.showHeader(header);
                this.scrollState.isHeaderHidden = false;
              }
            }
          }
          
          // 🚀 GOLD-STANDARD INFINITE SCROLL: Debounced auto-load when within 300px of bottom
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          const now = Date.now();
          const canTrigger = (now - lastInfiniteScrollTrigger) > INFINITE_SCROLL_DEBOUNCE;
          
          if (distanceFromBottom < 300 && !this.isLoading && canTrigger) {
            // 🚀 WOZ FIX: Determine active tab from currentTab state
            const isGeneralTab = this.currentTab === 'general';
            const isArchivesTab = this.currentTab === 'archives';
            
            if (isGeneralTab && this.pagination.general.hasMore) {
              console.log('📜 Infinite scroll triggered: loading more community shares');
              lastInfiniteScrollTrigger = now;
              this.loadMoreShares('general');
            } else if (isArchivesTab && this.pagination.archives.hasMore) {
              console.log('📜 Infinite scroll triggered: loading more archives');
              lastInfiniteScrollTrigger = now;
              this.loadMoreShares('archives');
            }
          }
          
          this.scrollState.lastScrollTop = scrollTop;
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // 🚀 WOZ FIX: Attach scroll listener to window (Twitter/Instagram pattern)
    const handler = () => handleScroll();
    window.addEventListener('scroll', handler, { passive: true });
    
    // 🔧 CRITICAL FIX: Store handler reference for cleanup
    this._scrollHandlers.set(window, handler);
    
    console.log('✅ Auto-hide header + infinite scroll initialized on window (gold standard)');
  }

  hideHeader(header) {
    header.style.transform = 'translateY(-100%)';
    header.style.opacity = '0';
  }

  showHeader(header) {
    header.style.transform = 'translateY(0)';
    header.style.opacity = '1';
  }

  // 🔧 LONG-TERM SOLUTION: Async tab switching with proper error handling
  async switchTab(tabName) {
    console.log(`🏝️ HiRealFeed switching to: ${tabName}`);
    
    try {
      // 🔧 CRITICAL FIX: Cancel any in-flight requests when switching tabs
      if (this._abortController) {
        console.log('🚫 Cancelling previous request before tab switch');
        this._abortController.abort();
      }
      
      // Reset loading state to prevent stuck loading during tab switch
      this.isLoading = false;
      
      // Prevent concurrent switches
      if (this.switchingTab) {
        console.log('⏳ Tab switch already in progress, waiting...');
        return;
      }
      
      this.switchingTab = true;
      
      // Update current tab
      this.currentTab = tabName;
      
      // Show appropriate content based on tab
      const container = document.getElementById('hi-island-feed-root');
      if (!container) {
        console.error('❌ Feed container not found');
        return;
      }
      
      // Ensure component is properly rendered
      if (!container.querySelector('.hi-real-feed')) {
        console.log('🔧 Rendering HiRealFeed structure...');
        this.render();
        // Wait for DOM update with longer delay for complex renders
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Find content area with retry logic
      let contentArea = container.querySelector('.hi-feed-content');
      if (!contentArea) {
        // Retry after additional delay
        console.log('⏳ Content area not found, retrying...');
        await new Promise(resolve => setTimeout(resolve, 100));
        contentArea = container.querySelector('.hi-feed-content');
        
        if (!contentArea) {
          console.error('❌ Feed content area not found after render and retry');
          console.error('🔧 Container content:', container.innerHTML.substring(0, 200) + '...');
          return;
        }
      }
      
      // Show loading state
      contentArea.innerHTML = `
        <div class="loading-state" style="padding: 40px; text-align: center;">
          <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4ECDC4; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="color: #666;">Loading ${tabName === 'general' ? 'community shares' : 'your archives'}...</p>
        </div>
      `;
      
      // Load data for the active tab
      if (!this.feedData[tabName] || this.feedData[tabName].length === 0) {
        console.log(`📊 Loading fresh data for ${tabName} tab`);
        await this.loadFeedData(tabName);
      } else {
        console.log(`📊 Using cached data for ${tabName} tab`);
        this.renderTabContent(tabName);
      }
      
      console.log(`✅ Successfully switched to ${tabName} tab`);
      
    } catch (error) {
      console.error(`❌ Error switching to ${tabName} tab:`, error);
      
      // Show error state
      const container = document.getElementById('hi-island-feed-root');
      if (container) {
        container.innerHTML = `
          <div class="error-state" style="padding: 40px; text-align: center; color: #ff6b6b;">
            <p>Error loading ${tabName}. Please try again.</p>
            <button onclick="window.hiRealFeed?.switchTab('${tabName}')" style="margin-top: 16px; padding: 8px 16px; background: #4ECDC4; color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
          </div>
        `;
      }
    } finally {
      this.switchingTab = false;
    }
  }

  // 🔧 NEW: Render specific tab content without tab navigation
  renderTabContent(tabName) {
    console.log(`🎨 [RENDER TAB] renderTabContent called for: ${tabName}`);
    console.log(`🎨 [RENDER TAB] this.feedData.general.length BEFORE innerHTML: ${this.feedData.general?.length || 0}`);
    
    const contentArea = document.querySelector('.hi-feed-content');
    if (!contentArea) return;

    if (tabName === 'general') {
      contentArea.innerHTML = `
        <div id="generalTab" class="hi-feed-tab-content active">
          <div class="tab-header">
            <h3>Community Hi 5s</h3>
            <p>Public and anonymous shares from the Hi community</p>
          </div>
          
          <div id="generalFeed" class="hi-feed-container">
            <div class="feed-loading-skeleton">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
          
          <!-- 🔄 Gold-standard infinite scroll - auto-loads on scroll proximity -->
          <div id="loadMoreGeneral" class="infinite-scroll-indicator" style="display: none; padding: 20px; text-align: center;">
            <div class="loading-spinner" style="width: 24px; height: 24px; margin: 0 auto;"></div>
            <p style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">Loading more...</p>
          </div>
        </div>
      `;
      console.log(`🎨 [RENDER TAB] this.feedData.general.length AFTER innerHTML: ${this.feedData.general?.length || 0}`);
      console.log(`🎨 [RENDER TAB] About to call getFilteredItems...`);
      this.renderFeedItems('general', this.getFilteredItems('general'));
    } else if (tabName === 'archives') {
      contentArea.innerHTML = `
        <div id="archivesTab" class="hi-feed-tab-content active">
          <div class="tab-header">
            <h3>My Hi 5 Archives</h3>
            <p>Your personal collection of Hi moments</p>
          </div>
          
          <div id="archivesFeed" class="hi-feed-container">
            <div class="feed-loading-skeleton">
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
          
          <!-- 🔄 Gold-standard infinite scroll - auto-loads on scroll proximity -->
          <div id="loadMoreArchives" class="infinite-scroll-indicator" style="display: none; padding: 20px; text-align: center;">
            <div class="loading-spinner" style="width: 24px; height: 24px; margin: 0 auto;"></div>
            <p style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">Loading more...</p>
          </div>
        </div>
      `;
      this.renderFeedItems('archives', this.feedData.archives || []);
    }

    // Re-attach event listeners for load more buttons
    this.attachLoadMoreListeners();
  }

  // 🔧 NEW: Separate method for load more listeners
  attachLoadMoreListeners() {
    // 🔄 GOLD-STANDARD: Infinite scroll auto-triggers via scroll detection
    // No manual click listeners needed - scroll proximity detection handles loading
    // Load indicators show/hide automatically via updateLoadMoreButton()
    console.log('📜 Infinite scroll active - auto-loads on proximity detection');
  }

  async loadMoreShares(tabName) {
    if (this.isLoading || !this.pagination[tabName].hasMore) return;

    this.pagination[tabName].page++;
    
    if (tabName === 'general') {
      await this.loadGeneralSharesFromPublicShares();
    } else if (tabName === 'archives') {
      await this.loadUserArchivesFromHiArchives();
    }
  }

  renderFeedItems(tabName, shares) {
    // Batch rendering with RAF for smoother performance
    window.requestAnimationFrame(() => {
      this._renderFeedItemsInternal(tabName, shares);
    });
  }

  _renderFeedItemsInternal(tabName, shares) {
    // Render feed items (production mode)
    
    // Map tab names to container IDs
    const containerMap = {
      'general': 'generalFeed',
      'archives': 'archivesFeed',
      'archive': 'archivesFeed' // Handle both 'archive' and 'archives'
    };
    
    const containerId = containerMap[tabName] || `${tabName}Feed`;
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.warn(`❌ Feed container not found: ${containerId}`);
      console.log('🔍 Available containers:', {
        generalFeed: !!document.getElementById('generalFeed'),
        archivesFeed: !!document.getElementById('archivesFeed'),
        hiIslandFeedRoot: !!document.getElementById('hi-island-feed-root'),
        feedContent: !!document.querySelector('.hi-feed-content')
      });
      return;
    }

    // 🧹 CLEAR CONTAINER: Remove ALL existing content (loading states, old shares, hardcoded text)
    // This fixes: "Loading shares..." text persisting AND filter showing wrong content
    // CRITICAL FIX: ALWAYS clear when re-rendering (filter changes, page 0, refresh)
    // BUG WAS: Only clearing on page===0 meant filter switches kept old content
    container.innerHTML = '';

    shares.forEach(share => {
      const shareElement = this.createShareElement(share, tabName);
      try {
        if (tabName === 'general' && this.wavedShares?.has?.(share.id)) {
          const btn = shareElement.querySelector('.share-action-btn[data-action="wave"]');
          if (btn) {
            btn.classList.add('waved');
            btn.disabled = true;
            btn.setAttribute('aria-pressed', 'true');
            // 🎯 X/TWITTER PATTERN: Keep count visible, don't change text
            // Count stays (e.g., "👋 1 Wave"), only visual state changes via .waved class
          }
        }
        if (tabName === 'general' && this.peacedShares?.has?.(share.id)) {
          const btn = shareElement.querySelector('.share-action-btn[data-action="send-peace"]');
          if (btn) {
            btn.classList.add('peaced');
            btn.disabled = true;
            btn.setAttribute('aria-pressed', 'true');
            // 🎯 FIX: Show count consistently (like "🕊️ 1 Peace") for already-reacted shares
            // This matches the text set after clicking (line 1192)
            const peaceCount = share.peace_count || 0;
            btn.textContent = `🕊️ ${peaceCount} Peace`;
          }
        }
      } catch {}
      container.appendChild(shareElement);
    });

    // Show empty state if no shares
    if (this.feedData[tabName].length === 0) {
      this.showEmptyState(tabName);
    }
    
    // 🚀 GOLD STANDARD: Remove any inline styles that override window scroll
    const feedContainers = document.querySelectorAll('.hi-feed-container');
    feedContainers.forEach(container => {
      container.style.removeProperty('overflow');
      container.style.removeProperty('overflow-y');
      container.style.removeProperty('overflow-x');
      container.style.removeProperty('max-height');
      container.style.removeProperty('height');
      container.style.removeProperty('overscroll-behavior');
      container.style.removeProperty('-webkit-overflow-scrolling');
      container.style.removeProperty('will-change');
    });
    
    console.log(`✅ Rendered ${shares.length} shares to ${tabName} feed`);
  }

  // Apply current origin filter to a tab's data
  getFilteredItems(tabName) {
    if (tabName !== 'general') return this.feedData[tabName] || [];
    if (this.originFilter === 'all') return this.feedData.general || [];

    const filter = this.originFilter;
    const items = this.feedData.general || [];
    const filtered = items.filter((share) => this.matchesOriginFilter(share, filter));
    
    return filtered;
  }

  matchesOriginFilter(share, filter) {
    try {
      const o = String(share.origin || '').toLowerCase();
      
      // 🎯 STEP 1: Check explicit MUSCLE origins first (highest priority)
      const isExplicitGym = o.includes('gym') || o.includes('muscle') || 
                            ['hi-muscle','muscle','gym','higym','hi_muscle_journey'].includes(o);
      if (isExplicitGym) return filter === 'muscle';
      
      // 🎯 STEP 2: Check explicit ISLAND origins (second priority)
      const isExplicitIsland = o.includes('island') || o === 'hi-island';
      if (isExplicitIsland) return filter === 'island';
      
      // 🎯 STEP 3: Everything else goes to QUICK (catch-all)
      return filter === 'quick';
      
    } catch {
      return filter === 'all';
    }
  }

  // Public API to set origin filter and re-render general tab
  setOriginFilter(filter = 'all') {
    this.originFilter = filter;
    if (this.currentTab === 'general') {
      const filtered = this.getFilteredItems('general');
      this.renderFeedItems('general', filtered);
      this.updateTabCount('general');
    }
  }

  // Handle "Wave Back" UX with server persistence
  async handleWaveAction(buttonEl) {
    if (!buttonEl || buttonEl.classList.contains('waved')) return;
    const shareId = buttonEl.dataset.shareId;
    if (!shareId) {
      console.warn('Wave action missing share id');
      return;
    }

    const originalText = buttonEl.textContent;

    try {
      const userId = this.currentUserId || null;

      // Optimistic UI update + subtle haptic feedback
      buttonEl.classList.add('waved', 'loading');
      buttonEl.disabled = true;
      buttonEl.textContent = '👋 Waving...';
      buttonEl.setAttribute('aria-pressed', 'true');
      if (navigator.vibrate) navigator.vibrate(10);

      const supabase = this.getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await supabase.rpc('wave_back', {
        p_share_id: shareId,
        p_user_id: userId
      });
      
      // 🔍 DEBUG: Log RPC response
      console.log('👋 Wave RPC response:', {
        shareId,
        userId,
        data,
        error,
        dataType: typeof data,
        waveCount: data?.wave_count,
        alreadyWaved: data?.already_waved
      });

      if (error) {
        console.error('❌ Wave RPC error:', error);
        throw error;
      }

      const waveCount = data?.wave_count || 0;
      const alreadyWaved = data?.already_waved || false;

      buttonEl.classList.remove('loading');
      buttonEl.textContent = `👋 ${waveCount} ${waveCount === 1 ? 'Wave' : 'Waves'}`;
      buttonEl.setAttribute('aria-pressed', 'true');

      this.wavedShares.add(shareId);
      try {
        localStorage.setItem('wavedShares', JSON.stringify(Array.from(this.wavedShares)));
      } catch {
        // ignore storage failures
      }
      
      // 🎯 FIX RACE CONDITION: Update feedData in memory AND localStorage
      // This prevents stale counts when navigating away/back before trigger completes
      const currentFeed = this.feedData[this.currentTab] || [];
      const shareIndex = currentFeed.findIndex(s => s.id === shareId);
      if (shareIndex !== -1) {
        currentFeed[shareIndex].wave_count = waveCount;
        console.log('✅ Updated wave_count in memory:', shareId, '→', waveCount);
      }
      
      // Also cache count in localStorage for persistence across page loads
      try {
        const cachedCounts = JSON.parse(localStorage.getItem('waveCounts') || '{}');
        cachedCounts[shareId] = { count: waveCount, timestamp: Date.now() };
        localStorage.setItem('waveCounts', JSON.stringify(cachedCounts));
      } catch {}


      window.dispatchEvent(new CustomEvent('wave:incremented', {
        detail: {
          shareId,
          userId,
          waveCount,
          alreadyWaved,
          timestamp: Date.now()
        }
      }));

      if (window.loadCurrentStatsFromDatabase) {
        setTimeout(() => window.loadCurrentStatsFromDatabase(), 500);
      }

    } catch (error) {
      console.error('Wave action failed:', error);
      buttonEl.classList.remove('loading', 'waved');
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
      buttonEl.setAttribute('aria-pressed', 'false');
    }
  }

  // Handle "Send Peace" UX with server persistence
  async handlePeaceAction(buttonEl) {
    if (!buttonEl || buttonEl.classList.contains('peaced')) return;
    const shareId = buttonEl.dataset.shareId;
    if (!shareId) {
      console.warn('Peace action missing share id');
      return;
    }

    const originalText = buttonEl.textContent;

    try {
      const userId = this.currentUserId || null;

      // Optimistic UI update + subtle haptic feedback
      buttonEl.classList.add('peaced', 'loading');
      buttonEl.disabled = true;
      buttonEl.textContent = '🕊️ Sending...';
      buttonEl.setAttribute('aria-pressed', 'true');
      if (navigator.vibrate) navigator.vibrate(10);

      const supabase = this.getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await supabase.rpc('send_peace', {
        p_share_id: shareId,
        p_user_id: userId
      });

      if (error) {
        throw error;
      }

      const peaceCount = data?.peace_count || 0;
      const alreadySentPeace = data?.already_sent_peace || false;

      buttonEl.classList.remove('loading');
      buttonEl.textContent = `🕊️ ${peaceCount} Peace`;
      buttonEl.setAttribute('aria-pressed', 'true');

      this.peacedShares.add(shareId);
      try {
        localStorage.setItem('peacedShares', JSON.stringify(Array.from(this.peacedShares)));
      } catch {
        // ignore storage failures
      }
      
      // 🎯 FIX RACE CONDITION: Update feedData in memory AND localStorage
      const currentFeed = this.feedData[this.currentTab] || [];
      const shareIndex = currentFeed.findIndex(s => s.id === shareId);
      if (shareIndex !== -1) {
        currentFeed[shareIndex].peace_count = peaceCount;
        console.log('✅ Updated peace_count in memory:', shareId, '→', peaceCount);
      }
      
      // Also cache count in localStorage for persistence
      try {
        const cachedCounts = JSON.parse(localStorage.getItem('peaceCounts') || '{}');
        cachedCounts[shareId] = { count: peaceCount, timestamp: Date.now() };
        localStorage.setItem('peaceCounts', JSON.stringify(cachedCounts));
      } catch {}


      window.dispatchEvent(new CustomEvent('peace:sent', {
        detail: {
          shareId,
          userId,
          peaceCount,
          alreadySentPeace,
          timestamp: Date.now()
        }
      }));

      if (window.loadCurrentStatsFromDatabase) {
        setTimeout(() => window.loadCurrentStatsFromDatabase(), 500);
      }

    } catch (error) {
      console.error('Peace action failed:', error);
      buttonEl.classList.remove('loading', 'peaced');
      buttonEl.disabled = false;
      buttonEl.textContent = originalText;
      buttonEl.setAttribute('aria-pressed', 'false');
    }
  }

  /**
   * � VIRAL-FIRST: Determine if share button should be visible
   * Only public content can be shared - respects privacy while enabling growth
   */
  shouldShowShareButton(share) {
    // Hide share button on private/anonymous content (respects user privacy)
    if (share.visibility === 'private' || share.visibility === 'anonymous') {
      return false;
    }
    
    // Show on all public content regardless of author
    // Cards will show proper attribution to original author
    return true;
  }

  /**
   * �🎨 Handle external share (shareable card generation)
   */
  async handleShareExternal(buttonEl) {
    if (!buttonEl) return;
    const shareId = buttonEl.dataset.shareId;
    if (!shareId) {
      console.warn('Share action missing share id');
      return;
    }

    try {
      // Find share data in current feeds (using correct feedData property)
      const activeTab = this.currentTab || 'general';
      const shares = activeTab === 'archives' ? this.feedData.archives : this.feedData.general;
      const shareData = shares.find(s => s.id === shareId);
      
      if (!shareData) {
        console.error('Share not found:', shareId);
        alert('Failed to load share data');
        return;
      }

      // Check if HiShareableCard is available
      if (!window.HiShareableCard) {
        console.error('❌ HiShareableCard not loaded');
        alert('Share feature unavailable. Please refresh the page.');
        return;
      }

      // Generate and show shareable card
      await window.HiShareableCard.shareCard(shareData);
      
      console.log('✅ Shareable card opened for share:', shareId);
      
    } catch (error) {
      console.error('❌ External share failed:', error);
      alert('Failed to generate shareable card. Please try again.');
    }
  }

  createShareElement(share, tabName) {
    const element = document.createElement('div');
    element.className = 'hi-share-item';
    element.dataset.shareId = share.id;
    // 🎯 CRITICAL: Track source table for cascade operations
    element.dataset.sourceTable = tabName === 'archives' ? 'hi_archives' : 'public_shares';
    
    const visibilityIcon = this.getVisibilityIcon(share.visibility);
    const timeAgo = this.formatTimeAgo(share.created_at);
    const location = share.location ? `📍 ${share.location}` : '';
    
    // 🎯 TESLA-GRADE: Format Hi content properly from schema
    const formattedContent = this.formatHiContent(share);
    const originBadgeHTML = this.getOriginBadge(share);

    // 🔬 DEBUG: Log what we're about to render
    if (!window.__shareRenderLogged) {
      console.log('🔬 Share render:', { type: share.type, origin: share.origin, badgeHTML: originBadgeHTML.substring(0, 100) });
      window.__shareRenderLogged = true;
    }

    // 🎯 X/INSTAGRAM GOLD STANDARD: Show overflow menu on user's OWN shares (ANY tab)
    // CRITICAL FIX: Use user_id comparison, NOT tab-based check
    // Anonymous shares (null user_id) are uneditable by design
    const isOwnShare = share.user_id && this.currentUserId && share.user_id === this.currentUserId;
    const sourceTable = tabName === 'archives' ? 'hi_archives' : 'public_shares';
    
    const overflowMenuHTML = isOwnShare ? `
      <div class="share-overflow-menu">
        <button class="share-overflow-btn" data-action="overflow" data-share-id="${share.id}" data-source-table="${sourceTable}" aria-label="More options" title="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
        <div class="share-overflow-dropdown" data-dropdown-for="${share.id}" style="display: none;">
          <button class="share-overflow-item" data-action="edit" data-share-id="${share.id}" data-source-table="${sourceTable}">
            <span>✏️</span> Edit
          </button>
          <button class="share-overflow-item share-overflow-item-danger" data-action="delete" data-share-id="${share.id}" data-source-table="${sourceTable}">
            <span>🗑️</span> Delete
          </button>
        </div>
      </div>
    ` : '';

    element.innerHTML = `
      <div class="share-header">
        <div class="share-user" style="cursor: pointer;" onclick="if(window.openProfileModal && '${share.user_id}') window.openProfileModal('${share.user_id}')" title="View ${this.escapeHtml(share.display_name || 'Hi Friend')}'s profile">
          ${share.avatar_url ? 
            `<img src="${share.avatar_url}" alt="Avatar" class="share-avatar" style="cursor: pointer;">` :
            '<div class="share-avatar-placeholder" style="cursor: pointer;">👤</div>'
          }
          <span class="share-username" style="cursor: pointer;">${this.escapeHtml(share.display_name || 'Hi Friend')}</span>
        </div>
        <div class="share-meta">
          <span class="share-visibility">${visibilityIcon}</span>
          <span class="share-time">${timeAgo}</span>
          ${overflowMenuHTML}
        </div>
      </div>
      
      <div class="share-content">
        ${formattedContent}
        ${location ? `<p class="share-location">${this.escapeHtml(location)}</p>` : ''}
        ${this.createEmotionalJourneyHTML(share)}
        ${this.createIntensityBadgeHTML(share.hi_intensity)}
        ${originBadgeHTML}
      </div>
      
      <div class="share-actions" data-debug-wave="${share.wave_count}" data-debug-peace="${share.peace_count}">
        <button class="share-action-btn" data-action="wave" data-share-id="${share.id}">
          ${typeof share.wave_count === 'number' && share.wave_count > 0 ? `👋 ${share.wave_count} ${share.wave_count === 1 ? 'Wave' : 'Waves'}` : '👋 Wave Back'}
        </button>
        <button class="share-action-btn" data-action="send-peace" data-share-id="${share.id}" title="Send peaceful vibes">
          ${typeof share.peace_count === 'number' && share.peace_count > 0 ? `🕊️ ${share.peace_count} Peace` : '🕊️ Send Peace'}
        </button>
        <button class="share-action-btn" data-action="share-external" data-share-id="${share.id}" title="Share to other platforms">
          📤 Share
        </button>
      </div>
    `;

    // 🚀 PERFORMANCE: Check already-waved state from localStorage (instant, no RPC needed)
    if (this.wavedShares?.has?.(share.id)) {
      const btn = element.querySelector('.share-action-btn[data-action="wave"]');
      if (btn) {
        btn.classList.add('waved');
        btn.disabled = true;
        btn.setAttribute('aria-pressed', 'true');
        // 🎯 X/TWITTER PATTERN: Keep count visible, don't change text
        // Count stays, only visual state changes (color/style via .waved class)
      }
    }

    // 🎯 REMOVED: Async RPC call that was causing inconsistency
    // wave_count already in share data from database query - no need to fetch again

    // 🚀 PERFORMANCE: Check already-peaced state from localStorage (instant, no RPC needed)
    if (this.peacedShares?.has?.(share.id)) {
      const btn = element.querySelector('.share-action-btn[data-action="send-peace"]');
      if (btn) {
        btn.classList.add('peaced');
        btn.disabled = true;
        btn.setAttribute('aria-pressed', 'true');
        // 🎯 X/TWITTER PATTERN: Keep count visible, don't change text
        // Count stays, only visual state changes (color/style via .peaced class)
      }
    }

    // 🎯 REMOVED: Async RPC call that was causing inconsistency
    // peace_count already in share data from database query - no need to fetch again

    // 🔍 Debug: Inspect pills in rendered DOM
    setTimeout(() => {
      const badges = element.querySelectorAll('.origin-badge');
      if (badges.length > 0 && !window.__domPillInspected) {
        window.__domPillInspected = true;
        const pill = badges[0];
        const computed = window.getComputedStyle(pill);
        console.log('🔍 DOM Pill Inspection:', {
          count: badges.length,
          text: pill.textContent,
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          fontSize: computed.fontSize,
          color: computed.color,
          background: computed.backgroundColor,
          zIndex: computed.zIndex,
          position: computed.position
        });
      }
    }, 200);

    return element;
  }

  // 🎯 SIMPLE: Display content as formatted by createShareContent (already has tags/emojis/location)
  formatHiContent(share) {
    try {
      // SIMPLE: Content is already properly formatted by HiDB.createShareContent
      // Hi Gym shares: emoji journey + text + #higym + location
      // Hi Island/Dashboard shares: text + #hi5 + location
      const content = share.content || share.text || 'Hi! 👋';
      
      // Convert newlines to <br> for display, preserve hashtags and emojis
      const formatted = this.escapeHtml(content).replace(/\\n/g, '<br>');
      
      return `<p class="share-text">${formatted}</p>`;
    } catch (error) {
      console.warn('⚠️ Error formatting Hi content:', error);
      return `<p class="share-text">${this.escapeHtml(share.content || 'Hi! 👋')}</p>`;
    }
  }

  // Extract additional text that's not part of the emoji format
  extractAdditionalText(content, metadata) {
    if (!content) return '';
    
    // Remove the emoji parts from content to get just the additional text
    let text = content;
    
      // Ensure container exists before rendering items (race fix)
      setTimeout(() => {
        this.renderFeedItems('general', this.getFilteredItems('general'));
      }, 0);
    if (metadata.currentEmoji && metadata.currentName) {
      text = text.replace(`${metadata.currentEmoji} ${metadata.currentName}`, '');
    }
    
    if (metadata.desiredEmoji && metadata.desiredName) {
      text = text.replace(`${metadata.desiredEmoji} ${metadata.desiredName}`, '');
      text = text.replace(' → ', '');
    }
    
    return text.trim().replace(/^\n+|\n+$/g, ''); // Clean up whitespace
  }

  // Utility methods (same as before)
  getOriginBadge(share) {
    const type = String(share.type || '').toLowerCase();
    
    // Map type to pill display
    let pillLabel, pillClass, pillColor, pillBorder;
    
    if (type === 'higym') {
      pillLabel = '💪 HiGym';
      pillClass = 'origin-higym';
      pillColor = '#9333EA';
      pillBorder = '#7C3AED';
    } else if (type === 'hi_island' || type === 'island') {
      pillLabel = '🏝️ Hi Island'; // 🎯 FIX: Add space for consistency
      pillClass = 'origin-island';
      pillColor = '#10B981';
      pillBorder = '#059669';
    } else {
      pillLabel = 'Hi 5'; // 🎯 FIX: Add space to match branding (was 'Hi5')
      pillClass = 'origin-hi5';
      pillColor = '#FF8C00';
      pillBorder = '#FF6B00';
    }

    const inlineStyle = `background: ${pillColor} !important; color: ${pillColor === '#FF8C00' ? '#1a1a1a' : 'white'} !important; border: 1.5px solid ${pillBorder} !important; padding: 4px 10px !important; border-radius: 8px !important; display: inline-block !important; font-weight: 600 !important; font-size: 13px !important; margin-right: 6px !important; opacity: 0.9 !important;`;

    return `<span class="origin-badge ${pillClass}" style="${inlineStyle}" title="${pillLabel}">${pillLabel}</span>`;
  }
  
  /**
   * 🎯 GOLD STANDARD: Create emotional journey display for Hi Muscle shares
   * Shows: current emotion → desired emotion
   * Only displays for shares with both current and desired emojis
   */
  createEmotionalJourneyHTML(share) {
    // Only show for Hi Gym shares with emotional journey data
    const hasEmotionalJourney = share.currentEmoji && share.desiredEmoji;
    if (!hasEmotionalJourney) return '';
    
    const type = String(share.type || '').toLowerCase();
    const isHiGym = type === 'higym';
    if (!isHiGym) return '';
    
    return `
      <div class="emotional-journey-badge" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        margin: 8px 0;
        background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(124, 58, 237, 0.15) 100%);
        border: 1.5px solid rgba(147, 51, 234, 0.3);
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
      ">
        <span style="font-size: 18px;">${share.currentEmoji}</span>
        <span style="color: rgba(147, 51, 234, 0.8); font-size: 12px;">→</span>
        <span style="font-size: 18px;">${share.desiredEmoji}</span>
        <span style="color: #888; font-size: 11px; margin-left: 4px;">emotional journey</span>
      </div>
    `;
  }
  
  /**
   * 🎯 Create Hi Scale intensity badge HTML
   * @param {number|null} intensity - Intensity value (1-5) or null
   * @returns {string} HTML for badge or empty string
   */
  createIntensityBadgeHTML(intensity) {
    // 🐛 DEBUG: Log intensity values
    console.log('🎯 createIntensityBadgeHTML called with:', intensity, typeof intensity);
    
    // Return empty if no intensity (backwards compatible)
    if (!intensity || intensity < 1 || intensity > 5) {
      console.log('⚠️ No intensity badge - value:', intensity);
      return '';
    }
    
    console.log('✅ Creating intensity badge for level:', intensity);
    
    // Map intensity to emoji, label, and color (Gold Standard design)
    const badges = {
      1: { emoji: '🌱', color: '#A8DADC', label: 'Opportunity', bg: 'rgba(168, 218, 220, 0.15)', border: 'rgba(168, 218, 220, 0.4)' },
      2: { emoji: '🌱', color: '#A8DADC', label: 'Opportunity', bg: 'rgba(168, 218, 220, 0.15)', border: 'rgba(168, 218, 220, 0.4)' },
      3: { emoji: '⚖️', color: '#888888', label: 'Neutral', bg: 'rgba(136, 136, 136, 0.1)', border: 'rgba(136, 136, 136, 0.3)' },
      4: { emoji: '⚡', color: '#FFD166', label: 'Hi Energy', bg: 'rgba(255, 209, 102, 0.15)', border: 'rgba(255, 209, 102, 0.4)' },
      5: { emoji: '⚡', color: '#F4A261', label: 'Highly Inspired', bg: 'rgba(244, 162, 97, 0.15)', border: 'rgba(244, 162, 97, 0.4)' }
    };
    
    const badge = badges[intensity];
    if (!badge) return '';
    
    // Gold standard styling - subtle, non-intrusive, consistent with emotional journey
    return `
      <div class="hi-intensity-badge" style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        margin: 8px 6px 8px 0;
        background: ${badge.bg};
        border: 1.5px solid ${badge.border};
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        color: ${badge.color};
        cursor: default;
        transition: all 0.2s ease;
        animation: fadeInBadge 0.3s ease-out;
      " 
      title="Hi Scale: ${badge.label} (${intensity})"
      onmouseover="this.style.transform='scale(1.05)'; this.style.filter='brightness(1.15)'; this.style.borderColor='${badge.color}';"
      onmouseout="this.style.transform='scale(1)'; this.style.filter='brightness(1)'; this.style.borderColor='${badge.border}';">
        <span style="font-size: 14px;">${badge.emoji}</span>
        <span>${badge.label}</span>
      </div>
    `;
  }
  
  getVisibilityIcon(visibility) {
    switch (visibility) {
      case 'public': return '🌍 Public';
      case 'anonymous': return '🕶️ Anonymous';
      case 'private': return '🔐 Private';
      default: return '📝 Shared';
    }
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  updateTabCount(tabName) {
    const countElement = document.getElementById(`${tabName}Count`);
    if (countElement) {
      countElement.textContent = this.feedData[tabName].length;
    }
  }

  updateLoadMoreButton(tabName) {
    // 🔄 GOLD-STANDARD: Show loading indicator while fetching, hide when no more items
    const indicator = document.getElementById(`loadMore${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (indicator) {
      // Show during active loading OR hide if no more content
      if (this.isLoading && this.pagination[tabName].hasMore) {
        indicator.style.display = 'block';
      } else {
        indicator.style.display = 'none';
      }
    }
  }

  showErrorState(tabName) {
    const container = document.getElementById(`${tabName}Feed`);
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h4>Unable to Load Shares</h4>
          <p>Database connection error. Check console for details.</p>
          <button class="retry-btn" onclick="window.hiRealFeed.loadFeedData('${tabName}')">
            Retry
          </button>
          <button class="debug-btn" onclick="window.hiRealFeed.debugConnection()" style="margin-left: 8px; background: #ff6b6b; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
            Debug
          </button>
        </div>
      `;
    }
  }
  
  // Emergency debug method
  async debugConnection() {
    console.log('🔧 HiRealFeed Debug Starting...');
    
    const client = this.getSupabase();
    console.log('📊 Supabase client:', client ? '✅ Available' : '❌ Missing');
    
    if (client) {
      try {
        // Test basic connection
        const { data: testResult, error: testError } = await client
          .from('public_shares')
          .select('count')
          .limit(1);
        
        if (testError) {
          console.error('❌ public_shares table test failed:', testError);
          
          // Try alternative tables
          const tables = ['hi_shares', 'shares', 'hi_archives'];
          for (const table of tables) {
            try {
              const { data, error } = await client
                .from(table)
                .select('count')
                .limit(1);
              
              if (!error) {
                console.log(`✅ Found alternative table: ${table}`);
              }
            } catch (e) {
              console.log(`❌ Table ${table} not available`);
            }
          }
        } else {
          console.log('✅ public_shares table accessible');
        }
      } catch (error) {
        console.error('❌ Connection test failed:', error);
      }
    }
    
    console.log('🔧 Debug complete - check console output');
  }

  showEmptyState(tabName) {
    const container = document.getElementById(`${tabName}Feed`);
    if (!container) return;

    const emptyContent = tabName === 'general' ? {
      icon: '🌱',
      title: 'No Community Shares Yet',
      message: 'Be the first to share a Hi 5 moment with the community!'
    } : {
      icon: '📝',
      title: 'No Archives Yet', 
      message: 'Start sharing Hi 5 moments to build your personal archive'
    };

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${emptyContent.icon}</div>
        <h4>${emptyContent.title}</h4>
        <p>${emptyContent.message}</p>
      </div>
    `;
  }

  showArchivesAuthRequired() {
    // 🔧 CRITICAL FIX: Reset loading state so UI doesn't stay stuck
    this.isLoading = false;
    
    const container = document.getElementById('archivesFeed') || document.querySelector('.feed-content');
    if (!container) {
      console.warn('⚠️ No archive container found');
      return;
    }

    // Tesla-grade placeholder matching Emotional Trends styling
    container.innerHTML = `
      <div style="padding: 60px 40px; text-align: center; background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%); color: #334155; border-radius: 24px; margin: 20px; border: 1px solid rgba(148, 163, 184, 0.2); backdrop-filter: blur(20px);">
        <div style="font-size: 64px; margin-bottom: 24px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));">�</div>
        <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Your Hi Archive Awaits</h2>
        <p style="margin: 0 0 32px 0; font-size: 17px; line-height: 1.6; color: #475569; max-width: 480px; margin-left: auto; margin-right: auto;">Every Hi moment you share gets saved to your personal archive. Sign in to view your journey, track patterns, and rediscover meaningful memories.</p>
        
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: #64748b;">
            <span style="font-size: 20px;">✨</span>
            <span>Personal moments, safely stored</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: #64748b;">
            <span style="font-size: 20px;">📈</span>
            <span>Track emotional patterns & growth</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: #64748b;">
            <span style="font-size: 20px;">🔒</span>
            <span>Private & secure, only you can see</span>
          </div>
        </div>
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; color: #6c757d; background: rgba(111, 66, 193, 0.1); padding: 8px 16px; border-radius: 20px; display: inline-block; border: 1px solid rgba(111, 66, 193, 0.2);">
            🔑 Account Required
          </div>
        </div>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button onclick="window.showAuthModal && window.showAuthModal('Sign in to access your personal Hi Archive and view all your shared moments.')" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); transition: all 0.2s ease; transform: translateY(0);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(99, 102, 241, 0.5)'" onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.4)'">
            ✨ Sign In to View Archive
          </button>
          <button onclick="window.location.href='/auth.html'" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 2px solid rgba(99, 102, 241, 0.3); padding: 14px 32px; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(99, 102, 241, 0.15)'" onmouseout="this.style.background='rgba(99, 102, 241, 0.1)'">
            Create Free Account
          </button>
        </div>
        
        <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8;">Free account • No spam • Secure authentication</p>
      </div>
    `;
  }

  // 🔧 NEW: Show error when hi_archives table doesn't exist in database
  showArchivesTableMissing() {
    // 🔧 CRITICAL FIX: Reset loading state so UI doesn't stay stuck
    this.isLoading = false;
    
    const container = document.getElementById('archivesFeed') || document.querySelector('.feed-content');
    if (!container) {
      console.warn('⚠️ No archive container found');
      return;
    }

    container.innerHTML = `
      <div style="padding: 60px 40px; text-align: center; background: linear-gradient(135deg, rgba(254,243,242,0.95) 0%, rgba(254,235,234,0.95) 100%); color: #7f1d1d; border-radius: 24px; margin: 20px; border: 2px solid rgba(220, 38, 38, 0.2); backdrop-filter: blur(20px);">
        <div style="font-size: 64px; margin-bottom: 24px; filter: drop-shadow(0 4px 8px rgba(220, 38, 38, 0.2));">🔧</div>
        <h2 style="margin: 0 0 16px 0; color: #7f1d1d; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Database Setup Required</h2>
        <p style="margin: 0 0 32px 0; font-size: 17px; line-height: 1.6; color: #991b1b; max-width: 560px; margin-left: auto; margin-right: auto;">The <code style="background: rgba(220, 38, 38, 0.1); padding: 2px 8px; border-radius: 4px; font-family: monospace;">hi_archives</code> table doesn't exist in your database yet. This is a quick fix that needs to be run by an admin.</p>
        
        <div style="background: rgba(254,202,202,0.5); border-radius: 16px; padding: 24px; margin: 0 auto 32px; max-width: 600px; border: 1px solid rgba(220, 38, 38, 0.3);">
          <div style="font-size: 20px; margin-bottom: 12px;">📋 Admin Instructions</div>
          <ol style="text-align: left; margin: 0; padding-left: 24px; color: #7f1d1d; font-size: 15px; line-height: 2;">
            <li>Open Supabase Dashboard → SQL Editor</li>
            <li>Run the SQL file: <code style="background: rgba(220, 38, 38, 0.1); padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 13px;">FIX_HI_ISLAND_STUCK_ARCHIVES_400.sql</code></li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div style="display: flex; gap: 16px; justify-center; flex-wrap: wrap;">
          <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); transition: all 0.2s ease; transform: translateY(0);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(220, 38, 38, 0.5)'" onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 12px rgba(220, 38, 38, 0.4)'">
            🔄 Refresh Page
          </button>
          <button onclick="window.hiRealFeed?.switchTab('general')" style="background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 2px solid rgba(220, 38, 38, 0.3); padding: 14px 32px; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(220, 38, 38, 0.15)'" onmouseout="this.style.background='rgba(220, 38, 38, 0.1)'">
            View General Shares Instead
          </button>
        </div>
        
        <p style="margin: 24px 0 0 0; font-size: 13px; color: #991b1b;">⚡ This is a one-time setup • Takes ~30 seconds to fix</p>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  injectStyles() {
    if (document.getElementById('hi-real-feed-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'hi-real-feed-styles';
    styles.textContent = `
      .hi-real-feed {
        max-width: 800px;
        margin: 0 auto;
        /* ✅ No scroll - natural page flow */
        overflow: visible !important;
        height: auto !important;
      }

      .hi-feed-content {
        /* ✅ CRITICAL: This wrapper must not create scroll */
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
      }

      .hi-feed-tabs {
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 4px;
        margin-bottom: 24px;
        backdrop-filter: blur(20px);
      }

      .hi-feed-tab {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: none;
        border: none;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .hi-feed-tab.active {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .tab-icon {
        font-size: 18px;
      }

      .tab-label {
        font-weight: 500;
      }

      .tab-count {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        margin-left: auto;
      }

      .hi-feed-tab-content {
        display: none;
        /* ✅ No scroll - natural page flow */
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }

      .hi-feed-tab-content.active {
        display: block;
        /* ✅ No scroll - natural page flow */
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }

      /* Skeleton Loading - Instant Visual Feedback */
      .feed-loading-skeleton {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .skeleton-item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        padding: 20px;
        min-height: 120px;
        animation: skeleton-pulse 1.5s ease-in-out infinite;
      }

      @keyframes skeleton-pulse {
        0%, 100% {
          opacity: 0.6;
        }
        50% {
          opacity: 0.3;
        }
      }

      .tab-header {
        text-align: center;
        margin-bottom: 24px;
        color: white;
      }

      .tab-header h3 {
        margin: 0 0 8px 0;
        font-size: 24px;
      }

      .tab-header p {
        margin: 0;
        opacity: 0.8;
        font-size: 14px;
      }

      .hi-feed-container {
        /* ✅ GOLD STANDARD: Simple block container - window handles scroll */
        display: block !important;
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
        /* Share cards have bottom margin for spacing */
      }
      
      .hi-feed-container > * {
        margin-bottom: 16px;
      }

      .hi-share-item {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 20px; /* Slightly reduce to show more content on mobile */
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 
          0 4px 6px rgba(0, 0, 0, 0.1),
          0 2px 4px rgba(0, 0, 0, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        position: relative;
        overflow: hidden;
        transform: translate3d(0,0,0); /* Isolate layer for smooth scroll */
        backface-visibility: hidden; /* Prevent flickering */
        content-visibility: auto; /* Lazy render off-screen items for faster initial load */
        scroll-snap-align: start; /* Buttery iOS scrolling */
        scroll-snap-stop: normal;
      }
      
      /* Mobile-specific readability improvements */
      @media (max-width: 768px) {
        .hi-share-item {
          padding: 18px 16px; /* Tighter on mobile to fit more content */
        }
        .share-text {
          font-size: 17px; /* Slightly larger for mobile comfort */
          line-height: 1.7; /* More generous line spacing on small screens */
        }
        .share-content {
          margin: 14px 0; /* Better vertical rhythm */
        }
      }
      
      .hi-share-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(255, 255, 255, 0.2), 
          transparent);
      }
      
      .hi-share-item:hover {
        transform: translateY(-2px);
        box-shadow: 
          0 12px 24px rgba(0, 0, 0, 0.15),
          0 6px 12px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.12);
      }

      .share-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start; /* Allow wrapping */
        margin-bottom: 12px;
        gap: 12px;
      }

      .share-user {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0; /* Enable text truncation */
        flex: 1; /* Take available space */
      }

      .share-avatar, .share-avatar-placeholder {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .share-username {
        font-weight: 600;
        font-size: 15px;
        /* 🎯 X/TWITTER PATTERN: Truncate long usernames */
        max-width: 140px; /* ~18 chars on mobile */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .share-meta {
        display: flex;
        align-items: center;
        gap: 8px; /* Tighter spacing */
        font-size: 13px;
        opacity: 0.6;
        flex-shrink: 0; /* Don't shrink meta */
      }

      .share-content {
        margin: 16px 0;
      }

      .share-text {
        margin: 0 0 12px 0;
        line-height: 1.65; /* Better mobile readability */
        font-size: 16px; /* Prevent iOS zoom on focus, better reading */
        letter-spacing: 0.01em; /* Subtle breathing room */
      }

      .share-location {
        margin: 0;
        font-size: 14px;
        opacity: 0.8;
      }

      /* 🎯 X/TWITTER PATTERN: Visual state for waved/peaced (color, not text) */
      .share-action-btn.waved {
        color: #FFD166;
        background: rgba(255, 209, 102, 0.15);
        border-color: rgba(255, 209, 102, 0.3);
      }

      .share-action-btn.peaced {
        color: #4ECDC4;
        background: rgba(78, 205, 196, 0.15);
        border-color: rgba(78, 205, 196, 0.3);
      }

      .origin-badge {
        display: inline-block !important;
        font-size: 13px !important;
        padding: 6px 14px !important;
        border-radius: 12px !important;
        margin-top: 8px !important;
        margin-right: 8px !important;
        font-weight: 700 !important;
        opacity: 1 !important;
        visibility: visible !important;
        position: relative !important;
        z-index: 10 !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .origin-badge:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .origin-hi5 {
        background: #FF8C00 !important;
        border: 2px solid #FF6B00 !important;
        color: #1a1a1a !important;
        text-shadow: none !important;
      }
      
      .origin-higym {
        background: #9333EA !important;
        border: 2px solid #7C3AED !important;
        color: #FFFFFF !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
      }
      
      .origin-island {
        background: rgba(34, 197, 94, 0.9) !important;
        border: 2px solid rgba(34, 197, 94, 1) !important;
        color: #1a1a1a !important;
      }

      .share-actions {
        display: flex;
        gap: 12px;
      }

      .share-action-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px 12px;
        color: white;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
      }

      .share-action-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .share-action-btn:disabled,
      .share-action-btn.loading {
        opacity: 0.6;
        cursor: not-allowed;
        pointer-events: none;
      }

      .load-more-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px 24px;
        color: white;
        cursor: pointer;
        margin-top: 24px;
        transition: all 0.3s ease;
      }

      .load-more-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .loading-state, .error-state, .empty-state, .auth-required-state {
        text-align: center;
        padding: 48px 24px;
        color: white;
      }

      .auth-required-state .auth-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .auth-required-state .auth-actions {
        margin-top: 24px;
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .auth-required-state .hi-btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        text-decoration: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
      }

      .auth-required-state .hi-btn-primary {
        background: var(--color-primary, #007bff);
        color: white;
      }

      .auth-required-state .hi-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px auto;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error-icon, .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .retry-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 12px 24px;
        color: white;
        cursor: pointer;
        margin-top: 16px;
      }

      @media (max-width: 768px) {
        .hi-feed-tabs {
          flex-direction: column;
          gap: 4px;
        }
        
        .hi-feed-tab {
          justify-content: center;
        }
        
        .tab-count {
          margin-left: 8px;
        }
        
        .share-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        
        .share-actions {
          flex-wrap: wrap;
        }
      }
      
      /* 🎯 X/INSTAGRAM GOLD STANDARD: Overflow Menu Styles */
      .share-overflow-menu {
        position: relative;
        margin-left: 8px;
      }
      
      .share-overflow-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .share-overflow-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      
      .share-overflow-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: rgba(30, 30, 30, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        min-width: 140px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(20px);
        z-index: 1000;
        overflow: hidden;
        animation: dropdownFadeIn 0.15s ease;
      }
      
      @keyframes dropdownFadeIn {
        from { opacity: 0; transform: translateY(-8px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      
      .share-overflow-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        background: none;
        border: none;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s ease;
        text-align: left;
      }
      
      .share-overflow-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .share-overflow-item-danger {
        color: #EF4444;
      }
      
      .share-overflow-item-danger:hover {
        background: rgba(239, 68, 68, 0.15);
      }
      
      /* 🎯 GOLD STANDARD: Edit Modal - Center-Staged, Unmissable */
      .hi-edit-modal-overlay {
        position: fixed !important;
        inset: 0 !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        min-height: 100vh !important;
        background: rgba(0, 0, 0, 0.92) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        padding: 20px;
        box-sizing: border-box;
        animation: modalOverlayFadeIn 0.2s ease-out;
        overflow-y: auto;
        margin: 0 !important;
      }
      
      @keyframes modalOverlayFadeIn {
        from { opacity: 0; backdrop-filter: blur(0px); }
        to { opacity: 1; backdrop-filter: blur(12px); }
      }
      
      .hi-edit-modal {
        position: relative !important;
        background: linear-gradient(180deg, #1e1e3f 0%, #151528 100%);
        border: 3px solid #FFD166 !important;
        border-radius: 24px;
        width: 100%;
        max-width: 520px;
        max-height: 85vh;
        overflow: hidden;
        box-shadow: 
          0 0 0 4px rgba(255, 209, 102, 0.3),
          0 25px 80px rgba(0, 0, 0, 0.8),
          0 0 100px rgba(255, 209, 102, 0.25);
        animation: modalBounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin: auto;
        transform: translateZ(0);
      }
      
      @keyframes modalBounceIn {
        0% { 
          transform: scale(0.8) translateY(40px); 
          opacity: 0; 
        }
        60% {
          transform: scale(1.03) translateY(-5px);
          opacity: 1;
        }
        100% { 
          transform: scale(1) translateY(0); 
          opacity: 1; 
        }
      }
      
      .hi-edit-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 209, 102, 0.05);
      }
      
      .hi-edit-modal-header h3 {
        margin: 0;
        color: #FFD166;
        font-size: 20px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .hi-edit-modal-header h3::before {
        content: '✏️';
        font-size: 18px;
      }
      
      .hi-edit-modal-close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 18px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 10px;
        transition: all 0.2s ease;
        font-weight: bold;
      }
      
      .hi-edit-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        transform: scale(1.05);
      }
      
      .hi-edit-modal-body {
        padding: 24px;
      }
      
      .hi-edit-textarea {
        width: 100%;
        min-height: 160px;
        background: rgba(255, 255, 255, 0.08);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        padding: 18px;
        color: white;
        font-size: 17px;
        font-family: inherit;
        line-height: 1.6;
        resize: vertical;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }
      
      .hi-edit-textarea::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
      
      .hi-edit-textarea:focus {
        outline: none;
        border-color: #FFD166;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.15);
      }
      
      .hi-edit-char-count {
        text-align: right;
        margin-top: 10px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
      }
      
      .hi-edit-modal-footer {
        display: flex;
        gap: 14px;
        justify-content: flex-end;
        padding: 20px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }
      
      .hi-edit-btn {
        padding: 14px 28px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        min-width: 120px;
      }
      
      .hi-edit-btn-cancel {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .hi-edit-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }
      
      .hi-edit-btn-save {
        background: linear-gradient(135deg, #FFD166 0%, #F4A261 100%);
        color: #1a1a1a;
        box-shadow: 0 4px 15px rgba(255, 209, 102, 0.4);
      }
      
      .hi-edit-btn-save:hover {
        background: linear-gradient(135deg, #FFE066 0%, #FFD166 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 209, 102, 0.5);
      }
      
      .hi-edit-btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      
      /* 🎯 GOLD STANDARD: Delete Modal - Center-Staged, Clear Warning */
      .hi-delete-modal-overlay {
        position: fixed !important;
        inset: 0 !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        min-height: 100vh !important;
        background: rgba(0, 0, 0, 0.92) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        padding: 20px;
        box-sizing: border-box;
        animation: modalOverlayFadeIn 0.2s ease-out;
        margin: 0 !important;
      }
      
      .hi-delete-modal {
        position: relative !important;
        background: linear-gradient(180deg, #2a1a1a 0%, #1a1015 100%);
        border: 3px solid #EF4444 !important;
        border-radius: 24px;
        width: 100%;
        max-width: 400px;
        padding: 36px 28px;
        text-align: center;
        box-shadow: 
          0 0 0 4px rgba(239, 68, 68, 0.3),
          0 25px 80px rgba(0, 0, 0, 0.8),
          0 0 100px rgba(239, 68, 68, 0.25);
        animation: modalBounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin: auto;
        transform: translateZ(0);
      }
      
      .hi-delete-modal-icon {
        font-size: 56px;
        margin-bottom: 20px;
        animation: deleteIconPulse 2s ease-in-out infinite;
      }
      
      @keyframes deleteIconPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .hi-delete-modal h3 {
        margin: 0 0 14px 0;
        color: #EF4444;
        font-size: 22px;
        font-weight: 700;
      }
      
      .hi-delete-modal p {
        margin: 0 0 28px 0;
        color: rgba(255, 255, 255, 0.6);
        font-size: 15px;
        line-height: 1.6;
      }
      
      .hi-delete-modal-actions {
        display: flex;
        gap: 16px;
        justify-content: center;
      }
      
      .hi-delete-btn {
        padding: 14px 28px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        min-width: 120px;
      }
      
      .hi-delete-btn-cancel {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .hi-delete-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }
      
      .hi-delete-btn-confirm {
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
      }
      
      .hi-delete-btn-confirm:hover {
        background: linear-gradient(135deg, #F87171 0%, #EF4444 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
      }
      
      .hi-delete-btn-confirm:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      
      /* 🎯 X/INSTAGRAM GOLD STANDARD: Mobile Bottom Sheet for Overflow Menu */
      @media (max-width: 480px) {
        /* Convert dropdown to bottom sheet on mobile */
        .share-overflow-dropdown {
          position: fixed !important;
          top: auto !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          min-width: 100% !important;
          border-radius: 20px 20px 0 0 !important;
          padding-bottom: env(safe-area-inset-bottom, 20px);
          animation: bottomSheetSlideIn 0.25s ease !important;
        }
        
        @keyframes bottomSheetSlideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .share-overflow-item {
          padding: 16px 24px;
          font-size: 16px;
          justify-content: flex-start;
        }
        
        .share-overflow-item:first-child {
          border-radius: 20px 20px 0 0;
        }
        
        /* Add a handle indicator for bottom sheet */
        .share-overflow-dropdown::before {
          content: '';
          display: block;
          width: 40px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          margin: 12px auto 8px;
        }
        
        /* Modal responsive adjustments */
        .hi-edit-modal,
        .hi-delete-modal {
          max-height: 85vh;
          margin: 0;
        }
        
        .hi-edit-modal {
          border-radius: 20px 20px 0 0;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 100%;
          animation: bottomSheetSlideIn 0.25s ease;
        }
        
        .hi-delete-modal {
          border-radius: 20px;
          margin: auto 16px;
        }
      }
      
      /* Tablet adjustments */
      @media (min-width: 481px) and (max-width: 768px) {
        .hi-edit-modal,
        .hi-delete-modal {
          max-width: 450px;
        }
      }
      
      /* Desktop enhancements */
      @media (min-width: 1024px) {
        .share-overflow-dropdown {
          min-width: 160px;
        }
        
        .share-overflow-item {
          padding: 14px 20px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  // 🔧 CRITICAL FIX: Cleanup method to prevent memory leaks
  destroy() {
    console.log('🧹 Cleaning up HiRealFeed resources...');
    
    // Cancel any in-flight requests
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    
    // Remove all scroll event listeners
    this._scrollHandlers.forEach((handler, container) => {
      container.removeEventListener('scroll', handler);
    });
    this._scrollHandlers.clear();
    
    // Remove document click listener for overflow menu
    if (this._documentClickHandler) {
      document.removeEventListener('click', this._documentClickHandler);
      this._documentClickHandler = null;
    }
    
    // Clear data
    this.feedData = { general: [], archives: [] };
    this.wavedShares.clear();
    this.peacedShares.clear();
    
    console.log('✅ HiRealFeed cleanup complete');
  }
}

// Initialize and export
window.HiIslandRealFeed = HiIslandRealFeed;

// � FIX BACKGROUND SUSPENSION: Don't destroy on pagehide - just pause
// Original bug: destroy() was called when backgrounding app, feed never recovered
// New approach: Use visibilitychange to pause/resume instead
let isInitialized = false;

function initializeFeed() {
  if (!isInitialized) {
    window.hiRealFeed = new HiIslandRealFeed();
    isInitialized = true;
    console.log('✅ hiRealFeed initialized');
  }
}

// WOZ FIX: Initialize IMMEDIATELY instead of waiting for DOMContentLoaded
// Modules load unpredictably, so we need hiRealFeed available ASAP
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFeed);
} else {
  // DOM already loaded, initialize now
  initializeFeed();
}

// 🎯 HANDLE PAGE VISIBILITY: Pause when hidden, resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('⏸️ Page hidden - pausing feed updates');
    // Feed stays alive, just pauses
  } else {
    console.log('▶️ Page visible - resuming feed');
    // Reinitialize if destroyed somehow
    if (!window.hiRealFeed) {
      console.warn('⚠️ Feed was destroyed - reinitializing');
      initializeFeed();
    }
  }
});

// 🚀 CRITICAL FIX: Only register ONE pageshow handler per page load
// Mobile Safari loads modules multiple times - each adds another listener!
if (!window.__feedPageshowRegistered) {
  window.__feedPageshowRegistered = Date.now();
  const FEED_INIT_TIMESTAMP = Date.now();
  
  window.addEventListener('pageshow', (event) => {
    const timeSinceInit = Date.now() - FEED_INIT_TIMESTAMP;
    const isInitialPageshow = timeSinceInit < 200;
    
    console.log('🔄 [HiRealFeed] pageshow:', {
      persisted: event.persisted,
      timeSinceInit,
      isInitialPageshow,
      wasInitialized: isInitialized
    });
    
    // Only reset on RETURN navigations or BFCache restore
    if (event.persisted) {
      console.log('🔄 BFCache restore - forcing full reinitialization');
      isInitialized = false;
      if (window.hiRealFeed) {
        window.hiRealFeed.destroy?.();
        window.hiRealFeed = null;
      }
      initializeFeed();
    } else if (!isInitialPageshow && isInitialized) {
      console.log('🔄 Return navigation - resetting module state');
      isInitialized = false;
    } else {
      console.log('✅ Initial pageshow - keeping fresh state');
    }
  });
} else {
  console.log('[HiRealFeed] ⏭️ Pageshow listener already registered, skipping duplicate');
}

export default HiIslandRealFeed;