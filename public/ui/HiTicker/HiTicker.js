/**
 * HiTicker.js
 * Scrolling News Ticker Component (v1.1.0)
 * 
 * Displays scrolling messages from ticker-config.json.
 * Future: Will support Supabase-backed messages for admin control.
 */

class HiTickerComponent {
  constructor() {
    this.container = null;
    this.messages = [];
    this.currentIndex = 0;
    this.animationId = null;
    this.isPaused = false;
    this.configUrl = './assets/ticker-config.json';
  }

  /**
   * Initialize the ticker in a container element
   * @param {HTMLElement} container - The container to render the ticker in
   */
  async init(container) {
    if (!container) {
      console.warn('[HiTicker] No container provided');
      return;
    }

    this.container = container;
    
    // Load messages
    await this.loadMessages();
    
    // Render ticker
    this.render();
    
    // Start animation
    this.startAnimation();

    console.log('[HiTicker] Initialized with', this.messages.length, 'messages');
  }

  /**
   * Load messages from config file (Phase 1) or Supabase (Phase 2)
   */
  async loadMessages() {
    try {
      // Phase 1: Load from JSON file
      const response = await fetch(this.configUrl + '?t=' + Date.now());
      
      if (!response.ok) {
        throw new Error(`Failed to load ticker config: ${response.status}`);
      }

      const config = await response.json();
      
      // Filter active messages
      this.messages = (config.messages || [])
        .filter(msg => msg.active !== false)
        .map(msg => ({
          id: msg.id || crypto.randomUUID(),
          text: msg.text,
          icon: msg.icon || '✨',
          link: msg.link || null,
          priority: msg.priority || 0
        }))
        .sort((a, b) => b.priority - a.priority);

      // Fallback messages if config is empty
      if (this.messages.length === 0) {
        this.messages = [
          { id: 'default-1', text: 'Welcome to Hi Pulse — where positivity flows', icon: '✨' },
          { id: 'default-2', text: 'Tap the medallion to spread good vibes', icon: '🌟' },
          { id: 'default-3', text: 'Join the Hi community today', icon: '👋' }
        ];
      }
    } catch (err) {
      console.warn('[HiTicker] Error loading config, using defaults:', err);
      this.messages = [
        { id: 'default-1', text: 'Welcome to Hi Pulse — where positivity flows', icon: '✨' },
        { id: 'default-2', text: 'Spread positivity one tap at a time', icon: '🌟' }
      ];
    }
  }

  /**
   * Render the ticker HTML
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="hi-ticker" role="marquee" aria-live="polite" aria-label="Hi community news">
        <div class="hi-ticker-track">
          ${this.messages.map(msg => this.renderMessage(msg)).join('')}
          ${this.messages.map(msg => this.renderMessage(msg)).join('')}
        </div>
      </div>
    `;

    // Add pause on hover
    const ticker = this.container.querySelector('.hi-ticker');
    if (ticker) {
      ticker.addEventListener('mouseenter', () => this.pause());
      ticker.addEventListener('mouseleave', () => this.resume());
      ticker.addEventListener('touchstart', () => this.pause(), { passive: true });
      ticker.addEventListener('touchend', () => this.resume(), { passive: true });
    }
  }

  /**
   * Render a single message
   */
  renderMessage(msg) {
    const linkStart = msg.link ? `<a href="${msg.link}" class="hi-ticker-link">` : '';
    const linkEnd = msg.link ? '</a>' : '';
    
    return `
      <div class="hi-ticker-item" data-id="${msg.id}">
        ${linkStart}
          <span class="hi-ticker-icon">${msg.icon}</span>
          <span class="hi-ticker-text">${msg.text}</span>
        ${linkEnd}
        <span class="hi-ticker-separator">•</span>
      </div>
    `;
  }

  /**
   * Start the scrolling animation
   */
  startAnimation() {
    const track = this.container?.querySelector('.hi-ticker-track');
    if (!track) return;

    // Calculate animation duration based on content width
    const contentWidth = track.scrollWidth / 2; // Half because we duplicate content
    const duration = Math.max(12, contentWidth / 80); // ~80px/second (faster)

    track.style.animationDuration = `${duration}s`;
  }

  /**
   * Pause the ticker
   */
  pause() {
    this.isPaused = true;
    const track = this.container?.querySelector('.hi-ticker-track');
    if (track) {
      track.style.animationPlayState = 'paused';
    }
  }

  /**
   * Resume the ticker
   */
  resume() {
    this.isPaused = false;
    const track = this.container?.querySelector('.hi-ticker-track');
    if (track) {
      track.style.animationPlayState = 'running';
    }
  }

  /**
   * Update messages dynamically
   * @param {Array} newMessages - New messages to display
   */
  updateMessages(newMessages) {
    this.messages = newMessages;
    this.render();
    this.startAnimation();
  }

  /**
   * Destroy the ticker
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.messages = [];
  }
}

// Create singleton instance
const HiTicker = new HiTickerComponent();

// Export for module usage
export { HiTicker };

// Also expose globally for non-module scripts
window.HiTicker = HiTicker;
