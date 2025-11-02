/**
 * HiStreaks Component
 * 
 * Simple streak visualization prototype for displaying user streak data.
 * Shows current streaks, progress indicators, and achievement milestones.
 * 
 * Usage:
 *   const hiStreaks = new HiStreaks('#streaks-container');
 *   await hiStreaks.initialize();
 */

class HiStreaks {
  constructor(container) {
    this.container = typeof container === 'string' ? 
      document.querySelector(container) : container;
    
    if (!this.container) {
      throw new Error('HiStreaks: Container element not found');
    }

    this.userId = null;
    this.streaks = [];
    this.isLoading = false;
  }

  /**
   * Initialize the streaks component
   */
  async initialize() {
    try {
      // Get current user ID
      this.userId = await this.getCurrentUserId();
      if (!this.userId) {
        this.renderEmptyState('Please log in to view your streaks');
        return;
      }

      // Render loading state
      this.renderLoadingState();
      
      // Load streak data
      await this.loadStreakData();
      
    } catch (error) {
      console.error('HiStreaks initialization error:', error);
      this.renderErrorState('Failed to load streaks');
    }
  }

  /**
   * Load streak data from HiBase
   */
  async loadStreakData() {
    this.isLoading = true;
    
    try {
      // Try to load from HiBase API
      const response = await fetch('/api/hibase/streaks/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          userId: this.userId
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      this.streaks = result.data || [];
      this.renderStreaks();
      
    } catch (error) {
      console.error('HiStreaks load error:', error);
      // Fallback to demo data for development
      this.loadDemoData();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load demo streak data for development/testing
   */
  loadDemoData() {
    this.streaks = [
      {
        id: 'streak_1',
        type: 'mindfulness',
        current_count: 7,
        longest_streak: 12,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        target_days: 30
      },
      {
        id: 'streak_2', 
        type: 'sharing',
        current_count: 3,
        longest_streak: 8,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        target_days: 14
      },
      {
        id: 'streak_3',
        type: 'gratitude',
        current_count: 0,
        longest_streak: 5,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 21
      }
    ];
    
    this.renderStreaks();
  }

  /**
   * Render all streaks
   */
  renderStreaks() {
    if (!this.streaks.length) {
      this.renderEmptyState('Start your first streak today! 🔥');
      return;
    }

    const activeStreaks = this.streaks.filter(s => s.current_count > 0);
    const inactiveStreaks = this.streaks.filter(s => s.current_count === 0);

    const streaksHTML = `
      <div class="hi-streaks">
        <div class="hi-streaks-header">
          <h2>Your Streaks</h2>
          <div class="hi-streaks-summary">
            ${activeStreaks.length} active • ${this.getTotalDays()} total days
          </div>
        </div>
        
        ${activeStreaks.length > 0 ? `
          <div class="hi-streaks-section">
            <h3>🔥 Active Streaks</h3>
            <div class="hi-streaks-grid">
              ${activeStreaks.map(streak => this.renderStreakCard(streak)).join('')}
            </div>
          </div>
        ` : ''}
        
        ${inactiveStreaks.length > 0 ? `
          <div class="hi-streaks-section">
            <h3>💤 Ready to Restart</h3>
            <div class="hi-streaks-grid">
              ${inactiveStreaks.map(streak => this.renderStreakCard(streak)).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="hi-streaks-section">
          <h3>📊 Progress Overview</h3>
          <div class="hi-streaks-overview">
            ${this.renderProgressOverview()}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = streaksHTML;
    this.bindStreakEvents();
  }

  /**
   * Render individual streak card
   */
  renderStreakCard(streak) {
    const isActive = streak.current_count > 0;
    const progress = streak.target_days ? (streak.current_count / streak.target_days) * 100 : 0;
    const streakEmoji = this.getStreakEmoji(streak.type);
    
    return `
      <div class="hi-streak-card ${isActive ? 'active' : 'inactive'}" data-id="${streak.id}">
        <div class="hi-streak-card-header">
          <div class="hi-streak-type">
            <span class="hi-streak-emoji">${streakEmoji}</span>
            <span class="hi-streak-name">${this.formatStreakType(streak.type)}</span>
          </div>
          ${isActive ? '<div class="hi-streak-fire">🔥</div>' : ''}
        </div>
        
        <div class="hi-streak-count">
          <span class="hi-streak-current">${streak.current_count}</span>
          <span class="hi-streak-label">day${streak.current_count !== 1 ? 's' : ''}</span>
        </div>
        
        ${streak.target_days ? `
          <div class="hi-streak-progress">
            <div class="hi-progress-bar">
              <div class="hi-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
            <div class="hi-progress-text">${streak.current_count}/${streak.target_days} days</div>
          </div>
        ` : ''}
        
        <div class="hi-streak-stats">
          <div class="hi-streak-stat">
            <span class="hi-stat-label">Best</span>
            <span class="hi-stat-value">${streak.longest_streak} days</span>
          </div>
          <div class="hi-streak-stat">
            <span class="hi-stat-label">Started</span>
            <span class="hi-stat-value">${this.getDateAgo(streak.created_at)}</span>
          </div>
        </div>
        
        <div class="hi-streak-actions">
          ${isActive ? 
            '<button class="hi-btn hi-btn-sm hi-btn-primary hi-continue-streak">Continue Streak</button>' :
            '<button class="hi-btn hi-btn-sm hi-btn-secondary hi-restart-streak">Restart</button>'
          }
        </div>
      </div>
    `;
  }

  /**
   * Render progress overview chart
   */
  renderProgressOverview() {
    const totalDays = this.getTotalDays();
    const longestStreak = Math.max(...this.streaks.map(s => s.longest_streak));
    const activeCount = this.streaks.filter(s => s.current_count > 0).length;
    
    return `
      <div class="hi-overview-stats">
        <div class="hi-overview-stat">
          <div class="hi-overview-number">${totalDays}</div>
          <div class="hi-overview-label">Total Days</div>
        </div>
        <div class="hi-overview-stat">
          <div class="hi-overview-number">${longestStreak}</div>
          <div class="hi-overview-label">Longest Streak</div>
        </div>
        <div class="hi-overview-stat">
          <div class="hi-overview-number">${activeCount}</div>
          <div class="hi-overview-label">Active Streaks</div>
        </div>
      </div>
      
      <div class="hi-streak-calendar">
        ${this.renderStreakCalendar()}
      </div>
    `;
  }

  /**
   * Render simple streak calendar (last 7 days)
   */
  renderStreakCalendar() {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const hasActivity = this.streaks.some(streak => {
        const streakDate = new Date(streak.updated_at);
        return streakDate.toDateString() === date.toDateString() && streak.current_count > 0;
      });
      
      days.push(`
        <div class="hi-calendar-day ${hasActivity ? 'active' : ''}">
          <div class="hi-day-number">${date.getDate()}</div>
          <div class="hi-day-dot ${hasActivity ? 'filled' : ''}"></div>
        </div>
      `);
    }
    
    return `
      <div class="hi-calendar-header">Last 7 Days</div>
      <div class="hi-calendar-grid">
        ${days.join('')}
      </div>
    `;
  }

  /**
   * Render loading state
   */
  renderLoadingState() {
    this.container.innerHTML = `
      <div class="hi-streaks-loading">
        <div class="hi-spinner"></div>
        <p>Loading your streaks...</p>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState(message) {
    this.container.innerHTML = `
      <div class="hi-streaks-empty">
        <div class="hi-streaks-empty-icon">🔥</div>
        <h3>Ready to Build Streaks?</h3>
        <p>${message}</p>
        <button class="hi-btn hi-btn-primary hi-start-streak">Start Your First Streak</button>
      </div>
    `;
  }

  /**
   * Render error state
   */
  renderErrorState(message) {
    this.container.innerHTML = `
      <div class="hi-streaks-error">
        <div class="hi-streaks-error-icon">⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p>${message}</p>
        <button class="hi-btn hi-btn-primary hi-retry-btn">Try Again</button>
      </div>
    `;
  }

  /**
   * Bind streak events
   */
  bindStreakEvents() {
    // Continue streak buttons
    const continueButtons = this.container.querySelectorAll('.hi-continue-streak');
    continueButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleContinueStreak(e));
    });

    // Restart streak buttons
    const restartButtons = this.container.querySelectorAll('.hi-restart-streak');
    restartButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleRestartStreak(e));
    });

    // Start streak button (empty state)
    const startBtn = this.container.querySelector('.hi-start-streak');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.handleStartStreak());
    }

    // Retry button (error state)
    const retryBtn = this.container.querySelector('.hi-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.initialize());
    }
  }

  /**
   * Handle continue streak action
   */
  handleContinueStreak(event) {
    const card = event.target.closest('.hi-streak-card');
    const streakId = card.dataset.id;
    console.log('Continue streak:', streakId);
    // TODO: Implement continue streak logic
  }

  /**
   * Handle restart streak action
   */
  handleRestartStreak(event) {
    const card = event.target.closest('.hi-streak-card');
    const streakId = card.dataset.id;
    console.log('Restart streak:', streakId);
    // TODO: Implement restart streak logic
  }

  /**
   * Handle start new streak
   */
  handleStartStreak() {
    console.log('Start new streak');
    // TODO: Implement start streak flow
  }

  /**
   * Utility functions
   */
  async getCurrentUserId() {
    if (window.userAuthenticated && window.currentUserId) {
      return window.currentUserId;
    }
    return 'demo-user-' + Date.now();
  }

  async getAuthToken() {
    return localStorage.getItem('hi_auth_token') || 'demo-token';
  }

  getTotalDays() {
    return this.streaks.reduce((total, streak) => total + streak.current_count, 0);
  }

  getStreakEmoji(type) {
    const emojis = {
      mindfulness: '🧘',
      sharing: '💫',
      gratitude: '🙏',
      exercise: '💪',
      meditation: '🕯️',
      journaling: '📝'
    };
    return emojis[type] || '⭐';
  }

  formatStreakType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getDateAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  }
}

// CSS Styles for HiStreaks Component
const hiStreaksStyles = `
  <style>
    .hi-streaks {
      max-width: 800px;
      margin: 0 auto;
      padding: var(--spacing-md);
    }

    .hi-streaks-header {
      text-align: center;
      margin-bottom: var(--spacing-xl);
    }

    .hi-streaks-header h2 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--color-text-primary);
    }

    .hi-streaks-summary {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .hi-streaks-section {
      margin-bottom: var(--spacing-xl);
    }

    .hi-streaks-section h3 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--color-text-primary);
    }

    .hi-streaks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
    }

