// 🚀 TESLA-GRADE ANONYMOUS ACCESS MODAL SYSTEM
// Handles anonymous users trying to access protected pages with smooth UX

class AnonymousAccessModal {
  constructor() {
    this.isShown = false;
    this.overlay = null;
    this.modal = null;
    this.init();
  }
  
  init() {
    // Check if user should see anonymous modal on page load
    this.checkAccessOnLoad();
    
    // Listen for access check requests
    window.addEventListener('checkAnonymousAccess', (e) => {
      this.checkAccess(e.detail);
    });
  }
  
  async checkAccessOnLoad() {
    // Wait for auth systems to initialize
    await this.waitForAuth();
    
    // Check if current page requires authentication
    const protectedPages = ['/profile.html', '/hi-muscle.html'];
    const currentPath = window.location.pathname;
    
    if (protectedPages.some(page => currentPath.includes(page))) {
      const hasAuth = await this.checkAuthStatus();
      if (!hasAuth) {
        console.log('🔒 Anonymous user accessing protected page, showing access modal');
        this.showAccessModal();
      }
    }
  }
  
  async waitForAuth() {
    // Wait for Supabase and auth systems to load
    let attempts = 0;
    while ((!window.supabase || !window.sb) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }
  
  async checkAuthStatus() {
    try {
      // Check multiple auth indicators
      if (window.supabase) {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) return true;
      }
      
      // Check localStorage tokens
      const indicators = ['sb-access-token', 'hiAccess', 'unified_membership_cache'];
      const hasTokens = indicators.some(key => localStorage.getItem(key));
      
      return hasTokens;
    } catch (error) {
      console.log('Auth check failed:', error);
      return false;
    }
  }
  
  showAccessModal() {
    if (this.isShown) return;
    
    this.isShown = true;
    this.createModal();
    
    // Smooth fade-in animation
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      this.modal.style.transform = 'translate(-50%, -50%) scale(1)';
      this.modal.style.opacity = '1';
    });
  }
  
  createModal() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    `;
    
    // Create modal
    this.modal = document.createElement('div');
    this.modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      background: linear-gradient(135deg, #0F0F23 0%, #1A1A2E 100%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: min(400px, 90vw);
      width: 100%;
      text-align: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    `;
    
    this.modal.innerHTML = `
      <div style="margin-bottom: 24px;">
        <div style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD93D, #FF7B24);
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        ">🔒</div>
        <h2 style="
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #FFD93D, #4ECDC4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">Join Hi Collective</h2>
        <p style="
          font-size: 16px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        ">This page requires membership to access all features. Join our community to unlock your full Hi experience!</p>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="joinBtn" style="
          background: linear-gradient(135deg, #FFD93D, #FF7B24);
          border: none;
          color: #111;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        ">✨ Join Hi Collective</button>
        
        <button id="exploreBtn" style="
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        ">🌟 Explore Anonymously</button>
        
        <button id="backBtn" style="
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 12px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        ">← Back to Home</button>
      </div>
    `;
    
    // Add event listeners
    this.modal.querySelector('#joinBtn').addEventListener('click', () => this.joinAction());
    this.modal.querySelector('#exploreBtn').addEventListener('click', () => this.exploreAction());
    this.modal.querySelector('#backBtn').addEventListener('click', () => this.backAction());
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.backAction();
      }
    });
    
    // Append to body
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);
    
    // Add hover effects
    this.addHoverEffects();
  }
  
  addHoverEffects() {
    const joinBtn = this.modal.querySelector('#joinBtn');
    const exploreBtn = this.modal.querySelector('#exploreBtn');
    
    joinBtn.addEventListener('mouseenter', () => {
      joinBtn.style.transform = 'translateY(-2px)';
      joinBtn.style.boxShadow = '0 8px 25px rgba(255, 211, 61, 0.3)';
    });
    
    joinBtn.addEventListener('mouseleave', () => {
      joinBtn.style.transform = 'translateY(0)';
      joinBtn.style.boxShadow = 'none';
    });
    
    exploreBtn.addEventListener('mouseenter', () => {
      exploreBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      exploreBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });
    
    exploreBtn.addEventListener('mouseleave', () => {
      exploreBtn.style.background = 'transparent';
      exploreBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
  }
  
  async joinAction() {
    // Mark user intent and redirect to welcome/signup
    sessionStorage.setItem('join-intent', 'true');
    sessionStorage.setItem('return-to', window.location.pathname);
    
    // Smooth transition
    await this.hideModal();
    window.location.href = '/welcome.html';
  }
  
  async exploreAction() {
    // Enable anonymous exploration mode
    localStorage.setItem('hi_discovery_mode', 'anonymous');
    localStorage.setItem('anonymous_access_granted', Date.now().toString());
    
    // Hide modal and stay on page
    await this.hideModal();
  }
  
  async backAction() {
    // Go back to main app
    await this.hideModal();
    window.location.href = '/index.html';
  }
  
  async hideModal() {
    if (!this.isShown) return;
    
    // Fade out animation
    this.overlay.style.opacity = '0';
    this.modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
    this.modal.style.opacity = '0';
    
    // Wait for animation and cleanup
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    
    this.isShown = false;
    this.overlay = null;
    this.modal = null;
  }
}

// Initialize the anonymous access modal system
if (typeof window !== 'undefined') {
  window.anonymousAccessModal = new AnonymousAccessModal();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnonymousAccessModal;
}