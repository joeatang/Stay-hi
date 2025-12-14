/**
 * 🚀 WOZNIAK-GRADE UNIFIED MODAL SYSTEM
 * Gold Standard Modal Design System for Stay Hi App
 * Based on the perfect Drop Hi modal implementation
 */

class HiGoldStandardModal {
  constructor() {
    this.activeModals = new Set();
    this.zIndexCounter = 10000;
  }

  // 🎯 GOLD STANDARD: Authentication Modal (Based on Drop Hi Success)
  showAuthModal(context = 'general', options = {}) {
    const config = this.getAuthModalConfig(context);
    return this.createModal({
      id: `authModal-${context}`,
      type: 'auth',
      ...config,
      ...options
    });
  }

  // 🎯 GOLD STANDARD: Upgrade Modal
  showUpgradeModal(feature = 'general', options = {}) {
    const config = this.getUpgradeModalConfig(feature);
    return this.createModal({
      id: `upgradeModal-${feature}`,
      type: 'upgrade',
      ...config,
      ...options
    });
  }

  // 🎯 GOLD STANDARD: Share Sheet Auth Modal (NEW)
  showShareAuthModal(origin = 'general', options = {}) {
    const config = this.getShareAuthModalConfig(origin);
    return this.createModal({
      id: `shareAuthModal-${origin}`,
      type: 'share-auth',
      ...config,
      ...options
    });
  }

  // 🎨 Modal Configuration Generator
  getAuthModalConfig(context) {
    const configs = {
      'drop-hi': {
        icon: '🏝️',
        title: 'Drop Your Hi on the Island',
        subtitle: 'Join our community to share your moments',
        description: 'Connect with others and be part of the Hi Island experience. Sign in to drop your Hi and share your story.',
        primaryAction: 'Sign In to Share',
        secondaryAction: 'Create Account'
      },
      'hi-muscle': {
        icon: '💪',
        title: 'Power Up Your Hi Muscle',
        subtitle: 'Track your wellness journey',
        description: 'Join the community to track your progress, share achievements, and inspire others on their wellness journey.',
        primaryAction: 'Sign In to Continue',
        secondaryAction: 'Create Account'
      },
      'dashboard': {
        icon: '📊',
        title: 'Access Your Dashboard',
        subtitle: 'Personal insights await',
        description: 'Sign in to view your personalized dashboard, track your progress, and explore your Hi journey.',
        primaryAction: 'Sign In to Dashboard',
        secondaryAction: 'Create Account'
      },
      'archive': {
        icon: '📚',
        title: 'Your Hi Archive Awaits',
        subtitle: 'Every moment, safely stored',
        description: 'Sign in to access your personal archive and rediscover all your meaningful Hi moments.',
        primaryAction: 'Sign In to View Archive',
        secondaryAction: 'Create Account'
      },
      'general': {
        icon: '✨',
        title: 'Join the Hi Community',
        subtitle: 'Share, connect, inspire',
        description: 'Sign in to unlock the full Hi experience and connect with our amazing community.',
        primaryAction: 'Sign In',
        secondaryAction: 'Create Account'
      }
    };

    return configs[context] || configs.general;
  }

  getUpgradeModalConfig(feature) {
    const configs = {
      'premium-sharing': {
        icon: '🌟',
        title: 'Unlimited Hi Sharing',
        subtitle: 'Share without limits',
        description: 'Upgrade to Premium to share unlimited Hi moments, access exclusive features, and get priority support.',
        primaryAction: 'Upgrade to Premium',
        secondaryAction: 'Maybe Later'
      },
      'advanced-stats': {
        icon: '📈',
        title: 'Advanced Analytics',
        subtitle: 'Deep insights into your journey',
        description: 'Unlock detailed analytics, trends, and personalized insights about your Hi journey.',
        primaryAction: 'Upgrade for Analytics',
        secondaryAction: 'Continue with Basic'
      }
    };

    return configs[feature] || configs['premium-sharing'];
  }

  getShareAuthModalConfig(origin) {
    const configs = {
      'hi-island': {
        icon: '🏝️',
        title: 'Share on Hi Island',
        subtitle: 'Connect with the global community',
        description: 'Create an account to share your moments on Hi Island and connect with people from around the world.',
        primaryAction: '✨ Sign In to Share',
        secondaryAction: 'Create Free Account',
        benefits: [
          'Share moments instantly',
          'Connect with the community',
          'Track your Hi journey',
          'Access island features'
        ]
      },
      'hi-muscle': {
        icon: '💪',
        title: 'Share Your Progress',
        subtitle: 'Inspire others on their journey',
        description: 'Join the community to share your wellness achievements and inspire others.',
        primaryAction: '💪 Sign In to Share',
        secondaryAction: 'Create Account',
        benefits: [
          'Share workout achievements',
          'Inspire others',
          'Track progress',
          'Join challenges'
        ]
      },
      'dashboard': {
        icon: '📊',
        title: 'Share from Dashboard',
        subtitle: 'Share your insights',
        description: 'Create an account to share your progress and insights with the community.',
        primaryAction: '📊 Sign In to Share',
        secondaryAction: 'Create Account',
        benefits: [
          'Share progress updates',
          'Connect with others',
          'Save to archive',
          'Get feedback'
        ]
      }
    };

    return configs[origin] || configs['hi-island'];
  }

