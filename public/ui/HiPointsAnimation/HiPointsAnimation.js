/**
 * HiPointsAnimation.js
 * Floating Points Animation Component (v1.1.0)
 * 
 * Shows floating "+N" animation when points are earned.
 * Designed to appear near the medallion on check-in.
 */

class HiPointsAnimationManager {
  constructor() {
    this.container = null;
    this.initialized = false;
  }

  /**
   * Initialize the animation container
   */
  init() {
    if (this.initialized) return;

    // Create container if it doesn't exist
    this.container = document.getElementById('hi-points-animation-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'hi-points-animation-container';
      this.container.className = 'hi-points-animation-container';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.container);
    }

    this.initialized = true;
    console.log('[HiPointsAnimation] Initialized');
  }

  /**
   * Show floating points animation
   * @param {Object} options - Animation options
   * @param {number} options.points - Points to display
   * @param {number} [options.x] - X position (default: center)
   * @param {number} [options.y] - Y position (default: center)
   * @param {HTMLElement} [options.anchor] - Element to anchor animation to
   * @param {string} [options.color] - Custom color
   */
  show(options = {}) {
    this.init();

    const {
      points = 5,
      x = null,
      y = null,
      anchor = null,
      color = '#FFD166'
    } = options;

    // Calculate position
    let posX, posY;
    
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      posX = rect.left + rect.width / 2;
      posY = rect.top + rect.height / 3; // Slightly above center
    } else if (x !== null && y !== null) {
      posX = x;
      posY = y;
    } else {
      // Default to center of screen
      posX = window.innerWidth / 2;
      posY = window.innerHeight / 2 - 50;
    }

    // Create animation element
    const anim = document.createElement('div');
    anim.className = 'hi-points-float';
    anim.innerHTML = `<span class="hi-points-value">+${points}</span>`;
    anim.style.left = `${posX}px`;
    anim.style.top = `${posY}px`;
    anim.style.setProperty('--points-color', color);

    // Add to container
    this.container.appendChild(anim);

    // Trigger animation
    requestAnimationFrame(() => {
      anim.classList.add('hi-points-float--animate');
    });

    // Create particle burst
    this.createParticles(posX, posY, color);

    // Remove after animation
    setTimeout(() => {
      if (anim.parentNode) {
        anim.parentNode.removeChild(anim);
      }
    }, 1500);

    // Haptic feedback
    if (window.PremiumUX?.triggerHapticFeedback) {
      window.PremiumUX.triggerHapticFeedback('success');
    }

    return anim;
  }

  /**
   * Create particle burst effect
   */
  createParticles(x, y, color) {
    const particleCount = 8;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'hi-points-particle';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty('--particle-color', color);
      
      // Calculate random direction
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);

      this.container.appendChild(particle);
      particles.push(particle);

      // Trigger animation
      requestAnimationFrame(() => {
        particle.classList.add('hi-points-particle--animate');
      });
    }

    // Remove particles after animation
    setTimeout(() => {
      particles.forEach(p => {
        if (p.parentNode) {
          p.parentNode.removeChild(p);
        }
      });
    }, 800);
  }

  /**
   * Show check-in animation (wrapper for common use case)
   * @param {HTMLElement} medallion - The medallion element to anchor to
   */
  checkin(medallion) {
    return this.show({
      points: 5,
      anchor: medallion,
      color: '#FFD166'
    });
  }

  /**
   * Show share points animation
   * @param {HTMLElement} anchor - Element to anchor to
   */
  share(anchor) {
    return this.show({
      points: 10,
      anchor,
      color: '#4ECDC4'
    });
  }
}

// Create singleton instance
const HiPointsAnimation = new HiPointsAnimationManager();

// Export for module usage
export { HiPointsAnimation };

// Also expose globally for non-module scripts
window.HiPointsAnimation = HiPointsAnimation;

// Auto-initialize CSS if not already present
(function injectStyles() {
  if (document.getElementById('hi-points-animation-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'hi-points-animation-styles';
  styles.textContent = `
    .hi-points-animation-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10001;
      overflow: hidden;
    }

    .hi-points-float {
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
    }

    .hi-points-value {
      display: inline-block;
      font-size: 2rem;
      font-weight: 800;
      color: var(--points-color, #FFD166);
      text-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.3),
        0 0 20px var(--points-color, #FFD166);
      letter-spacing: -0.02em;
    }

    .hi-points-float--animate {
      animation: pointsFloatUp 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes pointsFloatUp {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.5);
      }
      15% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.2);
      }
      30% {
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, calc(-50% - 80px)) scale(0.8);
      }
    }

    .hi-points-particle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--particle-color, #FFD166);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      pointer-events: none;
    }

    .hi-points-particle--animate {
      animation: particleBurst 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes particleBurst {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .hi-points-float--animate {
        animation: pointsFade 1s ease forwards;
      }

      @keyframes pointsFade {
        0% { opacity: 0; }
        20% { opacity: 1; }
        100% { opacity: 0; }
      }

      .hi-points-particle--animate {
        animation: none;
        opacity: 0;
      }
    }
  `;

  document.head.appendChild(styles);
})();
