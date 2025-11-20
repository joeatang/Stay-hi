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
      // 🚨 Prefer canonical client sources to avoid races and multiples
      let supa =
        (window.HiSupabase && typeof window.HiSupabase.getClient === 'function' && window.HiSupabase.getClient()) ||
        (typeof window.getSupabase === 'function' && window.getSupabase()) ||
        window.__HI_SUPABASE_CLIENT ||
        window.hiSupabase ||
        window.hiDB?.getSupabase?.() ||
        window.supabaseClient ||
        window.sb ||
        null;
      
      if (!supa) {
        // Wait up to 3 seconds for Supabase to initialize
        console.log('🔄 Waiting for Supabase client...');
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          supa =
            (window.HiSupabase && typeof window.HiSupabase.getClient === 'function' && window.HiSupabase.getClient()) ||
            (typeof window.getSupabase === 'function' && window.getSupabase()) ||
            window.__HI_SUPABASE_CLIENT ||
            window.hiSupabase ||
            window.hiDB?.getSupabase?.() ||
            window.supabaseClient ||
            window.sb ||
            null;
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
        // Schedule a late retry once more to recover after async UMD load
        if (!this._retryScheduled) {
          this._retryScheduled = true;
          setTimeout(() => { this.detectAuthState(); }, 2000);
        }
        return;
      }
      
      console.log('✅ Supabase client found:', supa.constructor.name);
      
      const { data: { session }, error } = await supa.auth.getSession();
      
      if (error || !session) {
        this.setAuthTier(0, 'No valid session');
        return;
      }
      
      // Validate session freshness
      const now = Date.now();
      let sessionTime = 0;
      if (typeof session.expires_at === 'number') {
        // Supabase may provide seconds since epoch
        sessionTime = session.expires_at > 1e12 ? session.expires_at : session.expires_at * 1000;
      } else if (session.expires_at) {
        sessionTime = new Date(session.expires_at).getTime();
      }
      
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
    // Attempt unified AccessGate first (non-invasive, event-driven)
    try {
      if (window.AccessGate?.request) {
        const decision = window.AccessGate.request(action);
        if (decision && decision.allow === true) {
          return true;
        }
        if (decision && decision.allow === false) {
          // AccessGateModal (if loaded) will appear; treat as pending auth
          return false;
        }
      }
    } catch(_){}
    // Fallback: legacy ProgressiveAuth contextual modal
    return await this.showContextualAuth(action, context);
  }
  
  // Show contextual authentication modal (not redirect!)
  async showContextualAuth(action, context) {
    return new Promise((resolve) => {
      // Create beautiful modal overlay
      const modal = document.createElement('div');
      modal.className = 'progressive-auth-modal';
      const titleId = 'auth-modal-title';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', titleId);
      modal.innerHTML = `
        <div class="auth-modal-backdrop" data-backdrop></div>
        <div class="auth-modal-content" role="document">
          <div class="auth-modal-header">
            <h2 id="${titleId}">✨ Ready to save your Hi?</h2>
            <p>${this.getContextualMessage(action, context)}</p>
          </div>
          
          <div class="auth-modal-body">
            <label for="auth-email" class="sr-only">Email address</label>
            <input type="email" id="auth-email" placeholder="Enter your email" class="auth-input" autocomplete="email" required>
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
      const backdrop = modal.querySelector('[data-backdrop]');

      // Focus trap and keyboard handling
      const previouslyFocused = document.activeElement;
      const focusableSelectors = [
        'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
        'textarea:not([disabled])', 'button:not([disabled])', '[tabindex]:not([tabindex="-1"])'
      ];
      function getFocusable() {
        return Array.from(modal.querySelectorAll(focusableSelectors.join(','))).filter(el => el.offsetParent !== null);
      }
      function trapFocus(e) {
        if (e.key !== 'Tab') return;
        const f = getFocusable();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      function onKeyDown(e) {
        if (e.key === 'Escape') {
          close('esc');
        } else if (e.key === 'Tab') {
          trapFocus(e);
        }
      }
      function close(reason) {
        modal.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('focus', enforceFocus, true);
        modal.remove();
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        resolve(false);
      }
      function enforceFocus(e) {
        if (!modal.contains(e.target)) {
          const f = getFocusable();
          if (f.length) f[0].focus();
          e.stopPropagation();
        }
      }
      modal.addEventListener('keydown', onKeyDown);
      document.addEventListener('focus', enforceFocus, true);
      
      submitBtn.onclick = async () => {
        const email = emailInput.value.trim();
        if (!email) return;
        
        try {
          await this.sendMagicLink(email);
          modal.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('focus', enforceFocus, true);
          modal.remove();
          this.showMagicLinkSent(email);
          resolve(false); // Will be true after magic link completion
        } catch (error) {
          console.error('Magic link failed:', error);
        }
      };
      
      cancelBtn.onclick = backdrop.onclick = () => close('cancel');
      
      // Add to DOM
      document.body.appendChild(modal);
      // Visually hidden class for label
      if (!document.getElementById('sr-only-style')) {
        const sr = document.createElement('style');
        sr.id = 'sr-only-style';
        sr.textContent = `.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`;
        document.head.appendChild(sr);
      }
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
    const redirectTo = (window.hiPostAuthPath?.getPostAuthURL ? 
      window.hiPostAuthPath.getPostAuthURL({ next: 'hi-dashboard.html' }) : 
      `${window.location.origin}/post-auth.html`);

    const { error } = await supa.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
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
try {
  console.info('[ProgressiveAuth] Deprecation notice: unified AuthCore + AccessGate superseding this system.');
  window.addEventListener('hi:membership-changed', (e)=>{
    try {
      const tier = e?.detail?.tier;
      if (!tier) return;
      if (tier === 'anonymous') {
        window.ProgressiveAuth.setAuthTier(0,'unified-membership');
      } else {
        window.ProgressiveAuth.setAuthTier(2,'unified-membership');
      }
    } catch(_){ }
  });
} catch(_){ }

// Backward compatibility
window.isAuthenticated = () => window.ProgressiveAuth.authTier >= 2;
window.requireAuth = (action) => window.ProgressiveAuth.requestAuth(action || 'access_premium_tools');

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressiveAuth;
}