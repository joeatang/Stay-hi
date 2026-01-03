/**
 * 🎯 HI TIER SYSTEM - SINGLE SOURCE OF TRUTH
 * Tesla-Grade Tier Configuration
 * 
 * This file is the ONLY place tier capabilities are defined.
 * All systems (HiTier.js, HiMembership.js, HiBrandTiers.js, Database) reference this config.
 * 
 * ARCHITECTURE:
 * - 6 distinct tiers: free → bronze → silver → gold → premium → collective
 * - Each tier has unique capabilities, trial days, and pricing
 * - Feature escalation: higher tiers get ALL lower tier features PLUS more
 * - Database stores tier name (lowercase), frontend displays brand name
 * 
 * USAGE (Global Script):
 *   <script src="./lib/config/TIER_CONFIG.js"></script>
 *   const config = window.HiTierConfig.getTierConfig('premium');
 *   const features = window.HiTierConfig.getTierFeatures('premium');
 * 
 * 🛑 NOTE: This is a GLOBAL SCRIPT, not an ES6 module
 * Loaded via <script src> in HTML, exposes window.HiTierConfig
 */

console.log('🎯 TIER_CONFIG.js loading...');

const TIER_CONFIG = {
  // ===== TIER 1: FREE (Beta Tester) =====
  free: {
    level: 1,
    name: 'Free Explorer',
    displayName: 'Hi Explorer',
    emoji: '🌱',
    color: '#6B7280',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    trialDays: 90, // 90-day beta testing period
    price: 0,
    description: 'Start your journey with 5 private shares per month',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited', // Unlimited taps for all tiers
      tapCooldown: 0, // No cooldown
      
      // Map Access
      mapAccess: 'full', // Full map access for all tiers
      mapRadius: 'unlimited',
      
      // Sharing
      shareCreation: 5, // 5 shares per month (test drive)
      shareViewing: 'all', // Can view all public shares
      shareTypes: ['private'], // Private shares only
      
      // Profile
      profileAccess: 'basic', // Can edit profile
      avatarUpload: false, // Default avatar only
      usernameChange: true,
      
      // Advanced Features
      hiMuscleAccess: true, // Hi Muscle access for all tiers
      calendarAccess: true, // Calendar access for all paid tiers (free gets it too for beta)
      trendsAccess: false,
      archiveAccess: 'basic',
      
      // Community
      communityStats: 'basic',
      leaderboard: 'visible'
    },
    
    upgradePrompt: 'Upgrade to Bronze for 30 shares/month and public sharing!',
    ctaText: 'Upgrade to Bronze'
  },

  // ===== TIER 2: BRONZE (Entry Premium) =====
  bronze: {
    level: 2,
    name: 'Bronze Member',
    displayName: 'Hi Pathfinder',
    emoji: '🧭',
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #D4A574 0%, #8B6F47 100%)',
    trialDays: 90, // 90-day beta testing period
    price: 5.55,
    description: 'Share daily with the Hi community',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      
      // Map Access
      mapAccess: 'full',
      mapRadius: 'unlimited',
      
      // Sharing
      shareCreation: 30, // 30 shares per month (1 per day)
      shareViewing: 'all',
      shareTypes: ['private', 'public', 'anonymous'], // All share types
      
      // Profile
      profileAccess: 'full',
      avatarUpload: true,
      usernameChange: 'unlimited',
      
      // Advanced Features
      hiMuscleAccess: true,
      calendarAccess: true,
      trendsAccess: false,
      archiveAccess: 'full',
      
      // Community
      communityStats: 'full',
      leaderboard: 'visible'
    },
    
    upgradePrompt: 'Upgrade to Silver for 75 shares/month!',
    ctaText: 'Upgrade to Silver'
  },

  // ===== TIER 3: SILVER (Power User) =====
  silver: {
    level: 3,
    name: 'Silver Member',
    displayName: 'Hi Trailblazer',
    emoji: '⚡',
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #E8E8E8 0%, #A0A0A0 100%)',
    trialDays: 90, // 90-day beta testing period
    price: 15.55,
    description: 'Share multiple times daily',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      
      // Map Access
      mapAccess: 'full',
      mapRadius: 'unlimited',
      
      // Sharing
      shareCreation: 75, // 75 shares per month (2-3 per day)
      shareViewing: 'all',
      shareTypes: ['private', 'public', 'anonymous'], // All share types
      
      // Profile
      profileAccess: 'full', // Full profile editing
      avatarUpload: true,
      usernameChange: 'unlimited', // Change username anytime
      customThemes: true, // Custom profile themes
      
      // Advanced Features
      hiMuscleAccess: 'full', // Unlimited emotional journey tracking
      calendarAccess: true, // Full calendar view
      trendsAccess: 'basic', // Basic trend analytics
      archiveAccess: 'full', // Save unlimited moments
      
      // Community
      communityStats: 'full',
      leaderboard: 'visible_with_rank'
    },
    
    upgradePrompt: 'Upgrade to Gold for 150 shares/month!',
    ctaText: 'Upgrade to Gold'
  },

  // ===== TIER 4: GOLD (Enthusiast) =====
  gold: {
    level: 4,
    name: 'Gold Member',
    displayName: 'Hi Champion',
    emoji: '🏆',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFE066 0%, #CC9900 100%)',
    trialDays: 90, // 90-day beta testing period
    price: 25.55,
    description: 'Share multiple times daily',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      
      // Map Access
      mapAccess: 'full',
      mapRadius: 'unlimited',
      mapFilters: true,
      
      // Sharing
      shareCreation: 150, // 150 shares per month (5 per day)
      shareViewing: 'all',
      shareTypes: ['private', 'public', 'anonymous'], // All share types
      shareAnalytics: 'basic',
      
      // Profile
      profileAccess: 'full',
      avatarUpload: true,
      usernameChange: 'unlimited',
      customThemes: true,
      profileBadges: true,
      
      // Advanced Features
      hiMuscleAccess: true,
      calendarAccess: true,
      trendsAccess: 'full',
      archiveAccess: 'unlimited',
      exportData: true,
      
      // Community
      communityStats: 'full',
      leaderboard: 'visible_with_rank',
      directMessages: 'basic'
    },
    
    upgradePrompt: 'Upgrade to Premium for unlimited shares!',
    ctaText: 'Upgrade to Premium'
  },

  // ===== TIER 5: PREMIUM (Unlimited) =====
  premium: {
    level: 5,
    name: 'Premium Member',
    displayName: 'Hi Pioneer',
    emoji: '🔥',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    trialDays: 90, // 90-day beta testing period
    price: 55.55,
    description: 'Unlimited sharing and all features',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      tapInsights: true,
      
      // Map Access
      mapAccess: 'full',
      mapRadius: 'unlimited',
      mapFilters: true,
      mapHeatmap: true,
      
      // Sharing
      shareCreation: 'unlimited',
      shareViewing: 'all',
      shareTypes: ['private', 'public', 'anonymous'], // All share types
      shareAnalytics: 'full',
      shareScheduling: 'unlimited',
      
      // Profile
      profileAccess: 'full',
      avatarUpload: true,
      usernameChange: 'unlimited',
      customThemes: true,
      profileBadges: true,
      customBadges: true, // Create custom badges
      verifiedBadge: true, // Premium verification badge
      
      // Advanced Features
      hiMuscleAccess: 'unlimited',
      calendarAccess: true,
      trendsAccess: 'premium', // Premium trend analytics with AI insights
      archiveAccess: 'unlimited',
      exportData: true,
      apiAccess: 'basic', // Basic API access for integrations
      
      // Community
      communityStats: 'full',
      leaderboard: 'visible_with_rank',
      directMessages: 'unlimited',
      prioritySupport: true, // 24/7 priority support
      betaFeatures: true // Early access to new features
    },
    
    upgradePrompt: 'Join the Collective for admin tools and community leadership!',
    ctaText: 'Join Collective'
  },

  // ===== TIER 6: COLLECTIVE (Admin + Community) =====
  collective: {
    level: 6,
    name: 'Collective Member',
    displayName: 'Hi Collective',
    emoji: '🌟',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    trialDays: 90, // 90-day trial for collective members
    price: 155.55,
    description: 'Full admin access and community leadership',
    
    features: {
      // All Premium Features
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      tapInsights: true,
      mapAccess: 'full',
      mapRadius: 'unlimited',
      mapFilters: true,
      mapHeatmap: true,
      shareCreation: 'unlimited',
      shareViewing: 'all',
      shareTypes: ['private', 'public', 'anonymous'], // All share types
      shareAnalytics: 'full',
      shareScheduling: 'unlimited',
      profileAccess: 'full',
      avatarUpload: true,
      usernameChange: 'unlimited',
      customThemes: true,
      profileBadges: true,
      customBadges: true,
      verifiedBadge: true,
      hiMuscleAccess: 'unlimited',
      calendarAccess: true,
      trendsAccess: 'premium',
      archiveAccess: 'unlimited',
      exportData: true,
      apiAccess: 'full', // Full API access
      communityStats: 'full',
      leaderboard: 'visible_with_rank',
      directMessages: 'unlimited',
      prioritySupport: true,
      betaFeatures: true,
      
      // Collective-Only Features
      adminPanel: true, // Access admin dashboard
      userManagement: 'full', // Manage user accounts
      inviteCodeGeneration: 'unlimited', // Generate unlimited invite codes
      analyticsAccess: 'full', // Full platform analytics
      contentModeration: true, // Moderate community content
      featureFlags: true, // Toggle feature flags
      systemMonitoring: true, // Monitor system health
      databaseAccess: 'read_only', // Read-only database access
      communityEvents: 'create', // Create community events
      announcementPosts: true // Post platform announcements
    },
    
    upgradePrompt: 'You have full access to Hi!',
    ctaText: null // No upgrade prompt for highest tier
  }
};

