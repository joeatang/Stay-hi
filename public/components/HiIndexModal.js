/**
 * 🌟 HiIndexModal.js — Full Hi Index Stats Modal
 * 
 * Shows personal Hi journey: trajectory chart, 30-day history, percentile.
 * Opens from HiIndexCard tap.
 * 
 * TIER-GATING:
 * - Free: Community stats only
 * - Paid: Personal + Community with breakdown
 * - Gold+: Deep analytics + percentile rank
 */

(function() {
  'use strict';

  // Tier access levels (matches HiIndexCard.js)
  // COMPREHENSIVE: All 6 official tiers + legacy/edge cases
  const TIER_ACCESS = {
    // === FREE TIERS (No personal stats) ===
    'free': { personalStats: false, trends: false, deepAnalytics: false },
    'anonymous': { personalStats: false, trends: false, deepAnalytics: false },
    'starter': { personalStats: false, trends: false, deepAnalytics: false },     // Legacy SQL value
    '24hr': { personalStats: false, trends: false, deepAnalytics: false },         // Legacy 24-hour access
    'trial': { personalStats: false, trends: false, deepAnalytics: false },        // Trial (handled by TrialManager → maps to real tier)
    
    // === PAID TIERS (Personal stats + trends) ===
    'bronze': { personalStats: true, trends: true, deepAnalytics: false },
    'silver': { personalStats: true, trends: true, deepAnalytics: false },
    
    // === PREMIUM TIERS (Deep analytics) ===
    'gold': { personalStats: true, trends: true, deepAnalytics: true },
    'premium': { personalStats: true, trends: true, deepAnalytics: true },
    'collective': { personalStats: true, trends: true, deepAnalytics: true }
  };

  // Get current user's tier (bulletproof detection)
  function getUserTier() {
    // 1. Try ProfileManager (most reliable if available)
    if (window.ProfileManager?.profile?.membership_tier) {
      const tier = window.ProfileManager.profile.membership_tier;
      // If trial, let TrialManager resolve effective tier
      if (tier === 'trial' && window.TrialManager?.getEffectiveTier) {
        return window.TrialManager.getEffectiveTier(window.ProfileManager.profile);
      }
      return tier;
    }
    // 2. Try HiMembership
    if (window.HiMembership?.membershipStatus?.tier) {
      const tier = window.HiMembership.membershipStatus.tier;
      if (tier === 'trial' && window.TrialManager?.getEffectiveTier) {
        return window.TrialManager.getEffectiveTier(window.HiMembership.membershipStatus);
      }
      return tier;
    }
    // 3. Check localStorage cache (set by AuthReady)
    try {
      const cached = localStorage.getItem('hi_membership_tier');
      if (cached && cached !== 'null' && cached !== 'undefined') return cached;
    } catch (e) {}
    // 4. Check HiBrandTiers current state (display utility but may have tier)
    if (window.HiBrandTiers?.currentTier) {
      return window.HiBrandTiers.currentTier;
    }
    // 5. Default to free (anonymous users)
    return 'free';
  }

  // Get tier access level (bulletproof normalization)
  function getTierAccess(tier) {
    // Normalize tier: lowercase, trim whitespace, handle nullish
    const normalized = (tier || 'free').toString().toLowerCase().trim();
    
    // Direct lookup first
    if (TIER_ACCESS[normalized]) {
      return TIER_ACCESS[normalized];
    }
    
    // Handle legacy/mapped values
    const TIER_MAP = {
      'standard': 'bronze',      // Legacy UI label
      'basic': 'bronze',         // Legacy
      'pro': 'premium',          // Legacy
      'unlimited': 'premium',    // Legacy
      'founder': 'collective',   // Special founder tier
      'admin': 'collective',     // Admin users get collective access
      'explorer': 'free',        // Display name mapping
      'pathfinder': 'bronze',    // Display name mapping
      'trailblazer': 'silver',   // Display name mapping
      'champion': 'gold',        // Display name mapping
      'pioneer': 'premium'       // Display name mapping
    };
    
    const mapped = TIER_MAP[normalized];
    if (mapped && TIER_ACCESS[mapped]) {
      return TIER_ACCESS[mapped];
    }
    
    // Ultimate fallback: free tier access
    return TIER_ACCESS['free'];
  }

  class HiIndexModal {
    constructor() {
      this.element = null;
      this.isOpen = false;
      this.data = null;
      this.chartCanvas = null;
    }

    /**
     * Open the modal
     */
    async open() {
      if (this.isOpen) return;
      
      // Create modal if first time
      if (!this.element) {
        this._createModal();
      }

      this.isOpen = true;
      this.element.classList.add('hi-index-modal--visible');
      document.body.style.overflow = 'hidden';
      
      // Trap focus
      this.element.querySelector('.hi-index-modal__close').focus();
      
      // Load data
      await this._loadData();

      // Announce to screen readers
      this._announce('Hi Index stats opened');
    }

    /**
     * Close the modal
     */
    close() {
      if (!this.isOpen) return;
      
      this.isOpen = false;
      this.element.classList.remove('hi-index-modal--visible');
      document.body.style.overflow = '';

      // Return focus to trigger
      const card = document.querySelector('.hi-index-card');
      if (card) card.focus();
    }

    /**
     * Create modal DOM structure
     */
    _createModal() {
      const modal = document.createElement('div');
      modal.className = 'hi-index-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'hiIndexModalTitle');
      
      modal.innerHTML = `
        <div class="hi-index-modal__backdrop"></div>
        <div class="hi-index-modal__container">
          <div class="hi-index-modal__header">
            <h2 id="hiIndexModalTitle" class="hi-index-modal__title">Your Hi Journey</h2>
            <button class="hi-index-modal__close" aria-label="Close modal">×</button>
          </div>
          <div class="hi-index-modal__body">
            <div class="hi-index-modal__loading">
              <div class="hi-index-modal__spinner"></div>
              <span>Loading your journey...</span>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.element = modal;

      // Event listeners
      modal.querySelector('.hi-index-modal__backdrop').addEventListener('click', () => this.close());
      modal.querySelector('.hi-index-modal__close').addEventListener('click', () => this.close());
      
      // Keyboard handling
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
    }

    /**
     * Load and display data
     */
    async _loadData() {
      const body = this.element.querySelector('.hi-index-modal__body');
      
      try {
        // Try to initialize HiIndex if not ready
        if (!window.hiIndexInstance) {
          const client = window.HiSupabase?.getClient?.() || window.hiSupabase || window.supabase;
          if (client && window.HiIndex) {
            window.hiIndexInstance = new window.HiIndex(client);
            console.log('[HiIndexModal] Created HiIndex instance on-demand');
          } else {
            throw new Error('Supabase client not available');
          }
        }

        // Load community + personal + history in parallel
        const [community, personal, communityHistory] = await Promise.all([
          window.hiIndexInstance.getCommunity(),
          window.hiIndexInstance.getPersonal(),
          window.hiIndexInstance.getHistory('community', 30)
        ]);

        this.data = { community, personal, history: communityHistory };
        body.innerHTML = this._getContentHTML(community, personal, communityHistory);
        
        // Render chart after DOM ready
        requestAnimationFrame(() => {
          this._renderChart(communityHistory.data);
        });

      } catch (err) {
        console.error('[HiIndexModal] Load failed:', err);
        body.innerHTML = this._getErrorHTML();
      }
    }

    /**
     * Generate main content HTML - TIER-GATED
     */
    _getContentHTML(community, personal, history) {
      // Show content if we have community data (always available)
      const hasData = community && !community.isEmpty;
      
      if (!hasData) {
        return this._getEmptyStateHTML();
      }

      const tier = getUserTier();
      const access = getTierAccess(tier);

      // FREE TIER: Community stats only
      if (!access.personalStats) {
        return this._getFreeContentHTML(community, history);
      }

      // PAID TIERS: Full personal + community view
      return this._getPaidContentHTML(community, personal, history, access);
    }

    /**
     * Free tier content: Community only
     */
    _getFreeContentHTML(community, history) {
      return `
        <!-- Community Wellness -->
        <div class="hi-index-modal__stats">
          <div class="hi-index-modal__stat hi-index-modal__stat--main">
            <span class="hi-index-modal__stat-value">${community.indexDisplay}</span>
            <span class="hi-index-modal__stat-label">Community Hi Index</span>
            <span class="hi-index-modal__stat-dots">${community.dots}</span>
          </div>
          
          <div class="hi-index-modal__stat-row">
            <div class="hi-index-modal__stat">
              <span class="hi-index-modal__stat-value">${community.shareCount || 0}</span>
              <span class="hi-index-modal__stat-label">Shares (7d)</span>
            </div>
            <div class="hi-index-modal__stat">
              <span class="hi-index-modal__stat-value">${community.tapCount || 0}</span>
              <span class="hi-index-modal__stat-label">Taps (7d)</span>
            </div>
          </div>
        </div>

        <!-- Level Label -->
        <div class="hi-index-modal__level">
          ${community.trendIcon} ${community.levelLabel}
        </div>

        <!-- 30-Day Community Chart -->
        <div class="hi-index-modal__chart-section">
          <h3 class="hi-index-modal__section-title">Community 30-Day Trend</h3>
          <div class="hi-index-modal__chart-container">
            <canvas id="hiIndexChart" width="320" height="160"></canvas>
          </div>
        </div>

        <!-- Upgrade CTA -->
        <div class="hi-index-modal__upgrade">
          <p>🔓 Upgrade to see your personal Hi Index and deeper analytics</p>
          <button class="hi-index-modal__upgrade-btn" onclick="window.location.href='/public/pricing.html'">
            View Plans
          </button>
        </div>

        <!-- Community Insight -->
        <div class="hi-index-modal__insight">
          ${this._getCommunityInsight(community)}
        </div>
      `;
    }

    /**
     * Paid tier content: Personal + Community
     */
    _getPaidContentHTML(community, personal, history, access) {
      const personalHasData = personal && !personal.isEmpty;
      const streak = personal?.streak || {};
      const hasStreakBonus = streak.hasBonus && streak.bonusPercent > 0;

      // Streak bonus section (for Bronze+)
      const streakBonusSection = access.trends ? `
        <!-- Streak Bonus Section -->
        <div class="hi-index-modal__streak-section ${hasStreakBonus ? 'hi-index-modal__streak-section--active' : ''}">
          <div class="hi-index-modal__streak-header">
            <span class="hi-index-modal__streak-icon">${hasStreakBonus ? '🔥' : '💪'}</span>
            <span class="hi-index-modal__streak-title">${streak.current || 0}-Day Streak</span>
            ${hasStreakBonus ? `<span class="hi-index-modal__streak-badge">${streak.bonusDisplay}</span>` : ''}
          </div>
          <div class="hi-index-modal__streak-body">
            <p class="hi-index-modal__streak-label">${streak.label || 'Build a 7-day streak for bonus!'}</p>
            ${streak.daysToNextTier !== null ? `
              <p class="hi-index-modal__streak-progress">${streak.nextTierMessage}</p>
            ` : ''}
            ${hasStreakBonus && personal.baseIndexDisplay ? `
              <p class="hi-index-modal__streak-math">Base: ${personal.baseIndexDisplay} × ${streak.multiplier}× = <strong>${personal.indexDisplay}</strong></p>
            ` : ''}
          </div>
        </div>
      ` : '';

      // Personal section
      const personalSection = personalHasData ? `
        <!-- Your Personal Stats -->
        <div class="hi-index-modal__section hi-index-modal__section--personal">
          <h3 class="hi-index-modal__section-title">Your Hi Journey</h3>
          <div class="hi-index-modal__stat-row hi-index-modal__stat-row--personal">
            <div class="hi-index-modal__stat">
              <span class="hi-index-modal__stat-value hi-index-modal__stat-value--gold">${personal.indexDisplay}</span>
              <span class="hi-index-modal__stat-label">Your Index ${hasStreakBonus ? `<span class="hi-index-modal__streak-indicator">🔥</span>` : ''}</span>
              <span class="hi-index-modal__stat-dots">${personal.dots}</span>
            </div>
            <div class="hi-index-modal__stat">
              <span class="hi-index-modal__stat-value ${personal.trend}">${personal.percentChangeDisplay}</span>
              <span class="hi-index-modal__stat-label">vs Yesterday</span>
            </div>
            ${access.deepAnalytics && personal.percentile ? `
              <div class="hi-index-modal__stat">
                <span class="hi-index-modal__stat-value">${personal.percentileDisplay}</span>
                <span class="hi-index-modal__stat-label">Rank</span>
              </div>
            ` : ''}
          </div>
          
          ${streakBonusSection}
          
          <!-- Activity Breakdown -->
          <div class="hi-index-modal__breakdown">
            <div class="hi-index-modal__breakdown-row">
              <div class="hi-index-modal__breakdown-item">
                <span class="hi-index-modal__breakdown-icon">🌊</span>
                <span class="hi-index-modal__breakdown-value">${personal.shareCount || 0}</span>
                <span class="hi-index-modal__breakdown-label">Shares</span>
              </div>
              <div class="hi-index-modal__breakdown-item">
                <span class="hi-index-modal__breakdown-icon">👆</span>
                <span class="hi-index-modal__breakdown-value">${personal.tapCount || 0}</span>
                <span class="hi-index-modal__breakdown-label">Taps</span>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <!-- Start Journey CTA -->
        <div class="hi-index-modal__cta">
          <p>Share or tap to start building your personal Hi Index!</p>
        </div>
      `;

      return `
        ${personalSection}

        <!-- Community Wellness -->
        <div class="hi-index-modal__stats">
          <div class="hi-index-modal__stat hi-index-modal__stat--main">
            <span class="hi-index-modal__stat-value">${community.indexDisplay}</span>
            <span class="hi-index-modal__stat-label">Community Hi Index</span>
            <span class="hi-index-modal__stat-dots">${community.dots}</span>
          </div>
          
          <div class="hi-index-modal__stat-row">
            <div class="hi-index-modal__stat">
              <span class="hi-index-modal__stat-value ${community.trend}">${community.percentChangeDisplay}</span>
              <span class="hi-index-modal__stat-label">vs Yesterday</span>
            </div>
            <div class="hi-index-modal__stat">
              <span class="hi-index-modal__stat-value">${community.shareCount || 0}</span>
              <span class="hi-index-modal__stat-label">Shares (7d)</span>
            </div>
          </div>
        </div>

        <!-- Level Label -->
        <div class="hi-index-modal__level">
          ${community.trendIcon} ${community.levelLabel}
        </div>

        <!-- 30-Day Community Chart -->
        <div class="hi-index-modal__chart-section">
          <h3 class="hi-index-modal__section-title">Community 30-Day Trend</h3>
          <div class="hi-index-modal__chart-container">
            <canvas id="hiIndexChart" width="320" height="160" aria-label="Hi Index chart showing last 30 days"></canvas>
          </div>
          <div class="hi-index-modal__chart-legend">
            <span class="hi-index-modal__legend-item">
              <span class="hi-index-modal__legend-dot"></span>
              Daily Hi Index
            </span>
          </div>
        </div>

        <!-- Community Insight -->
        <div class="hi-index-modal__insight">
          ${this._getCommunityInsight(community)}
        </div>
      `;
    }

    /**
     * Get community insight message
     */
    _getCommunityInsight(community) {
      if (community.trend === 'up') {
        return '✨ The community is thriving! Keep spreading Hi energy.';
      } else if (community.trend === 'down') {
        return '🌱 Every Hi counts — share some positivity today!';
      }
      return '⚡ Steady vibes in the Hi community.';
    }

    /**
     * Empty state HTML
     */
    _getEmptyStateHTML() {
      return `
        <div class="hi-index-modal__empty">
          <div class="hi-index-modal__empty-icon">✨</div>
          <h3 class="hi-index-modal__empty-title">Start Your Hi Journey</h3>
          <p class="hi-index-modal__empty-text">
            Share a Hi Wave or tap on others' shares to begin building your personal Hi Index.
          </p>
          <p class="hi-index-modal__empty-hint">
            Your Hi Index reflects your 7-day engagement pattern on a scale of 1-5.
          </p>
        </div>
      `;
    }

    /**
     * Error state HTML
     */
    _getErrorHTML() {
      return `
        <div class="hi-index-modal__error">
          <span class="hi-index-modal__error-icon">⚠️</span>
          <p>Could not load your Hi stats.</p>
          <button class="hi-index-modal__retry" onclick="window.HiIndexModal.open()">Try Again</button>
        </div>
      `;
    }

    /**
     * Generate personalized insight
     */
    _getInsight(personal) {
      if (personal.trend === 'up') {
        return `<span class="hi-index-modal__insight-icon">🌟</span> Hi Inspiration! Your Hi energy is growing.`;
      } else if (personal.trend === 'down') {
        return `<span class="hi-index-modal__insight-icon">💫</span> Hi Opportunity! Share a wave to boost your index.`;
      } else if (personal.index >= 4) {
        return `<span class="hi-index-modal__insight-icon">🔥</span> Amazing! You're in a high Hi state.`;
      } else if (personal.index >= 3) {
        return `<span class="hi-index-modal__insight-icon">⚡</span> Solid Hi momentum! Keep the waves coming.`;
      } else {
        return `<span class="hi-index-modal__insight-icon">🌱</span> Every Hi counts. Your journey is uniquely yours.`;
      }
    }

    /**
     * Render 30-day chart using Canvas
     */
    _renderChart(history) {
      const canvas = document.getElementById('hiIndexChart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear
      ctx.clearRect(0, 0, width, height);

      if (!history || history.length === 0) {
        this._renderEmptyChart(ctx, width, height);
        return;
      }

      // Prepare data (ensure 30 days, fill gaps with null)
      const data = this._prepareChartData(history);
      
      // Chart dimensions
      const padding = { top: 20, right: 20, bottom: 30, left: 35 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Scale
      const maxIndex = 5;
      const minIndex = 1;
      const xStep = chartWidth / (data.length - 1);
      const yScale = chartHeight / (maxIndex - minIndex);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      for (let i = 1; i <= 5; i++) {
        const y = padding.top + chartHeight - (i - minIndex) * yScale;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      // Y-axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      
      for (let i = 1; i <= 5; i++) {
        const y = padding.top + chartHeight - (i - minIndex) * yScale;
        ctx.fillText(i.toString(), padding.left - 8, y + 3);
      }

      // X-axis labels (every 7 days)
      ctx.textAlign = 'center';
      const today = new Date();
      
      [0, 7, 14, 21, 29].forEach(dayOffset => {
        if (dayOffset < data.length) {
          const x = padding.left + (data.length - 1 - dayOffset) * xStep;
          const label = dayOffset === 0 ? 'Today' : `-${dayOffset}d`;
          ctx.fillText(label, x, height - 8);
        }
      });

      // Line path
      ctx.beginPath();
      ctx.strokeStyle = '#FFD166';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let started = false;
      data.forEach((point, i) => {
        if (point !== null) {
          const x = padding.left + i * xStep;
          const y = padding.top + chartHeight - (point - minIndex) * yScale;
          
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(255, 209, 102, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 209, 102, 0.02)');

      ctx.beginPath();
      started = false;
      let lastValidX = padding.left;
      
      data.forEach((point, i) => {
        if (point !== null) {
          const x = padding.left + i * xStep;
          const y = padding.top + chartHeight - (point - minIndex) * yScale;
          
          if (!started) {
            ctx.moveTo(x, padding.top + chartHeight);
            ctx.lineTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
          lastValidX = x;
        }
      });
      
      ctx.lineTo(lastValidX, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Data points
      data.forEach((point, i) => {
        if (point !== null) {
          const x = padding.left + i * xStep;
          const y = padding.top + chartHeight - (point - minIndex) * yScale;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#FFD166';
          ctx.fill();
        }
      });
    }

    /**
     * Prepare chart data array (30 days)
     */
    _prepareChartData(history) {
      const data = new Array(30).fill(null);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      history.forEach(entry => {
        const entryDate = new Date(entry.snapshot_date);
        entryDate.setHours(0, 0, 0, 0);
        const daysAgo = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
        
        if (daysAgo >= 0 && daysAgo < 30) {
          data[29 - daysAgo] = entry.personal_index;
        }
      });

      return data;
    }

    /**
     * Render empty chart placeholder
     */
    _renderEmptyChart(ctx, width, height) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No chart data yet', width / 2, height / 2);
    }

    /**
     * Announce to screen readers
     */
    _announce(message) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'sr-only';
      announcer.textContent = message;
      document.body.appendChild(announcer);
      setTimeout(() => announcer.remove(), 1000);
    }
  }

  // CSS injection
  const styles = `
    .hi-index-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .hi-index-modal--visible {
      pointer-events: auto;
      opacity: 1;
    }

    .hi-index-modal__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }

    .hi-index-modal__container {
      position: relative;
      width: 100%;
      max-width: 420px;
      max-height: 85vh;
      background: linear-gradient(180deg, 
        rgba(30, 30, 45, 0.98) 0%,
        rgba(20, 20, 30, 0.99) 100%
      );
      border-radius: 24px 24px 0 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .hi-index-modal--visible .hi-index-modal__container {
      transform: translateY(0);
    }

    .hi-index-modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .hi-index-modal__title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .hi-index-modal__close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .hi-index-modal__close:hover,
    .hi-index-modal__close:focus {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      outline: none;
    }

    .hi-index-modal__body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px 32px;
      -webkit-overflow-scrolling: touch;
    }

    /* Loading */
    .hi-index-modal__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 0;
      color: rgba(255, 255, 255, 0.6);
    }

    .hi-index-modal__spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 209, 102, 0.2);
      border-top-color: #FFD166;
      border-radius: 50%;
      animation: hiIndexSpin 0.8s linear infinite;
    }

    @keyframes hiIndexSpin {
      to { transform: rotate(360deg); }
    }

    /* Stats */
    .hi-index-modal__stats {
      text-align: center;
      margin-bottom: 16px;
    }

    .hi-index-modal__stat--main {
      margin-bottom: 20px;
    }

    .hi-index-modal__stat--main .hi-index-modal__stat-value {
      font-size: 48px;
      font-weight: 700;
      color: #FFD166;
      display: block;
      line-height: 1.1;
    }

    .hi-index-modal__stat--main .hi-index-modal__stat-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 8px;
    }

    .hi-index-modal__stat-dots {
      font-size: 14px;
      letter-spacing: 4px;
      color: #FFD166;
      display: block;
      margin-top: 8px;
    }

    .hi-index-modal__stat-row {
      display: flex;
      justify-content: center;
      gap: 32px;
    }

    .hi-index-modal__stat-value {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      display: block;
    }

    .hi-index-modal__stat-value.up {
      color: #10B981;
    }

    .hi-index-modal__stat-value.down {
      color: #F59E0B;
    }

    .hi-index-modal__stat-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Level */
    .hi-index-modal__level {
      text-align: center;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      padding: 12px 16px;
      background: rgba(255, 209, 102, 0.1);
      border-radius: 12px;
      margin-bottom: 24px;
    }

    /* Chart */
    .hi-index-modal__chart-section {
      margin-bottom: 24px;
    }

    .hi-index-modal__section-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
    }

    .hi-index-modal__chart-container {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      padding: 12px;
      overflow: hidden;
    }

    #hiIndexChart {
      width: 100%;
      height: auto;
      display: block;
    }

    .hi-index-modal__chart-legend {
      display: flex;
      justify-content: center;
      margin-top: 8px;
    }

    .hi-index-modal__legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .hi-index-modal__legend-dot {
      width: 8px;
      height: 8px;
      background: #FFD166;
      border-radius: 50%;
    }

    /* Breakdown */
    .hi-index-modal__breakdown {
      margin-bottom: 24px;
    }

    .hi-index-modal__breakdown-row {
      display: flex;
      justify-content: center;
      gap: 24px;
    }

    .hi-index-modal__breakdown-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      min-width: 100px;
    }

    .hi-index-modal__breakdown-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .hi-index-modal__breakdown-value {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }

    .hi-index-modal__breakdown-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Insight */
    .hi-index-modal__insight {
      text-align: center;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      padding: 16px;
      background: linear-gradient(135deg, 
        rgba(99, 102, 241, 0.1) 0%,
        rgba(255, 209, 102, 0.1) 100%
      );
      border-radius: 12px;
    }

    .hi-index-modal__insight-icon {
      font-size: 16px;
      margin-right: 4px;
    }

    /* Empty state */
    .hi-index-modal__empty {
      text-align: center;
      padding: 32px 16px;
    }

    .hi-index-modal__empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .hi-index-modal__empty-title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 12px 0;
    }

    .hi-index-modal__empty-text {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .hi-index-modal__empty-hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }

    /* Error */
    .hi-index-modal__error {
      text-align: center;
      padding: 32px 16px;
      color: rgba(255, 255, 255, 0.7);
    }

    .hi-index-modal__error-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 16px;
    }

    .hi-index-modal__retry {
      margin-top: 16px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      background: rgba(255, 209, 102, 0.2);
      border: 1px solid rgba(255, 209, 102, 0.3);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .hi-index-modal__retry:hover {
      background: rgba(255, 209, 102, 0.3);
    }

    /* Screen reader only */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Desktop adjustments */
    @media (min-width: 600px) {
      .hi-index-modal {
        align-items: center;
      }

      .hi-index-modal__container {
        border-radius: 24px;
        max-height: 80vh;
        transform: translateY(20px) scale(0.95);
        opacity: 0;
      }

      .hi-index-modal--visible .hi-index-modal__container {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create singleton
  const instance = new HiIndexModal();
  
  // Export
  window.HiIndexModal = instance;

  console.log('[HiIndexModal] Module loaded');
})();
