/* ===================================================================
   🎯 TESLA-GRADE STANDARDIZED HEADER & FOOTER SYSTEM
   Woz-approved consistent navigation across all Hi Network pages
=================================================================== */

/**
 * Hi Standard Navigation - Tesla-Grade Universal Header/Footer
 * 
 * PHILOSOPHY:
 * - Woz Approach: Consistent, intuitive navigation that "just works"
 * - Jobs Approach: Clean, beautiful, functional design
 * - Mobile-first responsive design
 * - Tier-aware dynamic content
 * 
 * USAGE:
 * Include this script on every page for standardized navigation
 */

export class HiStandardNavigation {
  constructor() {
    this.currentPage = this.detectCurrentPage();
    this.userTier = null;
    this.initialized = false;
  }

  /**
   * Initialize standardized navigation
   */
  async initialize() {
    console.log('🧭 [Navigation] Initializing Tesla-grade standard navigation...');
    
    try {
      // Wait for membership system
      await this.waitForMembershipSystem();
      
      // Inject standardized header
      await this.injectStandardHeader();
      
      // Inject standardized footer  
      await this.injectStandardFooter();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Apply tier-based restrictions
      this.applyTierRestrictions();
      
      this.initialized = true;
      console.log('✅ [Navigation] Standard navigation initialized');
      
    } catch (error) {
      console.error('❌ [Navigation] Initialization failed:', error);
    }
  }

  /**
   * Detect current page for navigation highlighting
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    const pageMap = {
      'index.html': 'dashboard',
      'hi-dashboard.html': 'dashboard', 
      'hi-island.html': 'island',
      'hi-island-NEW.html': 'island',
      'hi-muscle.html': 'muscle',
      'profile.html': 'profile',
      'hi-mission-control.html': 'admin'
    };
    
    return pageMap[filename] || 'dashboard';
  }

  /**
   * Wait for membership system to load
   */
  async waitForMembershipSystem() {
    return new Promise((resolve) => {
      const checkMembership = () => {
        if (window.HiMembership?.isInitialized()) {
          this.userTier = window.HiMembership.getCurrentUser();
          resolve();
        } else {
          setTimeout(checkMembership, 100);
        }
      };
      checkMembership();
    });
  }