/**
 * Get complete tier configuration
 * @param {string} tierName - Tier name (free, bronze, silver, gold, premium, collective)
 * @returns {object} Tier configuration object
 */
function getTierConfig(tierName) {
  const normalizedTier = (tierName || 'free').toLowerCase();
  return TIER_CONFIG[normalizedTier] || TIER_CONFIG.free;
}

/**
 * Get tier features only
 * @param {string} tierName - Tier name
 * @returns {object} Tier features object
 */
function getTierFeatures(tierName) {
  return getTierConfig(tierName).features;
}

/**
 * Check if user can access a specific feature
 * @param {string} tierName - User's tier
 * @param {string} feature - Feature name
 * @returns {boolean|number|string} Feature value (true/false/number/'unlimited')
 */
function canAccessFeature(tierName, feature) {
  const features = getTierFeatures(tierName);
  const value = features[feature];
  
  // Handle boolean features
  if (typeof value === 'boolean') return value;
  
  // Handle numeric features (>0 means access)
  if (typeof value === 'number') return value > 0;
  
  // Handle string features ('unlimited' or specific access levels)
  if (typeof value === 'string') {
    if (value === 'unlimited') return true;
    if (value === 'none' || value === 'hidden' || value === 'view_only') return false;
    return true; // Other access levels (basic, full, etc.) = access granted
  }
  
  return false; // Default to no access
}

