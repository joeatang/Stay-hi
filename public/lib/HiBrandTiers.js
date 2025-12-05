/**
 * 🎨 Hi Brand Tier System - Tesla Grade
 * Single source of truth for tier display names and styling
 * On-brand names that match Hi's voice and personality
 * 
 * ARCHITECTURE:
 * - Database uses technical tier names (anonymous, 24hr, 7d, etc.)
 * - UI displays brand-friendly names (Hi Friend, Hi Explorer, etc.)
 * - This file is the ONLY place tier display names are defined
 * 
 * USAGE:
 *   const displayInfo = HiBrandTiers.getDisplayInfo('anonymous');
 *   // Returns: { name: 'Hi Friend', color: '#6B7280', emoji: '👋', ... }
 */

class HiBrandTierSystem {
  constructor() {
    // 🎯 SINGLE SOURCE OF TRUTH: Brand Tier Display Names
    this.tiers = {
      // ===== CORE TIERS =====
      'anonymous': {
        name: 'Hi Friend',
        color: '#6B7280',
        emoji: '👋',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Welcome to the Hi community'
      },
      
      '24hr': {
        name: 'Hi Explorer',
        color: '#10B981',
        emoji: '🌟',
        gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        description: '24-hour discovery pass'
      },
      
      '7d': {
        name: 'Hi Adventurer',
        color: '#3B82F6',
        emoji: '⚡',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: '7-day Hi journey'
      },
      
      '14d': {
        name: 'Hi Trailblazer',
        color: '#8B5CF6',
        emoji: '🚀',
        gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        description: '14-day experience'
      },
      
      '30d': {
        name: 'Hi Pioneer',
        color: '#F59E0B',
        emoji: '🔥',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        description: '30-day membership'
      },
      
      '60d': {
        name: 'Hi Champion',
        color: '#EF4444',
        emoji: '💎',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        description: '60-day elite access'
      },
      
      '90d': {
        name: 'Hi Legend',
        color: '#EC4899',
        emoji: '👑',
        gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        description: '90-day legendary status'
      },
      
      'member': {
        name: 'Hi Family',
        color: '#FFD166',
        emoji: '🌈',
        gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        description: 'Permanent Hi member'
      },
      
      // ===== HI-OS MEMBERSHIP TIERS =====
      'collective': {
        name: 'Collective',
        color: '#8B5CF6',
        emoji: '🏛️',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Hi Collective - Full access + Admin'
      },
      
      'enhanced': {
        name: 'Enhanced',
        color: '#3B82F6',
        emoji: '⚡',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Enhanced tier - Premium features'
      },
      
      'starter': {
        name: 'Starter',
        color: '#10B981',
        emoji: '🌟',
        gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        description: 'Starter tier - Core features'
      },
      
      // ===== LEGACY/ALTERNATE NAMES =====
      'registered': {
        name: 'Hi Friend',
        color: '#6B7280',
        emoji: '👋',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Registered user'
      },
      
      'standard': {
        name: 'Hi Explorer',
        color: '#3B82F6',
        emoji: '⚡',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Standard access'
      },
      
      'premium': {
        name: 'Hi Pioneer',
        color: '#F59E0B',
        emoji: '🔥',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        description: 'Premium member'
      },
      
      'elite': {
        name: 'Hi Champion',
        color: '#EF4444',
        emoji: '💎',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        description: 'Elite member'
      },
      
      'legend': {
        name: 'Hi Legend',
        color: '#EC4899',
        emoji: '👑',
        gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        description: 'Legendary status'
      }
    };
    
    // Default fallback for unknown tiers
    this.defaultTier = {
      name: 'Hi Friend',
      color: '#6B7280',
      emoji: '👋',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Welcome to Hi'
    };
    
    console.log('🎨 Hi Brand Tier System initialized');
  }
  
  /**
   * Get brand display info for a tier
   * @param {string} tierKey - Database tier name (e.g., 'anonymous', '24hr', etc.)
   * @returns {object} Display info with name, color, emoji, gradient
   */
  getDisplayInfo(tierKey) {
    if (!tierKey) return this.defaultTier;
    
    // Normalize tier key (lowercase, trim)
    const normalizedKey = String(tierKey).toLowerCase().trim();
    
    return this.tiers[normalizedKey] || this.defaultTier;
  }
  
  /**
   * Get just the brand name for a tier
   * @param {string} tierKey - Database tier name
   * @returns {string} Brand display name (e.g., 'Hi Friend')
   */
  getName(tierKey) {
    return this.getDisplayInfo(tierKey).name;
  }
  
