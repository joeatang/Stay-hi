/**
 * 🚀 Hi-Island Social Hi 5 System
 * 
 * Unified community feed with proper privacy controls:
 * - General Shares: Public + Anonymous shares from all users  
 * - My Archives: User's personal shares (all visibility types)
 * 
 * Privacy Architecture:
 * - Public shares: Visible in General + stored in My Archives
 * - Anonymous shares: Visible in General (anonymized) + stored in My Archives  
 * - Private shares: Only in My Archives, never in General
 */

class HiIslandSocialSystem {
  constructor() {
    this.currentTab = 'general';
    this.currentUserId = null;
    this.feedData = {
      general: [],
      archives: []
    };
    this.isLoading = false;
    this.pagination = {
      general: { page: 1, hasMore: true },
      archives: { page: 1, hasMore: true }
    };
  }

  // Initialize the social system
  async init() {
    console.log('🏝️ Initializing Hi-Island Social Hi 5 System...');
    
    try {
      // Get current user for personal archives
      await this.getCurrentUser();
      
      // Render the interface
      this.render();
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Load initial data
      await this.loadFeedData();
      
      console.log('✅ Hi-Island Social System ready');
    } catch (error) {
      console.error('❌ Hi-Island Social System initialization failed:', error);
    }
  }

  // Get current authenticated user
  async getCurrentUser() {
    try {
      if (window.hiAuth?.getCurrentUser) {
        const user = await window.hiAuth.getCurrentUser();
        this.currentUserId = user?.id || null;
      } else if (window.hiDB?.supabase?.auth) {
        const { data: { user } } = await window.hiDB.supabase.auth.getUser();
        this.currentUserId = user?.id || null;
      }
      
      console.log('👤 Current user ID:', this.currentUserId);
    } catch (error) {
      console.warn('⚠️ Could not get current user:', error);
      this.currentUserId = null;
    }
  }

