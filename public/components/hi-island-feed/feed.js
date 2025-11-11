// ===================================================================
// 🎯 HI ISLAND FEED COMPONENT
// Isolated, modular feed with tabs, filters, and Supabase integration
// ===================================================================

class HiIslandFeed {
  constructor(rootElement) {
    this.root = rootElement;
    this.currentTab = 'general';
    this.currentFilter = 'all';
    this.feedData = {
      general: [],
      archive: []
    };
    
    this.init();
  }

  // Initialize component
  async init() {
    this.render();
    this.attachEventListeners();
    await this.loadData();
  }

  // Render HTML structure
  render() {
    this.root.innerHTML = `
      <div class="hi-feed">
        <!-- Tab Navigation -->
        <nav class="hi-feed-tabs" role="tablist" aria-label="Hi Island tabs">
          <button class="hi-feed-tab" role="tab" aria-selected="true" data-tab="general">
            General Shares
          </button>
          <button class="hi-feed-tab" role="tab" aria-selected="false" data-tab="archive">
            My Archive
          </button>
          <button class="hi-feed-tab" role="tab" aria-selected="false" data-tab="trends">
            Emotional Trends
          </button>
          <button class="hi-feed-tab" role="tab" aria-selected="false" data-tab="milestones">
            Points Milestones
          </button>
          <button class="hi-feed-tab" role="tab" aria-selected="false" data-tab="show">
            Hi Show Shares
          </button>
        </nav>

        <!-- Filter Controls (visible only on General/Archive tabs) -->
                <div class="hi-feed-filters">
          <button class="hi-feed-filter-btn active" data-filter="all">All</button>
          <button class="hi-feed-filter-btn" data-filter="quick">👋 Hi5</button>
          <button class="hi-feed-filter-btn" data-filter="guided">💪 HiGYM</button>
        </div>

        <!-- Sections -->
        <section class="hi-feed-section" id="section-general" aria-hidden="false">
          <div class="hi-feed-section-header">🌍 Public feed from Hi Island community • Latest first</div>
          <div class="hi-feed-list" id="list-general"></div>
        </section>

        <section class="hi-feed-section" id="section-archive" aria-hidden="true">
          <div class="hi-feed-section-header">🔒 Your private Hi archive • Only you can see these</div>
          <div class="hi-feed-list" id="list-archive"></div>
        </section>

        <section class="hi-feed-section" id="section-trends" aria-hidden="true">
          <div class="hi-feed-empty">
            <div class="hi-feed-empty-icon">📊</div>
            <p>Emotional Trends coming soon</p>
          </div>
        </section>

        <section class="hi-feed-section" id="section-milestones" aria-hidden="true">
          <div class="hi-feed-empty">
            <div class="hi-feed-empty-icon">🏆</div>
            <p>Points & Milestones coming soon</p>
          </div>
        </section>

        <section class="hi-feed-section" id="section-show" aria-hidden="true">
          <div class="hi-feed-empty">
            <div class="hi-feed-empty-icon">📺</div>
            <p>Hi Show community coming soon</p>
          </div>
        </section>
      </div>
    `;
  }

