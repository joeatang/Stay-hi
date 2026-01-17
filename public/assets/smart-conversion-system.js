/**
 * 🎯 Tesla-Grade Smart Conversion Moments System  
 * Identifies perfect upgrade moments and creates contextual conversion opportunities
 * Maximizes conversion without being pushy or interrupting natural flow
 */

(function() {
  'use strict';

  const SMART_CONVERSION_KEY = 'hi_smart_conversion_data';
  
  class SmartConversionMomentsSystem {
    constructor() {
      this.conversionData = this.loadConversionData();
      this.engagementScore = 0;
      this.sessionInteractions = 0;
      this.conversionMoments = [];
      this.isShowingConversion = false;
      
      // Initialize conversion intelligence
      this.init();
    }
    
    init() {
      console.log('🎯 Smart Conversion Moments System initialized');
      
      // Track engagement signals
      this.trackEngagementSignals();
      
      // Monitor conversion triggers
      this.setupConversionTriggers();
      
      // Analyze user behavior patterns
      this.analyzeUserBehavior();
    }
    
    loadConversionData() {
      try {
        const stored = localStorage.getItem(SMART_CONVERSION_KEY);
        return stored ? JSON.parse(stored) : {
          totalInteractions: 0,
          conversionAttempts: 0,
          highEngagementMoments: 0,
          lastConversionPrompt: 0,
          conversionDeclines: 0,
          featureAttempts: {
            sharing: 0,
            calendar: 0,
            muscle: 0,
            profiles: 0
          }
        };
      } catch (error) {
        console.warn('⚠️ Could not load conversion data:', error);
        return {
          totalInteractions: 0,
          conversionAttempts: 0,
          highEngagementMoments: 0,
          lastConversionPrompt: 0,
          conversionDeclines: 0,
          featureAttempts: {
            sharing: 0,
            calendar: 0,
            muscle: 0,
            profiles: 0
          }
        };
      }
    }
    
    saveConversionData() {
      try {
        localStorage.setItem(SMART_CONVERSION_KEY, JSON.stringify(this.conversionData));
      } catch (error) {
        console.warn('⚠️ Could not save conversion data:', error);
      }
    }
    
    trackEngagementSignals() {
      // Track meaningful interactions that indicate engagement
      const meaningfulSelectors = [
        '.hi-medallion',
        '[class*="nav"]',
        '[class*="share"]',
        '[class*="profile"]',
        '.floating-hiffirmations'
      ];
      
      meaningfulSelectors.forEach(selector => {
        document.addEventListener('click', (e) => {
          if (e.target.closest(selector)) {
            this.recordEngagement('interaction', 2);
            this.sessionInteractions++;
          }
        });
      });
      
      // Track time spent (engagement indicator)
      let timeOnPage = 0;
      const timeTracker = setInterval(() => {
        timeOnPage += 5;
        if (timeOnPage % 30 === 0) { // Every 30 seconds
          this.recordEngagement('time_spent', 1);
        }
        if (timeOnPage > 180) { // High engagement after 3+ minutes
          this.recordEngagement('deep_engagement', 5);
          clearInterval(timeTracker);
        }
      }, 5000);
      
      // Track medallion interactions specifically
      this.trackMedallionEngagement();
    }
    
    trackMedallionEngagement() {
      const checkForMedallion = () => {
        const medallion = document.querySelector('.hi-medallion');
        if (medallion) {
          medallion.addEventListener('click', () => {
            this.recordEngagement('medallion_tap', 3);
            this.checkMedallionMilestone();
          });
        } else {
          setTimeout(checkForMedallion, 500);
        }
      };
      checkForMedallion();
    }
    
    checkMedallionMilestone() {
      // Check milestone data for conversion opportunities
      const milestoneData = localStorage.getItem('hi_milestone_celebrations');
      if (milestoneData) {
        try {
          const milestones = JSON.parse(milestoneData);
          
          // Perfect moment: After 5th tap (user is engaged but not overwhelmed)
          if (milestones.fifthTap && this.engagementScore > 15 && !this.hasRecentConversionAttempt()) {
            this.triggerSmartConversion('medallion_mastery', {
              trigger: 'Fifth medallion tap + high engagement',
              message: '🔥 You\'re mastering the Hi flow!',
              value_prop: 'Ready to unlock your full potential?',
              benefits: [
                '💾 Save your Hi journey progress',
                '🤝 Connect with the global community', 
                '🎯 Advanced Hi Gym workouts',
                '📊 Detailed insights and streaks'
              ],
              urgency: 'low',
              timing: 'perfect'
            });
          }
        } catch (error) {
          console.warn('⚠️ Error checking milestone data:', error);
        }
      }
    }
    
    setupConversionTriggers() {
      // Trigger 1: Premium feature attempt
      this.monitorPremiumFeatureAttempts();
      
      // Trigger 2: High engagement + exploration
      this.monitorExplorationBehavior();
      
      // Trigger 3: Repeated visits (returning user pattern)
      this.monitorReturningUserBehavior();
      
      // Trigger 4: Social sharing attempt
      this.monitorSharingAttempts();
    }
    
    monitorPremiumFeatureAttempts() {
      // Monitor for blocked feature attempts
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && (
              node.classList?.contains('anonymous-access-modal') ||
              node.classList?.contains('premium-feature-modal') ||
              node.id?.includes('upgrade')
            )) {
              this.handlePremiumFeatureAttempt();
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
        console.warn('🎯 Smart Conversion: document.body not ready for MutationObserver');
      }
    }
    
    handlePremiumFeatureAttempt() {
      const featureType = this.detectFeatureType();
      this.conversionData.featureAttempts[featureType]++;
      this.recordEngagement('premium_feature_attempt', 8);
      
      // High-value conversion moment: User actively tried premium feature
      if (this.engagementScore > 10 && !this.hasRecentConversionAttempt()) {
        setTimeout(() => {
          this.triggerSmartConversion('feature_attempt', {
            trigger: `${featureType} feature attempt`,
            message: '✨ You discovered a premium feature!',
            value_prop: 'Unlock this and so much more',
            benefits: this.getFeatureSpecificBenefits(featureType),
            urgency: 'medium',
            timing: 'contextual',
            cta: `Unlock ${featureType.charAt(0).toUpperCase() + featureType.slice(1)}`
          });
        }, 2000); // Small delay to avoid interrupting the modal
      }
      
      this.saveConversionData();
    }
    
    detectFeatureType() {
      const url = window.location.pathname;
      if (url.includes('hi-muscle')) return 'muscle';
      if (url.includes('profile')) return 'profiles';
      // Look for sharing context
      const recentShareAttempt = Date.now() - (this.conversionData.lastShareAttempt || 0) < 5000;
      if (recentShareAttempt) return 'sharing';
      return 'calendar';
    }
    
    getFeatureSpecificBenefits(featureType) {
      const benefits = {
        sharing: [
          '📱 Share Hi moments with the world',
          '👀 See who Hi\'d back to your shares',
          '🌍 Connect with the global Hi community',
          '💬 Get encouragement from other Hi\'ers'
        ],
        muscle: [
          '💪 Complete emotional fitness workouts', 
          '📚 Access full library of Hi Gym sessions',
          '📈 Track your emotional growth progress',
          '🎯 Personalized workout recommendations'
        ],
        profiles: [
          '👤 Create your unique Hi profile',
          '🏝️ Connect with your local island community',
          '📍 Share your Hi location with others',
          '🤝 Build meaningful Hi connections'
        ],
        calendar: [
          '📅 Track your Hi journey over time',
          '⚡ Build powerful Hi streaks',
          '📊 See detailed Hi patterns and insights',
          '🎯 Set and achieve Hi goals'
        ]
      };
      
      return benefits[featureType] || benefits.sharing;
    }
    
    monitorExplorationBehavior() {
      let pageVisits = 0;
      let uniqueFeatures = new Set();
      
      // Track navigation between pages
      const trackExploration = () => {
        pageVisits++;
        const currentPage = window.location.pathname;
        uniqueFeatures.add(currentPage);
        
        // High exploration = high conversion potential
        if (pageVisits >= 3 && uniqueFeatures.size >= 2 && this.engagementScore > 12) {
          this.recordEngagement('exploration_behavior', 6);
          
          if (!this.hasRecentConversionAttempt()) {
            this.triggerSmartConversion('explorer', {
              trigger: 'High exploration behavior',
              message: '🗺️ You\'re really exploring Hi!',
              value_prop: 'Love what you\'ve discovered so far?',
              benefits: [
                '🔓 Unlock every Hi feature you\'ve seen',
                '💾 Keep your progress as you explore',
                '🌟 Join thousands of other Hi explorers',
                '🎁 Get exclusive member-only features'
              ],
              urgency: 'low',
              timing: 'perfect'
            });
          }
        }
      };
      
      // Track page visibility changes (navigation)
      document.addEventListener('visibilitychange', trackExploration);
    }
    
    monitorReturningUserBehavior() {
      // Check if user has visited before (but isn't member)
      const hasVisitHistory = this.conversionData.totalInteractions > 10;
      const isAnonymous = !localStorage.getItem('sb-access-token');
      
      if (hasVisitHistory && isAnonymous && this.sessionInteractions > 2) {
        // Returning user, high-value conversion opportunity
        setTimeout(() => {
          if (!this.hasRecentConversionAttempt()) {
            this.triggerSmartConversion('returning_user', {
              trigger: 'Returning user engagement',
              message: '👋 Welcome back to Hi!', 
              value_prop: 'Ready to make this official?',
              benefits: [
                '🏠 Make Hi your permanent home',
                '💾 Never lose your Hi progress again',
                '🎯 Pick up exactly where you left off',
                '⭐ Unlock everything you\'ve been exploring'
              ],
              urgency: 'medium',
              timing: 'welcome_back'
            });
          }
        }, 8000); // Give them time to settle back in
      }
    }
    
    monitorSharingAttempts() {
      // Track when users try to share (high conversion signal)
      let lastShareAttemptTime = 0;
      document.addEventListener('click', (e) => {
        if (e.target.closest('[class*="share"], [id*="share"]')) {
          const now = Date.now();
          // Debounce: only track once per 3 seconds to prevent infinite loops
          if (now - lastShareAttemptTime > 3000) {
            this.conversionData.lastShareAttempt = now;
            this.recordEngagement('share_attempt', 10); // Very high value signal
            this.saveConversionData();
            lastShareAttemptTime = now;
          }
        }
      });
    }
    
    recordEngagement(type, points) {
      this.engagementScore += points;
      this.conversionData.totalInteractions++;
      
      console.log(`🎯 Engagement: +${points} for ${type} (total: ${this.engagementScore})`);
      
      // Save periodically
      if (this.conversionData.totalInteractions % 5 === 0) {
        this.saveConversionData();
      }
    }
    
    hasRecentConversionAttempt() {
      const timeSinceLastPrompt = Date.now() - this.conversionData.lastConversionPrompt;
      const cooldownPeriod = 10 * 60 * 1000; // 10 minutes
      
      return timeSinceLastPrompt < cooldownPeriod;
    }
    
    triggerSmartConversion(conversionType, config) {
      if (this.isShowingConversion) return;
      
      // v1.1.0: Don't show upgrade prompts to paid tier users
      if (this.isUserPaidTier()) {
        console.log('🎯 Smart conversion skipped: User is on paid tier');
        return;
      }
      
      this.isShowingConversion = true;
      this.conversionData.conversionAttempts++;
      this.conversionData.lastConversionPrompt = Date.now();
      this.saveConversionData();
      
      console.log('🎯 Smart conversion triggered:', conversionType, config);
      
      this.showConversionModal(config);
    }
    
    /**
     * v1.1.0: Check if user is on a paid tier (bronze+)
     * Paid users should not see upgrade/conversion prompts
     */
    isUserPaidTier() {
      try {
        // 🎯 UPDATED: Include both current and legacy tier names for compatibility
        const paidTiers = [
          // Current tiers (from TIER_CONFIG.js)
          'bronze', 'silver', 'gold', 'premium', 'collective',
          // Legacy tiers (for backward compatibility)
          'explorer', 'patron', 'guardian', 'lifetime', 'member'
        ];
        
        // Check HiMembership if available
        if (window.HiMembership?.membershipStatus) {
          const tier = window.HiMembership.membershipStatus.tier;
          return paidTiers.includes(tier);
        }
        
        // Fallback: Check HiBrandTiers if available
        if (window.HiBrandTiers?.currentTier) {
          const tier = window.HiBrandTiers.currentTier;
          return paidTiers.includes(tier);
        }
        
        // Fallback: Check localStorage for tier info
        const cachedMembership = localStorage.getItem('hi_membership_status');
        if (cachedMembership) {
          const parsed = JSON.parse(cachedMembership);
          const tier = parsed.tier;
          return paidTiers.includes(tier);
        }
        
        return false;
      } catch (error) {
        console.warn('🎯 Could not determine tier for conversion check:', error);
        return false;
      }
    }
    
    showConversionModal(config) {
      const modal = document.createElement('div');
      modal.id = 'smart-conversion-modal';
      modal.className = 'smart-conversion-modal';
      modal.innerHTML = `
        <div class="conversion-backdrop"></div>
        <div class="conversion-content">
          <div class="conversion-header">
            <div class="conversion-message">${config.message}</div>
            <button class="conversion-close" onclick="this.closest('.smart-conversion-modal').remove(); window.SmartConversionMomentsSystem.isShowingConversion = false;">×</button>
          </div>
          <div class="conversion-value-prop">${config.value_prop}</div>
          <div class="conversion-benefits">
            ${config.benefits.map(benefit => `<div class="benefit-item">${benefit}</div>`).join('')}
          </div>
          <div class="conversion-actions">
            <button class="conversion-cta primary" data-action="upgrade">
              ${config.cta || 'Join the Hi Community'}
            </button>
            <button class="conversion-cta secondary" data-action="maybe-later">
              Maybe Later
            </button>
          </div>
        </div>
      `;
      
      this.addConversionStyles();
      document.body.appendChild(modal);
      
      // Animate in
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modal.querySelector('.conversion-content').style.transform = 'translate(-50%, -50%) scale(1)';
      });
      
      // Handle actions
      modal.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'upgrade') {
          this.handleConversionAction('upgrade');
          this.hideConversionModal(modal);
        } else if (action === 'maybe-later') {
          this.handleConversionAction('decline');
          this.hideConversionModal(modal);
        }
      });
      
      // Close on backdrop click
      modal.querySelector('.conversion-backdrop').addEventListener('click', () => {
        this.handleConversionAction('dismiss');
        this.hideConversionModal(modal);
      });
    }
    
    hideConversionModal(modal) {
      modal.style.opacity = '0';
      modal.querySelector('.conversion-content').style.transform = 'translate(-50%, -50%) scale(0.95)';
      
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        this.isShowingConversion = false;
      }, 300);
    }
    
    handleConversionAction(action) {
      console.log('🎯 Conversion action:', action);
      
      if (action === 'upgrade') {
        // Track successful conversion intent
        this.conversionData.conversionClicks = (this.conversionData.conversionClicks || 0) + 1;
        
        // Redirect to signup
        if (window.showAuthModal) {
          window.showAuthModal('smart-conversion');
        } else {
          window.location.href = '/signup.html?source=smart_conversion&engagement_score=' + this.engagementScore;
        }
      } else if (action === 'decline') {
        this.conversionData.conversionDeclines++;
      }
      
      this.saveConversionData();
    }
    
    analyzeUserBehavior() {
      // Analyze patterns for optimization
      const behavior = {
        engagementLevel: this.calculateEngagementLevel(),
        conversionReadiness: this.calculateConversionReadiness(),
        featureInterest: this.calculateFeatureInterest()
      };
      
      console.log('🎯 User behavior analysis:', behavior);
      return behavior;
    }
    
    calculateEngagementLevel() {
      if (this.engagementScore > 20) return 'high';
      if (this.engagementScore > 10) return 'medium';
      return 'low';
    }
    
    calculateConversionReadiness() {
      const factors = {
        engagement: this.engagementScore > 15,
        exploration: this.sessionInteractions > 3,
        featureAttempts: Object.values(this.conversionData.featureAttempts).some(count => count > 0),
        returningUser: this.conversionData.totalInteractions > 5
      };
      
      const readinessScore = Object.values(factors).filter(Boolean).length;
      
      if (readinessScore >= 3) return 'high';
      if (readinessScore >= 2) return 'medium';
      return 'low';
    }
    
    calculateFeatureInterest() {
      const attempts = this.conversionData.featureAttempts;
      const maxAttempts = Math.max(...Object.values(attempts));
      
      if (maxAttempts === 0) return 'general';
      
      return Object.keys(attempts).find(key => attempts[key] === maxAttempts) || 'general';
    }
    
    addConversionStyles() {
      if (document.getElementById('smart-conversion-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'smart-conversion-styles';
      style.textContent = `
        .smart-conversion-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 16000;
          opacity: 0;
          transition: opacity 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .conversion-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
        }
        
        .conversion-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.9);
          background: linear-gradient(135deg, #1a1d35 0%, #0f1024 100%);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          width: 90%;
          max-width: 420px;
          color: white;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .conversion-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px 24px 0;
        }
        
        .conversion-message {
          font-size: 20px;
          font-weight: 700;
          color: #FFD166;
          flex: 1;
        }
        
        .conversion-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        
        .conversion-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        .conversion-value-prop {
          padding: 8px 24px 20px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .conversion-benefits {
          padding: 0 24px 24px;
        }
        
        .benefit-item {
          display: flex;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .benefit-item:last-child {
          border-bottom: none;
        }
        
        .conversion-actions {
          padding: 20px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .conversion-cta {
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .conversion-cta.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
        }
        
        .conversion-cta.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .conversion-cta.secondary {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .conversion-cta.secondary:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        
        @media (max-width: 768px) {
          .conversion-content {
            width: 95%;
            margin: 20px;
          }
          
          .conversion-header {
            padding: 20px 20px 0;
          }
          
          .conversion-message {
            font-size: 18px;
          }
          
          .conversion-value-prop {
            padding: 8px 20px 16px;
            font-size: 15px;
          }
          
          .conversion-benefits {
            padding: 0 20px 20px;
          }
          
          .conversion-actions {
            padding: 16px 20px 20px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Initialize when script loads (on all pages)
  window.SmartConversionMomentsSystem = new SmartConversionMomentsSystem();
  
})();