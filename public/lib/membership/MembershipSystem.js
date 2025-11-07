/**
 * MembershipSystem.js - Tesla-Grade Hi Network Access Control
 * 
 * MEMBERSHIP TIERS:
 * - Tier 1: $5.55  - Basic Hi Access
 * - Tier 2: $15.55 - Enhanced Hi Features  
 * - Tier 3: $55.55 - Premium Hi Experience
 * 
 * ACCESS MODES:
 * - Anonymous: View-only, minimal access
 * - Temporary: Limited-time trial access via codes
 * - Active Member: Full access based on tier
 * 
 * INTEGRATIONS:
 * - Stan app for membership purchases
 * - Referral code system with tracking
 * - Supabase for user data & access control
 */

export class HiMembershipSystem {
  constructor() {
    this.tiers = {
      ANONYMOUS: { level: 0, price: 0, name: 'Anonymous' },
      TIER_1: { level: 1, price: 5.55, name: 'Hi Starter', color: '#FF9A3C' },
      TIER_2: { level: 2, price: 15.55, name: 'Hi Explorer', color: '#D84B8A' },  
      TIER_3: { level: 3, price: 55.55, name: 'Hi Collective', color: '#8B5CF6' },
      ADMIN: { level: 99, price: 0, name: 'Hi Council', color: '#10B981' }
    };
    
    this.accessModes = {
      ANONYMOUS: 'anonymous',
      TEMPORARY: 'temporary', 
      ACTIVE: 'active'
    };
    
    this.currentUser = null;
    this.initialized = false;
  }

  /**
   * Initialize membership system
   */
  async initialize() {
    console.log('🎫 [Membership] Initializing Hi Network access control...');
    
    try {
      // Check for existing session
      await this.checkCurrentSession();
      
      // Set up access controls
      await this.applyAccessControls();
      
      this.initialized = true;
      console.log('✅ [Membership] System initialized:', this.currentUser);
      
    } catch (error) {
      console.error('❌ [Membership] Initialization failed:', error);
      // Fallback to anonymous mode
      this.setAnonymousMode();
    }
  }

  /**
   * Check current user session and membership status
   */
  async checkCurrentSession() {
    // Try Supabase auth first
    if (window.supabase?.auth) {
      const { data: { session } } = await window.supabase.auth.getSession();
      
      if (session?.user) {
        // Get membership tier from user metadata
        const membershipTier = session.user.user_metadata?.membership_tier || 'ANONYMOUS';
        const accessMode = session.user.user_metadata?.access_mode || 'active';
        
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          membershipTier,
          accessMode,
          tierInfo: this.tiers[membershipTier] || this.tiers.ANONYMOUS,
          expiresAt: session.user.user_metadata?.expires_at,
          referralCode: session.user.user_metadata?.referral_code
        };
        
        console.log('👤 [Membership] Session found:', this.currentUser);
        return;
      }
    }
    
    // Check for temporary access code in localStorage
    const tempAccess = localStorage.getItem('hi_temp_access');
    if (tempAccess) {
      try {
        const accessData = JSON.parse(tempAccess);
        if (accessData.expiresAt > Date.now()) {
          this.currentUser = {
            id: 'temp_' + accessData.code,
            email: null,
            membershipTier: accessData.tier || 'TIER_1',
            accessMode: 'temporary',
            tierInfo: this.tiers[accessData.tier || 'TIER_1'],
            expiresAt: accessData.expiresAt,
            referralCode: accessData.referralCode
          };
          
          console.log('⏰ [Membership] Temporary access found:', this.currentUser);
          return;
        } else {
          // Expired, remove it
          localStorage.removeItem('hi_temp_access');
        }
      } catch (error) {
        console.warn('⚠️ [Membership] Invalid temp access data:', error);
        localStorage.removeItem('hi_temp_access');
      }
    }
    
