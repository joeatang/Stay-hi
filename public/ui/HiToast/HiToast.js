/**
 * HiToast.js
 * Notification Toast Component (v1.1.0)
 * 
 * Displays brief, non-blocking notification messages.
 * Supports success, info, warning, and error variants.
 */

class HiToastManager {
  constructor() {
    this.container = null;
    this.queue = [];
    this.activeToast = null;
    this.defaultDuration = 3000;
    this.initialized = false;
  }

  /**
   * Initialize the toast container
   */
  init() {
    if (this.initialized) return;

    // Create container if it doesn't exist
    this.container = document.getElementById('hi-toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'hi-toast-container';
      this.container.className = 'hi-toast-container';
      this.container.setAttribute('role', 'alert');
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }

    this.initialized = true;
    console.log('[HiToast] Initialized');
  }

  /**
   * Show a toast message
   * @param {Object} options - Toast options
   * @param {string} options.message - The message to display
   * @param {string} [options.type='info'] - Type: 'success', 'info', 'warning', 'error'
   * @param {string} [options.icon] - Custom icon (emoji)
   * @param {number} [options.duration=3000] - Duration in ms (0 = persistent)
   * @param {Function} [options.onClick] - Click callback
   */
  show(options = {}) {
    this.init();

    const {
      message,
      type = 'info',
      icon = this.getDefaultIcon(type),
      duration = this.defaultDuration,
      onClick = null
    } = options;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `hi-toast hi-toast--${type}`;
    toast.innerHTML = `
      <span class="hi-toast-icon">${icon}</span>
      <span class="hi-toast-message">${message}</span>
    `;

    if (onClick) {
      toast.classList.add('hi-toast--clickable');
      toast.addEventListener('click', () => {
        onClick();
        this.dismiss(toast);
      });
    }

    // Add dismiss on swipe
    this.addSwipeToDismiss(toast);

    // Add to container
    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('hi-toast--show');
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    // Haptic feedback
    if (window.PremiumUX?.triggerHapticFeedback) {
      window.PremiumUX.triggerHapticFeedback('light');
    }

    return toast;
  }

  /**
   * Dismiss a toast
   */
  dismiss(toast) {
    if (!toast || !toast.parentNode) return;

    toast.classList.remove('hi-toast--show');
    toast.classList.add('hi-toast--hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Get default icon for toast type
   */
  getDefaultIcon(type) {
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      points: '🌟',
      checkin: '👋',
      streak: '🔥'
    };
    return icons[type] || icons.info;
  }

  /**
   * Add swipe-to-dismiss functionality
   */
  addSwipeToDismiss(toast) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;

    toast.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    toast.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX - startX;
      const currentY = e.touches[0].clientY - startY;

      // Only allow horizontal swipe
      if (Math.abs(currentX) > Math.abs(currentY)) {
        toast.style.transform = `translateX(${currentX}px)`;
        toast.style.opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
      }
    }, { passive: true });

    toast.addEventListener('touchend', () => {
      if (Math.abs(currentX) > 80) {
        // Swipe threshold met - dismiss
        this.dismiss(toast);
      } else {
        // Reset position
        toast.style.transform = '';
        toast.style.opacity = '';
      }
      currentX = 0;
    }, { passive: true });
  }

  // Convenience methods
  success(message, options = {}) {
    return this.show({ message, type: 'success', ...options });
  }

  info(message, options = {}) {
    return this.show({ message, type: 'info', ...options });
  }

  warning(message, options = {}) {
    return this.show({ message, type: 'warning', ...options });
  }

  error(message, options = {}) {
    return this.show({ message, type: 'error', ...options });
  }

  /**
   * Special toast for points earned
   * @param {number} points - Points earned
   * @param {string} [reason] - Reason for points
   */
  points(points, reason = '') {
    const message = reason 
      ? `+${points} Hi Points — ${reason}`
      : `+${points} Hi Points`;
    
    return this.show({
      message,
      type: 'points',
      icon: '🌟',
      duration: 4000
    });
  }

  /**
   * Special toast for check-in
   */
  checkin() {
    return this.show({
      message: 'Welcome back! +5 Hi Points 🌟',
      type: 'checkin',
      icon: '👋',
      duration: 4000
    });
  }

  /**
   * Special toast for streak milestone
   */
  streak(days) {
    return this.show({
      message: `${days} day streak! Keep it going! 🔥`,
      type: 'streak',
      icon: '🔥',
      duration: 5000
    });
  }
}

// Create singleton instance
const HiToast = new HiToastManager();

// Export for module usage
export { HiToast };

// Also expose globally for non-module scripts
window.HiToast = HiToast;
