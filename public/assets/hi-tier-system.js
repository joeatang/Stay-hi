// 🎯 TESLA-GRADE AUTHENTICATION TIER SYSTEM
// Integrates with existing progressive-auth.js and Hi database foundation
// Provides bulletproof tier detection with temporal access code support

class HiAuthTierSystem {
  constructor() {
    this.currentTier = 0;
    this.tierExpiry = null;
    this.session = null;
    this.memberData = null;
    this.capabilities = new Set();
    this.onTierChange = new Set();
    
    console.log('🎯 Hi Auth Tier System initialized');
    this.initializeTierDetection();
  }

  // Initialize tier detection system
  async initializeTierDetection() {
    try {
      // Wait for Supabase to be available
      await this.waitForSupabase();
      
      // Detect current authentication state
      await this.detectCurrentTier();
      
      // Set up tier monitoring
      this.setupTierMonitoring();
      
      console.log(`✅ Current tier detected: ${this.currentTier} (${this.getTierName()})`);
      
    } catch (error) {
      console.error('❌ Tier detection failed:', error);
      this.setTier(0); // Default to anonymous
    }
  }

  // Wait for Supabase client to be available
  async waitForSupabase() {
    let attempts = 0;
    while (!this.getSupabaseClient() && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.getSupabaseClient()) {
      throw new Error('Supabase client not available');
    }
  }

  // Get Supabase client with multiple fallback methods
  getSupabaseClient() {
    return window.getSupabase?.() || 
           window.supabaseClient || 
           window.sb || 
           window.supabase;
  }

  // Detect current authentication tier
  async detectCurrentTier() {
    const supabase = this.getSupabaseClient();
    
    try {
      // Check if supabase.auth is available (defensive check)
      if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== 'function') {
        console.warn('⚠️ Tier system: Supabase auth not ready, defaulting to anonymous');
        this.setTier(0);
        return;
      }
      
      // Check authentication status
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Anonymous user (Tier 0)
        this.setTier(0);
        return;
      }

      this.session = session;
      
      // Get member data including tier information
      const { data: memberData, error: memberError } = await supabase
        .from('hi_members')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (memberError || !memberData) {
        // Authenticated but no member profile (needs creation)
        this.setTier(1);
        return;
      }

      this.memberData = memberData;
      
      // Check for pending Stan membership
      await this.checkPendingStanMembership(session.user.email);
      
      // Check if temporal access has expired
      if (memberData.tier_expires_at) {
        const expiryDate = new Date(memberData.tier_expires_at);
        if (expiryDate < new Date()) {
          // Check if it's a Stan subscription that needs renewal
          if (memberData.stan_customer_id && memberData.subscription_status === 'active') {
            console.log('⚠️ Stan subscription expired - checking for renewal...');
            // Don't auto-downgrade Stan customers - they need to renew
            this.setTier(1); // Keep basic access until renewal
            return;
          }
          // Expired - downgrade to Tier 1
          await this.handleTierExpiry();
          return;
        }
        this.tierExpiry = expiryDate;
      }

