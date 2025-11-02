/**
 * HiFeed Component
 * 
 * Unified experience layer combining shares and streaks into a single feed.
 * Consumes the HiFeed API for cached, paginated content delivery.
 * 
 * Usage:
 *   const hiFeed = new HiFeed('#feed-container');
 *   await hiFeed.initialize();
 */

class HiFeed {
  constructor(container) {
    this.container = typeof container === 'string' ? 
      document.querySelector(container) : container;
    
    if (!this.container) {
      throw new Error('HiFeed: Container element not found');
    }

    this.userId = null;
    this.currentPage = 1;
    this.limit = 20;
    this.isLoading = false;
    this.hasMore = true;
    this.feedItems = [];
    
    this.bindEvents();
  }

  /**
   * Initialize the feed component
   */
  async initialize() {
    try {
      // Get current user ID
      this.userId = await this.getCurrentUserId();
      if (!this.userId) {
        this.renderEmptyState('Please log in to view your feed');
        return;
      }

      // Render loading state
      this.renderLoadingState();
      
      // Load initial feed data
      await this.loadFeedData();
      
    } catch (error) {
      console.error('HiFeed initialization error:', error);
      this.renderErrorState('Failed to load feed');
    }
  }

  /**
   * Load feed data from HiFeed API
   */
  async loadFeedData(append = false) {
    if (this.isLoading || (!this.hasMore && append)) return;
    
    this.isLoading = true;
    
    try {
      // Import HiFeed module dynamically (for browser compatibility)
      const response = await fetch('/api/hifeed/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          userId: this.userId,
          page: this.currentPage,
          limit: this.limit,
          type: 'all'
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const { data: items, pagination } = result;
      
      if (append) {
        this.feedItems.push(...items);
      } else {
        this.feedItems = items;
      }
      
      this.hasMore = pagination.hasMore;
      this.renderFeed();
      
    } catch (error) {
      console.error('HiFeed load error:', error);
      // Fallback to static demo data for development
      this.loadDemoData(append);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load demo data for development/testing
   */
  loadDemoData(append = false) {
    const demoItems = [
      {
        id: 'share_demo_1',
        type: 'share',
        content: 'Feeling grateful for this beautiful morning! 🌅',
        emotion: 'grateful',
        location: 'Central Park, NYC',
        createdAt: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: 'streak_demo_1',
        type: 'streak',
        content: '7 day mindfulness streak!',
        streakType: 'mindfulness',
        currentCount: 7,
        longestStreak: 12,
        createdAt: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: 'share_demo_2',
        type: 'share',
        content: 'Just completed my meditation practice 🧘‍♀️',
        emotion: 'peaceful',
        location: 'Home Studio',
        createdAt: new Date(Date.now() - 180000).toISOString()
      }
    ];

    if (append) {
      this.feedItems.push(...demoItems);
    } else {
      this.feedItems = demoItems;
    }
    
    this.hasMore = this.currentPage < 3; // Demo has 3 pages max
    this.renderFeed();
  }

  /**
   * Render the complete feed
   */
  renderFeed() {
    if (!this.feedItems.length) {
      this.renderEmptyState('No feed items yet. Start sharing your Hi moments!');
      return;
    }

    const feedHTML = `
      <div class="hi-feed">
        <div class="hi-feed-header">
          <h2>Your Hi Feed</h2>
          <div class="hi-feed-stats">
            ${this.feedItems.length} items
          </div>
        </div>
        
        <div class="hi-feed-items">
          ${this.feedItems.map(item => this.renderFeedItem(item)).join('')}
        </div>
        
        ${this.hasMore ? this.renderLoadMoreButton() : ''}
      </div>
    `;

    this.container.innerHTML = feedHTML;
    this.bindFeedEvents();
  }

  /**
   * Render individual feed item
   */
  renderFeedItem(item) {
    const timeAgo = this.getTimeAgo(item.createdAt);
    
    if (item.type === 'share') {
      return `
        <div class="hi-feed-item hi-feed-share" data-id="${item.id}">
          <div class="hi-feed-item-header">
            <div class="hi-feed-item-type">
              <span class="hi-emotion-badge hi-emotion-${item.emotion}">
                ${this.getEmotionEmoji(item.emotion)} ${item.emotion}
              </span>
            </div>
            <div class="hi-feed-item-time">${timeAgo}</div>
          </div>
          
          <div class="hi-feed-item-content">
            ${item.content}
          </div>
          
          ${item.location ? `
            <div class="hi-feed-item-location">
              📍 ${item.location}
            </div>
          ` : ''}
        </div>
      `;
    } else if (item.type === 'streak') {
      return `
        <div class="hi-feed-item hi-feed-streak" data-id="${item.id}">
          <div class="hi-feed-item-header">
            <div class="hi-feed-item-type">
              <span class="hi-streak-badge">
                🔥 ${item.streakType} streak
              </span>
            </div>
            <div class="hi-feed-item-time">${timeAgo}</div>
          </div>
          
          <div class="hi-feed-item-content">
            <div class="hi-streak-content">
              <div class="hi-streak-current">${item.content}</div>
              <div class="hi-streak-progress">
                Current: ${item.currentCount} days | Best: ${item.longestStreak} days
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    return '';
  }

  /**
   * Render load more button
   */
  renderLoadMoreButton() {
    return `
      <div class="hi-feed-load-more">
        <button class="hi-btn hi-btn-secondary hi-load-more-btn" ${this.isLoading ? 'disabled' : ''}>
          ${this.isLoading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    `;
  }

  /**
   * Render loading state
   */
  renderLoadingState() {
    this.container.innerHTML = `
      <div class="hi-feed-loading">
        <div class="hi-spinner"></div>
        <p>Loading your feed...</p>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState(message) {
    this.container.innerHTML = `
      <div class="hi-feed-empty">
        <div class="hi-feed-empty-icon">📱</div>
        <h3>Your Feed Awaits</h3>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  renderErrorState(message) {
    this.container.innerHTML = `
      <div class="hi-feed-error">
        <div class="hi-feed-error-icon">⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p>${message}</p>
        <button class="hi-btn hi-btn-primary hi-retry-btn">Try Again</button>
      </div>
    `;
  }

  /**
   * Bind component events
   */
  bindEvents() {
    // Will be bound after render
  }

  /**
   * Bind feed-specific events
   */
  bindFeedEvents() {
    // Load more button
    const loadMoreBtn = this.container.querySelector('.hi-load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMore());
    }

    // Retry button (error state)
    const retryBtn = this.container.querySelector('.hi-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.initialize());
    }

    // Feed item interactions
    const feedItems = this.container.querySelectorAll('.hi-feed-item');
    feedItems.forEach(item => {
      item.addEventListener('click', (e) => this.handleItemClick(e, item));
    });
  }

  /**
   * Load more items
   */
  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.currentPage++;
    await this.loadFeedData(true);
  }

  /**
   * Handle feed item click
   */
  handleItemClick(event, item) {
    const itemId = item.dataset.id;
    const feedItem = this.feedItems.find(item => item.id === itemId);
    
    if (feedItem) {
      console.log('Feed item clicked:', feedItem);
      // TODO: Implement item detail view or actions
    }
  }

  /**
   * Utility functions
   */
  async getCurrentUserId() {
    // Try to get from window.userAuthenticated first
    if (window.userAuthenticated && window.currentUserId) {
      return window.currentUserId;
    }
    
    // Fallback to demo user for development
    return 'demo-user-' + Date.now();
  }

  async getAuthToken() {
    // Placeholder for auth token retrieval
    return localStorage.getItem('hi_auth_token') || 'demo-token';
  }

  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  getEmotionEmoji(emotion) {
    const emojis = {
      grateful: '🙏',
      peaceful: '😌',
      joyful: '😊',
      excited: '🤩',
      content: '😊',
      reflective: '🤔',
      hopeful: '🌟'
    };
    return emojis[emotion] || '💫';
  }
}

// CSS Styles for HiFeed Component
const hiFeedStyles = `
  <style>
    .hi-feed {
      max-width: 600px;
      margin: 0 auto;
      padding: var(--spacing-md);
    }

    .hi-feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-sm);
      border-bottom: 2px solid var(--color-border-light);
    }

    .hi-feed-header h2 {
      margin: 0;
      color: var(--color-text-primary);
      font-size: var(--font-size-xl);
    }

    .hi-feed-stats {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .hi-feed-items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .hi-feed-item {
      background: var(--color-surface);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-md);
      border: 1px solid var(--color-border-light);
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .hi-feed-item:hover {
      border-color: var(--color-primary-light);
      box-shadow: 0 2px 8px var(--color-shadow-light);
    }

    .hi-feed-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);
    }

    .hi-emotion-badge, .hi-streak-badge {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius-full);
      font-size: var(--font-size-sm);
      font-weight: 500;
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
    }

    .hi-feed-item-time {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .hi-feed-item-content {
      margin-bottom: var(--spacing-sm);
      line-height: 1.5;
    }

    .hi-feed-item-location {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .hi-streak-content .hi-streak-current {
      font-weight: 600;
      margin-bottom: var(--spacing-xs);
    }

    .hi-streak-progress {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .hi-feed-load-more {
      text-align: center;
      margin-top: var(--spacing-lg);
    }

    .hi-feed-loading, .hi-feed-empty, .hi-feed-error {
      text-align: center;
      padding: var(--spacing-xl);
    }

    .hi-feed-empty-icon, .hi-feed-error-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }

    .hi-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border-light);
      border-top: 3px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto var(--spacing-md);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
`;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HiFeed;
} else {
  // Browser global
  window.HiFeed = HiFeed;
}

// Add styles to document if in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('#hi-feed-styles')) {
      const styleElement = document.createElement('div');
      styleElement.id = 'hi-feed-styles';
      styleElement.innerHTML = hiFeedStyles;
      document.head.appendChild(styleElement.querySelector('style'));
    }
  });
}