  /**
   * Inject standardized header
   */
  async injectStandardHeader() {
    // Only inject if no header exists
    if (document.querySelector('.tesla-header')) return;
    
    const headerHTML = `
      <header class="tesla-header">
        <div class="header-left">
          <button id="btnCal" class="calendar-btn" aria-label="Open calendar" title="View Hi Calendar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
          
          <!-- Hiffirmations Pill -->
          <button id="hiffirmationsTrigger" class="hiffirmations-header-pill" aria-label="Daily Hiffirmations" title="Daily Hiffirmations">
            Hiffirmations
          </button>
        </div>
        
        <!-- Centered Brand with Hi Logo -->
        <div class="header-center">
          <div class="brand-container">
            <img src="assets/brand/hi-logo-light.png" alt="Hi" class="brand-hi-logo" />
            <span class="brand-text">Stay Hi</span>
          </div>
        </div>
        
        <!-- Navigation Menu -->
        <div class="header-right">
          <!-- Membership Tier Indicator -->
          <div id="hi-tier-indicator" class="tier-indicator" title="Your membership tier">
            <span class="tier-text">Loading...</span>
          </div>
          
          <button id="btnMenu" class="menu-btn" aria-label="Open menu" title="Navigation Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Navigation Menu Modal -->
      <div id="navigationModal" class="navigation-modal" style="display: none;">
        <div class="navigation-backdrop" id="navigationBackdrop"></div>
        <div class="navigation-content">
          <div class="navigation-header">
            <h3>Stay Hi Navigation</h3>
            <button id="closeNavigation" class="close-nav-btn">✕</button>
          </div>
          <div class="navigation-menu">
            <div class="nav-section">
              <div class="nav-section-title">Navigate</div>
              <a href="index.html" class="nav-item ${this.currentPage === 'dashboard' ? 'active' : ''}">
                <span class="nav-icon">🏠</span>
                <span>Hi Today</span>
              </a>
              <a href="hi-island-NEW.html" class="nav-item ${this.currentPage === 'island' ? 'active' : ''}">
                <span class="nav-icon">🏝️</span>
                <span>Hi Island</span>
              </a>
              <a href="hi-muscle.html" class="nav-item ${this.currentPage === 'muscle' ? 'active' : ''}">
                <span class="nav-icon">💪</span>
                <span>Hi Gym</span>
              </a>
              <a href="profile.html?from=${window.location.pathname}" class="nav-item ${this.currentPage === 'profile' ? 'active' : ''}">
                <span class="nav-icon">👤</span>
                <span>Profile</span>
              </a>
            </div>
            <div class="nav-section" id="adminSection" style="display: none;">
              <div class="nav-section-title">Administration</div>
              <a href="hi-mission-control.html" class="nav-item admin-item ${this.currentPage === 'admin' ? 'active' : ''}">
                <span class="nav-icon">🚀</span>
                <span>Hi Mission Control</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Insert header at beginning of body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
    
    // Update tier indicator
    this.updateTierIndicator();
  }

  /**
   * Inject standardized footer (loads HiFooter component)
   */
  async injectStandardFooter() {
    // Only inject if no footer exists and HiFooter component is available
    if (document.querySelector('.hi-footer') || !window.HiFooter) return;
    
    // Mount HiFooter component at end of body
    const footerContainer = document.createElement('div');
    footerContainer.id = 'hi-footer-container';
    document.body.appendChild(footerContainer);
    
    // Initialize HiFooter if available
    if (window.HiFooter?.mount) {
      window.HiFooter.mount(footerContainer);
    }
  }

  /**
   * Setup event listeners for navigation
   */
  setupEventListeners() {
    // Menu toggle
    const menuBtn = document.getElementById('btnMenu');
    const navigationModal = document.getElementById('navigationModal');
    const closeBtn = document.getElementById('closeNavigation');
    const backdrop = document.getElementById('navigationBackdrop');

    if (menuBtn && navigationModal) {
      menuBtn.addEventListener('click', () => {
        navigationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      });

      [closeBtn, backdrop].forEach(el => {
        if (el) {
          el.addEventListener('click', () => {
            navigationModal.style.display = 'none';
            document.body.style.overflow = 'auto';
          });
        }
      });
    }

    // Calendar button
    const calBtn = document.getElementById('btnCal');
    if (calBtn) {
      calBtn.addEventListener('click', () => {
        console.log('📅 [Navigation] Calendar clicked - would open Hi Calendar');
        // TODO: Implement Hi Calendar modal
      });
    }

    // Hiffirmations button
    const hiffirmationsBtn = document.getElementById('hiffirmationsTrigger');
    if (hiffirmationsBtn) {
      hiffirmationsBtn.addEventListener('click', () => {
        console.log('✨ [Navigation] Hiffirmations clicked');
        // TODO: Open hiffirmations modal (existing functionality)
        if (window.showHiffirmations) {
          window.showHiffirmations();
        }
      });
    }
  }

  /**
   * Update tier indicator with current user info
   */
  updateTierIndicator() {
    const tierIndicator = document.getElementById('hi-tier-indicator');
    const tierText = document.querySelector('.tier-text');
    
    if (tierIndicator && tierText && this.userTier) {
      tierText.textContent = this.userTier.tierInfo.name;
      tierIndicator.style.color = this.userTier.tierInfo.color || '#6B7280';
      
      // Show time remaining for temporary access
      if (this.userTier.accessMode === 'temporary' && this.userTier.expiresAt) {
        const timeLeft = this.userTier.expiresAt - Date.now();
        const hours = Math.ceil(timeLeft / (1000 * 60 * 60));
        tierText.textContent += ` (${hours}h left)`;
      }
    }
  }

  /**
   * Apply tier-based navigation restrictions
   */
  applyTierRestrictions() {
    if (!this.userTier) return;
    
    const level = this.userTier.tierInfo.level;
    const tier = this.userTier.membershipTier;
    
    // Hide admin section for non-admins
    const adminSection = document.getElementById('adminSection');
    if (adminSection && tier === 'ADMIN') {
      adminSection.style.display = 'block';
    }
    
    // Apply restrictions to navigation items
    const restrictions = {
      'hi-island-NEW.html': level < 1,
      'profile.html': level < 1,
      'hi-muscle.html': level < 3,
      'hi-mission-control.html': tier !== 'ADMIN'
    };
    
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
}

// Global instance
window.HiStandardNavigation = new HiStandardNavigation();

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.HiStandardNavigation.initialize();
  });
} else {
  // DOM already loaded
  window.HiStandardNavigation.initialize();
}