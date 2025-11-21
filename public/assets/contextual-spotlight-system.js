/**
 * 🎯 Tesla-Grade Contextual Spotlight System
 * Animated feature highlights that appear at perfect moments
 * Guides discovery without interrupting natural flow
 */

(function() {
  'use strict';

  const CONTEXTUAL_SPOTLIGHT_KEY = 'hi_contextual_spotlights';
  
  class ContextualSpotlightSystem {
    constructor() {
      this.spotlights = this.loadSpotlightState();
      this.activeSpotlight = null;
      this.observerSetup = false;
      this.pageContext = this.detectPageContext();
      
      // Initialize contextual awareness
      this.init();
    }
    
    init() {
      console.log('🎯 Contextual Spotlight System initialized for:', this.pageContext);
      
      // Set up contextual triggers based on page
      this.setupContextualTriggers();
      
      // Track user interactions for smart timing
      this.trackUserInteractions();
    }
    
    detectPageContext() {
      const path = window.location.pathname;
      if (path.includes('welcome')) return 'welcome';
      if (path.includes('hi-dashboard')) return 'dashboard';
      if (path.includes('hi-island')) return 'island';
      if (path.includes('hi-muscle')) return 'muscle';
      if (path.includes('profile')) return 'profile';
      return 'unknown';
    }
    
    loadSpotlightState() {
      try {
        const stored = localStorage.getItem(CONTEXTUAL_SPOTLIGHT_KEY);
        return stored ? JSON.parse(stored) : {
          floatingRefresh: false,
          floatingHiffirmations: false,
          tierIndicator: false,
          navigationFirst: false,
          shareButtons: false,
          premiumFeatures: false
        };
      } catch (error) {
        console.warn('⚠️ Could not load spotlight state:', error);
        return {
          floatingRefresh: false,
          floatingHiffirmations: false,
          tierIndicator: false,
          navigationFirst: false,
          shareButtons: false,
          premiumFeatures: false
        };
      }
    }
    
    saveSpotlightState() {
      try {
        localStorage.setItem(CONTEXTUAL_SPOTLIGHT_KEY, JSON.stringify(this.spotlights));
      } catch (error) {
        console.warn('⚠️ Could not save spotlight state:', error);
      }
    }
    
    setupContextualTriggers() {
      // Page-specific spotlight triggers
      switch (this.pageContext) {
        case 'dashboard':
          this.setupDashboardSpotlights();
          break;
        case 'island':
          this.setupIslandSpotlights();
          break;
        case 'muscle':
          this.setupMuscleSpotlights();
          break;
        case 'welcome':
          this.setupWelcomeSpotlights();
          break;
      }
      
      // Universal spotlights (work on all pages)
      this.setupUniversalSpotlights();
    }
    
    setupDashboardSpotlights() {
      // Highlight floating Hiffirmations after first few medallion taps
      setTimeout(() => {
        if (!this.spotlights.floatingHiffirmations && this.shouldShowFloatingHiffirmationsSpotlight()) {
          this.showSpotlight('floatingHiffirmations', {
            selector: '.floating-hiffirmations',
            message: '💝 Daily inspiration appears here',
            subtitle: 'Contextual wisdom for your Hi journey',
            position: 'left',
            duration: 3500,
            trigger: 'engagement-moment'
          });
        }
      }, 4000); // Increased from 3s to 4s - let milestones settle
      
      // 🎯 WOZNIAK FIX: Tier indicator MUCH LATER - only after user explores
      // Moved from 8s to 18s to avoid overwhelming new users
      setTimeout(() => {
        if (!this.spotlights.tierIndicator && this.isAnonymousUser()) {
          this.showSpotlight('tierIndicator', {
            selector: '#hi-tier-indicator',
            message: '⭐ Your current access level',
            subtitle: 'Upgrade to unlock full Hi experience',
            position: 'bottom',
            duration: 3500,
            cta: 'See Benefits',
            ctaAction: 'show-upgrade-modal'
          });
        }
      }, 18000); // CRITICAL: 18 seconds gives user time to settle and explore
    }
    
    setupIslandSpotlights() {
      // Welcome to exploration context
      if (!this.spotlights.navigationFirst) {
        setTimeout(() => {
          this.showSpotlight('navigationFirst', {
            selector: '.hi-island-header',
            message: '🏝️ Explore community connections',
            subtitle: 'Discover Hi moments from around the world',
            position: 'bottom',
            duration: 4000,
            contextual: true
          });
        }, 1500);
      }
    }
    
    setupMuscleSpotlights() {
      // Emotional fitness context
      if (!this.spotlights.navigationFirst) {
        setTimeout(() => {
          this.showSpotlight('navigationFirst', {
            selector: '.hi-muscle-header',
            message: '💪 Emotional fitness workouts',
            subtitle: 'Guided sessions for life\'s challenges',
            position: 'bottom',
            duration: 4000,
            contextual: true
          });
        }, 1500);
      }
    }
    
    setupWelcomeSpotlights() {
      // Minimal spotlights on welcome - let curiosity drive
      // Only highlight medallion power after first interaction
    }
    
    setupUniversalSpotlights() {
      // Floating refresh spotlight (appears after page changes)
      this.trackPageChanges();
      
      // Premium feature attempt spotlights
      this.trackPremiumFeatureAttempts();
    }
    
    shouldShowFloatingHiffirmationsSpotlight() {
      // Show after user has tapped medallion a few times
      const milestoneData = localStorage.getItem('hi_milestone_celebrations');
      if (milestoneData) {
        try {
          const milestones = JSON.parse(milestoneData);
          return milestones.thirdTap; // Show after 3rd tap milestone
        } catch (error) {
          return false;
        }
      }
      return false;
    }
    
    isAnonymousUser() {
      // Check if user is anonymous (no auth token)
      const hasAuth = localStorage.getItem('sb-access-token') || 
                     localStorage.getItem('hiAccess') ||
                     localStorage.getItem('hi_discovery_mode');
      return !hasAuth;
    }
    
    trackPageChanges() {
      let isFirstPageChange = true;
      
      // Monitor navigation events
      window.addEventListener('beforeunload', () => {
        if (isFirstPageChange && !this.spotlights.floatingRefresh) {
          // Mark for spotlight on next page load
          sessionStorage.setItem('show_refresh_spotlight', 'true');
        }
      });
      
      // Show refresh spotlight if flagged
      if (sessionStorage.getItem('show_refresh_spotlight')) {
        setTimeout(() => {
          this.showSpotlight('floatingRefresh', {
            selector: '.floating-refresh-btn',
            message: '🔄 Refresh for fresh energy',
            subtitle: 'Each page has its own vibe',
            position: 'left',
            duration: 3000
          });
        }, 2000);
        sessionStorage.removeItem('show_refresh_spotlight');
      }
    }
    
    trackPremiumFeatureAttempts() {
      // Listen for premium feature modal appearances
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && (
              node.classList?.contains('anonymous-access-modal') ||
              node.id?.includes('upgrade') ||
              node.classList?.contains('membership-modal')
            )) {
              this.triggerUpgradeSpotlight();
            }
          });
        });
      });
      
      // Safety check: ensure document.body exists before observing
      if (document.body && typeof document.body.nodeType === 'number') {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } else {
        console.warn('🎯 Contextual Spotlight: document.body not ready for MutationObserver');
      }
    }
    
    triggerUpgradeSpotlight() {
      if (!this.spotlights.premiumFeatures) {
        // Brief delay to let modal settle
        setTimeout(() => {
          this.showSpotlight('premiumFeatures', {
            selector: '.modal-content, .anonymous-access-modal',
            message: '✨ Unlock the full Hi experience',
            subtitle: 'Join our community for complete access',
            position: 'top',
            duration: 3000,
            overlay: true
          });
        }, 500);
      }
    }
    
    trackUserInteractions() {
      // Track engagement level for smart spotlight timing
      let interactionCount = 0;
      
      const trackInteraction = () => {
        interactionCount++;
        
        // After several interactions, show advanced feature spotlights
        if (interactionCount === 5 && !this.spotlights.shareButtons) {
          this.highlightShareFeatures();
        }
      };
      
      // Track meaningful interactions
      document.addEventListener('click', trackInteraction);
      document.addEventListener('touchstart', trackInteraction);
    }
    
    highlightShareFeatures() {
      // Highlight sharing capabilities
      const shareButtons = document.querySelectorAll('[class*="share"], [id*="share"]');
      if (shareButtons.length > 0) {
        this.showSpotlight('shareButtons', {
          selector: shareButtons[0],
          message: '📱 Share your Hi moments',
          subtitle: 'Connect with the global community',
          position: 'auto',
          duration: 3000
        });
      }
    }
    
    showSpotlight(spotlightId, config) {
      if (this.activeSpotlight || this.spotlights[spotlightId]) {
        return; // Don't show if already active or already shown
      }
      
      const targetElement = document.querySelector(config.selector);
      if (!targetElement || targetElement.offsetParent === null) {
        console.log('🎯 Spotlight target not visible:', config.selector);
        return;
      }
      
      this.activeSpotlight = spotlightId;
      this.spotlights[spotlightId] = true;
      this.saveSpotlightState();
      
      this.createSpotlightElement(targetElement, config);
    }
    
    createSpotlightElement(targetElement, config) {
      const spotlight = document.createElement('div');
      spotlight.id = 'contextual-spotlight';
      spotlight.className = 'contextual-spotlight';
      
      // Calculate position
      const rect = targetElement.getBoundingClientRect();
      const position = this.calculateSpotlightPosition(rect, config.position);
      
      spotlight.innerHTML = `
        <div class="spotlight-content" style="transform-origin: ${position.origin}">
          <div class="spotlight-arrow" style="${position.arrowStyles}"></div>
          <div class="spotlight-message">${config.message}</div>
          <div class="spotlight-subtitle">${config.subtitle}</div>
          ${config.cta ? `<button class="spotlight-cta" data-action="${config.ctaAction}">${config.cta}</button>` : ''}
        </div>
      `;
      
      spotlight.style.cssText = `
        position: fixed;
        left: ${position.x}px;
        top: ${position.y}px;
        z-index: ${config.overlay ? 15000 : 3000};
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      
      this.addSpotlightStyles();
      document.body.appendChild(spotlight);
      
      // Animate in
      requestAnimationFrame(() => {
        spotlight.style.opacity = '1';
      });
      
      // Add glow effect to target
      targetElement.classList.add('spotlight-target');
      
      // Handle CTA if present
      if (config.cta) {
        const ctaBtn = spotlight.querySelector('.spotlight-cta');
        ctaBtn.addEventListener('click', () => {
          this.handleSpotlightAction(config.ctaAction);
          this.hideSpotlight(spotlight, targetElement);
        });
      }
      
      // Auto-hide after duration
      setTimeout(() => {
        this.hideSpotlight(spotlight, targetElement);
      }, config.duration || 3000);
      
      // Hide on click outside
      setTimeout(() => {
        const hideOnClick = (e) => {
          if (!spotlight.contains(e.target)) {
            this.hideSpotlight(spotlight, targetElement);
            document.removeEventListener('click', hideOnClick);
          }
        };
        document.addEventListener('click', hideOnClick);
      }, 1000);
    }
    
    calculateSpotlightPosition(rect, preferredPosition) {
      const isMobile = window.innerWidth <= 768;
      const spotlight = { width: isMobile ? 300 : 280, height: isMobile ? 90 : 80 };
      const arrow = { size: 8 };
      const margin = isMobile ? 20 : 16; // More breathing room on mobile
      
      let position = { x: 0, y: 0, origin: 'center', arrowStyles: '' };
      
      // 🎯 MOBILE FIX: Respect header space (90px header + 20px margin = 110px safe zone)
      const safeTopZone = isMobile ? 110 : margin;
      
      // Determine best position based on available space
      const canShowAbove = rect.top > spotlight.height + safeTopZone;
      const canShowBelow = window.innerHeight - rect.bottom > spotlight.height + margin;
      const canShowLeft = rect.left > spotlight.width + margin;
      const canShowRight = window.innerWidth - rect.right > spotlight.width + margin;
      
      if (preferredPosition === 'bottom' || (!canShowAbove && canShowBelow)) {
        // Show below
        position.x = rect.left + rect.width / 2 - spotlight.width / 2;
        position.y = rect.bottom + margin;
        position.origin = 'top center';
        position.arrowStyles = `
          top: -${arrow.size}px;
          left: 50%;
          transform: translateX(-50%);
          border-bottom: ${arrow.size}px solid rgba(75, 85, 99, 0.95);
          border-left: ${arrow.size}px solid transparent;
          border-right: ${arrow.size}px solid transparent;
        `;
      } else if (preferredPosition === 'top' || canShowAbove) {
        // Show above
        position.x = rect.left + rect.width / 2 - spotlight.width / 2;
        position.y = rect.top - spotlight.height - margin;
        position.origin = 'bottom center';
        position.arrowStyles = `
          bottom: -${arrow.size}px;
          left: 50%;
          transform: translateX(-50%);
          border-top: ${arrow.size}px solid rgba(75, 85, 99, 0.95);
          border-left: ${arrow.size}px solid transparent;
          border-right: ${arrow.size}px solid transparent;
        `;
      } else if (preferredPosition === 'left' || canShowLeft) {
        // Show left
        position.x = rect.left - spotlight.width - margin;
        position.y = rect.top + rect.height / 2 - spotlight.height / 2;
        position.origin = 'center right';
        position.arrowStyles = `
          right: -${arrow.size}px;
          top: 50%;
          transform: translateY(-50%);
          border-left: ${arrow.size}px solid rgba(75, 85, 99, 0.95);
          border-top: ${arrow.size}px solid transparent;
          border-bottom: ${arrow.size}px solid transparent;
        `;
      } else if (canShowRight) {
        // Show right
        position.x = rect.right + margin;
        position.y = rect.top + rect.height / 2 - spotlight.height / 2;
        position.origin = 'center left';
        position.arrowStyles = `
          left: -${arrow.size}px;
          top: 50%;
          transform: translateY(-50%);
          border-right: ${arrow.size}px solid rgba(75, 85, 99, 0.95);
          border-top: ${arrow.size}px solid transparent;
          border-bottom: ${arrow.size}px solid transparent;
        `;
      }
      
      // Keep within viewport bounds - MOBILE-AWARE
      const minY = isMobile ? safeTopZone : margin;
      position.x = Math.max(margin, Math.min(position.x, window.innerWidth - spotlight.width - margin));
      position.y = Math.max(minY, Math.min(position.y, window.innerHeight - spotlight.height - margin));
      
      return position;
    }
    
    hideSpotlight(spotlight, targetElement) {
      if (!spotlight || !spotlight.parentNode) return;
      
      this.activeSpotlight = null;
      targetElement.classList.remove('spotlight-target');
      
      spotlight.style.opacity = '0';
      spotlight.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        if (spotlight.parentNode) {
          spotlight.parentNode.removeChild(spotlight);
        }
      }, 400);
    }
    
    handleSpotlightAction(action) {
      switch (action) {
        case 'show-upgrade-modal':
          if (window.showAuthModal) {
            window.showAuthModal('contextual-spotlight');
          } else {
            window.location.href = '/signup.html?source=spotlight&feature=upgrade';
          }
          break;
        default:
          console.log('🎯 Spotlight action:', action);
      }
    }
    
    addSpotlightStyles() {
      if (document.getElementById('contextual-spotlight-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'contextual-spotlight-styles';
      style.textContent = `
        .contextual-spotlight {
          animation: spotlightFloat 4s ease-in-out infinite;
        }
        
        .contextual-spotlight .spotlight-content {
          position: relative;
          background: rgba(75, 85, 99, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          max-width: 280px;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.3),
            0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .contextual-spotlight .spotlight-arrow {
          position: absolute;
          width: 0;
          height: 0;
        }
        
        .contextual-spotlight .spotlight-message {
          font-weight: 600;
          margin-bottom: 4px;
          color: #FFD166;
        }
        
        .contextual-spotlight .spotlight-subtitle {
          font-size: 12px;
          opacity: 0.9;
          line-height: 1.3;
          margin-bottom: 8px;
        }
        
        .contextual-spotlight .spotlight-cta {
          background: rgba(255, 209, 102, 0.2);
          border: 1px solid rgba(255, 209, 102, 0.3);
          color: #FFD166;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .contextual-spotlight .spotlight-cta:hover {
          background: rgba(255, 209, 102, 0.3);
          transform: translateY(-1px);
        }
        
        .spotlight-target {
          animation: spotlightGlow 2s ease-in-out infinite alternate !important;
          transition: all 0.3s ease !important;
        }
        
        @keyframes spotlightFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        @keyframes spotlightGlow {
          from { 
            box-shadow: 0 0 5px rgba(255, 209, 102, 0.3);
          }
          to { 
            box-shadow: 0 0 20px rgba(255, 209, 102, 0.6);
          }
        }
        
        @media (max-width: 768px) {
          .contextual-spotlight .spotlight-content {
            max-width: 240px;
            padding: 10px 14px;
          }
          
          .contextual-spotlight .spotlight-message {
            font-size: 13px;
          }
          
          .contextual-spotlight .spotlight-subtitle {
            font-size: 11px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Initialize when script loads (on all pages)
  window.ContextualSpotlightSystem = new ContextualSpotlightSystem();
  
})();