  // 🚀 CORE: Universal Modal Creator
  createModal({ id, type, icon, title, subtitle, description, primaryAction, secondaryAction, benefits, onPrimary, onSecondary }) {
    // Prevent duplicate modals
    if (this.activeModals.has(id)) {
      console.log(`Modal ${id} already active`);
      return;
    }

    const zIndex = this.zIndexCounter++;
    
    const modalHTML = this.generateModalHTML({
      id, type, icon, title, subtitle, description, 
      primaryAction, secondaryAction, benefits, zIndex
    });

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.activeModals.add(id);

    // Add event listeners
    this.attachEventListeners(id, { onPrimary, onSecondary });

    // Focus management
    setTimeout(() => {
      const modal = document.getElementById(id);
      if (modal) modal.focus();
    }, 100);

    return id;
  }

  // 🎨 HTML Generator - Gold Standard Design
  generateModalHTML({ id, type, icon, title, subtitle, description, primaryAction, secondaryAction, benefits, zIndex }) {
    const benefitsHTML = benefits ? benefits.map(benefit => `
      <div style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: #64748b;">
        <span style="font-size: 20px;">✨</span>
        <span>${benefit}</span>
      </div>
    `).join('') : '';

    return `
      <div id="${id}" 
           style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: ${zIndex}; backdrop-filter: blur(10px); animation: fadeIn 0.3s ease-out;" 
           tabindex="-1">
        <div style="background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%); border-radius: 24px; padding: 48px 40px; max-width: 480px; margin: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 209, 102, 0.3); position: relative; animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
          
          <button onclick="window.HiGoldStandardModal?.closeModal('${id}')" 
                  style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 32px; color: #1e293b; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s ease; font-weight: 300;" 
                  onmouseover="this.style.background='rgba(30, 41, 59, 0.15)'; this.style.transform='scale(1.1)'" 
                  onmouseout="this.style.background='none'; this.style.transform='scale(1)'"
                  aria-label="Close modal">×</button>

          <div style="text-align: center;">
            <div style="font-size: 64px; margin-bottom: 24px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));">${icon}</div>
            <h2 style="color: #1e293b; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">${title}</h2>
            ${subtitle ? `<p style="color: #64748b; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">${subtitle}</p>` : ''}
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">${description}</p>
            
            ${benefits ? `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin-bottom: 32px; padding: 24px; background: rgba(255, 209, 102, 0.05); border-radius: 16px; border: 1px solid rgba(255, 209, 102, 0.2);">
                ${benefitsHTML}
              </div>
            ` : ''}

            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <button onclick="window.HiGoldStandardModal?.handlePrimary('${id}')" 
                      style="background: linear-gradient(135deg, #FF7A18 0%, #FFD166 100%); color: #1a1a1a; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 122, 24, 0.4); transition: all 0.2s ease; transform: translateY(0);" 
                      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(255, 122, 24, 0.5)'" 
                      onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 12px rgba(255, 122, 24, 0.4)'">
                ${primaryAction}
              </button>
              ${secondaryAction ? `
                <button onclick="window.HiGoldStandardModal?.handleSecondary('${id}')" 
                        style="background: rgba(255, 122, 24, 0.1); color: #FF7A18; border: 2px solid rgba(255, 122, 24, 0.3); padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" 
                        onmouseover="this.style.background='rgba(255, 122, 24, 0.15)'" 
                        onmouseout="this.style.background='rgba(255, 122, 24, 0.1)'">
                  ${secondaryAction}
                </button>
              ` : ''}
            </div>
            
            <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8;">Free account • No spam • Secure authentication</p>
          </div>
        </div>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;
  }

  // 🎯 Event Management
  attachEventListeners(id, { onPrimary, onSecondary }) {
    // Store callbacks for later use
    if (!window.hiModalCallbacks) window.hiModalCallbacks = {};
    window.hiModalCallbacks[id] = { onPrimary, onSecondary };

    // Escape key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.has(id)) {
        this.closeModal(id);
      }
    });

    // Backdrop click handling
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(id);
        }
      });
    }
  }

  // 🎯 Action Handlers
  handlePrimary(id) {
    const callbacks = window.hiModalCallbacks?.[id];
    if (callbacks?.onPrimary) {
      callbacks.onPrimary();
    } else {
      // Default: redirect to sign in page
      const isLocal = window.location.hostname === 'localhost';
      const signinPath = isLocal ? '/public/signin.html' : '/signin.html';
      window.location.href = signinPath + '?redirect=' + encodeURIComponent(window.location.pathname);
    }
    this.closeModal(id);
  }

  handleSecondary(id) {
    const callbacks = window.hiModalCallbacks?.[id];
    if (callbacks?.onSecondary) {
      callbacks.onSecondary();
    } else {
      // Default: redirect to sign up page with source tracking
      const isLocal = window.location.hostname === 'localhost';
      const signupPath = isLocal ? '/public/signup.html' : '/signup.html';
      window.location.href = signupPath + '?source=welcome&redirect=' + encodeURIComponent(window.location.pathname);
    }
    this.closeModal(id);
  }

  // 🧹 Modal Management
  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.animation = 'fadeOut 0.2s ease-out';
      setTimeout(() => {
        modal.remove();
        this.activeModals.delete(id);
        if (window.hiModalCallbacks?.[id]) {
          delete window.hiModalCallbacks[id];
        }
      }, 200);
    }
  }

  closeAllModals() {
    this.activeModals.forEach(id => this.closeModal(id));
  }
}

// 🚀 Initialize Global Modal System
window.HiGoldStandardModal = new HiGoldStandardModal();

// 🎯 Convenient Global Functions
window.showAuthModal = (context = 'general', options = {}) => {
  return window.HiGoldStandardModal.showAuthModal(context, options);
};

window.showUpgradeModal = (feature = 'general', options = {}) => {
  return window.HiGoldStandardModal.showUpgradeModal(feature, options);
};

window.showShareAuthModal = (origin = 'general', options = {}) => {
  return window.HiGoldStandardModal.showShareAuthModal(origin, options);
};

console.log('✅ Hi Gold Standard Modal System initialized');