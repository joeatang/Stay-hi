/* ===================================================================
   🎯 HI MEDALLION COMPONENT - Tesla-Grade Interactive Logic
   Cross-browser compatible, accessible, performant
   
   v1.1.0: Added long-press support for menu activation
=================================================================== */

/**
 * HI DEV: Mount HiMedallion with Tesla-grade interaction handling
 * @param {Element} container - DOM element to mount medallion
 * @param {Object} opts - Configuration options
 * @param {string} opts.size - Custom size override (e.g., '280px')
 * @param {string} opts.ariaLabel - Accessible label
 * @param {string} opts.origin - Analytics origin tracking
 * @param {Function} opts.onTap - Tap/click handler
 * @param {Function} opts.onLongPress - Long-press handler (v1.1.0)
 * @param {Function} opts.onHover - Hover handler (desktop)
 * @param {Function} opts.onFocus - Focus handler (keyboard)
 * @param {number} opts.longPressThreshold - Long-press duration in ms (default: 800)
 */
export function mountHiMedallion(container, opts = {}) {
  if (!container) {
    console.warn('[HI DEV] HiMedallion: No container element provided');
    return;
  }

  // v1.1.0: Long-press configuration
  const LONG_PRESS_THRESHOLD = opts.longPressThreshold || 800;

  // HI DEV: Size override support
  if (opts.size) {
    container.style.setProperty('--size', opts.size);
  }

  // HI DEV: Accessibility attributes
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', opts.ariaLabel || 'Give Yourself a Hi5');
  
  // v1.1.0: Prevent iOS context menu on long-press
  container.style.setProperty('-webkit-touch-callout', 'none');
  container.style.setProperty('touch-action', 'manipulation');

  // HI DEV: Ensure visual layers exist (rings + texture) for shield/target look
  const baseEl = container.querySelector('.hi-medallion__base');
  if (baseEl) {
    // Insert rings after base if missing
    if (!container.querySelector('.hi-medallion__rings')) {
      const rings = document.createElement('div');
      rings.className = 'hi-medallion__rings';
      baseEl.insertAdjacentElement('afterend', rings);
    }
    // Insert texture after rings if missing
    if (!container.querySelector('.hi-medallion__texture')) {
      const texture = document.createElement('div');
      texture.className = 'hi-medallion__texture';
      const ringsRef = container.querySelector('.hi-medallion__rings');
      if (ringsRef) {
        ringsRef.insertAdjacentElement('afterend', texture);
      } else {
        baseEl.insertAdjacentElement('afterend', texture);
      }
    }
  }

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

  // HI DEV: Pressed visual feedback across input types
  const pressOn = () => container.classList.add('is-pressed');
  const pressOff = () => container.classList.remove('is-pressed');
  container.addEventListener('pointerdown', pressOn, { passive: true });
  container.addEventListener('pointerup', pressOff, { passive: true });
  container.addEventListener('pointercancel', pressOff, { passive: true });
  container.addEventListener('mouseleave', pressOff, { passive: true });

  // v1.1.0: Long-press support for menu activation
  let touchStartTime = 0;
  let longPressTimer = null;
  let longPressTriggered = false;
  let touchStartX = 0;
  let touchStartY = 0;

  /**
   * v1.1.0: Handle long-press action
   */
  const handleLongPress = (event) => {
    longPressTriggered = true;
    pressOff();
    
    // Haptic feedback for long-press
    try {
      if (navigator.vibrate && 'ontouchstart' in window) {
        navigator.vibrate([50, 30, 50]); // Double pulse for long-press
      }
    } catch (error) {
      // Silently ignore vibration errors
    }

    trackInteraction('long_press', {
      inputType: event.type,
      duration: LONG_PRESS_THRESHOLD
    });

    // Execute long-press callback
    if (opts.onLongPress && typeof opts.onLongPress === 'function') {
      try {
        opts.onLongPress(event, container);
      } catch (error) {
        console.error('[HI DEV] HiMedallion onLongPress error:', error);
      }
    } else {
      // Default: Open medallion menu if available
      if (window.HiMedallionMenu?.open) {
        window.HiMedallionMenu.open({ anchor: container });
      }
    }
  };

  /**
   * v1.1.0: Cancel long-press if user moves finger
   */
  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  container.addEventListener('touchstart', (event) => {
    touchStartTime = Date.now();
    touchStartX = event.touches[0]?.clientX || 0;
    touchStartY = event.touches[0]?.clientY || 0;
    longPressTriggered = false;
    pressOn();
    
    // Start long-press timer
    cancelLongPress();
    longPressTimer = setTimeout(() => {
      handleLongPress(event);
    }, LONG_PRESS_THRESHOLD);
  }, { passive: true });

  container.addEventListener('touchmove', (event) => {
    // Cancel long-press if finger moves too much
    const touch = event.touches[0];
    if (touch) {
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);
      if (deltaX > 10 || deltaY > 10) {
        cancelLongPress();
      }
    }
  }, { passive: true });

  container.addEventListener('touchend', (event) => {
    cancelLongPress();
    const touchDuration = Date.now() - touchStartTime;
    
    // Only fire tap if it wasn't a long-press
    if (!longPressTriggered && touchDuration < LONG_PRESS_THRESHOLD) {
      handleActivation(event);
    }
    pressOff();
    longPressTriggered = false;
  }, { passive: false });

  container.addEventListener('touchcancel', () => {
    cancelLongPress();
    pressOff();
    longPressTriggered = false;
  }, { passive: true });

  /**
   * HI DEV: Cleanup function for component unmounting
   */
  const cleanup = () => {
    clearTimeout(pulseTimeout);
    cancelLongPress(); // v1.1.0: Clear long-press timer
    container.removeEventListener('click', handleActivation);
    container.removeEventListener('keydown', handleKeydown);
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('focus', handleFocus);
    // v1.1.0: Touch events are cleaned up by browser on element removal
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
      <div class="hi-medallion__rings"></div>
      <div class="hi-medallion__texture"></div>
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