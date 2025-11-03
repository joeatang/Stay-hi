/* ===================================================================
   🎯 HI MEDALLION COMPONENT - Tesla-Grade Interactive Logic
   Cross-browser compatible, accessible, performant
=================================================================== */

/**
 * HI DEV: Mount HiMedallion with Tesla-grade interaction handling
 * @param {Element} container - DOM element to mount medallion
 * @param {Object} opts - Configuration options
 * @param {string} opts.size - Custom size override (e.g., '280px')
 * @param {string} opts.ariaLabel - Accessible label
 * @param {string} opts.origin - Analytics origin tracking
 * @param {Function} opts.onTap - Tap/click handler
 * @param {Function} opts.onHover - Hover handler (desktop)
 * @param {Function} opts.onFocus - Focus handler (keyboard)
 */
export function mountHiMedallion(container, opts = {}) {
  if (!container) {
    console.warn('[HI DEV] HiMedallion: No container element provided');
    return;
  }

  // HI DEV: Size override support
  if (opts.size) {
    container.style.setProperty('--size', opts.size);
  }

  // HI DEV: Accessibility attributes
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', opts.ariaLabel || 'Give Yourself a Hi5');

  // HI DEV: Performance - cache DOM queries
  const halo = container.querySelector('.hi-medallion__halo');
  let isAnimating = false;
  let pulseTimeout = null;

  /**
   * HI DEV: Pulse animation with performance optimization
   */
  const triggerPulse = () => {
    if (isAnimating) return; // Prevent overlapping animations
    
    isAnimating = true;
    container.classList.remove('is-pulsing');
    
    // HI DEV: Force reflow to restart animation (optimized)
    void container.offsetHeight;
    
    container.classList.add('is-pulsing');
    
    // HI DEV: Reset animation state after completion
    clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(() => {
      isAnimating = false;
      container.classList.remove('is-pulsing');
    }, 600); // Match animation duration
  };

  /**
   * HI DEV: Analytics tracking with error handling
   */
  const trackInteraction = (eventType, data = {}) => {
    try {
      if (window.HiMonitor?.trackEvent) {
        window.HiMonitor.trackEvent('medallion_interaction', {
          type: eventType,
          origin: opts.origin || 'dashboard',
          timestamp: Date.now(),
          ...data
        });
      }
    } catch (error) {
      console.warn('[HI DEV] HiMedallion analytics error:', error);
    }
  };

  /**
   * HI DEV: Main activation handler
   */
  const handleActivation = (event) => {
    // HI DEV: Prevent double-firing on touch devices
    event.preventDefault();
    event.stopPropagation();

    // HI DEV: Haptic feedback on supported devices
    try {
      if (navigator.vibrate && 'ontouchstart' in window) {
        navigator.vibrate(50); // Subtle haptic pulse
      }
    } catch (error) {
      // Silently ignore vibration errors
    }

    // HI DEV: Visual feedback
    triggerPulse();

    // HI DEV: Track interaction
    trackInteraction('tap', {
      inputType: event.type,
      pointerType: event.pointerType || 'unknown'
    });

    // HI DEV: Execute user callback
    if (opts.onTap && typeof opts.onTap === 'function') {
      try {
        opts.onTap(event);
      } catch (error) {
        console.error('[HI DEV] HiMedallion onTap error:', error);
      }
    }
  };

  /**
   * HI DEV: Keyboard interaction handler
   */
  const handleKeydown = (event) => {
    // HI DEV: Standard button keys (Enter and Space)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivation(event);
    }
  };

  /**
   * HI DEV: Mouse hover handler (desktop only)
   */
  const handleMouseEnter = (event) => {
    // HI DEV: Only on devices with hover capability
    if (window.matchMedia('(hover: hover)').matches) {
      trackInteraction('hover', { inputType: 'mouse' });
      
      if (opts.onHover && typeof opts.onHover === 'function') {
        try {
          opts.onHover(event);
        } catch (error) {
          console.error('[HI DEV] HiMedallion onHover error:', error);
        }
      }
    }
  };

  /**
   * HI DEV: Focus handler for accessibility
   */
  const handleFocus = (event) => {
    trackInteraction('focus', { inputType: 'keyboard' });
    
    if (opts.onFocus && typeof opts.onFocus === 'function') {
      try {
        opts.onFocus(event);
      } catch (error) {
        console.error('[HI DEV] HiMedallion onFocus error:', error);
      }
    }
  };

  // HI DEV: Event listeners with passive optimization
  container.addEventListener('click', handleActivation, { passive: false });
  container.addEventListener('keydown', handleKeydown, { passive: false });
  container.addEventListener('mouseenter', handleMouseEnter, { passive: true });
  container.addEventListener('focus', handleFocus, { passive: true });

  // HI DEV: Touch event optimization for mobile
  let touchStartTime = 0;
  container.addEventListener('touchstart', (event) => {
    touchStartTime = Date.now();
  }, { passive: true });

  container.addEventListener('touchend', (event) => {
    const touchDuration = Date.now() - touchStartTime;
    // HI DEV: Only fire on quick taps, not long presses
    if (touchDuration < 500) {
      handleActivation(event);
    }
  }, { passive: false });

  /**
   * HI DEV: Cleanup function for component unmounting
   */
  const cleanup = () => {
    clearTimeout(pulseTimeout);
    container.removeEventListener('click', handleActivation);
    container.removeEventListener('keydown', handleKeydown);
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('focus', handleFocus);
    container.removeEventListener('touchstart', handleActivation);
    container.removeEventListener('touchend', handleActivation);
  };

  // HI DEV: Return cleanup function and API
  return {
    cleanup,
    pulse: triggerPulse,
    setSize: (size) => container.style.setProperty('--size', size),
    element: container
  };
}