      // Set current tier based on member data
      this.setTier(memberData.access_tier || 1);
      
    } catch (error) {
      console.error('Error detecting tier:', error);
      this.setTier(0); // Default to anonymous on error
    }
  }

  // Set current tier and update capabilities
  setTier(tier) {
    const oldTier = this.currentTier;
    this.currentTier = tier;
    this.updateCapabilities();
    
    // Notify tier change listeners
    if (oldTier !== tier) {
      this.notifyTierChange(tier, oldTier);
    }
  }

  // Update user capabilities based on tier
  updateCapabilities() {
    this.capabilities.clear();
    
    switch (this.currentTier) {
      case 0: // Explorer (Browse & Discover)
        this.capabilities.add('view_public_feeds');
        this.capabilities.add('tap_medallion');
        break;
        
      case 1: // Starter (Email Verified)
        this.capabilities.add('view_public_feeds');
        this.capabilities.add('tap_medallion');
        this.capabilities.add('drop_hi');
        this.capabilities.add('view_archive');
        this.capabilities.add('create_profile');
        this.capabilities.add('share_public');
        break;
        
      case 2: // Enhanced (Temporal Access)
        this.capabilities.add('view_public_feeds');
        this.capabilities.add('tap_medallion');
        this.capabilities.add('drop_hi');
        this.capabilities.add('view_archive');
        this.capabilities.add('create_profile');
        this.capabilities.add('share_public');
        this.capabilities.add('view_trends');
        this.capabilities.add('view_milestones');
        this.capabilities.add('premium_analytics');
        this.capabilities.add('cross_app_integration');
        break;
        
      case 3: // Lifetime (Special Access)
        // All capabilities
        this.capabilities.add('view_public_feeds');
        this.capabilities.add('tap_medallion');
        this.capabilities.add('drop_hi');
        this.capabilities.add('view_archive');
        this.capabilities.add('create_profile');
        this.capabilities.add('share_public');
        this.capabilities.add('view_trends');
        this.capabilities.add('view_milestones');
        this.capabilities.add('premium_analytics');
        this.capabilities.add('cross_app_integration');
        this.capabilities.add('view_hi_show');
        this.capabilities.add('admin_features');
        this.capabilities.add('beta_access');
        break;
    }
  }

  // Check if user has specific capability
  hasCapability(capability) {
    return this.capabilities.has(capability);
  }

  // Handle tier expiry
  async handleTierExpiry() {
    console.log('🔄 Temporal access expired, downgrading to Starter tier');
    
    const supabase = this.getSupabaseClient();
    
    try {
      // Update database
      await supabase
        .from('hi_members')
        .update({
          access_tier: 1,
          membership_tier: 'starter',
          tier_expires_at: null
        })
        .eq('user_id', this.session.user.id);
        
      // Update local state
      this.setTier(1);
      this.tierExpiry = null;
      
      // Show expiry notification
      this.showTierExpiryNotification();
      
    } catch (error) {
      console.error('Error handling tier expiry:', error);
    }
  }

  // Redeem access code for tier upgrade
  async redeemAccessCode(accessCode) {
    const supabase = this.getSupabaseClient();
    
    try {
      // Call the database function
      const { data, error } = await supabase.rpc('redeem_access_code', {
        user_member_id: this.memberData?.id,
        access_code: accessCode
      });

      if (error || !data?.[0]?.success) {
        throw new Error(data?.[0]?.message || 'Access code redemption failed');
      }

      const result = data[0];
      
      // Update local state
      this.setTier(result.new_tier);
      this.tierExpiry = new Date(result.expires_at);
      
      // Show success notification
      this.showTierUpgradeSuccess(result);
      
      return {
        success: true,
        tier: result.new_tier,
        expiresAt: result.expires_at
      };
      
    } catch (error) {
      console.error('Access code redemption error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check for pending Stan membership and auto-upgrade
  async checkPendingStanMembership(userEmail) {
    try {
      const supabase = this.getSupabaseClient();
      
      // Check if user has pending Stan membership
      const { data: pendingMembership, error } = await supabase.rpc('claim_pending_membership', {
        p_user_id: this.session.user.id,
        p_email: userEmail
      });
      
      if (error) {
        console.log('ℹ️ No pending Stan membership found');
        return false;
      }
      
      if (pendingMembership) {
        console.log('🎉 Stan membership claimed successfully!');
        // Refresh member data to get updated tier
        await this.detectCurrentTier();
        return true;
      }
      
    } catch (error) {
      console.error('❌ Error checking Stan membership:', error);
    }
    return false;
  }

  // Get tier name for display (enhanced for Stan tiers)
  getTierName() {
    const memberData = this.memberData;
    
    // Enhanced tier names for Stan subscribers
    if (memberData?.stan_customer_id) {
      const stanTierNames = {
        0: 'Explorer',
        1: 'Starter ($5.55/mo)', 
        2: 'Enhanced ($15.55/mo)',
        3: 'Collective ($55.55/mo)'
      };
      const tierName = stanTierNames[this.currentTier];
      if (tierName) {
        return `${tierName} - Stan Member`;
      }
    }
    
    // Standard tier names
    const names = {
      0: 'Explorer',
      1: 'Starter (Email Verified)', 
      2: 'Enhanced (Temporal Access)',
      3: 'Collective (Special Access)'
    };
    return names[this.currentTier] || 'Unknown';
  }

  // Check if feature requires upgrade and show appropriate modal
  checkFeatureAccess(feature, context) {
    if (this.hasCapability(feature)) {
      return true;
    }

    // Show upgrade modal for protected feature
    this.showUpgradeModal(context);
    return false;
  }

  // Show upgrade modal based on context
  showUpgradeModal(context) {
    if (window.showHiUpgradeModal) {
      window.showHiUpgradeModal(context, {
        currentTier: this.currentTier,
        onUpgrade: (context) => {
          this.handleUpgradeRequest(context);
        }
      });
    }
  }

  // Handle upgrade request
  handleUpgradeRequest(context) {
    // Redirect to signup with context
    const params = new URLSearchParams({
      context: context,
      action: 'signup',
      source: 'hi-island',
      tier: this.currentTier
    });
    
    window.location.href = `signin.html?${params.toString()}`;
  }

  // Set up tier monitoring (check for changes)
  setupTierMonitoring() {
    // Check tier expiry every 5 minutes
    setInterval(() => {
      if (this.tierExpiry && new Date() > this.tierExpiry) {
        this.handleTierExpiry();
      }
    }, 5 * 60 * 1000);

    // Listen for auth state changes
    const supabase = this.getSupabaseClient();
    if (supabase?.auth?.onAuthStateChange) {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        await this.detectCurrentTier();
      });
    }
  }

  // Show tier expiry notification
  showTierExpiryNotification() {
    // Use browser notification or custom toast
    if (window.showToast) {
      window.showToast('Your enhanced access has expired. Upgrade to continue enjoying premium features!', 'info');
    }
  }

  // Show tier upgrade success notification
  showTierUpgradeSuccess(result) {
    if (window.showToast) {
      const expiryDate = new Date(result.expires_at).toLocaleDateString();
      window.showToast(`🎉 Access upgraded successfully! Your enhanced tier expires on ${expiryDate}`, 'success');
    }
  }

  // Notify tier change listeners
  notifyTierChange(newTier, oldTier) {
    this.onTierChange.forEach(callback => {
      try {
        callback(newTier, oldTier);
      } catch (error) {
        console.error('Tier change listener error:', error);
      }
    });
  }

  // Add tier change listener
  onTierChanged(callback) {
    this.onTierChange.add(callback);
    return () => this.onTierChange.delete(callback);
  }

  // Get current tier info for display
  getTierInfo() {
    return {
      tier: this.currentTier,
      tierName: this.getTierName(),
      expiresAt: this.tierExpiry,
      isExpired: this.tierExpiry && new Date() > this.tierExpiry,
      capabilities: Array.from(this.capabilities)
    };
  }
}

// Initialize global tier system
window.HiTierSystem = new HiAuthTierSystem();

// Global convenience functions
window.hasHiCapability = (capability) => window.HiTierSystem.hasCapability(capability);
window.checkHiFeatureAccess = (feature, context) => window.HiTierSystem.checkFeatureAccess(feature, context);
window.redeemHiAccessCode = (code) => window.HiTierSystem.redeemAccessCode(code);
window.getHiTierInfo = () => window.HiTierSystem.getTierInfo();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HiAuthTierSystem };
}