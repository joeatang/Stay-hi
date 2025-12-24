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
  }

  // Initialize the feed with REAL data sources
  async init() {
    console.log('🏝️ Initializing Hi-Island REAL Feed System...');
    
    try {
      // Get current user for personal archives
      await this.getCurrentUser();
      // Try to fetch user's public share count via RPC; fail gracefully
      try {
        const supabase = this.getSupabase();
        if (supabase && this.currentUserId) {
          const { getUserShareCount } = await import('../../lib/rpc/getUserShareCount.js');
          this.userPublicShareCount = await getUserShareCount(supabase, this.currentUserId);
        } else {
          this.userPublicShareCount = 0;
        }
      } catch (e) {
        console.warn('⚠️ HiRealFeed: getUserShareCount unavailable:', e);
        this.userPublicShareCount = 0;
      }
      
      // Render the interface
      this.render();
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Initialize auto-hide header scroll behavior
      this.initAutoHideHeader();
      
      // Load initial data from REAL tables
      await this.loadFeedData();
      
      console.log('✅ Hi-Island REAL Feed System ready');
    } catch (error) {
      console.error('❌ Hi-Island REAL Feed System initialization failed:', error);
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
        // Use cache if < 30 seconds old AND higher than DB (DB trigger may not have completed yet)
        if (age < 30000 && cachedData.count > dbCount) {
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

  // Get Supabase client (using unified resolution from HiDB)
  getSupabase() {
    // Use the unified resolver from HiDB if available
    if (window.getSupabase) {
      const client = window.getSupabase();
      if (client) return client;
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
      return window.supabase.createClient(url, key);
    }
    
    console.error('❌ HiRealFeed: No Supabase client found');
    return null;
  }

  // Load feed data from REAL database tables
  async loadFeedData(tabName = null) {
    const tabs = tabName ? [tabName] : ['general', 'archives'];
    
    for (const tab of tabs) {
      try {
        if (tab === 'general') {
          await this.loadGeneralSharesFromPublicShares();
        } else if (tab === 'archives') {
          if (this.currentUserId) {
            await this.loadUserArchivesFromHiArchives();
          } else {
            // Show authentication prompt for archives
            this.showArchivesAuthRequired();
          }
        }
      } catch (error) {
        console.error(`❌ Failed to load ${tab} data:`, error);
        this.showErrorState(tab);
      }
    }
  }

  // Load general/public shares from public_shares table (REAL data source)
  async loadGeneralSharesFromPublicShares() {
    const supabase = this.getSupabase();
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
        const result = await supabase
          .from('public_shares_enriched')
          .select('*')
          .order('created_at', { ascending: false })
          .range(this.pagination.general.page * 20, (this.pagination.general.page + 1) * 20 - 1);
        
        shares = result.data;
        error = result.error;
        
        if (!error && shares) {
          console.log('🏆 Loaded shares with LIVE profile data + reaction counts (view exists)');
        }
      } catch (viewError) {
        console.log('📊 View not available, using JOIN query');
      }
      
      // Fallback: Direct JOIN if view doesn't exist
      if (!shares || error) {
        const result = await supabase
          .from('public_shares')
          .select(`
            *,
            wave_count,
            peace_count,
            profiles (
              username,
              display_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .range(this.pagination.general.page * 20, (this.pagination.general.page + 1) * 20 - 1);
        
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
          created_at: shares[0].created_at
        });
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
  async loadUserArchivesFromHiArchives() {
    const supabase = this.getSupabase();
    if (!supabase || !this.currentUserId) {
      console.warn('⚠️ No Supabase client or user not authenticated for archives');
      return;
    }

    try {
      this.isLoading = true;

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

      // Query REAL hi_archives table for user's personal data
      const { data: archives, error } = await supabase
        .from('hi_archives')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .range(this.pagination.archives.page * 20, (this.pagination.archives.page + 1) * 20 - 1);

      if (error) {
        console.error('❌ Failed to load from hi_archives:', error);
        throw error;
      }

      // 🎯 TESLA-GRADE: Process archive data with ACTUAL SCHEMA
      const processedArchives = (archives || []).map(archive => {
        // 🔬 Debug: log first archive to reveal ACTUAL schema
        if (!window.__archiveSchemaLogged) {
          console.log('🔍 ACTUAL ARCHIVE SCHEMA:', Object.keys(archive));
          window.__archiveSchemaLogged = true;
        }
        
        // 🔬 DEBUG: Log type field for investigation
        if (!window.__archiveTypeLogged) {
          console.log('🔍 Archive Type Debug:', {
            raw_type: archive.type,
            raw_origin: archive.origin,
            content_preview: (archive.content || archive.text || '').substring(0, 50),
            created_at: archive.created_at
          });
          window.__archiveTypeLogged = true;
        }
        
        return {
          id: archive.id,
          content: archive.content || archive.text || 'Personal Hi 5 moment', // Try all variants
          text: archive.text || '',
          visibility: archive.visibility || (archive.is_anonymous ? 'anonymous' : 'private'),
          metadata: archive.metadata || {},
          created_at: archive.created_at,
          user_id: archive.user_id,
          location: archive.location || 'Location unavailable',
          origin: archive.origin || 'unknown',
          type: archive.type || 'hi5',
          display_name: 'You', // User's own archives
          avatar_url: null, // Will be filled from user profile if needed
          // 🏆 Add medallion/emoji data
          currentEmoji: archive.current_emoji || '👋',
          currentName: archive.current_name || 'Hi',
          desiredEmoji: archive.desired_emoji || '👋',
          desiredName: archive.desired_name || 'Hi',
          // 🎯 Hi Scale intensity (1-5 or null)
          hi_intensity: archive.hi_intensity || null
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
    }
  }

  // 🎯 NEW: Auto-hide header on scroll down, reveal on scroll up (immersive reading)
  initAutoHideHeader() {
    const feedContainers = document.querySelectorAll('.hi-feed-container');
    const header = document.querySelector('.tesla-header');
    
    if (!header) {
      console.warn('⚠️ Header not found for auto-hide feature');
      return;
    }
    
    // 🚀 GOLD STANDARD: Throttled + debounced scroll handler for buttery 60fps
    let ticking = false;
    let lastInfiniteScrollTrigger = 0;
    const INFINITE_SCROLL_DEBOUNCE = 500; // ms between load triggers
    
    const handleScroll = (container) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
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
            // Determine which tab we're scrolling in
            const isGeneralTab = container.id === 'generalFeed';
            const isArchivesTab = container.id === 'archivesFeed';
            
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
    
    // Attach passive scroll listeners to all feed containers
    feedContainers.forEach(container => {
      container.addEventListener('scroll', () => handleScroll(container), { passive: true });
    });
    
    console.log('✅ Auto-hide header + infinite scroll initialized on', feedContainers.length, 'containers');
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
            btn.textContent = '👋 Waved';
          }
        }
        if (tabName === 'general' && this.peacedShares?.has?.(share.id)) {
          const btn = shareElement.querySelector('.share-action-btn[data-action="send-peace"]');
          if (btn) {
            btn.classList.add('peaced');
            btn.disabled = true;
            btn.setAttribute('aria-pressed', 'true');
            btn.textContent = '🕊️ Peace Sent';
          }
        }
      } catch {}
      container.appendChild(shareElement);
    });

    // Show empty state if no shares
    if (this.feedData[tabName].length === 0) {
      this.showEmptyState(tabName);
    }
    
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

      // Optimistic UI update
      buttonEl.classList.add('waved', 'loading');
      buttonEl.disabled = true;
      buttonEl.textContent = '👋 Waving...';
      buttonEl.setAttribute('aria-pressed', 'true');

      const supabase = this.getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await supabase.rpc('wave_back', {
        p_share_id: shareId,
        p_user_id: userId
      });

      if (error) {
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

      // Optimistic UI update
      buttonEl.classList.add('peaced', 'loading');
      buttonEl.disabled = true;
      buttonEl.textContent = '🕊️ Sending...';
      buttonEl.setAttribute('aria-pressed', 'true');

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

    element.innerHTML = `
      <div class="share-header">
        <div class="share-user" style="cursor: pointer;" onclick="window.location.href='/profile.html?user=${share.user_id}'" title="View ${this.escapeHtml(share.display_name || 'Hi Friend')}'s profile">
          ${share.avatar_url ? 
            `<img src="${share.avatar_url}" alt="Avatar" class="share-avatar" style="cursor: pointer;">` :
            '<div class="share-avatar-placeholder" style="cursor: pointer;">👤</div>'
          }
          <span class="share-username" style="cursor: pointer;">${this.escapeHtml(share.display_name || 'Hi Friend')}</span>
        </div>
        <div class="share-meta">
          <span class="share-visibility">${visibilityIcon}</span>
          <span class="share-time">${timeAgo}</span>
        </div>
      </div>
      
      <div class="share-content">
        ${formattedContent}
        ${location ? `<p class="share-location">${this.escapeHtml(location)}</p>` : ''}
        ${this.createEmotionalJourneyHTML(share)}
        ${this.createIntensityBadgeHTML(share.hi_intensity)}
        ${originBadgeHTML}
      </div>
      
      <div class="share-actions">
        <button class="share-action-btn" data-action="wave" data-share-id="${share.id}">
          ${typeof share.wave_count === 'number' ? `👋 ${share.wave_count} ${share.wave_count === 1 ? 'Wave' : 'Waves'}` : '👋 Wave Back'}
        </button>
        ${this.shouldShowShareButton(share) ? `
        <button class="share-action-btn" data-action="send-peace" data-share-id="${share.id}" title="Send peaceful vibes">
          ${typeof share.peace_count === 'number' ? `🕊️ ${share.peace_count} Peace` : '🕊️ Send Peace'}
        </button>
        <button class="share-action-btn" data-action="share-external" data-share-id="${share.id}" title="Share to other platforms">
          📤 Share
        </button>
        ` : ''}
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
      pillLabel = '🏝️ Island';
      pillClass = 'origin-island';
      pillColor = '#10B981';
      pillBorder = '#059669';
    } else {
      pillLabel = 'Hi5';
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
    // Return empty if no intensity (backwards compatible)
    if (!intensity || intensity < 1 || intensity > 5) {
      return '';
    }
    
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
      }

      .hi-feed-tab-content.active {
        display: block;
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
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        max-height: 60vh;
        min-height: 300px; /* Immediate scrollability - don't wait for content */
        -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
        overscroll-behavior: contain; /* Prevent rubber-band bounce */
        will-change: scroll-position; /* GPU acceleration for smooth 60fps */
        transform: translate3d(0,0,0); /* Force hardware acceleration */
        scroll-behavior: smooth;
        scroll-snap-type: y proximity; /* Buttery iOS scrolling */
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.3) transparent;
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
    `;
    
    document.head.appendChild(styles);
  }
}

// Initialize and export
window.HiIslandRealFeed = HiIslandRealFeed;

// WOZ FIX: Initialize IMMEDIATELY instead of waiting for DOMContentLoaded
// Modules load unpredictably, so we need hiRealFeed available ASAP
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.hiRealFeed = new HiIslandRealFeed();
    console.log('✅ hiRealFeed initialized (DOMContentLoaded)');
  });
} else {
  // DOM already loaded, initialize now
  window.hiRealFeed = new HiIslandRealFeed();
  console.log('✅ hiRealFeed initialized (immediate)');
}

export default HiIslandRealFeed;