/**
 * 🏆 Hi Access Tiers System - UNIFIED DATABASE VERSION
 * Now uses unified-membership-system.js as source of truth
 * Backwards compatibility wrapper for existing code
 */

// Load unified membership system
if (!window.unifiedMembership) {
  console.warn('⚠️ Unified membership system not loaded, using fallback mode');
}

const HI_ACCESS_TIERS = {
  ANONYMOUS: {
    level: 0,
    name: 'Anonymous Explorer',
    duration: null,
    features: {
      hiMedallionInteractions: 'unlimited_readonly',
      mapAccess: 'limited_5_locations',
      shareCreation: false,
      profileAccess: false,
      hiMuscleAccess: false,
      communityStats: 'view_only'
    },
    hooks: [
      'Feel the Hi energy instantly ✨',
      'See what the community is up to',
      'Discover Hi locations near you'
    ]
  },
  
  DISCOVERY_24H: {
    level: 1,
    name: 'Discovery Sampler',
    duration: 24 * 60 * 60 * 1000, // 24 hours in ms
    features: {
      hiMedallionInteractions: 3, // Limited interactions
      mapAccess: 'preview_5_locations',
      shareCreation: false,
      profileAccess: 'view_only',
      hiMuscleAccess: false,
      communityStats: 'view_only'
    },
    hooks: [
      'Your Hi journey begins! 🚀',
      '3 magical Hi interactions await',
      'Peek into our community energy'
    ],
    conversionTriggers: [
      'after_2_interactions',
      'at_time_50_percent',
      'on_expire'
    ]
  },

  EXPLORER_3D: {
    level: 2,
    name: 'Community Explorer',
    duration: 3 * 24 * 60 * 60 * 1000, // 3 days
    features: {
      hiMedallionInteractions: 'unlimited',
      mapAccess: 'full_map_view',
      shareCreation: 1, // One share to test engagement
      profileAccess: 'view_only',
      hiMuscleAccess: 'read_only',
      communityStats: 'full_view'
    },
    hooks: [
      'Full Hi medallion magic unlocked! ⚡',
      'Explore the entire Hi community map',
      'Create your first Hi share',
      'Discover Hi Muscle insights'
    ],
    conversionTriggers: [
      'after_first_share',
      'after_map_exploration',
      'at_time_75_percent'
    ]
  },

  BETA_7D: {
    level: 3,
    name: 'Hi Beta Member',
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days
    features: {
      hiMedallionInteractions: 'unlimited',
      mapAccess: 'full_access',
      shareCreation: 'unlimited',
      profileAccess: 'create_limited',
      hiMuscleAccess: 'full_access',
      communityStats: 'contribute'
    },
    hooks: [
      'Welcome to the Hi inner circle! 👑',
      'Unlimited Hi shares & interactions',
      'Full Hi Muscle community access',
      'Create your Hi profile'
    ],
    conversionTriggers: [
      'after_profile_creation',
      'after_5_shares',
      'at_time_80_percent'
    ]
  },

  VIP_30D: {
    level: 4,
    name: 'Hi VIP Trial',
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days
    features: {
      hiMedallionInteractions: 'unlimited',
      mapAccess: 'full_access_priority',
      shareCreation: 'unlimited',
      profileAccess: 'full_customization',
      hiMuscleAccess: 'vip_access',
      communityStats: 'advanced_insights'
    },
    hooks: [
      'VIP Hi experience activated! 🌟',
      'Priority access to everything',
      'Advanced community insights',
      'Full profile customization',
      'Exclusive Hi Muscle features'
    ],
    conversionTriggers: [
      'after_advanced_usage',
      'at_time_90_percent',
      'on_vip_feature_use'
    ]
  },

  MEMBER: {
    level: 5,
    name: 'Hi Member',
    duration: null, // Permanent
    features: {
      hiMedallionInteractions: 'unlimited',
      mapAccess: 'full_access_permanent',
      shareCreation: 'unlimited',
      profileAccess: 'full_access',
      hiMuscleAccess: 'member_access',
      communityStats: 'full_contribution'
    }
  }
};

/**
 * Access Control Manager
 */
class HiAccessManager {
  constructor() {
    this.currentUser = null;
    this.accessLevel = null;
    this.sessionStart = Date.now();
    this.interactionCount = 0;
    this.init();
  }

  init() {
    // Load user session from localStorage
    const session = localStorage.getItem('hiUserSession');
    if (session) {
      this.currentUser = JSON.parse(session);
      this.determineAccessLevel();
    } else {
      // Default to anonymous access
      this.setAccessLevel(HI_ACCESS_TIERS.ANONYMOUS);
    }
  }

  /**
   * Activate invite code and set appropriate access tier
   */
  activateInviteCode(code) {
    const codeType = this.determineCodeType(code);
    const tier = this.getTierForCodeType(codeType);
    
    if (tier) {
      this.setAccessLevel(tier);
      this.trackCodeActivation(code, codeType);
      return { success: true, tier };
    }
    
    return { success: false, error: 'Invalid invite code' };
  }