  /**
   * Get color for a tier
   * @param {string} tierKey - Database tier name
   * @returns {string} Hex color code
   */
  getColor(tierKey) {
    return this.getDisplayInfo(tierKey).color;
  }
  
  /**
   * Get emoji for a tier
   * @param {string} tierKey - Database tier name
   * @returns {string} Emoji character
   */
  getEmoji(tierKey) {
    return this.getDisplayInfo(tierKey).emoji;
  }
  
  /**
   * Get gradient for a tier (for premium UI elements)
   * @param {string} tierKey - Database tier name
   * @returns {string} CSS gradient
   */
  getGradient(tierKey) {
    return this.getDisplayInfo(tierKey).gradient;
  }
  
  /**
   * Format tier for display in UI pill
   * @param {string} tierKey - Database tier name
   * @param {object} options - Display options
   * @returns {string} Formatted tier text
   */
  formatForDisplay(tierKey, options = {}) {
    const {
      showEmoji = false,
      compact = false
    } = options;
    
    const info = this.getDisplayInfo(tierKey);
    
    if (compact) {
      // Just emoji for ultra-compact display
      return info.emoji;
    }
    
    if (showEmoji) {
      return `${info.emoji} ${info.name}`;
    }
    
    return info.name;
  }
  
  /**
   * Update a tier pill element with brand styling
   * @param {HTMLElement} element - The tier indicator element
   * @param {string} tierKey - Database tier name
   * @param {object} options - Styling options
   */
  updateTierPill(element, tierKey, options = {}) {
    const {
      showEmoji = false,
      useGradient = false
    } = options;
    
    if (!element) return;
    
    // ✅ FIX: Guard against duplicate updates (prevents multiple systems fighting)
    if (element._lastTierUpdate === tierKey) {
      console.log('🎫 Tier already set to', tierKey, '- skipping duplicate update');
      return;
    }
    element._lastTierUpdate = tierKey;
    
    const info = this.getDisplayInfo(tierKey);
    
    // Update text content with defensive fallback
    let tierText = element.querySelector('.tier-text');
    
    // Defensive fallback: if querySelector fails, try finding any span
    if (!tierText) {
      tierText = element.querySelector('span');
    }
    
    // Final fallback: create span if needed (Hi-OS resilience)
    if (!tierText) {
      tierText = document.createElement('span');
      tierText.className = 'tier-text';
      element.appendChild(tierText);
      console.log('🔧 Created missing .tier-text element');
    }
    
    // ✅ FIX: Remove loading state when tier is set
    if (element.dataset.authLoading === 'true') {
      delete element.dataset.authLoading;
      tierText.classList.remove('tier-loading');
    }
    
    // Update text content
    tierText.textContent = this.formatForDisplay(tierKey, { showEmoji });
    console.log('🎨 Tier pill updated:', tierKey, '→', tierText.textContent);
    
    // Update styling
    if (useGradient) {
      element.style.background = info.gradient;
      element.style.color = '#FFFFFF';
    } else {
      element.style.color = info.color;
    }
    
    // Update title/tooltip
    element.title = info.description;
  }
}

// ===== GLOBAL INSTANCE =====
window.HiBrandTiers = new HiBrandTierSystem();

// ===== BACKWARD COMPATIBILITY =====
// Helper function for legacy code that expects tier names directly
window.getHiTierName = (tierKey) => window.HiBrandTiers.getName(tierKey);
window.getHiTierColor = (tierKey) => window.HiBrandTiers.getColor(tierKey);

// ===== DEVELOPMENT HELPERS =====
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.debugTiers = () => {
    console.group('🎨 Hi Brand Tier System');
    console.log('Available tiers:', Object.keys(window.HiBrandTiers.tiers));
    console.log('');
    console.log('Examples:');
    console.log('  HiBrandTiers.getName("anonymous"):', window.HiBrandTiers.getName('anonymous'));
    console.log('  HiBrandTiers.getName("24hr"):', window.HiBrandTiers.getName('24hr'));
    console.log('  HiBrandTiers.getName("member"):', window.HiBrandTiers.getName('member'));
    console.log('');
    console.log('Full info for "anonymous":', window.HiBrandTiers.getDisplayInfo('anonymous'));
    console.groupEnd();
  };
  
  console.log('🔧 Tier debug available: debugTiers()');
}
