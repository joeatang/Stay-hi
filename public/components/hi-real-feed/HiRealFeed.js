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

  // Get Supabase client (using same method as production code)
  getSupabase() {
    return window.getSupabase?.() || window.supabaseClient || window.sb || 
           window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
  }

  // Load feed data from REAL database tables
  async loadFeedData(tabName = null) {
    const tabs = tabName ? [tabName] : ['general', 'archives'];
    
    for (const tab of tabs) {
      try {
        if (tab === 'general') {
          await this.loadGeneralSharesFromPublicShares();
        } else if (tab === 'archives' && this.currentUserId) {
          await this.loadUserArchivesFromHiArchives();
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
      console.warn('⚠️ No Supabase client available for general shares');
      this.showErrorState('general');
      return;
    }

    try {
      this.isLoading = true;
      
      // Query REAL public_shares table with proper pagination
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
        .order('created_at', { ascending: false })
        .range(this.pagination.general.page * 20, (this.pagination.general.page + 1) * 20 - 1);

      if (error) {
        console.error('❌ Failed to load from public_shares:', error);
        throw error;
      }

      // Process shares with proper anonymization
      const processedShares = (shares || []).map(share => {
        const processed = {
          id: share.id,
          content: share.text || share.content || 'Shared a Hi 5 moment!',
          visibility: share.is_anonymous ? 'anonymous' : 'public',
          created_at: share.created_at,
          user_id: share.user_id,
          location: share.location,
          origin: share.origin || 'unknown',
          type: share.type || 'hi5'
        };

        // Handle anonymization
        if (share.is_anonymous) {
          processed.display_name = 'Anonymous Hi 5er';
          processed.avatar_url = null;
        } else if (share.profiles) {
          processed.display_name = share.profiles.display_name || share.profiles.username || 'Hi 5er';
          processed.avatar_url = share.profiles.avatar_url;
        } else {
          processed.display_name = 'Hi 5er';
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

      // Process archive data
      const processedArchives = (archives || []).map(archive => ({
        id: archive.id,
        content: archive.journal || archive.text || 'Personal Hi 5 moment',
        visibility: 'private', // Archives are personal
        created_at: archive.created_at,
        user_id: archive.user_id,
        location: archive.location,
        origin: archive.origin || 'unknown',
        type: archive.type || 'hi5',
        current_emoji: archive.current_emoji || '🙌',
        desired_emoji: archive.desired_emoji || '✨',
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

  // Render the feed interface (same as before but with corrected data flow)
  render() {
    const container = document.getElementById('hi-island-feed-root');
    if (!container) {
      console.error('❌ Hi-Island feed container not found');
      return;
    }

    container.innerHTML = `
      <div class="hi-real-feed">
        <!-- Tab Navigation -->
        <nav class="hi-feed-tabs" role="tablist">
          <button 
            class="hi-feed-tab active" 
            role="tab" 
            data-tab="general"
            aria-selected="true"
          >
            <span class="tab-icon">🌍</span>
            <span class="tab-label">General Shares</span>
            <span class="tab-count" id="generalCount">0</span>
          </button>
          
          <button 
            class="hi-feed-tab" 
            role="tab" 
            data-tab="archives"
            aria-selected="false"
          >
            <span class="tab-icon">📦</span>
            <span class="tab-label">My Archives</span>
            <span class="tab-count" id="archivesCount">0</span>
          </button>
        </nav>

        <!-- Feed Content -->
        <div class="hi-feed-content">
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

  attachEventListeners() {
    // Tab switching
    document.querySelectorAll('.hi-feed-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Load more buttons
    const loadMoreGeneral = document.getElementById('loadMoreGeneral');
    if (loadMoreGeneral) {
      loadMoreGeneral.addEventListener('click', () => this.loadMoreShares('general'));
    }

    const loadMoreArchives = document.getElementById('loadMoreArchives');
    if (loadMoreArchives) {
      loadMoreArchives.addEventListener('click', () => this.loadMoreShares('archives'));
    }
  }

  switchTab(tabName) {
    // Update tab states
    document.querySelectorAll('.hi-feed-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    document.querySelectorAll('.hi-feed-tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // Activate selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}Tab`);
    
    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedTab.setAttribute('aria-selected', 'true');
      selectedContent.classList.add('active');
      
      this.currentTab = tabName;
      
      // Load data if not already loaded
      if (this.feedData[tabName].length === 0) {
        this.loadFeedData(tabName);
      }
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

    element.innerHTML = `
      <div class="share-header">
        <div class="share-user">
          ${share.avatar_url ? 
            `<img src="${share.avatar_url}" alt="Avatar" class="share-avatar">` :
            '<div class="share-avatar-placeholder">👤</div>'
          }
          <span class="share-username">${this.escapeHtml(share.display_name || 'Hi 5er')}</span>
        </div>
        <div class="share-meta">
          <span class="share-visibility">${visibilityIcon}</span>
          <span class="share-time">${timeAgo}</span>
        </div>
      </div>
      
      <div class="share-content">
        <p class="share-text">${this.escapeHtml(share.content)}</p>
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
          <p>Please check your connection and try again</p>
          <button class="retry-btn" onclick="window.hiRealFeed.loadFeedData('${tabName}')">
            Retry
          </button>
        </div>
      `;
    }
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

      .loading-state, .error-state, .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: white;
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