    .hi-streak-card {
      background: var(--color-surface);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-md);
      border: 2px solid var(--color-border-light);
      transition: all 0.3s ease;
    }

    .hi-streak-card.active {
      border-color: var(--color-primary);
      background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-primary-light) 100%);
    }

    .hi-streak-card.inactive {
      opacity: 0.7;
    }

    .hi-streak-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .hi-streak-type {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .hi-streak-emoji {
      font-size: 24px;
    }

    .hi-streak-name {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .hi-streak-fire {
      font-size: 20px;
      animation: flicker 2s ease-in-out infinite alternate;
    }

    @keyframes flicker {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0.8; transform: scale(1.1); }
    }

    .hi-streak-count {
      text-align: center;
      margin-bottom: var(--spacing-md);
    }

    .hi-streak-current {
      font-size: 48px;
      font-weight: bold;
      color: var(--color-primary);
    }

    .hi-streak-label {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
    }

    .hi-streak-progress {
      margin-bottom: var(--spacing-md);
    }

    .hi-progress-bar {
      height: 8px;
      background: var(--color-border-light);
      border-radius: var(--border-radius-full);
      overflow: hidden;
      margin-bottom: var(--spacing-xs);
    }

    .hi-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
      transition: width 0.3s ease;
    }

    .hi-progress-text {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      text-align: center;
    }

    .hi-streak-stats {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
      padding: var(--spacing-sm);
      background: var(--color-background);
      border-radius: var(--border-radius-md);
    }

    .hi-streak-stat {
      text-align: center;
    }

    .hi-stat-label {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .hi-stat-value {
      display: block;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .hi-streak-actions {
      text-align: center;
    }

    .hi-overview-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .hi-overview-stat {
      text-align: center;
      padding: var(--spacing-md);
      background: var(--color-surface);
      border-radius: var(--border-radius-lg);
    }

    .hi-overview-number {
      font-size: 32px;
      font-weight: bold;
      color: var(--color-primary);
    }

    .hi-overview-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
    }

    .hi-streak-calendar {
      background: var(--color-surface);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-md);
    }

    .hi-calendar-header {
      text-align: center;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
      color: var(--color-text-primary);
    }

    .hi-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: var(--spacing-sm);
    }

    .hi-calendar-day {
      text-align: center;
      padding: var(--spacing-xs);
    }

    .hi-day-number {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .hi-day-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin: var(--spacing-xs) auto 0;
      background: var(--color-border-light);
    }

    .hi-day-dot.filled {
      background: var(--color-primary);
    }

    .hi-streaks-loading, .hi-streaks-empty, .hi-streaks-error {
      text-align: center;
      padding: var(--spacing-xl);
    }

    .hi-streaks-empty-icon, .hi-streaks-error-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }
  </style>
`;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HiStreaks;
} else {
  // Browser global
  window.HiStreaks = HiStreaks;
}

// Add styles to document if in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('#hi-streaks-styles')) {
      const styleElement = document.createElement('div');
      styleElement.id = 'hi-streaks-styles';
      styleElement.innerHTML = hiStreaksStyles;
      document.head.appendChild(styleElement.querySelector('style'));
    }
  });
}