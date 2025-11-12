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
    this.feedData = {
      general: [],
      archives: []
    };
    this.isLoading = false;
    this.pagination = {
      general: { page: 0, hasMore: true },
      archives: { page: 0, hasMore: true }
    };
  }

  // Initialize the feed with REAL data sources
  async init() {
    console.log('🏝️ Initializing Hi-Island REAL Feed System...');
    
    try {
      // Get current user for personal archives
      await this.getCurrentUser();
      
      // Render the interface
      this.render();
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Load initial data from REAL tables
      await this.loadFeedData();
      
      console.log('✅ Hi-Island REAL Feed System ready');
    } catch (error) {
      console.error('❌ Hi-Island REAL Feed System initialization failed:', error);
    }
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
      
      console.log('🔍 HiRealFeed: Attempting to load from public_shares...');
      
      // Query REAL public_shares table with proper pagination
      // 🚨 EMERGENCY FIX: Filter out medallion taps to prevent data contamination
      const { data: shares, error } = await supabase
        .from('public_shares')
        .select(`
          *,
          profiles (
            username,
            display_name, 
            avatar_url
          )
        `)
        .not('text', 'ilike', '%medallion tap%')  // Exclude medallion taps from text column
        .order('created_at', { ascending: false })
        .range(this.pagination.general.page * 20, (this.pagination.general.page + 1) * 20 - 1);

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

      // 🎯 TESLA-GRADE: Process shares with NEW SCHEMA alignment
      const processedShares = (shares || []).map(share => {
        const processed = {
          id: share.id,
          content: share.content || 'Shared a Hi 5 moment!', // NEW SCHEMA: content field
          visibility: share.visibility || 'public', // NEW SCHEMA: visibility field
          metadata: share.metadata || {}, // NEW SCHEMA: metadata field with Hi format
          created_at: share.created_at,
          user_id: share.user_id,
          location: share.location_data?.location || share.location, // NEW SCHEMA: location_data
          origin: share.metadata?.origin || 'unknown',
          type: share.metadata?.type || 'hi5'
        };

        // Handle anonymization using NEW SCHEMA
        if (share.visibility === 'anonymous') {
          processed.display_name = 'Hi Friend';
          processed.avatar_url = null;
        } else if (share.profiles) {
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
        this.feedData.general = processedShares;
      } else {
        this.feedData.general = [...this.feedData.general, ...processedShares];
      }

      this.renderFeedItems('general', processedShares);
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

      // 🎯 TESLA-GRADE: Process archive data with NEW SCHEMA alignment
      const processedArchives = (archives || []).map(archive => ({
        id: archive.id,
        content: archive.content || 'Personal Hi 5 moment', // NEW SCHEMA: content field
        visibility: archive.visibility || 'private', // NEW SCHEMA: visibility field  
        metadata: archive.metadata || {}, // NEW SCHEMA: metadata field with Hi format
        created_at: archive.created_at,
        user_id: archive.user_id,
        location: archive.location_data?.location || archive.location, // NEW SCHEMA: location_data
        origin: archive.metadata?.origin || 'unknown',
        type: archive.metadata?.type || 'hi5',
        display_name: 'You', // User's own archives
        avatar_url: null // Will be filled from user profile if needed
      }));

      // Update feed data
      if (this.pagination.archives.page === 0) {
        this.feedData.archives = processedArchives;
      } else {
        this.feedData.archives = [...this.feedData.archives, ...processedArchives];
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
            </div>
            
            <div id="generalFeed" class="hi-feed-container">
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading community shares...</p>
              </div>
            </div>
            
            <button id="loadMoreGeneral" class="load-more-btn" style="display: none;">
              Load More Community Shares
            </button>
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
              <button id="loadMoreArchives" class="load-more-btn" style="display: none;">
                Load More Archives
              </button>
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
            <!-- Content will be populated by renderFeedItems -->
          </div>
          
          <button id="loadMoreGeneral" class="load-more-btn" style="display: none;">
            Load More Community Shares
          </button>
        </div>
      `;
      this.renderFeedItems('general', this.feedData.general || []);
    } else if (tabName === 'archives') {
      contentArea.innerHTML = `
        <div id="archivesTab" class="hi-feed-tab-content active">
          <div class="tab-header">
            <h3>My Hi 5 Archives</h3>
            <p>Your personal collection of Hi moments</p>
          </div>
          
          <div id="archivesFeed" class="hi-feed-container">
            <!-- Content will be populated by renderFeedItems -->
          </div>
          
          <button id="loadMoreArchives" class="load-more-btn" style="display: none;">
            Load More Archives
          </button>
        </div>
      `;
      this.renderFeedItems('archives', this.feedData.archives || []);
    }

    // Re-attach event listeners for load more buttons
    this.attachLoadMoreListeners();
  }

  // 🔧 NEW: Separate method for load more listeners
  attachLoadMoreListeners() {
    const loadMoreGeneral = document.getElementById('loadMoreGeneral');
    if (loadMoreGeneral) {
      loadMoreGeneral.addEventListener('click', () => this.loadMoreShares('general'));
    }

    const loadMoreArchives = document.getElementById('loadMoreArchives');  
    if (loadMoreArchives) {
      loadMoreArchives.addEventListener('click', () => this.loadMoreShares('archives'));
    }
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
    const container = document.getElementById(`${tabName}Feed`);
    if (!container) return;

    // Remove loading state on first render
    if (this.pagination[tabName].page === 0) {
      container.innerHTML = '';
    }

    shares.forEach(share => {
      const shareElement = this.createShareElement(share, tabName);
      container.appendChild(shareElement);
    });

    // Show empty state if no shares
    if (this.feedData[tabName].length === 0) {
      this.showEmptyState(tabName);
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

    element.innerHTML = `
      <div class="share-header">
        <div class="share-user">
          ${share.avatar_url ? 
            `<img src="${share.avatar_url}" alt="Avatar" class="share-avatar">` :
            '<div class="share-avatar-placeholder">👤</div>'
          }
          <span class="share-username">${this.escapeHtml(share.display_name || 'Hi Friend')}</span>
        </div>
        <div class="share-meta">
          <span class="share-visibility">${visibilityIcon}</span>
          <span class="share-time">${timeAgo}</span>
        </div>
      </div>
      
      <div class="share-content">
        ${formattedContent}
        ${location ? `<p class="share-location">${this.escapeHtml(location)}</p>` : ''}
      </div>
      
      <div class="share-actions">
        <button class="share-action-btn" data-action="wave" data-share-id="${share.id}">
          👋 Wave Back
        </button>
        ${tabName === 'archives' ? `
          <button class="share-action-btn" data-action="share" data-share-id="${share.id}">
            📤 Share Again
          </button>
        ` : ''}
      </div>
    `;

    return element;
  }

  // 🎯 TESLA-GRADE: Format Hi content from new schema
  formatHiContent(share) {
    try {
      // Debug logging to see what data we have
      console.log('🔍 Formatting share content:', {
        id: share.id,
        content: share.content,
        metadata: share.metadata,
        hasMetadata: !!(share.metadata && Object.keys(share.metadata).length)
      });

      // Try to parse metadata for proper Hi format
      const metadata = share.metadata || {};
      
      if (metadata.currentEmoji || metadata.desiredEmoji) {
        // Reconstruct proper Hi format from metadata
        let hiFormat = '';
        
        if (metadata.currentEmoji && metadata.currentName) {
          hiFormat += `<span class="hi-current-state">${metadata.currentEmoji} ${this.escapeHtml(metadata.currentName)}</span>`;
        }
        
        if (metadata.desiredEmoji && metadata.desiredName) {
          if (hiFormat) hiFormat += ' → ';
          hiFormat += `<span class="hi-desired-state">${metadata.desiredEmoji} ${this.escapeHtml(metadata.desiredName)}</span>`;
        }
        
        // Add additional text if present
        const additionalText = this.extractAdditionalText(share.content, metadata);
        if (additionalText) {
          hiFormat += `<p class="hi-additional-text">${this.escapeHtml(additionalText)}</p>`;
        }
        
        console.log('✅ Created Hi formatted content:', hiFormat);
        return `<div class="hi-formatted-content">${hiFormat}</div>`;
      } else {
        // Fallback to content as-is (for legacy or simple shares)
        console.log('⚠️ No metadata found, using raw content');
        return `<p class="share-text">${this.escapeHtml(share.content || 'Hi! 👋')}</p>`;
      }
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
    const button = document.getElementById(`loadMore${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (button) {
      button.style.display = this.pagination[tabName].hasMore ? 'block' : 'none';
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
      }

      .hi-share-item {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
      }

      .share-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .share-user {
        display: flex;
        align-items: center;
        gap: 12px;
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
      }

      .share-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        opacity: 0.7;
      }

      .share-content {
        margin: 16px 0;
      }

      .share-text {
        margin: 0 0 8px 0;
        line-height: 1.5;
      }

      .share-location {
        margin: 0;
        font-size: 14px;
        opacity: 0.8;
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

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.hiRealFeed = new HiIslandRealFeed();
});

export default HiIslandRealFeed;