/* ==========================================================================
   Stay Hi — Premium UX Interactions (Tesla x TikTok)
   JavaScript for engaging micro-interactions and premium feedback
   ========================================================================== */

class PremiumUX {
  constructor() {
    this.isInitialized = false;
    this.confettiActive = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.setupIntersectionObserver();
    this.isInitialized = true;
    
    console.log('🚀 Premium UX initialized');
  }

  // -------------------------
  // TikTok-style Confetti System
  // -------------------------
  createConfetti(options = {}) {
    if (this.confettiActive) return;
    
    const {
      count = 50,
      duration = 3000,
      colors = ['#FE2C55', '#25F4EE', '#8A2BE2', '#FFD700', '#FF6B6B']
    } = options;

    this.confettiActive = true;
    
    const container = this.getOrCreateConfettiContainer();
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.createConfettiPiece(container, colors);
      }, i * 50);
    }
    
    setTimeout(() => {
      this.confettiActive = false;
    }, duration);
  }

  getOrCreateConfettiContainer() {
    let container = document.querySelector('.confetti-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'confetti-container';
      document.body.appendChild(container);
    }
    return container;
  }

  createConfettiPiece(container, colors) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    
    // Random properties
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;
    const left = Math.random() * 100;
    const duration = Math.random() * 2 + 2;
    const delay = Math.random() * 0.5;
    
    piece.style.cssText = `
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    
    container.appendChild(piece);
    
    setTimeout(() => {
      if (piece.parentNode) {
        piece.remove();
      }
    }, (duration + delay) * 1000);
  }

  // -------------------------
  // Particle Burst Effect
  // -------------------------
  createParticleBurst(element, options = {}) {
    const {
      count = 12,
      colors = ['#25F4EE', '#FE2C55', '#8A2BE2'],
      size = 4
    } = options;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
      this.createParticle(centerX, centerY, colors, size);
    }
  }

  createParticle(x, y, colors, size) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = (Math.PI * 2 * Math.random());
    const velocity = Math.random() * 100 + 50;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      --dx: ${dx}px;
      --dy: ${dy}px;
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
      particle.remove();
    }, 800);
  }

  // -------------------------
  // Premium Success Celebration
  // -------------------------
  celebrateSuccess(element, message = '✨ Success!') {
    // Create celebration ring
    this.createCelebrationRing(element);
    
    // Show floating message
    this.showFloatingMessage(element, message);
    
    // Add confetti
    this.createConfetti({ count: 30 });
    
    // Haptic feedback on mobile
    this.triggerHapticFeedback();
  }

  createCelebrationRing(element) {
    const rect = element.getBoundingClientRect();
    const ring = document.createElement('div');
    ring.className = 'celebration-ring';
    
    ring.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      transform: translate(-50%, -50%);
      z-index: 10000;
      pointer-events: none;
    `;
    
    document.body.appendChild(ring);
    
    setTimeout(() => {
      ring.remove();
    }, 800);
  }

  showFloatingMessage(element, message) {
    const rect = element.getBoundingClientRect();
    const msgEl = document.createElement('div');
    msgEl.className = 'floating-message';
    msgEl.textContent = message;
    
    msgEl.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top - 20}px;
      transform: translate(-50%, 0);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      z-index: 10001;
      pointer-events: none;
      animation: float-up 2s ease-out forwards;
    `;
    
    // Add floating animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float-up {
        0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -10px) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -60px) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(msgEl);
    
    setTimeout(() => {
      msgEl.remove();
      style.remove();
    }, 2000);
  }

  // -------------------------
  // Floating Hearts (TikTok-style)
  // -------------------------
  createFloatingHearts(element, count = 3) {
    const rect = element.getBoundingClientRect();
    const hearts = ['❤️', '💖', '💝', '💕', '💗'];
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const heart = document.createElement('div');
        heart.className = 'heart-float';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        
        const offsetX = (Math.random() - 0.5) * 100;
        heart.style.cssText = `
          position: fixed;
          left: ${rect.left + rect.width / 2 + offsetX}px;
          top: ${rect.top + rect.height / 2}px;
          z-index: 9999;
          pointer-events: none;
        `;
        
        document.body.appendChild(heart);
        
        setTimeout(() => {
          heart.remove();
        }, 3000);
      }, i * 200);
    }
  }

  // -------------------------
  // Ripple Effect
  // -------------------------
  createRipple(element, event) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;
    
    // Add ripple animation if not exists
    if (!document.querySelector('#ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'ripple-styles';
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  // -------------------------
  // Premium Loading States
  // -------------------------
  showPremiumLoading(element, message = 'Loading...') {
    const loader = document.createElement('div');
    loader.className = 'premium-loader';
    loader.innerHTML = `
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div style="margin-top: 12px; font-weight: 500; color: #666;">${message}</div>
    `;
    
    loader.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 1000;
    `;
    
    element.style.position = 'relative';
    element.appendChild(loader);
    
    return () => loader.remove();
  }

  // -------------------------
  // Haptic Feedback (Enhanced for mobile)
  // -------------------------
  triggerHapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        celebration: [10, 30, 10, 30, 10],
        error: [100]
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
    
    // For devices that support the Vibration API with more control
    if ('vibrate' in navigator && type === 'celebration') {
      setTimeout(() => navigator.vibrate([50]), 200);
      setTimeout(() => navigator.vibrate([30]), 500);
    }
  }

  // -------------------------
  // Glow Effects
  // -------------------------
  addGlowEffect(element, color = '#3B82F6') {
    element.style.boxShadow = `0 0 20px ${color}40, 0 0 40px ${color}20`;
    element.style.transition = 'box-shadow 0.3s ease';
    
    setTimeout(() => {
      element.style.boxShadow = '';
    }, 2000);
  }

  // -------------------------
  // Tesla-style Micro-interactions
  // -------------------------
  // Safe matches function with fallback
  matches(element, selector) {
    if (!element || typeof element.matches !== 'function') return false;
    try {
      return element.matches(selector);
    } catch (e) {
      return false;
    }
  }

  setupEventListeners() {
    // Add premium hover effects to buttons
    document.addEventListener('mouseenter', (e) => {
      if (this.matches(e.target, '.btn-premium, .hi-btn, .premium-hover')) {
        e.target.style.transform = 'translateY(-2px)';
        // Add subtle glow on hover
        if (this.matches(e.target, '.btn-premium')) {
          e.target.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.4)';
        }
      }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
      if (this.matches(e.target, '.btn-premium, .hi-btn, .premium-hover')) {
        e.target.style.transform = '';
        e.target.style.boxShadow = '';
      }
    }, true);
    
    // Enhanced click effects
    document.addEventListener('click', (e) => {
      if (this.matches(e.target, '.btn-premium, .hi-btn')) {
        this.createRipple(e.target, e);
        this.triggerHapticFeedback('medium');
        
        // Add premium click animation
        e.target.style.transform = 'scale(0.98)';
        setTimeout(() => {
          e.target.style.transform = '';
        }, 150);
      }
      
      if (this.matches(e.target, '.celebration-trigger')) {
        this.celebrateSuccess(e.target);
        this.triggerHapticFeedback('celebration');
      }
      
      // Tesla-style focus rings for accessibility
      if (this.matches(e.target, '.focus-premium')) {
        e.target.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
        e.target.style.outlineOffset = '2px';
        setTimeout(() => {
          e.target.style.outline = '';
          e.target.style.outlineOffset = '';
        }, 2000);
      }
    });
    
    // Add premium scroll effects
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      document.body.classList.add('scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
      }, 150);
    });
  }

  // -------------------------
  // Intersection Observer for Animations
  // -------------------------
  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          
          // Add shimmer effect to cards when they come into view
          if (entry.target.matches('.glass-card, .hi-card, .panel')) {
            entry.target.classList.add('shimmer-effect');
            setTimeout(() => {
              entry.target.classList.remove('shimmer-effect');
            }, 2000);
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    // Observe relevant elements
    document.querySelectorAll('.glass-card, .hi-card, .panel, .hi-btn').forEach(el => {
      observer.observe(el);
    });
  }

  // -------------------------
  // Public API Methods
  // -------------------------
  
  // Method to trigger confetti manually
  confetti(options) {
    this.createConfetti(options);
  }
  
  // Method to celebrate success
  celebrate(element, message) {
    this.celebrateSuccess(element, message);
  }
  
  // Method to create particle burst
  burst(element, options) {
    this.createParticleBurst(element, options);
  }
  
  // Method to add floating hearts
  hearts(element, count) {
    this.createFloatingHearts(element, count);
  }
  
  // Method to add glow effect
  glow(element, color) {
    this.addGlowEffect(element, color);
  }
}

// Initialize Premium UX
window.PremiumUX = new PremiumUX();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PremiumUX;
}

console.log('✨ Premium UX loaded successfully!');