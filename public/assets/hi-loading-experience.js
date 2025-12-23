/**
 * 🎬 Hi Loading Experience V2.0
 * Tesla-Grade CSS-First Loading System
 * Following Stay Hi's proven architecture patterns
 */

class HiLoadingExperience {
  constructor() {
    this.overlay = null;
    this.isActive = false;
    this.audioEnabled = false;
    this.sounds = {};
    
    // Tesla-grade timing using Stay Hi patterns
    this.phases = {
      SHOW: 250,     // Fade in
      PULSE: 300,    // Logo pulse
      BREATHE: 200,  // Breathing animation
      HIDE: 200      // Fade out
    };
  }

  /**
   * 🚀 Start the loading experience
   * CSS-first approach with minimal JavaScript orchestration
   */
  async start(message = 'Preparing your Hi experience...') {
    if (this.isActive) return;
    this.isActive = true;

    try {
      // Create overlay using CSS-first approach
      this.createOverlay(message);
      
      // Phase 1: Show overlay (CSS animation)
      this.showOverlay();
      await this.wait(this.phases.SHOW);
      
      // Phase 2: Logo pulse (CSS animation)
      this.triggerPulse();
      if (this.audioEnabled) this.playSound('pulse');
      await this.wait(this.phases.PULSE);
      
      // Phase 3: Breathing animation (CSS animation)
      this.triggerBreathing();
      if (this.audioEnabled) this.playSound('breathe');
      await this.wait(this.phases.BREATHE);
      
      // Phase 4: Prepare for transition
      this.stopAnimations();
      await this.wait(this.phases.HIDE);
      
    } catch (error) {
      console.warn('Hi Loading Experience error:', error);
      this.cleanup();
    }
  }

  /**
   * 🎨 Create overlay with minimal DOM manipulation
   */
  createOverlay(message) {
    // Remove any existing overlay
    this.cleanup();
    
    // Create overlay structure
    this.overlay = document.createElement('div');
    this.overlay.className = 'hi-loading-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-label', 'Loading Stay Hi application');
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'hi-loading-content';
    
    // Hi logo
    const logo = document.createElement('img');
    logo.src = 'assets/brand/hi-logo-dark.png';
    logo.alt = 'Hi';
    logo.className = 'hi-loading-logo';
    logo.loading = 'eager'; // Ensure immediate load
    
    // Loading message
    const messageEl = document.createElement('p');
    messageEl.className = 'hi-loading-message';
    messageEl.textContent = message;
    messageEl.setAttribute('aria-live', 'polite');
    
    // Assemble structure
    content.appendChild(logo);
    content.appendChild(messageEl);
    this.overlay.appendChild(content);
    
    // Add to DOM (hidden by default via CSS)
    document.body.appendChild(this.overlay);
  }

  /**
   * ✨ Show overlay using CSS animation
   */
  showOverlay() {
    if (!this.overlay) return;
    
    // Trigger CSS animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('show');
    });
  }

  /**
   * 💫 Trigger logo pulse animation
   */
  triggerPulse() {
    const logo = this.overlay?.querySelector('.hi-loading-logo');
    if (!logo) return;
    
    logo.classList.add('pulse');
    
    // Remove class after animation
    setTimeout(() => {
      logo.classList.remove('pulse');
    }, 600);
  }

  /**
   * 🌊 Trigger breathing animation
   */
  triggerBreathing() {
    const logo = this.overlay?.querySelector('.hi-loading-logo');
    if (!logo) return;
    
    logo.classList.add('breathing');
  }

  /**
   * 🛑 Stop all animations
   */
  stopAnimations() {
    const logo = this.overlay?.querySelector('.hi-loading-logo');
    if (!logo) return;
    
    logo.classList.remove('pulse', 'breathing');
  }

  /**
   * 🎵 Play sound effect (premium enhancement)
   */
  playSound(type) {
    if (!this.audioEnabled || !this.sounds[type]) return;
    
    try {
      const audio = this.sounds[type].cloneNode();
      audio.volume = 0.3; // Subtle volume
      audio.play().catch(() => {
        // Fail silently - audio is enhancement only
      });
    } catch (error) {
      // Audio not critical to experience
    }
  }

  /**
   * 🎼 Initialize sound system (optional)
   */
  async initAudio() {
    // Only if user has interacted with page (browser requirement)
    if (!document.hasFocus()) return;
    
    try {
      // Lightweight sound effects
      this.sounds.pulse = await this.loadSound('assets/sounds/hi-pulse.mp3');
      this.sounds.breathe = await this.loadSound('assets/sounds/hi-breathe.mp3');
      this.audioEnabled = true;
    } catch (error) {
      console.log('Audio enhancement unavailable:', error);
      this.audioEnabled = false;
    }
  }

  /**
   * 🔊 Load sound file
   */
  loadSound(src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => resolve(audio));
      audio.addEventListener('error', reject);
      audio.load();
    });
  }

  /**
   * 🎭 Hide and cleanup
   */
  async hide() {
    if (!this.overlay) return;
    
    this.overlay.classList.add('hide');
    this.overlay.classList.remove('show');
    
    // Wait for CSS animation to complete
    await this.wait(this.phases.HIDE);
    this.cleanup();
  }

  /**
   * 🧹 Clean up resources
   */
  cleanup() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.isActive = false;
  }

  /**
   * ⏱️ Promise-based wait
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

// Create global instance following Stay Hi patterns
window.hiLoadingExperience = new HiLoadingExperience();

// Initialize audio on first user interaction
document.addEventListener('click', () => {
  window.hiLoadingExperience.initAudio();
}, { once: true });

// ============================================================================
// AUTOMATIC SPLASH SCREENS FOR HEAVY NAVIGATIONS
// ============================================================================

/**
 * 🚀 Intercept heavy navigation events and show splash screen
 * Applies to: Dashboard, Hi Island, Welcome redirects
 */
(function initAutoSplash() {
  'use strict';

  // Pages that should show splash screen during navigation
  const SPLASH_PAGES = [
    'hi-dashboard.html',
    'hi-island.html',
    'hi-island-NEW.html',
    'hi-muscle.html',
    'welcome.html'
  ];

  // Check if current navigation should show splash
  function shouldShowSplash(url) {
    if (!url) return false;
    return SPLASH_PAGES.some(page => url.includes(page));
  }

  // Intercept window.location changes
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;

  window.location.assign = function(url) {
    if (shouldShowSplash(url)) {
      window.hiLoadingExperience?.start('Loading your Hi experience...');
    }
    return originalAssign.call(window.location, url);
  };

  window.location.replace = function(url) {
    if (shouldShowSplash(url)) {
      window.hiLoadingExperience?.start('Preparing your journey...');
    }
    return originalReplace.call(window.location, url);
  };

  // Show splash on current page if it's a heavy page and loading
  if (document.readyState === 'loading') {
    const currentPage = window.location.pathname;
    if (shouldShowSplash(currentPage)) {
      window.hiLoadingExperience?.start('Loading...');
      
      // Hide when page is ready
      window.addEventListener('DOMContentLoaded', async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        await window.hiLoadingExperience?.hide();
      });
    }
  }
})();

console.log('🎬 Hi Loading Experience V3.0 initialized - Auto-splash system ready');