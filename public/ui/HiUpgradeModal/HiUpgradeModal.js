/* ===================================================================
   🎯 TESLA-GRADE PROMOTIONAL MODAL SYSTEM
   Hi OS compliant upgrade prompts with Hi Share Sheet design language
=================================================================== */

export class HiUpgradeModal {
  constructor(options = {}) {
    this.triggerContext = options.context || 'general'; // 'drop-hi', 'archive', 'trends', etc.
    this.currentTier = options.currentTier || 0;
    this.onUpgrade = options.onUpgrade || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.isOpen = false;
  }

  // Show appropriate modal based on context and tier
  show() {
    if (this.isOpen) return;
    
    const modalConfig = this.getModalConfig();
    this.render(modalConfig);
    this.isOpen = true;
    
    // Track analytics
    this.trackModalShown();
  }

  // Get modal configuration based on context and tier
  getModalConfig() {
    const configs = {
      'drop-hi': {
        title: 'Drop Your First Hi! 👋',
        subtitle: 'Share a moment with the world',
        description: 'Join thousands sharing authentic moments every day. Create your account to drop your first Hi and connect with the global community.',
        primaryAction: 'Create Account to Share',
        secondaryAction: 'Maybe Later',
        icon: '🏝️',
        benefits: [
          'Share authentic moments instantly',
          'Connect with the global Hi community', 
          'Track your Hi journey and milestones',
          'Access to all Hi Island features'
        ],
        ctaStyle: 'primary'
      },
      'archive': {
        title: 'Your Personal Hi Archive 📚',
        subtitle: 'Keep track of your Hi journey',
        description: 'Create an account to save and revisit all your Hi moments. Build your personal collection of authentic shares.',
        primaryAction: 'Create Account for Archive',
        secondaryAction: 'Continue Browsing',
        icon: '📖',
        benefits: [
          'Save all your Hi moments forever',
          'Review your emotional journey over time',
          'Export your Hi history anytime',
          'Private and secure storage'
        ],
        ctaStyle: 'secondary'
      },
      'trends': {
        title: 'Unlock Emotional Insights 📊',
        subtitle: 'Discover patterns in your Hi journey',
        description: 'See how your emotions and shares evolve over time with personalized analytics and insights.',
        primaryAction: 'Get Emotional Analytics',
        secondaryAction: 'Not Now',
        icon: '📈',
        benefits: [
          'Track emotional patterns over time',
          'Personalized Hi insights dashboard',
          'Goal setting and progress tracking',
          'Community comparison metrics'
        ],
        ctaStyle: 'premium'
      },
      'milestones': {
        title: 'Earn Hi Milestones 🎯',
        subtitle: 'Celebrate your Hi achievements',
        description: 'Unlock badges, track streaks, and celebrate milestones as you build your Hi journey.',
        primaryAction: 'Start Earning Milestones',
        secondaryAction: 'Skip for Now',
        icon: '🏆',
        benefits: [
          'Unlock achievement badges',
          'Track Hi sharing streaks',
          'Celebrate major milestones',
          'Compare with the community'
        ],
        ctaStyle: 'tertiary'
      },
      'show': {
        title: 'Hi Show Premium Content 🎭',
        subtitle: 'Curated Hi moments and stories',
        description: 'Access exclusive Hi Show content, featured stories, and premium community highlights.',
        primaryAction: 'Unlock Hi Show',
        secondaryAction: 'Stay in General Feed',
        icon: '⭐',
        benefits: [
          'Exclusive curated Hi content',
          'Featured community stories',
          'Premium member highlights',
          'Early access to new features'
        ],
        ctaStyle: 'premium'
      }
    };

    return configs[this.triggerContext] || configs['drop-hi'];
  }

  // Render modal with Hi Share Sheet design language
  render(config) {
    const modal = document.createElement('div');
    modal.className = 'hi-upgrade-modal-overlay';
    modal.innerHTML = `
      <div class="hi-upgrade-modal" role="dialog" aria-labelledby="upgrade-title" aria-describedby="upgrade-description">
        <div class="hi-upgrade-header">
          <div class="hi-upgrade-icon">${config.icon}</div>
          <h2 id="upgrade-title" class="hi-upgrade-title">${config.title}</h2>
          <p class="hi-upgrade-subtitle">${config.subtitle}</p>
          <button class="hi-upgrade-close" aria-label="Close modal">×</button>
        </div>
        
        <div class="hi-upgrade-content">
          <p id="upgrade-description" class="hi-upgrade-description">${config.description}</p>
          
          <div class="hi-upgrade-benefits">
            ${config.benefits.map(benefit => `
              <div class="hi-upgrade-benefit">
                <span class="hi-upgrade-benefit-icon">✓</span>
                <span class="hi-upgrade-benefit-text">${benefit}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="hi-upgrade-actions">
          <button class="hi-upgrade-btn hi-upgrade-btn--${config.ctaStyle}" data-action="upgrade">
            ${config.primaryAction}
          </button>
          <button class="hi-upgrade-btn hi-upgrade-btn--secondary" data-action="cancel">
            ${config.secondaryAction}
          </button>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(modal);
    
    // Add event listeners
    this.attachEventListeners(modal);
    
    // Show with animation
    requestAnimationFrame(() => {
      modal.classList.add('hi-upgrade-modal-open');
    });
  }

  // Attach event listeners
  attachEventListeners(modal) {
    const closeBtn = modal.querySelector('.hi-upgrade-close');
    const upgradeBtn = modal.querySelector('[data-action="upgrade"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    const overlay = modal;

    // Close handlers
    const closeModal = () => {
      this.close(modal);
      this.onCancel(this.triggerContext);
    };

    // Upgrade handler
    const handleUpgrade = () => {
      this.close(modal);
      this.onUpgrade(this.triggerContext);
      this.trackUpgradeStarted();
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    upgradeBtn.addEventListener('click', handleUpgrade);
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  // Close modal with animation
  close(modal) {
    if (!this.isOpen) return;
    
    modal.classList.add('hi-upgrade-modal-closing');
    
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      this.isOpen = false;
    }, 300);
  }

  // Analytics tracking
  trackModalShown() {
    if (window.HiAnalytics) {
      window.HiAnalytics.track('upgrade_modal_shown', {
        context: this.triggerContext,
        tier: this.currentTier,
        timestamp: new Date().toISOString()
      });
    }
  }

  trackUpgradeStarted() {
    if (window.HiAnalytics) {
      window.HiAnalytics.track('upgrade_started', {
        context: this.triggerContext,
        tier: this.currentTier,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Global factory function for easy usage
window.showHiUpgradeModal = function(context, options = {}) {
  const modal = new HiUpgradeModal({
    context: context,
    currentTier: options.currentTier || 0,
    onUpgrade: options.onUpgrade || function(context) {
      // Default: Redirect to signup with context
      const signupUrl = `signin.html?context=${context}&action=signup`;
      window.location.href = signupUrl;
    },
    onCancel: options.onCancel || function(context) {
      console.log(`User cancelled upgrade from ${context}`);
    }
  });
  
  modal.show();
  return modal;
};

// Quick access functions for each context
window.showDropHiUpgrade = () => showHiUpgradeModal('drop-hi');
window.showArchiveUpgrade = () => showHiUpgradeModal('archive');  
window.showTrendsUpgrade = () => showHiUpgradeModal('trends');
window.showMilestonesUpgrade = () => showHiUpgradeModal('milestones');
window.showHiShowUpgrade = () => showHiUpgradeModal('show');