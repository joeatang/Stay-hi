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
    this.checkInProgress = false; // Guard against duplicate checks
    
    // Check immediately on init
    setTimeout(() => {
      this.checkAccessOnLoad();
    }, 100); // Very short delay to ensure DOM is ready
    
    // Also check after a longer delay in case of slow loading
    setTimeout(() => {
      if (!this.isShown && !this.checkInProgress) {
        this.checkAccessOnLoad();
      }
    }, 2000);
    
    // Listen for access check requests
    window.addEventListener('checkAnonymousAccess', (e) => {
      this.checkAccess(e.detail);
    });
  }
  
  async checkAccessOnLoad() {
    if (this.checkInProgress) {
      console.log('🔍 Anonymous Access Modal: Check already in progress, skipping');
      return;
    }
    
    this.checkInProgress = true;
    console.log('🔍 Anonymous Access Modal: Starting checkAccessOnLoad');
    
    // Check if current page requires authentication
    const protectedPages = ['/profile.html'];
    const currentPath = window.location.pathname;
    
    console.log(`🛤️ Current path: ${currentPath}`);
    console.log(`🔒 Protected pages: ${protectedPages}`);
    
    if (protectedPages.some(page => currentPath.includes(page))) {
      console.log('✅ This is a protected page, checking auth immediately...');
      
      // Quick auth check first (no waiting)
      const quickAuthCheck = await this.quickAuthCheck();
      
      if (quickAuthCheck === false) {
        console.log('🔒 Quick auth check failed - showing modal immediately');
        this.showAccessModal();
        return;
      }
      
      // Wait for auth systems to initialize
      await this.waitForAuth();
      
      // More thorough auth check after systems load
      const hasAuth = await this.checkAuthStatus();
      
      console.log(`🔐 Thorough auth check result: ${hasAuth}`);
      
      // Show modal if no clear authentication found
      if (hasAuth === false) {
        console.log('🔒 No authentication detected, showing access modal');
        this.showAccessModal();
      } else if (hasAuth === true) {
        console.log('🔓 User is authenticated, allowing access');
      } else {
        // If uncertain, check for anonymous exploration mode first
        const anonymousAccess = localStorage.getItem('anonymous_access_granted');
        const discoveryMode = localStorage.getItem('hi_discovery_mode');
        
        if (anonymousAccess || discoveryMode === 'anonymous') {
          console.log('🌟 Anonymous exploration mode detected, allowing access');
        } else {
          console.log('❓ Auth status uncertain, showing modal for safety');
          this.showAccessModal();
        }
      }
    } else {
      console.log('🟢 This is NOT a protected page, no modal needed');
    }
    
    // Clear the progress flag when check completes
    this.checkInProgress = false;
  }

  async quickAuthCheck() {
    console.log('⚡ Performing quick auth check...');
    
    // Check localStorage tokens immediately (no waiting)
    const tokenKeys = [
      'sb-access-token', 
      'sb-refresh-token',
      'hiAccess',
      'supabase.auth.token'
    ];
    
    const hasTokens = tokenKeys.some(key => {
      const value = localStorage.getItem(key);
      return value && value !== 'null' && value !== 'undefined' && value.length > 0;
    });
    
    if (hasTokens) {
      console.log('⚡ Quick check: Auth tokens found');
      return true;
    }
    
    // Check for anonymous exploration mode
    const anonymousAccess = localStorage.getItem('anonymous_access_granted');
    const discoveryMode = localStorage.getItem('hi_discovery_mode');
    
    if (anonymousAccess || discoveryMode === 'anonymous') {
      console.log('⚡ Quick check: Anonymous exploration mode active');
      return true;
    }
    
    console.log('⚡ Quick check: No authentication found');
    return false;
  }
  
  async waitForAuth() {
    // Wait for Supabase and auth systems to load with better detection
    let attempts = 0;
    while (attempts < 100) { // Longer timeout
      if (window.supabase || window.supabaseClient || window.sb || 
          (window.HiSupabase && typeof window.HiSupabase.getClient === 'function')) {
        console.log('🔓 Auth system detected, continuing...');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    console.log('⚠️ Auth systems not detected after timeout');
    return false;
  }
  
  async checkAuthStatus() {
    try {
      console.log('🔍 Starting comprehensive auth status check...');
      
      // Method 1: Check Supabase user
      if (window.supabase && window.supabase.auth && typeof window.supabase.auth.getUser === 'function') {
        try {
          const { data: { user } } = await window.supabase.auth.getUser();
          if (user) {
            console.log('✅ Supabase user found:', user.id);
            return true;
          } else {
            console.log('❌ Supabase user is null');
          }
        } catch (e) {
          console.log('⚠️ Supabase user check failed:', e.message);
        }
      } else {
        console.log('❌ window.supabase or auth.getUser not available');
      }
      
      if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.getUser === 'function') {
        try {
          const { data: { user } } = await window.supabaseClient.auth.getUser();
          if (user) {
            console.log('✅ SupabaseClient user found:', user.id);
            return true;
          } else {
            console.log('❌ SupabaseClient user is null');
          }
        } catch (e) {
          console.log('⚠️ SupabaseClient user check failed:', e.message);
        }
      } else {
        console.log('❌ window.supabaseClient or auth.getUser not available');
      }
      
      // Method 2: Check localStorage tokens (multiple indicators)
      const tokenKeys = [
        'sb-access-token', 
        'sb-refresh-token',
        'hiAccess',
        'supabase.auth.token'
      ];
      
      console.log('🔍 Checking localStorage tokens...');
      let foundTokens = [];
      
      tokenKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && value !== 'null' && value !== 'undefined' && value.length > 0) {
          foundTokens.push(key);
          console.log(`✅ Found token: ${key}`);
        }
      });
      
      if (foundTokens.length > 0) {
        console.log(`✅ Auth tokens found: ${foundTokens.join(', ')}`);
        return true;
      }
      
      // Method 3: Check session storage
      const sessionKeys = ['supabase.auth.session'];
      console.log('🔍 Checking sessionStorage...');
      
      let foundSessions = [];
      sessionKeys.forEach(key => {
        const value = sessionStorage.getItem(key);
        if (value && value !== 'null' && value !== 'undefined' && value.length > 0) {
          foundSessions.push(key);
          console.log(`✅ Found session: ${key}`);
        }
      });
      
      if (foundSessions.length > 0) {
        console.log(`✅ Auth session found: ${foundSessions.join(', ')}`);
        return true;
      }
      
      // If we get here, no clear authentication found
      console.log('❌ No authentication found - user appears to be anonymous');
      return false;
      
    } catch (error) {
      console.log('⚠️ Auth check failed with error:', error);
      return false;
    }
  }
  
  showAccessModal() {
    if (this.isShown) {
      console.log('⚠️ Modal already shown, skipping duplicate request');
      return;
    }
    
    console.log('🚀 Showing anonymous access modal');
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
      z-index: 10001;
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
    
    // Emergency escape mechanisms
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isShown) {
        console.log('🚪 Emergency escape - Escape key pressed');
        this.exploreAction(); // Allow exploration instead of blocking
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Safety timeout - auto-dismiss after 30 seconds to prevent permanent blocking
    this.safetyTimeout = setTimeout(() => {
      if (this.isShown) {
        console.log('🚪 Safety timeout - Auto-dismissing modal after 30 seconds');
        this.exploreAction();
      }
    }, 30000);
    
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
    window.location.href = '/public/hi-dashboard.html';
  }
  
  async exploreAction() {
    // Enable anonymous exploration mode
    localStorage.setItem('hi_discovery_mode', 'anonymous');
    localStorage.setItem('anonymous_access_granted', Date.now().toString());
    
    // Hide modal and stay on page
    await this.hideModal();
  }
  
  async backAction() {
    // Go back to main app/dashboard
    await this.hideModal();
    window.location.href = '/public/hi-dashboard.html';
  }
  
  async hideModal() {
    if (!this.isShown) return;
    
    console.log('🚪 Hiding anonymous access modal');
    
    // Clear safety timeout
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }
    
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