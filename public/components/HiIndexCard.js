/**
 * 🌟 HiIndexCard.js — Dashboard Trigger Card
 * 
 * Compact card that displays current Hi Index and opens modal on tap.
 * Injects into dashboard below global stats.
 */

(function() {
  'use strict';

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

      // Load data
      try {
        if (window.hiIndexInstance) {
          this.data = await window.hiIndexInstance.getPersonal();
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

      if (data.isEmpty) {
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
     * Main card HTML
     */
    _getCardHTML(data) {
      const trendClass = data.trend === 'up' ? 'hi-index-card--up' : 
                        data.trend === 'down' ? 'hi-index-card--down' : '';
      
      return `
        <div class="hi-index-card ${trendClass}" role="button" tabindex="0" 
             aria-label="Your Hi Index is ${data.indexDisplay}. ${data.percentChangeDisplay}. Tap to see your journey.">
          <div class="hi-index-card__main">
            <span class="hi-index-card__icon">${data.trendIcon}</span>
            <div class="hi-index-card__content">
              <div class="hi-index-card__row">
                <span class="hi-index-card__title">Hi Index: ${data.indexDisplay}</span>
                <span class="hi-index-card__change ${data.trend}">${data.percentChangeDisplay}</span>
              </div>
              <span class="hi-index-card__dots" aria-hidden="true">${data.dots}</span>
            </div>
          </div>
          <span class="hi-index-card__chevron" aria-hidden="true">›</span>
        </div>
      `;
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
          this.data = await window.hiIndexInstance.getPersonal();
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
        this.data = await window.hiIndexInstance.getPersonal();
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