  // Render the social feed interface
  render() {
    const container = document.getElementById('hi-island-feed-root');
    if (!container) {
      console.error('❌ Hi-Island feed container not found');
      return;
    }

    container.innerHTML = `
      <div class="hi-social-system">
        <!-- Tab Navigation -->
        <nav class="hi-social-tabs" role="tablist">
          <button 
            class="hi-social-tab active" 
            role="tab" 
            data-tab="general"
            aria-selected="true"
          >
            <span class="tab-icon">🌍</span>
            <span class="tab-label">General Shares</span>
            <span class="tab-count" id="generalCount">0</span>
          </button>
          
          <button 
            class="hi-social-tab" 
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
        <div class="hi-social-content">
          <!-- General Shares Tab -->
          <div id="generalTab" class="hi-social-tab-content active">
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
          <div id="archivesTab" class="hi-social-tab-content">
            <div class="tab-header">
              <h3>My Hi 5 Archives</h3>
              <p>Your personal collection of Hi moments (all visibility types)</p>
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

  // Attach event listeners
  attachEventListeners() {
    // Tab switching
    document.querySelectorAll('.hi-social-tab').forEach(tab => {
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

  // Switch between tabs
  switchTab(tabName) {
    // Update tab states
    document.querySelectorAll('.hi-social-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    document.querySelectorAll('.hi-social-tab-content').forEach(content => {
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

  // Load feed data for specified tab
  async loadFeedData(tabName = null) {
    const tabs = tabName ? [tabName] : ['general', 'archives'];
    
    for (const tab of tabs) {
      try {
        if (tab === 'general') {
          await this.loadGeneralShares();
        } else if (tab === 'archives' && this.currentUserId) {
          await this.loadUserArchives();
        }
      } catch (error) {
        console.error(`❌ Failed to load ${tab} data:`, error);
        this.showErrorState(tab);
      }
    }
  }

  // Load general/public shares (public + anonymous)
  async loadGeneralShares() {
    if (!window.HiBase?.shares) {
      console.warn('⚠️ HiBase.shares not available for general shares');
      return;
    }

    try {
      this.isLoading = true;
      
      // Load public and anonymous shares
      const { data: shares, error } = await window.HiBase.shares.getPublicShares({
        visibility: ['public', 'anonymous'],
        limit: 20,
        page: this.pagination.general.page
      });

      if (error) {
        console.error('❌ Failed to load general shares:', error);
        this.showErrorState('general');
        return;
      }

      // Process and anonymize data as needed
      const processedShares = shares.map(share => ({
        ...share,
        // Anonymize user info for anonymous shares
        display_name: share.visibility === 'anonymous' ? 'Anonymous Hi 5er' : share.display_name,
        avatar_url: share.visibility === 'anonymous' ? null : share.avatar_url
      }));

      this.feedData.general = [...this.feedData.general, ...processedShares];
      this.renderFeedItems('general', processedShares);
      this.updateTabCount('general');

      // Update pagination
      this.pagination.general.hasMore = shares.length === 20;
      this.updateLoadMoreButton('general');

    } catch (error) {
      console.error('❌ Error loading general shares:', error);
      this.showErrorState('general');
    } finally {
      this.isLoading = false;
    }
  }

  // Load user's personal archives (all visibility types)
  async loadUserArchives() {
    if (!this.currentUserId || !window.HiBase?.shares) {
      console.warn('⚠️ User not authenticated or HiBase not available');
      return;
    }

    try {
      this.isLoading = true;

      // Load all user's shares regardless of visibility
      const { data: shares, error } = await window.HiBase.shares.getUserShares(
        this.currentUserId, 
        {
          limit: 20,
          page: this.pagination.archives.page
        }
      );

      if (error) {
        console.error('❌ Failed to load user archives:', error);
        this.showErrorState('archives');
        return;
      }

      this.feedData.archives = [...this.feedData.archives, ...shares];
      this.renderFeedItems('archives', shares);
      this.updateTabCount('archives');

      // Update pagination
      this.pagination.archives.hasMore = shares.length === 20;
      this.updateLoadMoreButton('archives');

    } catch (error) {
      console.error('❌ Error loading user archives:', error);
      this.showErrorState('archives');
    } finally {
      this.isLoading = false;
    }
  }

  // Load more shares for a tab
  async loadMoreShares(tabName) {
    if (this.isLoading) return;

    this.pagination[tabName].page++;
    
    if (tabName === 'general') {
      await this.loadGeneralShares();
    } else if (tabName === 'archives') {
      await this.loadUserArchives();
    }
  }

  // Render feed items
  renderFeedItems(tabName, shares) {
    const container = document.getElementById(`${tabName}Feed`);
    if (!container) return;

    // Remove loading state on first render
    if (this.feedData[tabName].length === shares.length) {
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

  // Create a share element
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
          <span class="share-username">${share.display_name || 'Hi 5er'}</span>
        </div>
        <div class="share-meta">
          <span class="share-visibility">${visibilityIcon}</span>
          <span class="share-time">${timeAgo}</span>
        </div>
      </div>
      
      <div class="share-content">
        <p class="share-text">${this.escapeHtml(share.content || share.text || 'Shared a Hi 5 moment!')}</p>
        ${location ? `<p class="share-location">${location}</p>` : ''}
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

    // Attach action listeners
    element.querySelectorAll('.share-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleShareAction(e, share));
    });

    return element;
  }

  // Get visibility icon
  getVisibilityIcon(visibility) {
    switch (visibility) {
      case 'public': return '🌍 Public';
      case 'anonymous': return '🕶️ Anonymous';
      case 'private': return '🔐 Private';
      default: return '📝 Shared';
    }
  }

  // Format time ago
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

  // Handle share actions
  async handleShareAction(e, share) {
    const action = e.target.dataset.action;
    const shareId = e.target.dataset.shareId;
    
    switch (action) {
      case 'wave':
        await this.handleWaveBack(shareId);
        break;
      case 'share':
        await this.handleShareAgain(share);
        break;
    }
  }

  // Handle wave back action
  async handleWaveBack(shareId) {
    // Implement wave back functionality
    console.log('👋 Waving back at share:', shareId);
    // TODO: Implement wave tracking
  }

  // Handle share again action
  async handleShareAgain(share) {
    // Open share sheet with prefilled content
    if (window.openHiShareSheet) {
      window.openHiShareSheet('hi-island', {
        content: share.content || share.text,
        location: share.location
      });
    }
  }

  // Update tab count
  updateTabCount(tabName) {
    const countElement = document.getElementById(`${tabName}Count`);
    if (countElement) {
      countElement.textContent = this.feedData[tabName].length;
    }
  }

  // Update load more button
  updateLoadMoreButton(tabName) {
    const button = document.getElementById(`loadMore${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (button) {
      button.style.display = this.pagination[tabName].hasMore ? 'block' : 'none';
    }
  }

  // Show error state
  showErrorState(tabName) {
    const container = document.getElementById(`${tabName}Feed`);
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h4>Unable to Load Shares</h4>
          <p>Please check your connection and try again</p>
          <button class="retry-btn" onclick="window.hiSocialSystem.loadFeedData('${tabName}')">
            Retry
          </button>
        </div>
      `;
    }
  }

  // Show empty state
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

  // Utility: Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Inject CSS styles
  injectStyles() {
    if (document.getElementById('hi-social-system-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'hi-social-system-styles';
    styles.textContent = `
      .hi-social-system {
        max-width: 800px;
        margin: 0 auto;
      }

      .hi-social-tabs {
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 4px;
        margin-bottom: 24px;
        backdrop-filter: blur(20px);
      }

      .hi-social-tab {
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

      .hi-social-tab.active {
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

      .hi-social-tab-content {
        display: none;
      }

      .hi-social-tab-content.active {
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
        .hi-social-tabs {
          flex-direction: column;
          gap: 4px;
        }
        
        .hi-social-tab {
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
window.HiIslandSocialSystem = HiIslandSocialSystem;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.hiSocialSystem = new HiIslandSocialSystem();
});

export default HiIslandSocialSystem;