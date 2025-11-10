// 🚀 Tesla-Grade Progressive Authentication System
// Enables discovery without breaking flow, scales with user engagement

class ProgressiveAuth {
  constructor() {
    this.authTier = 0; // 0=Anonymous, 1=Light, 2=Full
    this.session = null;
    this.capabilities = new Set();
    this.onAuthChange = new Set();
    
    console.log('🚀 Progressive Auth System initialized');
    this.detectAuthState();
  }
  
  // Detect current authentication state
  async detectAuthState() {
    try {
      // Retry logic for Supabase client detection (timing issues)
      let supa = window.getSupabase?.() || window.supabaseClient || window.sb;
      
      if (!supa) {
        // Wait up to 2 seconds for Supabase to initialize
        console.log('🔄 Waiting for Supabase client...');
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          supa = window.getSupabase?.() || window.supabaseClient || window.sb;
          if (supa) break;
        }
      }
      
      if (!supa) {
        console.log('❌ Supabase client still not available after waiting. Available:', {
          getSupabase: !!window.getSupabase,
          supabaseClient: !!window.supabaseClient,
          sb: !!window.sb,
          supabase: !!window.supabase
        });
        this.setAuthTier(0, 'No Supabase client');
        return;
      }
      
      console.log('✅ Supabase client found:', supa.constructor.name);
      
      const { data: { session }, error } = await supa.auth.getSession();
      
      if (error || !session) {
        this.setAuthTier(0, 'No valid session');
        return;
      }
      
      // Validate session freshness
      const now = new Date().getTime();
      const sessionTime = new Date(session.expires_at).getTime();
      
      if (sessionTime <= now) {
        this.setAuthTier(0, 'Session expired');
        return;
      }
      
      // Full authentication detected
      this.session = session;
      this.setAuthTier(2, 'Full authentication');
      
    } catch (error) {
      console.error('Auth detection failed:', error);
      this.setAuthTier(0, 'Detection error');
    }
  }
  
  // Set authentication tier and update capabilities
  setAuthTier(tier, reason = '') {
    const oldTier = this.authTier;
    this.authTier = tier;
    
    console.log(`🔒 Auth Tier: ${oldTier} → ${tier} (${reason})`);
    
    // Update capabilities based on tier
    this.updateCapabilities();
    
    // Notify subscribers
    this.notifyAuthChange();
  }
  
  // Update user capabilities based on auth tier
  updateCapabilities() {
    this.capabilities.clear();
    
    switch (this.authTier) {
      case 0: // Anonymous
        this.capabilities.add('view_feed');
        this.capabilities.add('use_basic_tools');
        this.capabilities.add('see_public_content');
        break;
        
      case 1: // Light Auth (could be future expansion)
        this.capabilities.add('view_feed');
        this.capabilities.add('use_basic_tools');
        this.capabilities.add('see_public_content');
        this.capabilities.add('create_profile');
        break;
        
      case 2: // Full Auth
        this.capabilities.add('view_feed');
        this.capabilities.add('use_basic_tools');
        this.capabilities.add('see_public_content');
        this.capabilities.add('create_profile');
        this.capabilities.add('share_hi');
        this.capabilities.add('access_dashboard');
        this.capabilities.add('see_global_map');
        this.capabilities.add('track_streaks');
        this.capabilities.add('access_premium_tools');
        break;
    }
    
    console.log('🛠️ Updated capabilities:', Array.from(this.capabilities));
  }
  
  // Check if user has specific capability
  can(action) {
    return this.capabilities.has(action);
  }
  
  // Request authentication for specific action
  async requestAuth(action, context = {}) {
    if (this.can(action)) {
      return true; // Already authorized
    }
    
    console.log(`🔐 Auth required for action: ${action}`);
    
    // Show contextual auth prompt instead of redirect
    return await this.showContextualAuth(action, context);
  }
  
  // Show contextual authentication modal (not redirect!)
  async showContextualAuth(action, context) {
    return new Promise((resolve) => {
      // Create beautiful modal overlay
      const modal = document.createElement('div');
      modal.className = 'progressive-auth-modal';
      modal.innerHTML = `
        <div class="auth-modal-backdrop"></div>
        <div class="auth-modal-content">
          <div class="auth-modal-header">
            <h2>✨ Ready to save your Hi?</h2>
            <p>${this.getContextualMessage(action, context)}</p>
          </div>
          
          <div class="auth-modal-body">
            <input type="email" id="auth-email" placeholder="Enter your email" class="auth-input">
            <button id="auth-submit" class="auth-button primary">
              🚀 Continue with Magic Link
            </button>
          </div>
          
          <div class="auth-modal-footer">
            <button id="auth-cancel" class="auth-button secondary">
              Maybe later
            </button>
          </div>
        </div>
      `;
      
      // Add modal styles
      this.addModalStyles();
      
      // Add event listeners
      const emailInput = modal.querySelector('#auth-email');
      const submitBtn = modal.querySelector('#auth-submit');
      const cancelBtn = modal.querySelector('#auth-cancel');
      const backdrop = modal.querySelector('.auth-modal-backdrop');
      
      submitBtn.onclick = async () => {
        const email = emailInput.value.trim();
        if (!email) return;
        
        try {
          await this.sendMagicLink(email);
          modal.remove();
          this.showMagicLinkSent(email);
          resolve(false); // Will be true after magic link completion
        } catch (error) {
          console.error('Magic link failed:', error);
        }
      };
      
      cancelBtn.onclick = backdrop.onclick = () => {
        modal.remove();
        resolve(false);
      };
      
      // Add to DOM
      document.body.appendChild(modal);
      emailInput.focus();
    });
  }
  
  // Get contextual message based on action
  getContextualMessage(action, context) {
    const messages = {
      'share_hi': 'Share this Hi moment with the community and track your journey!',
      'access_dashboard': 'View your personal Hi dashboard and streaks!',
      'see_global_map': 'See Hi moments from around the world!',
      'track_streaks': 'Keep track of your daily Hi moments!',
      'create_profile': 'Create your profile to personalize your experience!'
    };
    
    return messages[action] || 'Sign in to unlock this feature!';
  }
  
  // Send magic link
  async sendMagicLink(email) {
    const supa = window.getSupabase?.() || window.supabaseClient || window.sb;
    if (!supa) throw new Error('Supabase not available');
    
    const { error } = await supa.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/post-auth.html`
      }
    });
    
    if (error) throw error;
  }
  
  // Show magic link sent confirmation
  showMagicLinkSent(email) {
    // Create confirmation toast/modal
    console.log(`✅ Magic link sent to ${email}`);
    
    // You could add a nice toast notification here
    if (window.toast) {
      window.toast(`📧 Magic link sent to ${email}!`);
    }
  }
  
  // Add modal styles
  addModalStyles() {
    if (document.getElementById('progressive-auth-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'progressive-auth-styles';
    styles.textContent = `
      .progressive-auth-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .auth-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
      }
      
      .auth-modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        animation: modalSlideIn 0.3s ease-out;
      }
      
      @keyframes modalSlideIn {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .auth-modal-header h2 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 24px;
      }
      
      .auth-modal-header p {
        margin: 0 0 24px 0;
        color: #666;
        line-height: 1.5;
      }
      
      .auth-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #eee;
        border-radius: 8px;
        font-size: 16px;
        margin-bottom: 16px;
        box-sizing: border-box;
      }
      
      .auth-input:focus {
        outline: none;
        border-color: #007bff;
      }
      
      .auth-button {
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        margin: 4px;
      }
      
      .auth-button.primary {
        background: #007bff;
        color: white;
        width: 100%;
      }
      
      .auth-button.secondary {
        background: transparent;
        color: #666;
      }
      
      .auth-button:hover {
        opacity: 0.9;
      }
      
      .auth-modal-footer {
        text-align: center;
        margin-top: 16px;
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  // Subscribe to auth changes
  onAuthStateChange(callback) {
    this.onAuthChange.add(callback);
    return () => this.onAuthChange.delete(callback);
  }
  
  // Notify subscribers of auth changes
  notifyAuthChange() {
    this.onAuthChange.forEach(callback => {
      try {
        callback({
          tier: this.authTier,
          capabilities: Array.from(this.capabilities),
          session: this.session
        });
      } catch (error) {
        console.error('Auth change callback error:', error);
      }
    });
  }
  
  // Manual authentication trigger
  async authenticate() {
    return await this.requestAuth('access_premium_tools');
  }
  
  // Sign out
  async signOut() {
    try {
      const supa = window.getSupabase?.() || window.supabaseClient || window.sb;
      if (supa && this.session) {
        await supa.auth.signOut();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      this.session = null;
      this.setAuthTier(0, 'Signed out');
    }
  }
  
  // Get current auth state for UI
  getAuthState() {
    return {
      tier: this.authTier,
      isAnonymous: this.authTier === 0,
      isAuthenticated: this.authTier >= 2,
      capabilities: Array.from(this.capabilities),
      session: this.session
    };
  }
}

// Global instance
window.ProgressiveAuth = new ProgressiveAuth();

// Backward compatibility
window.isAuthenticated = () => window.ProgressiveAuth.authTier >= 2;
window.requireAuth = (action) => window.ProgressiveAuth.requestAuth(action || 'access_premium_tools');

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressiveAuth;
}