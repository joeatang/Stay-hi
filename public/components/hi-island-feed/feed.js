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
        <div class="hi-feed-filters" id="hi-feed-filter-controls">
          <button class="hi-feed-filter-btn active" data-filter="all">All</button>
          <button class="hi-feed-filter-btn" data-filter="quick">Hi5️⃣</button>
          <button class="hi-feed-filter-btn" data-filter="guided">HiGYM</button>
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
    const filterControls = this.root.querySelector('#hi-feed-filter-controls');
    if (tabName === 'general' || tabName === 'archive') {
      filterControls.style.display = 'flex';
    } else {
      filterControls.style.display = 'none';
    }

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

  // Load data from Supabase (using hiDB wrapper)
  async loadData() {
    if (!window.hiDB) {
      console.error('❌ hiDB not initialized');
      return;
    }

    try {
      // Load General feed (public shares) - hiDB handles fallbacks
      const generalData = await window.hiDB.fetchPublicShares({ limit: 50 });
      this.feedData.general = generalData || [];
      console.log(`✅ Loaded ${this.feedData.general.length} general shares`);

      // Load Archive (user's private shares) - hiDB handles auth
      const archiveData = await window.hiDB.fetchMyArchive({ limit: 50 });
      this.feedData.archive = archiveData || [];
      console.log(`✅ Loaded ${this.feedData.archive.length} archive shares`);

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
    if (!listContainer) return;

    const data = this.feedData[tabName] || [];
    
    // Apply filter
    const filteredData = this.filterData(data, this.currentFilter);

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
    return data.filter(share => share.origin === filter);
  }

  // Create card element
  createCard(share) {
    const card = document.createElement('div');
    card.className = 'hi-feed-card';
    card.dataset.shareId = share.id;

    const timeAgo = this.formatTimeAgo(share.createdAt);
    const originBadge = share.origin === 'quick' ? 'Hi5️⃣' : share.origin === 'guided' ? 'HiGYM' : '';

    card.innerHTML = `
      <div class="hi-feed-card-header">
        <div class="hi-feed-card-user">${share.userName || 'Hi Friend'}</div>
        <div class="hi-feed-card-time">${timeAgo}</div>
      </div>
      <div class="hi-feed-card-message">
        ${share.currentEmoji} → ${share.desiredEmoji} 
        ${share.text ? `<br><br>${this.escapeHtml(share.text)}` : ''}
      </div>
      <div class="hi-feed-card-meta">
        ${originBadge ? `<span class="hi-feed-card-badge">${originBadge}</span>` : ''}
        ${share.currentName ? `<span>${share.currentEmoji} ${share.currentName}</span>` : ''}
        ${share.desiredName ? `<span>${share.desiredEmoji} ${share.desiredName}</span>` : ''}
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