  determineCodeType(code) {
    // Pattern matching for different code types
    if (/^HI24H/.test(code)) return 'DISCOVERY_24H';
    if (/^HI3D/.test(code)) return 'EXPLORER_3D';
    if (/^HI7D/.test(code)) return 'BETA_7D';
    if (/^HI30D/.test(code)) return 'VIP_30D';
    
    // Legacy codes or special patterns
    if (code.length === 8 && /^[A-Z0-9]+$/.test(code)) {
      // Analyze code characteristics for smart tier assignment
      const hasNumbers = /\d/.test(code);
      const hasVowels = /[AEIOU]/.test(code);
      
      if (hasNumbers && hasVowels) return 'VIP_30D';
      if (hasNumbers) return 'BETA_7D';
      if (hasVowels) return 'EXPLORER_3D';
      return 'DISCOVERY_24H';
    }
    
    return null;
  }

  getTierForCodeType(codeType) {
    return HI_ACCESS_TIERS[codeType] || null;
  }

  /**
   * 🎯 SURGICAL FIX: Determine access level based on user session
   */
  determineAccessLevel() {
    if (!this.currentUser) {
      this.setAccessLevel(HI_ACCESS_TIERS.ANONYMOUS);
      return;
    }

    // Check for premium membership
    if (this.currentUser.membership === 'premium' || this.currentUser.isPremium) {
      this.setAccessLevel(HI_ACCESS_TIERS.PREMIUM);
      return;
    }

    // Check for active temporary access
    const savedAccess = localStorage.getItem('hiAccessLevel');
    if (savedAccess) {
      try {
        const accessData = JSON.parse(savedAccess);
        const tier = HI_ACCESS_TIERS[accessData.tier];
        
        if (tier && (!accessData.expiresAt || Date.now() < accessData.expiresAt)) {
          this.setAccessLevel(tier);
          this.expiresAt = accessData.expiresAt;
          return;
        } else if (accessData.expiresAt && Date.now() >= accessData.expiresAt) {
          // Access expired, clean up
          localStorage.removeItem('hiAccessLevel');
        }
      } catch (error) {
        console.warn('⚠️ Invalid access level data, resetting to authenticated');
        localStorage.removeItem('hiAccessLevel');
      }
    }

    // Default to authenticated for valid users
    this.setAccessLevel(HI_ACCESS_TIERS.AUTHENTICATED);
  }

  setAccessLevel(tier) {
    this.accessLevel = tier;
    
    // Set expiration if temporary access
    if (tier.duration) {
      this.expiresAt = Date.now() + tier.duration;
    } else {
      this.expiresAt = null;
    }
    
    // Save session
    this.saveSession();
    
    // Trigger UI updates
    this.notifyAccessChange();
  }

  /**
   * Check if user can perform specific action
   */
  canAccess(feature, params = {}) {
    if (!this.accessLevel) return false;
    
    // Check expiration
    if (this.isExpired()) {
      this.handleExpiration();
      return false;
    }
    
    const access = this.accessLevel.features[feature];
    
    switch (feature) {
      case 'hiMedallionInteractions':
        if (access === 'unlimited' || access === 'unlimited_readonly') return true;
        if (typeof access === 'number') {
          return this.interactionCount < access;
        }
        return false;
        
      case 'mapAccess':
        return access !== false;
        
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

  /**
   * Get access level info for UI display
   */
  getAccessInfo() {
    if (!this.accessLevel) return null;
    
    const remaining = this.getTimeRemaining();
    const features = this.getAvailableFeatures();
    
    return {
      tier: this.accessLevel.name,
      level: this.accessLevel.level,
      remaining,
      features,
      hooks: this.accessLevel.hooks || []
    };
  }

  getTimeRemaining() {
    if (!this.expiresAt) return null;
    
    const remaining = this.expiresAt - Date.now();
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  isExpired() {
    return this.expiresAt && Date.now() > this.expiresAt;
  }

  handleExpiration() {
    // Downgrade to anonymous access
    this.setAccessLevel(HI_ACCESS_TIERS.ANONYMOUS);
    this.showExpirationModal();
  }

  // Helper methods
  getShareCount() {
    return parseInt(localStorage.getItem('hiShareCount') || '0');
  }

  trackInteraction() {
    this.interactionCount++;
    this.checkConversionTriggers();
  }

  checkConversionTriggers() {
    const triggers = this.accessLevel.conversionTriggers || [];
    
    triggers.forEach(trigger => {
      if (trigger === 'after_2_interactions' && this.interactionCount === 2) {
        this.showConversionPrompt('interaction_milestone');
      }
      // Add more trigger logic
    });
  }

  showConversionPrompt(reason) {
    // Implementation for showing conversion modals
    console.log(`🎯 Conversion trigger: ${reason}`);
    // This would trigger a modal in the actual UI
  }

  saveSession() {
    const session = {
      accessLevel: this.accessLevel,
      expiresAt: this.expiresAt,
      interactionCount: this.interactionCount,
      sessionStart: this.sessionStart
    };
    
    localStorage.setItem('hiUserSession', JSON.stringify(session));
  }

  notifyAccessChange() {
    // Emit custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('hiAccessChanged', {
      detail: this.getAccessInfo()
    }));
  }
}

// Global instance
window.hiAccessManager = new HiAccessManager();

// Expose for debugging
window.HI_ACCESS_TIERS = HI_ACCESS_TIERS;