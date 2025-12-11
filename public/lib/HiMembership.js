/**
 * lib/HiMembership.js
 * CONSOLIDATED: 2025-11-01 from assets/unified-membership-system.js
 * 🏆 UNIFIED MEMBERSHIP SYSTEM - TESLA GRADE
 * Single source of truth with time-based progression
 * Extensible foundation for future premium tiers
 * 
 * UPDATED: 2025-11-22 - Now imports from TIER_CONFIG.js for all tier definitions
 * NOTE: TIER_CONFIG.js must be loaded before this file (add script tag in HTML)
 */

class UnifiedMembershipSystem {
  constructor() {
    this.currentUser = null;
    this.membershipStatus = null;
    this.sessionStart = Date.now();
    this.interactionCount = 0;
    this.supabase = null;
    this.init();
  }

  // Tesla-grade initialization with bulletproof fallbacks
  async init() {
    try {
      // Wait for Supabase to be ready
      this.supabase = await this.waitForSupabase();
      
      // Load user session from database (source of truth)
      await this.loadMembershipStatus();
      
      // Set up session monitoring
      this.setupSessionMonitoring();
      
      console.log('🏆 Unified Membership System initialized');
    } catch (error) {
      console.error('❌ Membership system initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  async waitForSupabase() {
    // Import HiSupabase v3 directly (Hi-Grade approach)
    try {
      const module = await import('./HiSupabase.v3.js');
      return module.supabase;
    } catch (error) {
      console.error('Failed to load HiSupabase v3:', error);
      throw new Error('Supabase not available');
    }
  }

  // Load membership status from database (single source of truth)
  async loadMembershipStatus() {
    try {
      if (!this.supabase) {
        this.setAnonymousAccess();
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user) {
        this.setAnonymousAccess();
        return;
      }

      this.currentUser = user;

      // Get membership from database (with fallback)
      let membership, memberError;
      
      try {
        // Try unified function first
        const result = await this.supabase.rpc('get_unified_membership');
        membership = result.data;
        memberError = result.error;
      } catch (error) {
        // Fallback to existing get_my_membership function
        console.log('🔄 Using fallback membership function');
        const result = await this.supabase.rpc('get_my_membership');
        membership = result.data;
        memberError = result.error;
        
        // Transform existing response to unified format
        if (membership) {
          membership = this.transformLegacyResponse(membership);
        }
      }
      
      if (memberError) {
        console.error('❌ Membership lookup failed:', memberError);
        this.setAnonymousAccess();
        return;
      }

      // 🛑 CRITICAL FIX: Handle null/undefined/empty membership data from database
      // Check for: null, undefined, empty object, or object without tier
      if (!membership || (typeof membership === 'object' && !membership.tier)) {
        console.warn('⚠️ No membership data returned from database', { membership, userId: user.id });
        
        // 🔧 DEV AUTO-PROVISION: Create premium membership for specific dev user
        const DEV_USER_ID = '7878a4d0-0df3-4a43-a3e9-26449d44db5f';
        if (user.id === DEV_USER_ID) {
          console.log('🔧 DEV MODE: Auto-provisioning premium membership for dev user');
          
          // ⚡ IMMEDIATE FALLBACK: Use local premium membership without database
          // This ensures dev experience is not blocked by database issues
          membership = {
            tier: 'premium',
            level: 5,
            status: 'active',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            days_remaining: 365,
            can_access_calendar: true,
            can_access_hi_muscle: true,
            upgrade_available: false,
            features: this.getFeaturesByTier('premium'),
            isAnonymous: false,
            is_admin: false,
            _dev_mode: true // Flag to indicate this is a dev-provisioned membership
          };
          
          console.log('✅ DEV: Using local premium membership (features fully unlocked)', membership);
          
          // Try to persist to database in background (non-blocking)
          setTimeout(async () => {
            try {
              console.log('🔧 Attempting background database sync for dev membership...');
              const { error: insertError } = await this.supabase
                .from('memberships')
                .upsert({
                  user_id: user.id,
                  tier: 'premium',
                  status: 'active',
                  created_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                }, { 
                  onConflict: 'user_id'
                });
              
              if (insertError) {
                console.warn('⚠️ Background DB sync failed (RLS policy?), continuing with local membership');
                console.log('📋 Run CREATE_PREMIUM_MEMBERSHIP.sql in Supabase to persist membership');
              } else {
                console.log('✅ Dev membership synced to database');
              }
            } catch (err) {
              console.warn('⚠️ Background sync exception:', err.message);
            }
          }, 1000);
        } else {
          // Non-dev user with no membership → anonymous access
          this.setAnonymousAccess();
          return;
        }
      }

      this.membershipStatus = membership;
      try {
        localStorage.setItem('isAdmin', membership?.is_admin ? 'true' : 'false');
      } catch {}
      this.saveMembershipCache();
      this.notifyMembershipChange();
      
      // Proactively update tier pill if helper exists
      try {
        if (window.HiBrandTiers?.updateTierPill && membership?.tier) {
          window.HiBrandTiers.updateTierPill(membership.tier);
        }
      } catch {}
      
      console.log('✅ Membership loaded:', membership);
      
    } catch (error) {
      console.error('❌ Membership loading error:', error);
      this.setAnonymousAccess();
    }
  }

  // Transform legacy get_my_membership response to unified format
  transformLegacyResponse(legacyData) {
    // Handle different legacy response formats
    if (legacyData.status === 'no_membership' || legacyData.signup_required) {
      return {
        tier: 'anonymous',
        status: legacyData.signup_required ? 'anonymous' : 'no_membership',
        expires_at: null,
        days_remaining: null,
        can_access_calendar: false,
        can_access_hi_muscle: false,
        upgrade_available: true,
        signup_required: legacyData.signup_required || false,
        features: this.getFeaturesByTier('anonymous'),
        isAnonymous: true
      };
    }
    
    // CRITICAL FIX: Add features object based on tier
    const tier = legacyData.tier || 'anonymous';
    const features = this.getFeaturesByTier(tier);
    const isAnonymous = tier === 'anonymous' || tier === 'free';
    
    // If it's already in unified format with features, return as-is
    if (legacyData.tier && legacyData.features) {
      return legacyData;
    }
    
    // Transform with features added
    return {
      tier: tier,
      status: legacyData.status || 'active',
      expires_at: legacyData.expires_at || legacyData.trial_end || null,
      days_remaining: legacyData.days_remaining || null,
      can_access_calendar: !isAnonymous,
      can_access_hi_muscle: !isAnonymous,
      upgrade_available: tier !== 'collective',
      signup_required: false,
      features: features,
      isAnonymous: isAnonymous,
      is_admin: legacyData.is_admin || false
    };
  }

  // CRITICAL FIX: Define features for each tier
  // UPDATED: Now imports from TIER_CONFIG.js instead of hardcoding
  getFeaturesByTier(tier) {
    // Check if TIER_CONFIG is available globally
    if (typeof window !== 'undefined' && window.HiTierConfig) {
      return window.HiTierConfig.getTierFeatures(tier);
    }
    
    // Fallback: Use basic tier features if TIER_CONFIG not loaded
    console.warn('[HiMembership] TIER_CONFIG not loaded, using fallback features');
    const tierFeatures = {
      'anonymous': {
        hiMedallionInteractions: 10,
        mapAccess: 'preview',
        shareCreation: false,
        profileAccess: 'view_only',
        hiMuscleAccess: false,
        calendarAccess: false
      },
      'free': {
        hiMedallionInteractions: 10,
        mapAccess: 'preview',
        shareCreation: false,
        profileAccess: 'view_only',
        hiMuscleAccess: false,
        calendarAccess: false
      },
      'bronze': {
        hiMedallionInteractions: 50,
        mapAccess: 'limited',
        shareCreation: 10,
        profileAccess: 'basic',
        hiMuscleAccess: true,
        calendarAccess: false
      },
      'silver': {
        hiMedallionInteractions: 100,
        mapAccess: 'full',
        shareCreation: 50,
        profileAccess: 'full',
        hiMuscleAccess: true,
        calendarAccess: true
      },
      'gold': {
        hiMedallionInteractions: 'unlimited',
        mapAccess: 'full',
        shareCreation: 'unlimited',
        profileAccess: 'full',
        hiMuscleAccess: true,
        calendarAccess: true
      },
      'premium': {
        hiMedallionInteractions: 'unlimited',
        mapAccess: 'full',
        shareCreation: 'unlimited',
        profileAccess: 'full',
        hiMuscleAccess: true,
        calendarAccess: true
      },
      'collective': {
        hiMedallionInteractions: 'unlimited',
        mapAccess: 'full',
        shareCreation: 'unlimited',
        profileAccess: 'full',
        hiMuscleAccess: true,
        calendarAccess: true,
        adminPanel: true,
        userManagement: true,
        inviteCodeGeneration: 'unlimited'
      }
    };

    return tierFeatures[tier] || tierFeatures['free'];
  }

  // Set anonymous access (default state)
  setAnonymousAccess() {
    this.membershipStatus = {
      tier: 'anonymous',
      level: 0,
      duration: null,
      expiresAt: null,
      features: {
        hiMedallionInteractions: 'unlimited_readonly',
        mapAccess: 'limited_5_locations',
        shareCreation: false,
        profileAccess: false,
        hiMuscleAccess: false,
        calendarAccess: false, // ✅ Anonymous users can't access calendar
        communityStats: 'view_only'
      },
      isAnonymous: true
    };
    
    this.saveMembershipCache();
    this.notifyMembershipChange();
  }

  // Activate invite code (creates/updates membership in database)
  async activateInviteCode(code) {
    try {
      if (!this.supabase) {
        throw new Error('Database not available');
      }

      // Call unified invite code activation
      const { data: result, error } = await this.supabase.rpc('activate_unified_invite_code', {
        invite_code: code
      });

      if (error) {
        console.error('❌ Code activation failed:', error);
        return { success: false, error: error.message };
      }

      // Reload membership status
      await this.loadMembershipStatus();
      
      // Track activation analytics
      this.trackEvent('invite_code_activated', {
        code: code,
        tier: result.tier,
        duration: result.duration
      });

      return { 
        success: true, 
        tier: result.tier,
        duration: result.duration,
        expiresAt: result.expires_at
      };
      
    } catch (error) {
      console.error('❌ Code activation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user can access specific feature
  canAccess(feature, params = {}) {
    if (!this.membershipStatus) return false;
    
    // Check expiration first
    if (this.isExpired()) {
      this.handleExpiration();
      return false;
    }
    
    // 🛑 WOZ CRITICAL FIX: Check if features object exists before accessing
    if (!this.membershipStatus.features) {
      console.warn('⚠️ membershipStatus.features is undefined, treating as no access');
      return false;
    }
    
    const access = this.membershipStatus.features[feature];
    
    switch (feature) {
      case 'hiMedallionInteractions':
        if (access === 'unlimited' || access === 'unlimited_readonly') return true;
        if (typeof access === 'number') {
          return this.interactionCount < access;
        }
        return false;
        
      case 'calendarAccess':
        // ✅ Calendar is membership-only
        return access === true && !this.membershipStatus.isAnonymous;
        
      case 'hiMuscleAccess':
        return access !== false && !this.membershipStatus.isAnonymous;
        
      case 'shareCreation':
        if (access === 'unlimited') return true;
        if (typeof access === 'number') {
          return this.getShareCount() < access;
        }
        return access === true;
        
      default:
        return access !== false && access !== 'view_only';
    }
  }

  // Get current membership info for UI
  getMembershipInfo() {
    if (!this.membershipStatus) return null;
    
    const remaining = this.getTimeRemaining();
    
    return {
      tier: this.membershipStatus.tier,
      level: this.membershipStatus.level,
      isAnonymous: this.membershipStatus.isAnonymous,
      remaining,
      features: this.membershipStatus.features,
      canUpgrade: this.canUpgrade()
    };
  }

  // Check if membership is expired
  isExpired() {
    if (!this.membershipStatus?.expiresAt) return false;
    return Date.now() > new Date(this.membershipStatus.expiresAt).getTime();
  }

  // Get time remaining (for UI display)
  getTimeRemaining() {
    if (!this.membershipStatus?.expiresAt) return null;
    
    const remaining = new Date(this.membershipStatus.expiresAt).getTime() - Date.now();
    if (remaining <= 0) return null;
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // Handle membership expiration
  handleExpiration() {
    console.log('⏰ Membership expired, downgrading to anonymous');
    this.setAnonymousAccess();
    this.showExpirationModal();
  }

  // Check if user can upgrade
  canUpgrade() {
    if (!this.membershipStatus) return false;
    return this.membershipStatus.tier !== 'member' && this.membershipStatus.tier !== 'lifetime';
  }

  // Track user interaction
  trackInteraction() {
    this.interactionCount++;
    this.checkConversionTriggers();
    
    // Track in database for analytics
    this.trackEvent('medallion_interaction', {
      count: this.interactionCount,
      tier: this.membershipStatus?.tier || 'anonymous'
    });
  }

  // Check conversion triggers
  checkConversionTriggers() {
    if (!this.membershipStatus?.isAnonymous) return;
    
    // Anonymous users: show upgrade prompts at strategic moments
    if (this.interactionCount === 3) {
      this.showUpgradePrompt('interaction_milestone_3');
    } else if (this.interactionCount === 7) {
      this.showUpgradePrompt('interaction_milestone_7');
    } else if (this.interactionCount === 15) {
      this.showUpgradePrompt('interaction_milestone_15');
    }
  }

  // Show upgrade prompt
  showUpgradePrompt(reason) {
    console.log(`🎯 Upgrade trigger: ${reason}`);
    
    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('membershipUpgradePrompt', {
      detail: { reason, membership: this.membershipStatus }
    }));
  }

  // Show expiration modal
  showExpirationModal() {
    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('membershipExpired', {
      detail: { previousTier: this.membershipStatus.tier }
    }));
  }

  // Session monitoring for security
  setupSessionMonitoring() {
    // Check membership status every 5 minutes
    setInterval(async () => {
      if (this.currentUser) {
        await this.loadMembershipStatus();
      }
    }, 5 * 60 * 1000);
    
    // Handle auth state changes
    if (this.supabase?.auth) {
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          this.setAnonymousAccess();
        } else if (event === 'SIGNED_IN' && session) {
          await this.loadMembershipStatus();
        }
      });
    }
  }

  // Cache management
  saveMembershipCache() {
    try {
      const cacheData = {
        membership: this.membershipStatus,
        cachedAt: Date.now(),
        userId: this.currentUser?.id || null
      };
      localStorage.setItem('unified_membership_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Failed to cache membership data:', error);
    }
  }

  // Event notification
  notifyMembershipChange() {
    window.dispatchEvent(new CustomEvent('membershipStatusChanged', {
      detail: this.getMembershipInfo()
    }));
  }

  // Analytics tracking
  trackEvent(eventName, metadata = {}) {
    try {
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent(eventName, {
          ...metadata,
          membership_tier: this.membershipStatus?.tier || 'anonymous',
          user_id: this.currentUser?.id || 'anonymous'
        });
      }
    } catch (error) {
      console.warn('⚠️ Analytics tracking failed:', error);
    }
  }

