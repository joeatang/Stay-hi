/**
 * HiMedallionMenu.js
 * Long-Press Menu Component for Medallion (v1.1.0)
 * 
 * Displays a floating menu with two options:
 * - Share a Hi (opens HiShareSheet)
 * - Hi Gym (navigates to hi-muscle.html)
 * 
 * Triggered by long-press on medallion (800ms threshold).
 */

class HiMedallionMenuManager {
  constructor() {
    this.menu = null;
    this.backdrop = null;
    this.isOpen = false;
    this.initialized = false;
    this.anchorElement = null;
  }

  /**
   * Initialize the menu (called on first open)
   */
  init() {
    if (this.initialized) return;

    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'hi-medallion-menu-backdrop';
    this.backdrop.addEventListener('click', () => this.close());
    document.body.appendChild(this.backdrop);

    // Create menu
    this.menu = document.createElement('div');
    this.menu.className = 'hi-medallion-menu';
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-label', 'Medallion actions');
    this.menu.innerHTML = `
      <div class="hi-medallion-menu-header">
        <span class="hi-medallion-menu-title">Your next move</span>
      </div>
      <div class="hi-medallion-menu-options">
        <button class="hi-medallion-menu-option" data-action="share" role="menuitem">
          <span class="hi-medallion-menu-icon">🌟</span>
          <span class="hi-medallion-menu-label">Share a Hi</span>
          <span class="hi-medallion-menu-hint">Celebrate a win</span>
        </button>
        <button class="hi-medallion-menu-option" data-action="higym" role="menuitem">
          <span class="hi-medallion-menu-icon">💪</span>
          <span class="hi-medallion-menu-label">Hi Gym</span>
          <span class="hi-medallion-menu-hint">Train your mind</span>
        </button>
      </div>
    `;
    document.body.appendChild(this.menu);

    // Wire up actions
    this.menu.querySelectorAll('.hi-medallion-menu-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        this.handleAction(action);
      });
    });

    // Keyboard navigation
    this.menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });

    this.initialized = true;
    console.log('[HiMedallionMenu] Initialized');
  }

  /**
   * Open the menu
   * @param {Object} options - Options
   * @param {HTMLElement} [options.anchor] - Element to position menu relative to
   */
  open(options = {}) {
    this.init();

    const { anchor = null } = options;
    this.anchorElement = anchor;

    // Position menu
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 280;
      const menuHeight = 180;
      
      // Center above medallion
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      let top = rect.top - menuHeight - 20;

      // Keep menu on screen
      left = Math.max(16, Math.min(left, window.innerWidth - menuWidth - 16));
      top = Math.max(60, top); // Below header

      // If not enough space above, position below
      if (top < 60) {
        top = rect.bottom + 20;
      }

      this.menu.style.left = `${left}px`;
      this.menu.style.top = `${top}px`;
    } else {
      // Center in viewport
      this.menu.style.left = '50%';
      this.menu.style.top = '40%';
      this.menu.style.transform = 'translate(-50%, -50%)';
    }

    // Show
    this.backdrop.classList.add('hi-medallion-menu-backdrop--show');
    this.menu.classList.add('hi-medallion-menu--show');
    this.isOpen = true;

    // Focus first option
    const firstOption = this.menu.querySelector('.hi-medallion-menu-option');
    if (firstOption) {
      firstOption.focus();
    }

    // Haptic feedback
    if (window.PremiumUX?.triggerHapticFeedback) {
      window.PremiumUX.triggerHapticFeedback('medium');
    }

    console.log('[HiMedallionMenu] Opened');
  }

  /**
   * Close the menu
   */
  close() {
    if (!this.isOpen) return;

    this.backdrop.classList.remove('hi-medallion-menu-backdrop--show');
    this.menu.classList.remove('hi-medallion-menu--show');
    this.isOpen = false;

    // Reset transform
    this.menu.style.transform = '';

    console.log('[HiMedallionMenu] Closed');
  }

  /**
   * Handle menu action
   */
  handleAction(action) {
    this.close();

    switch (action) {
      case 'share':
        // Open HiShareSheet (same modal used everywhere)
        if (window.openHiShareSheet) {
          window.openHiShareSheet('hi5', { source: 'medallion_menu' });
        } else if (window.HiShareSheet?.open) {
          window.HiShareSheet.open({ origin: 'hi5' });
        } else {
          // Fallback: navigate to island
          const href = window.hiPaths?.page ? window.hiPaths.page('island') : 'hi-island-NEW.html';
          window.location.href = href;
        }
        break;

      case 'higym':
        // Navigate to Hi Gym
        const gymHref = window.hiPaths?.page ? window.hiPaths.page('muscle') : 'hi-muscle.html';
        window.location.href = gymHref;
        break;

      default:
        console.warn('[HiMedallionMenu] Unknown action:', action);
    }
  }

  /**
   * Toggle menu
   */
  toggle(options = {}) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(options);
    }
  }

  /**
   * Destroy the menu
   */
  destroy() {
    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
    }
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
    this.initialized = false;
    this.isOpen = false;
  }
}

// Create singleton instance
const HiMedallionMenu = new HiMedallionMenuManager();

// Export for module usage
export { HiMedallionMenu };

// Also expose globally for non-module scripts
window.HiMedallionMenu = HiMedallionMenu;
