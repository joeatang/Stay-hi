// ===============================================
// 🔒 TESLA-GRADE AUTHENTICATION CONTROLLER
// ===============================================
// Comprehensive auth system with membership integration

class TeslaAuthController {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.currentMembership = null;
    this.authCheckInterval = null;
    
    // Listen for Supabase ready
    window.addEventListener('supabase-ready', this.initialize.bind(this));
    
    // Initialize if Supabase already ready
    if (window.sb) {
      this.initialize();
    }
  }

  // Initialize authentication system
  async initialize() {
    if (this.initialized) return;
    
    console.log('🔒 Initializing Tesla Auth Controller...');
    
    try {
      // Set up auth state listener
      if (window.sb) {
        window.sb.auth.onAuthStateChange((event, session) => {
          this.handleAuthStateChange(event, session);
        });
      }
      
      // Check current auth state
      await this.checkAuthState();
      
      // Start periodic membership checks (every 5 minutes)
      this.authCheckInterval = setInterval(() => {
        this.checkMembershipStatus();
      }, 5 * 60 * 1000);
      
      this.initialized = true;
      console.log('✅ Tesla Auth Controller initialized');
      
      // Emit ready event
      window.dispatchEvent(new CustomEvent('tesla-auth-ready', {
        detail: { controller: this }
      }));
      
    } catch (error) {
      console.error('❌ Tesla Auth Controller initialization failed:', error);
    }
  }

  // Handle Supabase auth state changes
  async handleAuthStateChange(event, session) {
    console.log('🔒 Auth state changed:', event, !!session);
    
    switch (event) {
      case 'SIGNED_IN':
        await this.handleSignIn(session);
        break;
      case 'SIGNED_OUT':
        await this.handleSignOut();
        break;
      case 'TOKEN_REFRESHED':
        console.log('🔄 Token refreshed');
        await this.checkMembershipStatus();
        break;
    }
  }

  // Handle successful sign-in
  async handleSignIn(session) {
    this.currentUser = session.user;
    
    try {
      // Get or create membership
      await this.checkMembershipStatus();
      
      // Track sign-in event
      await this.trackFeatureUsage('user_signin');
      
      console.log('✅ User signed in successfully:', this.currentUser.email);
      
      // Emit sign-in event
      window.dispatchEvent(new CustomEvent('tesla-auth-signin', {
        detail: { user: this.currentUser, membership: this.currentMembership }
      }));
      
    } catch (error) {
      console.error('❌ Post sign-in setup failed:', error);
    }
  }

  // Handle sign-out
  async handleSignOut() {
    console.log('🔒 User signed out');
    
    this.currentUser = null;
    this.currentMembership = null;
    
    // Clear any cached data
    this.clearLocalCache();
    
    // Emit sign-out event
    window.dispatchEvent(new CustomEvent('tesla-auth-signout'));
  }

  // Check current authentication state
  async checkAuthState() {
    if (!window.sb) {
      console.warn('🔒 Supabase not available for auth check');
      return false;
    }
    
    try {
      const { data: { session }, error } = await window.sb.auth.getSession();
      
      if (error) {
        console.error('🔒 Auth check error:', error);
        return false;
      }
      
      if (session?.user) {
        this.currentUser = session.user;
        await this.checkMembershipStatus();
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('🔒 Auth state check failed:', error);
      return false;
    }
  }

  // Check membership status
  async checkMembershipStatus() {
    if (!this.currentUser || !window.sb) return null;
    
    try {
      console.log('🔒 Checking membership status...');
      
      const { data, error } = await window.sb.rpc('get_my_membership');
      
      if (error) {
        console.error('🔒 Membership check error:', error);
        return null;
      }
      
      this.currentMembership = data;
      console.log('✅ Membership status:', data);
      
      // Check if trial is expiring soon (< 2 days)
      if (data.is_trial && data.trial_days_remaining <= 2) {
        this.showTrialExpirationNotice(data.trial_days_remaining);
      }
      
      // Check if membership has expired
      if (!data.is_member) {
        this.handleExpiredMembership();
      }
      
      // Emit membership update event
      window.dispatchEvent(new CustomEvent('tesla-auth-membership-update', {
        detail: { membership: this.currentMembership }
      }));
      
      return this.currentMembership;
      
    } catch (error) {
      console.error('🔒 Membership status check failed:', error);
      return null;
    }
  }

  // Use invitation code
  async useInvitationCode(code) {
    if (!code || !window.sb) {
      throw new Error('Invalid code or Supabase not available');
    }
    
    try {
      console.log('🎫 Using invitation code:', code);
      
      const { data, error } = await window.sb.rpc('use_invitation_code', { p_code: code });
      
      if (error) {
        throw new Error(error.message || 'Failed to use invitation code');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid invitation code');
      }
      
      // Update current membership
      this.currentMembership = data.membership;
      
      console.log('✅ Invitation code used successfully');
      
      // Track usage
      await this.trackFeatureUsage('invitation_code_used', { code });
      
      // Emit event
      window.dispatchEvent(new CustomEvent('tesla-auth-code-used', {
        detail: { code, membership: this.currentMembership }
      }));
      
      return data;
      
    } catch (error) {
      console.error('❌ Failed to use invitation code:', error);
      throw error;
    }
  }

  // Cancel membership
  async cancelMembership(reason = 'user_requested') {
    if (!this.currentUser || !window.sb) {
      throw new Error('Not authenticated');
    }
    
    try {
      console.log('❌ Cancelling membership:', reason);
      
      const { data, error } = await window.sb.rpc('cancel_membership', { p_reason: reason });
      
      if (error) {
        throw new Error(error.message || 'Failed to cancel membership');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Cancellation failed');
      }
      
      // Update membership status
      await this.checkMembershipStatus();
      
      console.log('✅ Membership cancelled:', data.message);
      
      // Track cancellation
      await this.trackFeatureUsage('membership_cancelled', { reason });
      
      // Emit event
      window.dispatchEvent(new CustomEvent('tesla-auth-membership-cancelled', {
        detail: { reason, message: data.message, access_until: data.access_until }
      }));
      
      return data;
      
    } catch (error) {
      console.error('❌ Failed to cancel membership:', error);
      throw error;
    }
  }

  // Sign out user
  async signOut() {
    if (!window.sb) return;
    
    try {
      console.log('🔒 Signing out user...');
      
      await window.sb.auth.signOut();
      
      // handleSignOut() will be called via auth state listener
      
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      // Force local cleanup even if remote sign out failed
      this.handleSignOut();
    }
  }

  // Check if user has access to a feature
  hasFeatureAccess(featureName) {
    if (!this.currentMembership) return false;
    
    const { features_enabled = [], status } = this.currentMembership;
    
    // No access if membership is not active
    if (status !== 'active') return false;
    
    // Check if feature is in enabled list
    return features_enabled.includes(featureName);
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Check if user has active membership
  hasActiveMembership() {
    return !!(this.currentMembership?.is_member && this.currentMembership?.status === 'active');
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get current membership
  getCurrentMembership() {
    return this.currentMembership;
  }

  // Track feature usage
  async trackFeatureUsage(featureName, metadata = {}) {
    if (!this.currentUser || !window.sb) return;
    
    try {
      await window.sb.rpc('track_feature_usage', {
        p_feature_name: featureName,
        p_metadata: metadata
      });
    } catch (error) {
      console.warn('⚠️ Failed to track feature usage:', error);
    }
  }

  // Show trial expiration notice
  showTrialExpirationNotice(daysRemaining) {
    const message = daysRemaining === 0 
      ? 'Your trial expires today! Upgrade to continue using Stay Hi.'
      : `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Upgrade to continue using Stay Hi.`;
    
    // Create toast notification
    this.showNotification(message, 'warning', {
      action: 'Upgrade Now',
      actionCallback: () => this.showUpgradeModal()
    });
  }

  // Handle expired membership
  handleExpiredMembership() {
    console.log('⚠️ Membership has expired');
    
    // Show modal or redirect to upgrade page
    this.showNotification('Your membership has expired. Please renew to continue using Stay Hi.', 'error', {
      action: 'Renew Membership',
      actionCallback: () => this.showUpgradeModal()
    });
  }

  // Show upgrade modal (placeholder - implement based on your modal system)
  showUpgradeModal() {
    console.log('💎 Showing upgrade modal...');
    // This will integrate with your existing modal system
    // For now, redirect to membership page
    window.location.href = '/membership-upgrade.html';
  }

  // Show notification (placeholder - integrate with your notification system)
  showNotification(message, type = 'info', options = {}) {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `tesla-auth-toast tesla-auth-toast--${type}`;
    toast.innerHTML = `
      <div class="toast-message">${message}</div>
      ${options.action ? `<button class="toast-action">${options.action}</button>` : ''}
    `;
    
    document.body.appendChild(toast);
    
    // Add event listener for action button
    if (options.action && options.actionCallback) {
      toast.querySelector('.toast-action').addEventListener('click', options.actionCallback);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Clear local cache
  clearLocalCache() {
    try {
      // Clear any cached auth data
      localStorage.removeItem('tesla_auth_cache');
      localStorage.removeItem('membership_cache');
      
      // Clear session storage
      sessionStorage.clear();
      
    } catch (error) {
      console.warn('⚠️ Failed to clear local cache:', error);
    }
  }

  // Cleanup
  destroy() {
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }
    
    this.currentUser = null;
    this.currentMembership = null;
    this.initialized = false;
  }
}

// Global instance
window.TeslaAuth = new TeslaAuthController();

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugAuth = () => {
    console.group('🔒 Tesla Auth Debug');
    console.log('Initialized:', window.TeslaAuth.initialized);
    console.log('Current User:', window.TeslaAuth.currentUser);
    console.log('Current Membership:', window.TeslaAuth.currentMembership);
    console.log('Is Authenticated:', window.TeslaAuth.isAuthenticated());
    console.log('Has Active Membership:', window.TeslaAuth.hasActiveMembership());
    console.groupEnd();
  };
  
  console.log('🔧 Development auth helper available: debugAuth()');
}

// Global exposure for compatibility
window.TeslaAuthController = TeslaAuthController;