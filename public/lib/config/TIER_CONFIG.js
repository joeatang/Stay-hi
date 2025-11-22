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
 * USAGE:
 *   import { TIER_CONFIG, getTierConfig, getTierFeatures } from './config/TIER_CONFIG.js';
 *   const config = getTierConfig('premium');
 *   const features = getTierFeatures('premium');
 */

export const TIER_CONFIG = {
  // ===== TIER 1: FREE (Default/Anonymous) =====
  free: {
    level: 1,
    name: 'Free Explorer',
    displayName: 'Hi Explorer',
    emoji: '🌱',
    color: '#6B7280',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    trialDays: 0,
    price: 0,
    description: 'Discover Hi with limited features',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 10, // 10 taps per day
      tapCooldown: 60, // seconds between taps
      
      // Map Access
      mapAccess: 'preview', // Can view 5 locations
      mapRadius: 5, // miles
      
      // Sharing
      shareCreation: false, // Cannot create shares
      shareViewing: 'public_only', // Can only view public shares
      
      // Profile
      profileAccess: 'view_only', // Can view but not edit
      avatarUpload: false,
      usernameChange: false,
      
      // Advanced Features
      hiMuscleAccess: false, // No emotional journey tracking
      calendarAccess: false, // No calendar view
      trendsAccess: false, // No trend analytics
      archiveAccess: 'none', // Cannot save moments
      
      // Community
      communityStats: 'view_only',
      leaderboard: 'hidden'
    },
    
    upgradePrompt: 'Upgrade to unlock unlimited taps, sharing, and emotional journey tracking!',
    ctaText: 'Upgrade to Bronze'
  },

  // ===== TIER 2: BRONZE (Entry Level) =====
  bronze: {
    level: 2,
    name: 'Bronze Member',
    displayName: 'Hi Pathfinder',
    emoji: '🥉',
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #D4A574 0%, #8B6F47 100%)',
    trialDays: 7, // 7-day trial
    price: 5.55,
    description: 'Start your Hi journey with essential features',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 50, // 50 taps per day
      tapCooldown: 30, // seconds between taps
      
      // Map Access
      mapAccess: 'basic', // Can view 20 locations
      mapRadius: 20, // miles
      
      // Sharing
      shareCreation: 10, // 10 shares per month
      shareViewing: 'all', // View all shares (public + anonymous + private with access)
      shareTypes: ['public', 'anonymous'], // Can create public and anonymous shares
      
      // Profile
      profileAccess: 'basic', // Can edit profile
      avatarUpload: true,
      usernameChange: true, // Once per month
      
      // Advanced Features
      hiMuscleAccess: 'basic', // Basic emotional journey tracking (10 journeys/month)
      calendarAccess: false, // No calendar view
      trendsAccess: false, // No trend analytics
      archiveAccess: 'basic', // Save up to 50 moments
      
      // Community
      communityStats: 'basic',
      leaderboard: 'visible'
    },
    
    upgradePrompt: 'Upgrade to Silver for unlimited shares and full emotional analytics!',
    ctaText: 'Upgrade to Silver'
  },

  // ===== TIER 3: SILVER (Popular Choice) =====
  silver: {
    level: 3,
    name: 'Silver Member',
    displayName: 'Hi Trailblazer',
    emoji: '🥈',
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #E8E8E8 0%, #A0A0A0 100%)',
    trialDays: 14, // 14-day trial
    price: 15.55,
    description: 'Enhanced features with unlimited sharing',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 100, // 100 taps per day
      tapCooldown: 15, // seconds between taps
      
      // Map Access
      mapAccess: 'full', // Can view all locations
      mapRadius: 'unlimited',
      
      // Sharing
      shareCreation: 50, // 50 shares per month
      shareViewing: 'all',
      shareTypes: ['public', 'anonymous', 'private'], // All share types
      
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
    
    upgradePrompt: 'Upgrade to Gold for unlimited taps and premium analytics!',
    ctaText: 'Upgrade to Gold'
  },

  // ===== TIER 4: GOLD (Premium Features) =====
  gold: {
    level: 4,
    name: 'Gold Member',
    displayName: 'Hi Champion',
    emoji: '🥇',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFE066 0%, #CC9900 100%)',
    trialDays: 21, // 21-day trial
    price: 25.55,
    description: 'Premium access with advanced analytics',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited', // Unlimited taps
      tapCooldown: 0, // No cooldown
      
      // Map Access
      mapAccess: 'full',
      mapRadius: 'unlimited',
      mapFilters: true, // Advanced map filters
      
      // Sharing
      shareCreation: 'unlimited', // Unlimited shares
      shareViewing: 'all',
      shareTypes: ['public', 'anonymous', 'private', 'scheduled'], // + scheduled shares
      shareAnalytics: 'basic', // View share performance
      
      // Profile
      profileAccess: 'full',
      avatarUpload: true,
      usernameChange: 'unlimited',
      customThemes: true,
      profileBadges: true, // Display achievement badges
      
      // Advanced Features
      hiMuscleAccess: 'unlimited', // Unlimited emotional journey tracking
      calendarAccess: true,
      trendsAccess: 'full', // Full trend analytics with insights
      archiveAccess: 'unlimited',
      exportData: true, // Export all personal data
      
      // Community
      communityStats: 'full',
      leaderboard: 'visible_with_rank',
      directMessages: 'basic' // DM other users
    },
    
    upgradePrompt: 'Upgrade to Premium for priority support and exclusive features!',
    ctaText: 'Upgrade to Premium'
  },

  // ===== TIER 5: PREMIUM (All Features) =====
  premium: {
    level: 5,
    name: 'Premium Member',
    displayName: 'Hi Pioneer',
    emoji: '⭐',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    trialDays: 30, // 30-day trial (current default)
    price: 55.55,
    description: 'Complete Hi experience with all features unlocked',
    
    features: {
      // Medallion Interactions
      hiMedallionInteractions: 'unlimited',
      tapCooldown: 0,
      tapInsights: true, // Advanced tap analytics
      
      // Map Access
      mapAccess: 'full',
      mapRadius: 'unlimited',
      mapFilters: true,
      mapHeatmap: true, // Emotional heatmap overlay
      
      // Sharing
      shareCreation: 'unlimited',
      shareViewing: 'all',
      shareTypes: ['public', 'anonymous', 'private', 'scheduled', 'collaborative'], // + collaborative shares
      shareAnalytics: 'full', // Full share analytics + insights
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
      shareTypes: ['public', 'anonymous', 'private', 'scheduled', 'collaborative'],
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
export function getTierConfig(tierName) {
  const normalizedTier = (tierName || 'free').toLowerCase();
  return TIER_CONFIG[normalizedTier] || TIER_CONFIG.free;
}

/**
 * Get tier features only
 * @param {string} tierName - Tier name
 * @returns {object} Tier features object
 */
export function getTierFeatures(tierName) {
  return getTierConfig(tierName).features;
}

/**
 * Check if user can access a specific feature
 * @param {string} tierName - User's tier
 * @param {string} feature - Feature name
 * @returns {boolean|number|string} Feature value (true/false/number/'unlimited')
 */
export function canAccessFeature(tierName, feature) {
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
export function getTierRank(tierName) {
  return getTierConfig(tierName).level;
}

/**
 * Check if tierA is at least as high as tierB
 * @param {string} tierA - First tier
 * @param {string} tierB - Second tier
 * @returns {boolean} True if tierA >= tierB
 */
export function isAtLeast(tierA, tierB) {
  return getTierRank(tierA) >= getTierRank(tierB);
}

/**
 * Get all tier names in order
 * @returns {string[]} Array of tier names
 */
export function getAllTiers() {
  return ['free', 'bronze', 'silver', 'gold', 'premium', 'collective'];
}

/**
 * Get tier upgrade CTA
 * @param {string} tierName - Current tier
 * @returns {object} { prompt: string, ctaText: string|null }
 */
export function getUpgradeCTA(tierName) {
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
export function isValidTier(tierName) {
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
}