    // Default to anonymous
    this.setAnonymousMode();
  }

  /**
   * Set user to anonymous mode
   */
  setAnonymousMode() {
    this.currentUser = {
      id: 'anonymous',
      email: null,
      membershipTier: 'ANONYMOUS',
      accessMode: 'anonymous',
      tierInfo: this.tiers.ANONYMOUS,
      expiresAt: null,
      referralCode: null
    };
    
    console.log('👻 [Membership] Anonymous mode active');
  }

  /**
   * Apply access controls based on current membership
   */
  async applyAccessControls() {
    const tier = this.currentUser.membershipTier;
    const mode = this.currentUser.accessMode;
    
    console.log(`🔐 [Membership] Applying ${tier} (${mode}) access controls...`);
    
    // Set CSS variables for tier theming
    document.documentElement.style.setProperty('--hi-tier-color', this.currentUser.tierInfo.color || '#6B7280');
    
    // Apply page-specific restrictions
    this.applyPageRestrictions();
    
    // Apply feature restrictions
    this.applyFeatureRestrictions();
    
    // Set up UI indicators
    this.showMembershipStatus();
  }

  /**
   * Apply page access restrictions
   */
  applyPageRestrictions() {
    const restrictions = this.getPageRestrictions();
    
    // Store restrictions for navigation guards
    window.hiAccessRestrictions = restrictions;
    
    // Hide restricted navigation elements
    this.hideRestrictedNavigation(restrictions);
  }

  /**
   * Get page access restrictions by tier
   */
  getPageRestrictions() {
    const tier = this.currentUser.membershipTier;
    
    const baseRestrictions = {
      'welcome.html': false, // Always accessible
      'hi-dashboard.html': false, // Always accessible (view-only for anonymous)
      'hi-island.html': tier === 'ANONYMOUS', // Restricted for anonymous
      'profile.html': tier === 'ANONYMOUS', // Restricted for anonymous  
      'hi-muscle.html': tier === 'ANONYMOUS' || tier === 'TIER_1', // Tier 2+ only
      'admin.html': tier !== 'ADMIN' // Admin only
    };
    
    // Temporary access gets Tier 1 permissions
    if (this.currentUser.accessMode === 'temporary') {
      return {
        ...baseRestrictions,
        'hi-island.html': false,
        'profile.html': false
      };
    }
    
    return baseRestrictions;
  }

  /**
   * Apply feature-level restrictions
   */
  applyFeatureRestrictions() {
    const tier = this.currentUser.membershipTier;
    const mode = this.currentUser.accessMode;
    
    // Share sheet restrictions
    const shareRestricted = tier === 'ANONYMOUS';
    document.querySelectorAll('[data-hi-share]').forEach(el => {
      if (shareRestricted) {
        el.style.display = 'none';
      }
    });
    
    // Medallion restrictions (anonymous can tap but limited tracking)
    const medallion = document.getElementById('hiMedallion');
    if (medallion && tier === 'ANONYMOUS') {
      medallion.title = 'Sign up to track your Hi waves!';
    }
    
    // Profile features by tier
    if (tier === 'TIER_1' || mode === 'temporary') {
      // Basic profile only
      document.querySelectorAll('[data-tier-min="2"]').forEach(el => el.style.display = 'none');
      document.querySelectorAll('[data-tier-min="3"]').forEach(el => el.style.display = 'none');
    } else if (tier === 'TIER_2') {
      // Enhanced features
      document.querySelectorAll('[data-tier-min="3"]').forEach(el => el.style.display = 'none');
    }
    
    console.log(`🎯 [Membership] ${tier} feature restrictions applied`);
  }

  /**
   * Hide navigation for restricted pages
   */
  hideRestrictedNavigation(restrictions) {
    Object.entries(restrictions).forEach(([page, isRestricted]) => {
      if (isRestricted) {
        const navLink = document.querySelector(`[href*="${page}"]`);
        if (navLink) {
          navLink.style.opacity = '0.5';
          navLink.style.pointerEvents = 'none';
          navLink.title = 'Membership required';
        }
      }
    });
  }

  /**
   * Show membership status in UI
   */
  showMembershipStatus() {
    const tierInfo = this.currentUser.tierInfo;
    const mode = this.currentUser.accessMode;
    
    // Update header if tier indicator exists
    const tierIndicator = document.getElementById('hi-tier-indicator');
    if (tierIndicator) {
      tierIndicator.textContent = tierInfo.name;
      tierIndicator.style.color = tierInfo.color;
      
      if (mode === 'temporary') {
        const timeLeft = this.currentUser.expiresAt - Date.now();
        const hours = Math.ceil(timeLeft / (1000 * 60 * 60));
        tierIndicator.textContent += ` (${hours}h left)`;
      }
    }
    
    // Add membership badge to avatar/profile area
    const profileArea = document.querySelector('.profile-area, #userProfile');
    if (profileArea && !profileArea.querySelector('.membership-badge')) {
      const badge = document.createElement('div');
      badge.className = 'membership-badge';
      badge.style.cssText = `
        background: ${tierInfo.color}; 
        color: white; 
        padding: 2px 6px; 
        border-radius: 4px; 
        font-size: 10px; 
        font-weight: bold;
        margin-left: 4px;
      `;
      badge.textContent = tierInfo.name;
      profileArea.appendChild(badge);
    }
  }

  /**
   * Activate temporary access with code
   */
  async activateTemporaryAccess(code, referralCode = null) {
    console.log('🎟️ [Membership] Activating temporary access:', code);
    
    try {
      // Validate code with backend (would be Supabase function)
      // For now, mock validation
      const validCodes = {
        'HIBETA2024': { tier: 'TIER_2', hours: 72 },
        'HIFAMILY': { tier: 'TIER_3', hours: 168 },
        'HITRIAL': { tier: 'TIER_1', hours: 24 }
      };
      
      const codeInfo = validCodes[code.toUpperCase()];
      if (!codeInfo) {
        throw new Error('Invalid access code');
      }
      
      const expiresAt = Date.now() + (codeInfo.hours * 60 * 60 * 1000);
      
      // Store temporary access
      const accessData = {
        code,
        tier: codeInfo.tier,
        expiresAt,
        referralCode,
        activatedAt: Date.now()
      };
      
      localStorage.setItem('hi_temp_access', JSON.stringify(accessData));
      
      // Update current user
      this.currentUser = {
        id: 'temp_' + code,
        email: null,
        membershipTier: codeInfo.tier,
        accessMode: 'temporary',
        tierInfo: this.tiers[codeInfo.tier],
        expiresAt,
        referralCode
      };
      
      // Reapply access controls
      await this.applyAccessControls();
      
      console.log('✅ [Membership] Temporary access activated:', this.currentUser);
      return { success: true, user: this.currentUser };
      
    } catch (error) {
      console.error('❌ [Membership] Code activation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has access to specific feature
   */
  hasAccess(feature, minTier = 'TIER_1') {
    const tierLevels = { 'ANONYMOUS': 0, 'TIER_1': 1, 'TIER_2': 2, 'TIER_3': 3, 'ADMIN': 99 };
    const userLevel = tierLevels[this.currentUser.membershipTier] || 0;
    const requiredLevel = tierLevels[minTier] || 1;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get membership tier info
   */
  getTierInfo(tier = null) {
    return this.tiers[tier || this.currentUser.membershipTier];
  }
}

// Global instance
window.HiMembership = new HiMembershipSystem();

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.HiMembership.initialize();
});