  // Attach event listeners
  attachEventListeners() {
    // Tab clicks
    const tabs = this.root.querySelectorAll('.hi-feed-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Filter clicks
    const filters = this.root.querySelectorAll('.hi-feed-filter-btn');
    filters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const targetFilter = filter.dataset.filter;
        this.switchFilter(targetFilter);
      });
    });

    // Username clicks (event delegation for dynamically created elements)
    this.root.addEventListener('click', (e) => {
      const usernameEl = e.target.closest('.hi-feed-card-user-clickable');
      if (usernameEl) {
        const userId = usernameEl.dataset.userId;
        // Only open modal if user ID exists (not anonymous)
        if (userId && userId.trim() && window.openProfileModal) {
          window.openProfileModal(userId);
        }
      }
    });

    // Keyboard accessibility for username clicks
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const usernameEl = e.target.closest('.hi-feed-card-user-clickable');
        if (usernameEl) {
          e.preventDefault();
          const userId = usernameEl.dataset.userId;
          // Only open modal if user ID exists (not anonymous)
          if (userId && userId.trim() && window.openProfileModal) {
            window.openProfileModal(userId);
          }
        }
      }
    });
  }

  // Switch active tab
  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    const tabs = this.root.querySelectorAll('.hi-feed-tab');
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === tabName;
      tab.setAttribute('aria-selected', isActive);
    });

    // Update sections
    const sections = this.root.querySelectorAll('.hi-feed-section');
    sections.forEach(section => {
      const isVisible = section.id === `section-${tabName}`;
      section.setAttribute('aria-hidden', !isVisible);
    });

    // Show/hide filters (only for General and Archive)
    const filterControls = this.root.querySelector('.hi-feed-filters');
    if (filterControls) {
      if (tabName === 'general' || tabName === 'archive') {
        filterControls.style.display = 'flex';
      } else {
        filterControls.style.display = 'none';
      }
    }

    // CRITICAL: Render the list for the new tab
    this.renderList(tabName);

    console.log(`🔄 Switched to tab: ${tabName}`);
  }

  // Switch active filter
  switchFilter(filterName) {
    this.currentFilter = filterName;

    // Update filter buttons
    const filters = this.root.querySelectorAll('.hi-feed-filter-btn');
    filters.forEach(filter => {
      if (filter.dataset.filter === filterName) {
        filter.classList.add('active');
      } else {
        filter.classList.remove('active');
      }
    });

    // Re-render current list with filter
    this.renderList(this.currentTab);
    console.log(`🔍 Switched filter: ${filterName}`);
  }

  // Load data from Supabase (using hiDB wrapper or HiBase)
  async loadData() {
    // Check if HiBase shares integration is enabled
    const hibaseEnabled = window.HiFlags && window.HiFlags.isEnabled('hibase_shares_enabled');
    
    if (hibaseEnabled && window.HiBase_shares) {
      // 🔥 NEW: HiBase integration path
      console.log('📡 Using HiBase shares integration for feed loading');
      
      try {
        // Load General feed via HiBase
        const { data: generalData, error: generalError } = await window.HiBase_shares.getPublicShares(50);
        
        if (generalError) {
          console.error('❌ HiBase general feed load failed:', generalError);
          throw new Error('HiBase general feed failed');
        }
        
        this.feedData.general = generalData || [];
        console.log(`✅ Loaded ${this.feedData.general.length} general shares via HiBase`);
        
        // Load Archive (user's private shares) - note: this may need user authentication
        try {
          const currentUser = window.hiAuth?.getCurrentUser?.();
          if (currentUser && currentUser.id !== 'anonymous') {
            const { data: archiveData, error: archiveError } = await window.HiBase_shares.getUserShares(currentUser.id, 50);
            
            if (!archiveError) {
              this.feedData.archive = archiveData || [];
              console.log(`✅ Loaded ${this.feedData.archive.length} archive shares via HiBase`);
            } else {
              console.warn('⚠️ HiBase archive load failed (using empty):', archiveError);
              this.feedData.archive = [];
            }
          } else {
            console.log('ℹ️ No authenticated user, skipping archive load');
            this.feedData.archive = [];
          }
        } catch (archiveError) {
          console.warn('⚠️ HiBase archive load failed (non-critical):', archiveError);
          this.feedData.archive = [];
        }
        
        // Track successful HiBase feed load
        import('/lib/monitoring/HiMonitor.js').then(m => 
          m.trackEvent('feed_load', { path: 'hibase', items: this.feedData.general.length })
        ).catch(() => {});
        
        // Render current tab
        this.renderList(this.currentTab);
        
      } catch (error) {
        console.error('❌ HiBase feed loading failed, falling back to legacy:', error);
        
        // Log error for monitoring
        if (window.HiMonitor) {
          window.HiMonitor.logError(error, { where: 'feed_load', path: 'hibase' });
        }
        
        // Fall back to legacy hiDB method
        await this.loadDataLegacy();
      }
      
    } else {
      // 🔄 FALLBACK: Legacy hiDB path
      await this.loadDataLegacy();
    }
  }
  
  // Legacy data loading method
  async loadDataLegacy() {
    console.log('📡 Using legacy hiDB for feed loading');
    
    if (!window.hiDB) {
      console.error('❌ hiDB not initialized');
      return;
    }

    try {
      // Load General feed (public shares) - hiDB handles fallbacks
      const generalData = await window.hiDB.fetchPublicShares({ limit: 50 });
      this.feedData.general = generalData || [];
      console.log(`✅ Loaded ${this.feedData.general.length} general shares via legacy`);

      // Load Archive (user's private shares) - hiDB handles auth
      const archiveData = await window.hiDB.fetchMyArchive({ limit: 50 });
      this.feedData.archive = archiveData || [];
      console.log(`✅ Loaded ${this.feedData.archive.length} archive shares via legacy`);

      // Track legacy feed load
      import('/lib/monitoring/HiMonitor.js').then(m => 
        m.trackEvent('feed_load', { path: 'legacy', items: this.feedData.general.length })
      ).catch(() => {});

      // Render current tab
      this.renderList(this.currentTab);

    } catch (error) {
      console.error('❌ Error loading feed data:', error);
      this.showError('Failed to load feed data');
    }
  }

  // Render list for specific tab
  renderList(tabName) {
    const listContainer = this.root.querySelector(`#list-${tabName}`);
    if (!listContainer) {
      console.error(`❌ List container not found for tab: ${tabName}`);
      return;
    }

    const data = this.feedData[tabName] || [];
    console.log(`📋 Rendering ${tabName} list with ${data.length} items`);
    
    // Apply filter
    const filteredData = this.filterData(data, this.currentFilter);
    console.log(`🔍 After filter '${this.currentFilter}': ${filteredData.length} items`);

    // Clear container
    listContainer.innerHTML = '';

    if (filteredData.length === 0) {
      listContainer.innerHTML = `
        <div class="hi-feed-empty">
          <div class="hi-feed-empty-icon">🤷</div>
          <p>No shares found</p>
        </div>
      `;
      return;
    }

    // Render cards
    filteredData.forEach(share => {
      const card = this.createCard(share);
      listContainer.appendChild(card);
    });
  }

  // Filter data based on origin type
  filterData(data, filter) {
    if (filter === 'all') return data;
    
    // Map filter to origin values (support both old and new)
    return data.filter(share => {
      if (filter === 'quick') {
        return share.origin === 'hi5' || share.origin === 'quick';
      } else if (filter === 'guided') {
        return share.origin === 'higym' || share.origin === 'guided';
      }
      return share.origin === filter;
    });
  }

  // Create card element
  createCard(share) {
    const card = document.createElement('div');
    card.className = 'hi-feed-card';
    card.dataset.shareId = share.id;

    // 🔍 DEBUG: Log share data to verify userId
    console.log('📋 Creating card for share:', {
      id: share.id,
      userName: share.userName,
      userId: share.userId,
      isAnonymous: share.isAnonymous,
      hasAvatar: !!share.userAvatar
    });

    const timeAgo = this.formatTimeAgo(share.createdAt);
    
    // Map origin to badge with emoji
    let originBadge = '';
    let badgeClass = '';
    if (share.origin === 'hi5' || share.origin === 'quick' || share.origin === 'hi-island' || share.origin === 'dashboard') {
      // 🚀 TESLA-GRADE FIX: Dashboard and Hi-Island shares should be tagged as Hi5
      originBadge = '👋 Hi5';
      badgeClass = 'badge-hi5';
    } else if (share.origin === 'higym' || share.origin === 'guided' || share.origin === 'hi-muscle') {
      originBadge = '💪 HiGYM';
      badgeClass = 'badge-higym';
    }

    // For HiGYM, show emotional journey prominently
    const isHiGym = share.origin === 'higym' || share.origin === 'guided';
    const emotionalJourney = isHiGym && share.currentEmoji && share.desiredEmoji
      ? `<div class="hi-feed-card-journey">
           <div class="hi-feed-card-journey-label">Emotional Journey</div>
           <div class="hi-feed-card-journey-emojis">${share.currentEmoji} → ${share.desiredEmoji}</div>
         </div>`
      : '';

    // Create avatar HTML (will be replaced by actual avatar element)
    const avatarPlaceholder = document.createElement('div');
    avatarPlaceholder.className = 'hi-feed-card-avatar';
    
    // Use AvatarUtils if available to create proper avatar
    if (window.AvatarUtils) {
      const userObj = {
        avatar_url: share.userAvatar,
        display_name: share.userName,
        username: share.userName,
        email: null // We don't have email in public shares
      };
      
      const avatarElement = window.AvatarUtils.createAvatar(userObj, {
        size: '40px',
        className: 'hi-feed-avatar',
        showInitials: true,
        isAnonymous: share.isAnonymous
      });
      
      avatarPlaceholder.appendChild(avatarElement);
    } else {
      // Fallback: simple initials div
      const initials = (share.userName || 'HI').substring(0, 2).toUpperCase();
      avatarPlaceholder.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ECDC4, #FFD93D);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        ">${initials}</div>
      `;
    }

    // 🌟 TESLA-GRADE: ALL users have clickable profiles (including anonymous)
    // Anonymous users show public anonymous profile with engagement stats
    const isClickable = share.userId && share.userId.trim();
    const userNameClass = isClickable ? 'hi-feed-card-user hi-feed-card-user-clickable' : 'hi-feed-card-user';
    const profileLabel = share.isAnonymous ? 'View anonymous user profile' : `View ${share.userName || 'Hi Friend'}'s profile`;
    const userNameAttrs = isClickable 
      ? `data-user-id="${share.userId}" role="button" tabindex="0" aria-label="${profileLabel}"`
      : '';

    card.innerHTML = `
      <div class="hi-feed-card-header">
        <div class="hi-feed-card-user-info">
          ${avatarPlaceholder.outerHTML}
          <div class="${userNameClass}" ${userNameAttrs}>${share.userName || 'Hi Friend'}</div>
        </div>
        <div class="hi-feed-card-time">${timeAgo}</div>
      </div>
      ${emotionalJourney}
      ${share.text ? `<div class="hi-feed-card-message">${this.escapeHtml(share.text)}</div>` : ''}
      <div class="hi-feed-card-meta">
        ${originBadge ? `<span class="hi-feed-card-badge ${badgeClass}">${originBadge}</span>` : ''}
        ${share.location ? `<span>📍 ${share.location}</span>` : ''}
      </div>
    `;

    return card;
  }

  // Format timestamp to relative time
  formatTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show error toast
  showError(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }
}

// ===================================================================
// 🚀 AUTO-INITIALIZE
// ===================================================================
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const root = document.getElementById('hi-island-feed-root');
    if (root) {
      window.hiIslandFeed = new HiIslandFeed(root);
      console.log('✅ Hi Island Feed component initialized');
    }
  }
})();
