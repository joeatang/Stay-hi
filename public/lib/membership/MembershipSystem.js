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
      // Public Access
      ANONYMOUS: { level: 0, price: 0, name: 'Anonymous', color: '#6B7280' },
      
      // Stan Membership Entry Point  
      STAN_MEMBER: { level: 1, price: 0, name: 'Stan Member', color: '#3B82F6', source: 'stan' },
      
      // Hi Network Paid Tiers
      TIER_1: { level: 2, price: 5.55, name: 'Hi Starter', color: '#FF9A3C' },
      TIER_2: { level: 3, price: 15.55, name: 'Hi Explorer', color: '#D84B8A' },  
      TIER_3: { level: 4, price: 55.55, name: 'Hi Collective', color: '#8B5CF6' },
      
      // Woz + Jobs 7th Tier: Creator/Community Builder
      HI_ARCHITECT: { 
        level: 5, 
        price: 155.55, 
        name: 'Hi Architect', 
        color: '#F59E0B',
        capabilities: ['generate_codes', 'community_analytics', 'referral_system', 'beta_features']
      },
      
      // System Administration
      ADMIN: { level: 99, price: 0, name: 'Hi Council', color: '#10B981' }
    };
    
    this.accessModes = {
      ANONYMOUS: 'anonymous',
      TEMPORARY: 'temporary', 
      ACTIVE: 'active',
      STAN_LINKED: 'stan_linked'
    };
    
    // Code Generation Capabilities (Hi Architect tier)
    this.codeTypes = {
      TRIAL_24H: { duration: 24 * 60 * 60 * 1000, name: '24 Hour Trial', tier: 'TIER_1' },
      TRIAL_7D: { duration: 7 * 24 * 60 * 60 * 1000, name: '7 Day Trial', tier: 'TIER_1' },
      TRIAL_30D: { duration: 30 * 24 * 60 * 60 * 1000, name: '30 Day Trial', tier: 'TIER_2' },
      TRIAL_90D: { duration: 90 * 24 * 60 * 60 * 1000, name: '90 Day Trial', tier: 'TIER_3' },
      STAN_REGISTER: { duration: null, name: 'Stan Registration', tier: 'STAN_MEMBER' }
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
    const level = this.currentUser.tierInfo.level;
    
    const baseRestrictions = {
      'welcome.html': false, // Always accessible
      'hi-dashboard.html': false, // Always accessible (view-only for anonymous)
      'hi-island.html': level < 1, // Requires Stan Member+ 
      'profile.html': level < 1, // Requires Stan Member+
      'hi-muscle.html': level < 3, // Requires Hi Explorer+ (Tier 2)
      'hi-architect.html': level < 5, // Requires Hi Architect tier
      'admin.html': tier !== 'ADMIN' // Admin only
    };
    
    // Temporary access inherits granted tier permissions
    if (this.currentUser.accessMode === 'temporary') {
      const tempLevel = this.tiers[this.currentUser.grantedTier || 'TIER_1'].level;
      return {
        ...baseRestrictions,
        'hi-island.html': tempLevel < 1,
        'profile.html': tempLevel < 1,
        'hi-muscle.html': tempLevel < 3,
        'hi-architect.html': tempLevel < 5
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
   * Generate access codes (Hi Architect capability)
   */
  async generateAccessCode(codeType, quantity = 1, customDuration = null) {
    if (!this.hasAccess('generate_codes')) {
      throw new Error('Code generation requires Hi Architect tier or higher');
    }
    
    const codeInfo = this.codeTypes[codeType];
    if (!codeInfo) {
      throw new Error('Invalid code type');
    }
    
    const codes = [];
    const duration = customDuration || codeInfo.duration;
    
    for (let i = 0; i < quantity; i++) {
      const code = this.generateUniqueCode();
      codes.push({
        code,
        type: codeType,
        tier: codeInfo.tier,
        duration,
        generatedBy: this.currentUser.id,
        generatedAt: Date.now(),
        expiresAt: duration ? Date.now() + duration : null,
        usedAt: null,
        usedBy: null
      });
    }
    
    // Store codes (would sync to Supabase in production)
    const existingCodes = JSON.parse(localStorage.getItem('hi_generated_codes') || '[]');
    existingCodes.push(...codes);
    localStorage.setItem('hi_generated_codes', JSON.stringify(existingCodes));
    
    console.log(`🎫 [Hi Architect] Generated ${quantity} ${codeType} codes`);
    return codes;
  }

  /**
   * Generate unique alphanumeric code
   */
  generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'HI';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Link Stan membership
   */
  async linkStanMembership(stanUserId, stanSubscriptionId) {
    try {
      console.log('🔗 [Membership] Linking Stan membership...');
      
      this.currentUser.membershipTier = 'STAN_MEMBER';
      this.currentUser.accessMode = 'stan_linked';
      this.currentUser.tierInfo = this.tiers.STAN_MEMBER;
      this.currentUser.stanUserId = stanUserId;
      this.currentUser.stanSubscriptionId = stanSubscriptionId;
      
      await this.applyAccessControls();
      
      console.log('✅ [Membership] Stan membership linked');
      return { success: true };
      
    } catch (error) {
      console.error('❌ [Membership] Stan linking failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has access to specific feature
   */
  hasAccess(feature, minTier = 'TIER_1') {
    const tierLevels = { 
      'ANONYMOUS': 0, 
      'STAN_MEMBER': 1, 
      'TIER_1': 2, 
      'TIER_2': 3, 
      'TIER_3': 4, 
      'HI_ARCHITECT': 5, 
      'ADMIN': 99 
    };
    const userLevel = tierLevels[this.currentUser.membershipTier] || 0;
    const requiredLevel = tierLevels[minTier] || 1;
    
    // Special capabilities check
    if (feature === 'generate_codes' || feature === 'community_analytics' || 
        feature === 'referral_system' || feature === 'beta_features') {
      return userLevel >= 5; // Hi Architect+ only
    }
    
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