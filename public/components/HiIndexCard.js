/**
 * 🌟 HiIndexCard.js — Dashboard Trigger Card
 * 
 * Compact card that displays current Hi Index and opens modal on tap.
 * Injects into dashboard below global stats.
 * 
 * TIER-GATING:
 * - Free tier: Global stats dots only
 * - Paid tiers: Personal + Global side-by-side with trends
 */

(function() {
  'use strict';

  // Tier access levels for Hi Index features
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

  class HiIndexCard {
    constructor(options = {}) {
      this.containerId = options.containerId || 'hiIndexCardContainer';
      this.onTap = options.onTap || (() => window.HiIndexModal?.open());
      this.element = null;
      this.data = null;
    }

    /**
     * Initialize and inject card into dashboard
     */
    async init() {
      // Create container if not exists
      let container = document.getElementById(this.containerId);
      if (!container) {
        container = this._createContainer();
        if (!container) {
          console.warn('[HiIndexCard] Could not find injection point');
          return;
        }
      }

      // Show loading state
      this._render({ loading: true });

      // Load data - COMMUNITY first (always has data), then personal
      try {
        if (window.hiIndexInstance) {
          const [community, personal] = await Promise.all([
            window.hiIndexInstance.getCommunity(),
            window.hiIndexInstance.getPersonal()
          ]);
          this.data = { community, personal };
          this._render(this.data);
        } else {
          // Wait for HiIndex to initialize
          this._waitForHiIndex();
        }
      } catch (err) {
        console.error('[HiIndexCard] Failed to load:', err);
        this._render({ error: true });
      }
    }

    /**
     * Create container and inject after global stats
     */
    _createContainer() {
      // Find global stats container
      const globalStats = document.querySelector('.global-stats-container');
      if (!globalStats) {
        console.warn('[HiIndexCard] No .global-stats-container found');
        return null;
      }

      const container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'hi-index-card-wrapper';
      
      // Insert after global stats
      globalStats.parentNode.insertBefore(container, globalStats.nextSibling);
      
      return container;
    }

    /**
     * Render card content
     */
    _render(data) {
      const container = document.getElementById(this.containerId);
      if (!container) return;

      if (data.loading) {
        container.innerHTML = this._getLoadingHTML();
        return;
      }

      if (data.error) {
        container.innerHTML = this._getErrorHTML();
        return;
      }

      // Check if BOTH community and personal are empty (very rare)
      const community = data.community || data;
      if (community.isEmpty && (!data.personal || data.personal.isEmpty)) {
        container.innerHTML = this._getEmptyHTML();
        this._attachListeners(container);
        return;
      }

      container.innerHTML = this._getCardHTML(data);
      this._attachListeners(container);
    }

    /**
     * Loading state HTML
     */
    _getLoadingHTML() {
      return `
        <div class="hi-index-card hi-index-card--loading" aria-busy="true">
          <div class="hi-index-card__shimmer"></div>
        </div>
      `;
    }

    /**
     * Error state HTML
     */
    _getErrorHTML() {
      return `
        <div class="hi-index-card hi-index-card--error" role="button" tabindex="0" aria-label="Retry loading Hi Index">
          <span class="hi-index-card__icon">⚠️</span>
          <span class="hi-index-card__text">Tap to retry</span>
        </div>
      `;
    }

    /**
     * Empty state HTML (new user)
     */
    _getEmptyHTML() {
      return `
        <div class="hi-index-card hi-index-card--empty" role="button" tabindex="0" aria-label="Start your Hi journey">
          <span class="hi-index-card__icon">✨</span>
          <div class="hi-index-card__content">
            <span class="hi-index-card__title">Your Hi Index</span>
            <span class="hi-index-card__subtitle">Share or tap to begin your journey</span>
          </div>
          <span class="hi-index-card__chevron">›</span>
        </div>
      `;
    }

    /**
     * Main card HTML - Shows COMMUNITY (global wellness) + Personal stats based on tier
     */
    _getCardHTML(data) {
      // data = { community, personal }
      const community = data.community || data; // Fallback for old format
      const personal = data.personal;
      const tier = getUserTier();
      const access = getTierAccess(tier);
      
      // Debug logging
      console.log('[HiIndexCard] Tier detection:', {
        tier,
        access,
        sources: {
          profileManager: window.ProfileManager?.profile?.membership_tier,
          hiMembership: window.HiMembership?.membershipStatus?.tier,
          localStorage: localStorage.getItem('hi_membership_tier')
        }
      });
      
      const trendClass = community.trend === 'up' ? 'hi-index-card--up' : 
                        community.trend === 'down' ? 'hi-index-card--down' : '';
      
      // Free tier: Global dots only (compact)
      if (!access.personalStats) {
        return `
          <div class="hi-index-card hi-index-card--free ${trendClass}" role="button" tabindex="0" 
               aria-label="Community Hi Index. Tap to learn more.">
            <div class="hi-index-card__main">
              <span class="hi-index-card__icon">✨</span>
              <div class="hi-index-card__content">
                <span class="hi-index-card__title">Community Hi</span>
                <span class="hi-index-card__dots hi-index-card__dots--large" aria-label="${community.indexDisplay} out of 5">${community.dots}</span>
                <span class="hi-index-card__tap-hint">Tap for details</span>
              </div>
            </div>
            <span class="hi-index-card__chevron" aria-hidden="true">›</span>
          </div>
        `;
      }
      
      // Paid tiers: Show both Personal + Global side-by-side
      const personalHasData = personal && !personal.isEmpty;
      const personalDisplay = personalHasData ? personal.indexDisplay : '—';
      const personalDots = personalHasData ? personal.dots : '○○○○○';
      
      // Trend arrows
      const communityArrow = access.trends ? this._getTrendArrow(community.trend, community.percentChange) : '';
      const personalArrow = access.trends && personalHasData ? this._getTrendArrow(personal.trend, personal.percentChange) : '';
      
      // Streak bonus indicator (for paid tiers with trends)
      const streakBonus = (access.trends && personalHasData && personal.streak?.hasBonus) 
        ? `<span class="hi-index-card__streak-bonus" title="${personal.streak.label}">🔥${personal.streak.bonusDisplay}</span>`
        : '';
      
      return `
        <div class="hi-index-card hi-index-card--paid ${trendClass}" role="button" tabindex="0" 
             aria-label="Your Hi Index is ${personalDisplay}. Community Hi Index is ${community.indexDisplay}. Tap to see details.">
          <div class="hi-index-card__dual">
            <!-- Personal Stats -->
            <div class="hi-index-card__stat hi-index-card__stat--personal">
              <span class="hi-index-card__stat-label">You ${streakBonus}</span>
              <div class="hi-index-card__stat-row">
                <span class="hi-index-card__stat-value">${personalDisplay}</span>
                ${personalArrow}
              </div>
              <span class="hi-index-card__stat-dots">${personalDots}</span>
            </div>
            
            <!-- Divider -->
            <div class="hi-index-card__divider"></div>
            
            <!-- Community Stats -->
            <div class="hi-index-card__stat hi-index-card__stat--community">
              <span class="hi-index-card__stat-label">Community</span>
              <div class="hi-index-card__stat-row">
                <span class="hi-index-card__stat-value">${community.indexDisplay}</span>
                ${communityArrow}
              </div>
              <span class="hi-index-card__stat-dots">${community.dots}</span>
            </div>
          </div>
          <div class="hi-index-card__footer">
            <span class="hi-index-card__tap-hint">Tap for details</span>
            <span class="hi-index-card__chevron" aria-hidden="true">›</span>
          </div>
        </div>
      `;
    }

    /**
     * Get trend arrow HTML
     */
    _getTrendArrow(trend, percentChange) {
      if (!trend || trend === 'stable') return '';
      const arrow = trend === 'up' ? '↑' : '↓';
      const colorClass = trend === 'up' ? 'hi-index-card__arrow--up' : 'hi-index-card__arrow--down';
      const value = Math.abs(percentChange || 0).toFixed(0);
      return `<span class="hi-index-card__arrow ${colorClass}">${arrow}${value}%</span>`;
    }

    /**
     * Attach click/tap listeners
     */
    _attachListeners(container) {
      const card = container.querySelector('.hi-index-card');
      if (!card) return;

      card.addEventListener('click', () => this.onTap());
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onTap();
        }
      });

      // Retry on error card
      if (card.classList.contains('hi-index-card--error')) {
        card.addEventListener('click', () => this.refresh());
      }
    }

    /**
     * Wait for HiIndex to initialize
     */
    _waitForHiIndex() {
      const check = setInterval(async () => {
        if (window.hiIndexInstance) {
          clearInterval(check);
          const [community, personal] = await Promise.all([
            window.hiIndexInstance.getCommunity(),
            window.hiIndexInstance.getPersonal()
          ]);
          this.data = { community, personal };
          this._render(this.data);
        }
      }, 500);

      // Timeout after 10s
      setTimeout(() => {
        clearInterval(check);
        if (!this.data) {
          this._render({ isEmpty: true });
        }
      }, 10000);
    }

    /**
     * Refresh card data
     */
    async refresh() {
      this._render({ loading: true });
      
      if (window.hiIndexInstance) {
        window.hiIndexInstance.clearCache();
        const [community, personal] = await Promise.all([
          window.hiIndexInstance.getCommunity(),
          window.hiIndexInstance.getPersonal()
        ]);
        this.data = { community, personal };
        this._render(this.data);
      }
    }

    /**
     * Update with new data (call after share/tap action)
     */
    update(data) {
      this.data = data;
      this._render(data);
    }
  }

  // CSS injection
  const styles = `
    .hi-index-card-wrapper {
      width: 100%;
      max-width: 400px;
      margin: 12px auto;
      padding: 0 16px;
      box-sizing: border-box;
    }

    .hi-index-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      -webkit-tap-highlight-color: transparent;
    }

    .hi-index-card:hover,
    .hi-index-card:focus {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 209, 102, 0.3);
      transform: translateY(-1px);
      outline: none;
    }

    .hi-index-card:active {
      transform: scale(0.98);
    }

    .hi-index-card--up {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .hi-index-card--down {
      border-color: rgba(245, 158, 11, 0.3);
    }

    .hi-index-card__main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .hi-index-card__icon {
      font-size: 24px;
      line-height: 1;
    }

    .hi-index-card__content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .hi-index-card__row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .hi-index-card__title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .hi-index-card__change {
      font-size: 12px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
    }

    .hi-index-card__change.up {
      color: #10B981;
      background: rgba(16, 185, 129, 0.15);
    }

    .hi-index-card__change.down {
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.15);
    }

    .hi-index-card__change.stable {
      color: rgba(255, 255, 255, 0.7);
    }

    .hi-index-card__dots {
      font-size: 10px;
      letter-spacing: 2px;
      color: #FFD166;
      opacity: 0.8;
    }

    .hi-index-card__subtitle {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }

    .hi-index-card__chevron {
      font-size: 20px;
      color: rgba(255, 255, 255, 0.4);
      transition: transform 0.2s ease;
    }

    .hi-index-card:hover .hi-index-card__chevron {
      transform: translateX(2px);
      color: #FFD166;
    }

    .hi-index-card__text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Loading shimmer */
    .hi-index-card--loading {
      min-height: 56px;
      background: rgba(255, 255, 255, 0.03);
      cursor: default;
    }

    .hi-index-card__shimmer {
      width: 100%;
      height: 24px;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.03) 0%,
        rgba(255, 255, 255, 0.08) 50%,
        rgba(255, 255, 255, 0.03) 100%
      );
      background-size: 200% 100%;
      animation: hiIndexShimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
    }

    @keyframes hiIndexShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Empty state */
    .hi-index-card--empty {
      background: linear-gradient(135deg, 
        rgba(255, 209, 102, 0.05) 0%,
        rgba(99, 102, 241, 0.05) 100%
      );
      border-style: dashed;
    }

    /* Error state */
    .hi-index-card--error {
      background: rgba(239, 68, 68, 0.05);
      border-color: rgba(239, 68, 68, 0.2);
      justify-content: center;
      gap: 8px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .hi-index-card-wrapper {
        padding: 0 12px;
        margin: 8px auto;
      }

      .hi-index-card {
        padding: 10px 14px;
      }

      .hi-index-card__icon {
        font-size: 20px;
      }

      .hi-index-card__title {
        font-size: 13px;
      }
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Export
  window.HiIndexCard = HiIndexCard;

  // Auto-initialize after auth ready
  window.addEventListener('hi:auth-ready', () => {
    setTimeout(() => {
      if (!window.hiIndexCardInstance) {
        window.hiIndexCardInstance = new HiIndexCard();
        window.hiIndexCardInstance.init();
        console.log('[HiIndexCard] ✅ Auto-initialized');
      }
    }, 500);
  });

  console.log('[HiIndexCard] Module loaded');
})();