/**
 * HI DEV: Auto-mount all medallions on page load
 * @param {Object} defaultOpts - Default options for all medallions
 */
export function autoMountHiMedallions(defaultOpts = {}) {
  const medallions = document.querySelectorAll('.hi-medallion:not([data-hi-mounted])');
  const instances = [];

  medallions.forEach((medallion) => {
    // HI DEV: Merge data attributes with default options
    const opts = {
      ...defaultOpts,
      origin: medallion.dataset.origin || defaultOpts.origin,
      ariaLabel: medallion.dataset.ariaLabel || defaultOpts.ariaLabel,
      size: medallion.dataset.size || defaultOpts.size
    };

    const instance = mountHiMedallion(medallion, opts);
    if (instance) {
      medallion.setAttribute('data-hi-mounted', 'true');
      instances.push(instance);
    }
  });

  console.log(`[HI DEV] HiMedallion: Mounted ${instances.length} medallions`);
  return instances;
}

/**
 * HI DEV: Utility function to create medallion HTML
 * @param {Object} opts - Configuration options
 * @returns {string} HTML string for medallion
 */
export function createHiMedallionHTML(opts = {}) {
  const id = opts.id || 'hiMedallion';
  const classes = `hi-medallion ${opts.className || ''}`.trim();
  
  return `
    <div class="${classes}" id="${id}" ${opts.dataAttributes || ''}>
      <div class="hi-medallion__halo"></div>
      <div class="hi-medallion__base"></div>
      <div class="hi-medallion__edge"></div>
      <div class="hi-medallion__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <filter id="hiInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feOffset dy="1" dx="0"/>
              <feGaussianBlur stdDeviation="1.2" result="offset-blur"/>
              <feComposite operator="arithmetic" k2="-1" k3="1" in="offset-blur" in2="SourceGraphic"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0"/>
            </filter>
          </defs>
          <g fill="none" stroke="var(--hi-medallion-hand)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#hiInnerShadow)">
            <path d="M48 86c0-10 8-18 18-18h28c14 0 26 12 26 26 0 18-14 34-32 34H68c-11 0-20-9-20-20v-22z"/>
            <path d="M64 56V28"/>
            <path d="M82 58V24"/>
            <path d="M98 60V30"/>
            <path d="M114 68V42"/>
          </g>
          <text x="80" y="100" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI" font-size="18" fill="var(--hi-medallion-hand)" font-weight="700">HI</text>
        </svg>
      </div>
    </div>
  `.trim();
}