/**
 * 🚀 Hi Anonymous Onboarding System
 * Tesla-Grade first-time visitor experience for anonymous users
 * Triggers ONLY for fresh incognito/new users on welcome.html
 */

(function() {
  'use strict';

  const HI_ANONYMOUS_ONBOARDING_KEY = 'hi_anonymous_onboarding_v1';
  const HI_ANONYMOUS_SEEN_KEY = 'hi_anonymous_welcome_seen';
  
  class HiAnonymousOnboarding {
    constructor() {
      this.currentStep = 0;
      this.totalSteps = 5;
      this.overlay = null;
      this.isActive = false;
      
      // Initialize immediately if on welcome page
      if (window.location.pathname.includes('welcome.html')) {
        this.init();
      }
    }
    
    init() {
      // Wait for page to be fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.checkAndShow());
      } else {
        this.checkAndShow();
      }
    }
    
    checkAndShow() {
      // Only show for true first-time anonymous visitors
      if (this.shouldShowOnboarding()) {
        console.log('👋 Hi Anonymous Onboarding: Showing welcome experience');
        setTimeout(() => this.showOnboarding(), 1000); // Small delay for smooth experience
      }
    }
    
    shouldShowOnboarding() {
      try {
        // Check if user has seen anonymous onboarding before
        const hasSeenOnboarding = localStorage.getItem(HI_ANONYMOUS_ONBOARDING_KEY);
        const hasSeenWelcome = sessionStorage.getItem(HI_ANONYMOUS_SEEN_KEY);
        
        // Check if user has any Hi activity (returning user)
        const hasHiActivity = this.hasAnyHiActivity();
        
        // Show onboarding if: never seen it AND no Hi activity AND not already seen this session
        const shouldShow = !hasSeenOnboarding && !hasHiActivity && !hasSeenWelcome;
        
        console.log('🔍 Hi Onboarding Check:', {
          hasSeenOnboarding: !!hasSeenOnboarding,
          hasHiActivity,
          hasSeenWelcome: !!hasSeenWelcome,
          shouldShow
        });
        
        return shouldShow;
      } catch (error) {
        console.warn('⚠️ Hi Onboarding check failed:', error);
        return false; // Fail safe - don't show if uncertain
      }
    }
    
    hasAnyHiActivity() {
      const indicators = [
        'hi-usage-start',
        'hi_total',
        'hi_general_shares', 
        'hi_my_archive',
        'hiAccess',
        'sb-access-token',
        'hi_discovery_mode'
      ];
      
      return indicators.some(key => {
        try {
          const value = localStorage.getItem(key);
          return value && value !== '0' && value !== '[]' && value !== 'null';
        } catch {
          return false;
        }
      });
    }
    
    showOnboarding() {
      if (this.isActive) return;
      
      this.isActive = true;
      this.currentStep = 0;
      
      // Mark that we've shown onboarding this session
      sessionStorage.setItem(HI_ANONYMOUS_SEEN_KEY, 'true');
      
      this.createOverlay();
      this.showStep(0);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    
    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'hi-anonymous-onboarding';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 15000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      
      document.body.appendChild(this.overlay);
      
      // Animate in
      requestAnimationFrame(() => {
        this.overlay.style.opacity = '1';
      });
    }
    
    showStep(stepIndex) {
      if (!this.overlay) return;
      
      const steps = this.getOnboardingSteps();
      const step = steps[stepIndex];
      
      if (!step) {
        this.completeOnboarding();
        return;
      }
      
      this.overlay.innerHTML = `
        <div style="
          background: rgba(15, 16, 34, 0.95);
          backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 40px 32px;
          max-width: 480px;
          width: 90vw;
          text-align: center;
          color: white;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
        ">
          <!-- Progress Indicator -->
          <div style="
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 24px;
          ">
            ${Array.from({length: this.totalSteps}, (_, i) => `
              <div style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${i <= stepIndex ? '#FFD166' : 'rgba(255, 255, 255, 0.2)'};
                transition: background 0.3s ease;
              "></div>
            `).join('')}
          </div>
          
          <!-- Step Icon -->
          <div style="
            font-size: 48px;
            margin-bottom: 20px;
            animation: bounceIn 0.6s ease-out;
          ">${step.icon}</div>
          
          <!-- Step Content -->
          <h2 style="
            margin: 0 0 16px;
            font-size: 24px;
            color: #FFD166;
            font-weight: 700;
          ">${step.title}</h2>
          
          <p style="
            margin: 0 0 32px;
            font-size: 16px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.9);
          ">${step.description}</p>
          
          <!-- Action Buttons -->
          <div style="
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          ">
            ${stepIndex > 0 ? `
              <button id="hiOnboardingPrev" style="
                padding: 12px 20px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Previous</button>
            ` : ''}
            
            ${stepIndex === this.totalSteps - 1 ? `
              <button id="hiOnboardingStart" style="
                padding: 12px 24px;
                background: linear-gradient(135deg, #4ECDC4, #44A08D);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Start Your Hi Journey</button>
              
              <button id="hiOnboardingSkip" style="
                padding: 12px 20px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: rgba(255, 255, 255, 0.7);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Skip for Now</button>
            ` : `
              <button id="hiOnboardingNext" style="
                padding: 12px 24px;
                background: linear-gradient(135deg, #4ECDC4, #44A08D);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Next</button>
            `}
          </div>
          
          <!-- Skip Option (except last step) -->
          ${stepIndex < this.totalSteps - 1 ? `
            <div style="margin-top: 16px;">
              <button id="hiOnboardingSkipAll" style="
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
                cursor: pointer;
                text-decoration: underline;
              ">Skip Tour</button>
            </div>
          ` : ''}
        </div>
      `;
      
      // Add event listeners
      this.attachStepListeners(stepIndex);
      
      // Add CSS animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    getOnboardingSteps() {
      return [
        {
          icon: '👋',
          title: 'Welcome to the Hi House!',
          description: 'Stay Hi helps you stay highly inspired by checking in with yourself daily. Each tap, share, or moment is your way of saying "I\'m here." Welcome to your new home for staying inspired.'
        },
        {
          icon: '🎯',
          title: 'The Medallion System',
          description: 'This is your center. Tap it anytime to stay present and say Hi to the world. It\'s a symbol of presence — your reminder that you showed up today. Watch as your Hi moments connect with others globally.'
        },
        {
          icon: '💪',
          title: 'Hi Gym & Features',
          description: 'Need guidance? The Hi Gym walks you through your emotions step by step until you find your Hi again. Plus explore your Hi Dashboard for insights, profiles for community, and calendars for tracking progress.'
        },
        {
          icon: '🌟',
          title: 'Self Hi-5 & Sharing',
          description: 'Finished a workout? Stayed calm? Made a good choice? That\'s a Hi Moment. Tap Self Hi-5 to celebrate yourself and share it with the world. Anonymous mode lets you explore freely before joining our vibrant community.'
        },
        {
          icon: '✨',
          title: 'Ready to Begin?',
          description: 'Tap the Medallion and start your first Hi-5. You just joined a world of people choosing to stay highly inspired — one Hi at a time. Welcome home!'
        }
      ];
    }
    
    attachStepListeners(stepIndex) {
      const nextBtn = document.getElementById('hiOnboardingNext');
      const prevBtn = document.getElementById('hiOnboardingPrev');
      const startBtn = document.getElementById('hiOnboardingStart');
      const skipBtn = document.getElementById('hiOnboardingSkip');
      const skipAllBtn = document.getElementById('hiOnboardingSkipAll');
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => this.showStep(stepIndex + 1));
        nextBtn.addEventListener('mouseenter', () => {
          nextBtn.style.transform = 'translateY(-2px)';
          nextBtn.style.boxShadow = '0 8px 25px rgba(78, 205, 196, 0.3)';
        });
        nextBtn.addEventListener('mouseleave', () => {
          nextBtn.style.transform = 'translateY(0)';
          nextBtn.style.boxShadow = 'none';
        });
      }
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => this.showStep(stepIndex - 1));
        prevBtn.addEventListener('mouseenter', () => {
          prevBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        prevBtn.addEventListener('mouseleave', () => {
          prevBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        });
      }
      
      if (startBtn) {
        startBtn.addEventListener('click', () => this.completeOnboarding(true));
        startBtn.addEventListener('mouseenter', () => {
          startBtn.style.transform = 'translateY(-2px)';
          startBtn.style.boxShadow = '0 8px 25px rgba(78, 205, 196, 0.4)';
        });
        startBtn.addEventListener('mouseleave', () => {
          startBtn.style.transform = 'translateY(0)';
          startBtn.style.boxShadow = 'none';
        });
      }
      
      if (skipBtn) {
        skipBtn.addEventListener('click', () => this.completeOnboarding(false));
      }
      
      if (skipAllBtn) {
        skipAllBtn.addEventListener('click', () => this.completeOnboarding(false));
      }
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (!this.isActive) return;
        
        if (e.key === 'Escape') {
          this.completeOnboarding(false);
        } else if (e.key === 'ArrowRight' && nextBtn) {
          nextBtn.click();
        } else if (e.key === 'ArrowLeft' && prevBtn) {
          prevBtn.click();
        } else if (e.key === 'Enter' && startBtn) {
          startBtn.click();
        } else if (e.key === 'Enter' && nextBtn) {
          nextBtn.click();
        }
      });
    }
    
    completeOnboarding(userEngaged = true) {
      if (!this.overlay) return;
      
      this.isActive = false;
      
      // Mark as completed so it doesn't show again
      try {
        localStorage.setItem(HI_ANONYMOUS_ONBOARDING_KEY, 'completed');
        
        // Track completion for analytics
        if (userEngaged) {
          localStorage.setItem('hi_onboarding_completed', 'true');
        }
        
        console.log('✅ Hi Anonymous Onboarding completed:', { userEngaged });
      } catch (error) {
        console.warn('⚠️ Failed to save onboarding completion:', error);
      }
      
      // Animate out and remove
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // If user engaged, trigger any follow-up actions
        if (userEngaged) {
          this.triggerPostOnboardingActions();
        }
      }, 300);
    }
    
    triggerPostOnboardingActions() {
      // Optional: Highlight the "Try Anonymous" button or medallion
      try {
        const tryAnonymousBtn = document.getElementById('tryAnonymousBtn');
        if (tryAnonymousBtn) {
          // Subtle highlight effect
          tryAnonymousBtn.style.animation = 'pulse 2s ease-in-out infinite';
          setTimeout(() => {
            tryAnonymousBtn.style.animation = '';
          }, 6000);
        }
      } catch (error) {
        console.warn('⚠️ Post-onboarding actions failed:', error);
      }
    }
  }
  
  // Auto-initialize when script loads
  window.HiAnonymousOnboarding = new HiAnonymousOnboarding();
  
  // Also expose for manual triggering if needed
  window.showHiOnboarding = () => {
    if (window.HiAnonymousOnboarding) {
      window.HiAnonymousOnboarding.showOnboarding();
    }
  };
  
})();