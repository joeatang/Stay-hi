/**
 * Pull-to-Refresh Gesture Handler
 * Instagram/X-style pull-to-refresh implementation
 * 
 * Usage:
 *   const ptr = new PullToRefresh('.scrollable-container', async () => {
 *     await fetchNewData();
 *   });
 */

class PullToRefresh {
  constructor(containerSelector, onRefresh, options = {}) {
    this.container = typeof containerSelector === 'string' 
      ? document.querySelector(containerSelector) 
      : containerSelector;
    
    if (!this.container) {
      console.warn('[PTR] Container not found:', containerSelector);
      return;
    }

    this.onRefresh = onRefresh;
    this.options = {
      threshold: 80, // Distance to trigger refresh
      maxDistance: 120, // Maximum pull distance
      resistance: 2.5, // Pull resistance factor
      spinnerHeight: 60, // Spinner container height
      ...options
    };

    this.state = {
      startY: 0,
      currentY: 0,
      pullDistance: 0,
      isRefreshing: false,
      isPulling: false,
      canPull: false
    };

    this.init();
  }

  init() {
    // Create spinner element
    this.createSpinner();
    
    // Bind touch events
    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });
    
    console.log('[PTR] Pull-to-refresh initialized on', this.container);
  }

  createSpinner() {
    this.spinner = document.createElement('div');
    this.spinner.className = 'ptr-spinner';
    this.spinner.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: ${this.options.spinnerHeight}px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-${this.options.spinnerHeight}px);
      transition: transform 0.2s ease-out;
      pointer-events: none;
      z-index: 100;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    this.spinner.innerHTML = `
      <div class="ptr-icon" style="
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-top-color: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease-out;
      "></div>
    `;

    // Insert spinner at top of container
    if (this.container.style.position !== 'relative' && 
        this.container.style.position !== 'absolute') {
      this.container.style.position = 'relative';
    }
    this.container.insertBefore(this.spinner, this.container.firstChild);
  }

  onTouchStart(e) {
    // Only allow pull when at top of scroll
    const isAtTop = this.container.scrollTop === 0;
    
    if (!isAtTop || this.state.isRefreshing) {
      this.state.canPull = false;
      return;
    }

    this.state.canPull = true;
    this.state.startY = e.touches[0].clientY;
    this.state.isPulling = false;
  }

  onTouchMove(e) {
    if (!this.state.canPull || this.state.isRefreshing) return;

    this.state.currentY = e.touches[0].clientY;
    const deltaY = this.state.currentY - this.state.startY;

    // Only handle downward pulls
    if (deltaY < 0) {
      this.state.isPulling = false;
      return;
    }

    // Apply resistance
    this.state.pullDistance = Math.min(
      deltaY / this.options.resistance,
      this.options.maxDistance
    );

    if (this.state.pullDistance > 10) {
      this.state.isPulling = true;
      e.preventDefault(); // Prevent scroll bounce
    }

    this.updateSpinner();
  }

  onTouchEnd() {
    if (!this.state.isPulling || this.state.isRefreshing) {
      this.resetSpinner();
      return;
    }

    // Trigger refresh if pulled past threshold
    if (this.state.pullDistance >= this.options.threshold) {
      this.triggerRefresh();
    } else {
      this.resetSpinner();
    }

    this.state.isPulling = false;
    this.state.canPull = false;
  }

  updateSpinner() {
    const progress = Math.min(this.state.pullDistance / this.options.threshold, 1);
    const translateY = this.state.pullDistance - this.options.spinnerHeight;
    const rotation = progress * 180;

    this.spinner.style.transform = `translateY(${translateY}px)`;
    this.spinner.style.transition = 'none';
    
    const icon = this.spinner.querySelector('.ptr-icon');
    icon.style.transform = `rotate(${rotation}deg)`;
    icon.style.transition = 'none';

    // Haptic feedback at threshold
    if (progress >= 1 && !this.state.wasAtThreshold) {
      this.state.wasAtThreshold = true;
      if (window.PremiumUX?.triggerHapticFeedback) {
        window.PremiumUX.triggerHapticFeedback('medium');
      }
    } else if (progress < 1) {
      this.state.wasAtThreshold = false;
    }
  }

  async triggerRefresh() {
    this.state.isRefreshing = true;
    
    // Show spinner with animation
    this.spinner.style.transition = 'transform 0.2s ease-out';
    this.spinner.style.transform = 'translateY(0)';
    
    const icon = this.spinner.querySelector('.ptr-icon');
    icon.style.transition = 'none';
    icon.style.animation = 'ptr-spin 0.8s linear infinite';
    
    // Add CSS animation
    if (!document.getElementById('ptr-animations')) {
      const style = document.createElement('style');
      style.id = 'ptr-animations';
      style.textContent = `
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Haptic feedback
    if (window.PremiumUX?.triggerHapticFeedback) {
      window.PremiumUX.triggerHapticFeedback('success');
    }

    // Execute refresh callback
    try {
      await this.onRefresh();
    } catch (error) {
      console.error('[PTR] Refresh error:', error);
    }

    // Hide spinner with delay
    setTimeout(() => {
      this.resetSpinner();
      this.state.isRefreshing = false;
    }, 300);
  }

  resetSpinner() {
    this.spinner.style.transition = 'transform 0.3s ease-out';
    this.spinner.style.transform = `translateY(-${this.options.spinnerHeight}px)`;
    
    const icon = this.spinner.querySelector('.ptr-icon');
    icon.style.animation = '';
    icon.style.transition = 'transform 0.2s ease-out';
    icon.style.transform = 'rotate(0deg)';
    
    this.state.pullDistance = 0;
  }

  destroy() {
    if (this.spinner && this.spinner.parentNode) {
      this.spinner.remove();
    }
    // Note: We don't remove event listeners since they're bound with .bind()
    // In production, you'd want to store the bound functions and remove them
  }
}

// Export for use in other modules
window.PullToRefresh = PullToRefresh;