/**
 * Get tier rank for comparison
 * @param {string} tierName - Tier name
 * @returns {number} Tier level (1-6)
 */
function getTierRank(tierName) {
  return getTierConfig(tierName).level;
}

/**
 * Check if tierA is at least as high as tierB
 * @param {string} tierA - First tier
 * @param {string} tierB - Second tier
 * @returns {boolean} True if tierA >= tierB
 */
function isAtLeast(tierA, tierB) {
  return getTierRank(tierA) >= getTierRank(tierB);
}

/**
 * Get all tier names in order
 * @returns {string[]} Array of tier names
 */
function getAllTiers() {
  return ['free', 'bronze', 'silver', 'gold', 'premium', 'collective'];
}

/**
 * Get tier upgrade CTA
 * @param {string} tierName - Current tier
 * @returns {object} { prompt: string, ctaText: string|null }
 */
function getUpgradeCTA(tierName) {
  const config = getTierConfig(tierName);
  return {
    prompt: config.upgradePrompt,
    ctaText: config.ctaText
  };
}

/**
 * Validate tier name
 * @param {string} tierName - Tier to validate
 * @returns {boolean} True if valid tier
 */
function isValidTier(tierName) {
  return getAllTiers().includes((tierName || '').toLowerCase());
}

// Export for window global access (for non-module scripts)
if (typeof window !== 'undefined') {
  window.HiTierConfig = {
    TIER_CONFIG,
    getTierConfig,
    getTierFeatures,
    canAccessFeature,
    getTierRank,
    isAtLeast,
    getAllTiers,
    getUpgradeCTA,
    isValidTier
  };
  console.log('✅ window.HiTierConfig initialized with', Object.keys(TIER_CONFIG).length, 'tiers');
}