  // Helper methods
  getShareCount() {
    return parseInt(localStorage.getItem('hiShareCount') || '0');
  }

  handleInitializationError(error) {
    console.error('🔥 Membership system fallback mode activated');
    this.setAnonymousAccess();
  }
}

// Global instance - single source of truth
window.unifiedMembership = new UnifiedMembershipSystem();

// Helper to manually refresh membership from console or other modules
window.refreshMembership = async () => {
  try {
    await window.unifiedMembership.loadMembershipStatus();
    return window.unifiedMembership.membershipStatus;
  } catch (e) {
    console.error('refreshMembership failed:', e);
    throw e;
  }
};

// Backward compatibility helpers
window.hiAccessManager = window.unifiedMembership;

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugMembership = () => {
    console.group('🏆 Unified Membership Debug');
    console.log('Current User:', window.unifiedMembership.currentUser);
    console.log('Membership Status:', window.unifiedMembership.membershipStatus);
    console.log('Interaction Count:', window.unifiedMembership.interactionCount);
    console.log('Can Access Calendar:', window.unifiedMembership.canAccess('calendarAccess'));
    console.log('Can Access Hi Muscle:', window.unifiedMembership.canAccess('hiMuscleAccess'));
    console.groupEnd();
  };
  
  console.log('🔧 Membership debug available: debugMembership()');
}

// Global exposure instead of ES6 export (for compatibility)
window.UnifiedMembershipSystem = UnifiedMembershipSystem;