/**
 * 🎉 Tesla-Grade Milestone Celebration System
 * Rewards natural discovery with perfect-timing celebrations
 * Replaces tutorials with achievement-driven progression
 */

(function() {
  'use strict';

  const MILESTONE_STORAGE_KEY = 'hi_milestone_celebrations';
  
  class MilestoneCelebrationSystem {
    constructor() {
      this.milestones = this.loadMilestoneState();
      this.currentTapCount = 0;
      this.celebrationQueue = [];
      this.isShowing = false;
      
      // Initialize milestone tracking
      this.init();
    }
    
    init() {
      // Track medallion interactions across all pages
      this.trackMedallionInteractions();
      
      // Track navigation for contextual celebrations
      this.trackNavigation();
      
      console.log('🎉 Milestone Celebration System initialized');
    }
    
    loadMilestoneState() {
      try {
        const stored = localStorage.getItem(MILESTONE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {
          firstTap: false,
          thirdTap: false,
          fifthTap: false,
          firstNavigation: false,
          firstMuscleVisit: false,
          firstIslandVisit: false
        };
      } catch (error) {
        console.warn('⚠️ Could not load milestone state:', error);
        return {
          firstTap: false,
          thirdTap: false,
          fifthTap: false,
          firstNavigation: false,
          firstMuscleVisit: false,
          firstIslandVisit: false
        };
      }
    }
    
    saveMilestoneState() {
      try {
        localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(this.milestones));
      } catch (error) {
        console.warn('⚠️ Could not save milestone state:', error);
      }
    }
    
    trackMedallionInteractions() {
      // Wait for medallion to be available
      const checkForMedallion = () => {
        const medallionContainer = document.querySelector('#hiMedallionContainer');
        const medallion = medallionContainer ? medallionContainer.querySelector('.hi-medallion') : null;
        
        if (medallion) {
          this.setupMedallionTracking(medallion);
        } else {
          setTimeout(checkForMedallion, 500);
        }
      };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForMedallion);
      } else {
        checkForMedallion();
      }
    }
    
    setupMedallionTracking(medallion) {
      const handleMedallionTap = () => {
        this.currentTapCount++;
        this.checkTapMilestones();
      };
      
      medallion.addEventListener('click', handleMedallionTap);
      medallion.addEventListener('touchstart', handleMedallionTap, { passive: true });
    }
    
    checkTapMilestones() {
      // First tap celebration - PURPOSEFUL TIMING: After medallion interaction settles
      if (this.currentTapCount === 1 && !this.milestones.firstTap) {
        this.milestones.firstTap = true;
        this.saveMilestoneState();
        this.queueCelebration({
          type: 'firstTap',
          message: '🎉 sent your first Hi wave!',
          subtitle: 'Watch the stats update in real-time',
          duration: 3500,
          delay: 1200, // Wait for medallion animation to complete
          action: 'highlight-stats'
        });
      }
      
      // Third tap celebration - THOUGHTFUL SPACING: Only if enough time passed
      if (this.currentTapCount === 3 && !this.milestones.thirdTap) {
        this.milestones.thirdTap = true;
        this.saveMilestoneState();
        this.queueCelebration({
          type: 'thirdTap',
          message: '✨ your Hi rhythm!',
          subtitle: 'You\'re connecting with the global community',
          duration: 3500,
          delay: 800,
          hint: 'Try exploring Hi Island 🏝️ for more community features'
        });
      }
      
      // Fifth tap celebration - SMART TIMING: Show only if user is engaged
      if (this.currentTapCount === 5 && !this.milestones.fifthTap) {
        this.milestones.fifthTap = true;
        this.saveMilestoneState();
        this.queueCelebration({
          type: 'fifthTap',
          message: '🔥 getting the Hi flow!',
          subtitle: 'Ready to unlock the full experience?',
          duration: 4000,
          delay: 1000,
          cta: 'Join the Community',
          ctaAction: 'upgrade-prompt'
        });
      }
    }
    
    trackNavigation() {
      // Track first navigation between pages
      const currentPage = window.location.pathname;
      
      if (currentPage.includes('hi-island') && !this.milestones.firstIslandVisit) {
        this.milestones.firstIslandVisit = true;
        this.saveMilestoneState();
        this.queueCelebration({
          type: 'firstIslandVisit',
          message: '🏝️ Welcome to Hi Island!',
          subtitle: 'Discover community connections and exploration',
          duration: 4000,
          contextual: true
        });
      }
      
      if (currentPage.includes('hi-muscle') && !this.milestones.firstMuscleVisit) {
        this.milestones.firstMuscleVisit = true;
        this.saveMilestoneState();
        this.queueCelebration({
          type: 'firstMuscleVisit',
          message: '💪 Found the Hi Gym!',
          subtitle: 'Guided emotional workouts for life\'s challenges',
          duration: 4000,
          contextual: true
        });
      }
    }
    
    queueCelebration(celebration) {
      this.celebrationQueue.push(celebration);
      if (!this.isShowing) {
        this.showNextCelebration();
      }
    }
    
    showNextCelebration() {
      if (this.celebrationQueue.length === 0) {
        this.isShowing = false;
        return;
      }
      
      this.isShowing = true;
      const celebration = this.celebrationQueue.shift();
      
      // WOZNIAK-GRADE TIMING: Respect user's cognitive load
      const delay = celebration.delay || (celebration.contextual ? 1500 : 800);
      setTimeout(() => {
        this.displayCelebration(celebration);
      }, delay);
    }
    
    displayCelebration(celebration) {
      const celebrationEl = document.createElement('div');
      celebrationEl.id = 'milestone-celebration';
      celebrationEl.innerHTML = `
        <div class="celebration-content">
          <div class="celebration-message">${celebration.message}</div>
          <div class="celebration-subtitle">${celebration.subtitle}</div>
          ${celebration.hint ? `<div class="celebration-hint">${celebration.hint}</div>` : ''}
          ${celebration.cta ? `<button class="celebration-cta" data-action="${celebration.ctaAction}">${celebration.cta}</button>` : ''}
        </div>
      `;
      
      celebrationEl.style.cssText = `
        position: fixed;
        top: 90px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        z-index: 1500;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        pointer-events: none;
      `;
      
      // Add celebration styles
      this.addCelebrationStyles();
      
      document.body.appendChild(celebrationEl);
      
      // Animate in
      requestAnimationFrame(() => {
        celebrationEl.style.opacity = '1';
        celebrationEl.style.transform = 'translateX(-50%) translateY(0)';
      });
      
      // Handle CTA click if present
      if (celebration.cta) {
        const ctaBtn = celebrationEl.querySelector('.celebration-cta');
        ctaBtn.addEventListener('click', () => {
          this.handleCelebrationAction(celebration.ctaAction);
          this.hideCelebration(celebrationEl);
        });
      }
      
      // Auto-hide after duration
      setTimeout(() => {
        this.hideCelebration(celebrationEl);
      }, celebration.duration);
    }
    
    hideCelebration(celebrationEl) {
      celebrationEl.style.opacity = '0';
      celebrationEl.style.transform = 'translateX(-50%) translateY(-20px)';
      
      setTimeout(() => {
        if (celebrationEl.parentNode) {
          celebrationEl.parentNode.removeChild(celebrationEl);
        }
        
        // Show next celebration in queue
        setTimeout(() => {
          this.showNextCelebration();
        }, 200);
      }, 400);
    }
    
    handleCelebrationAction(action) {
      switch (action) {
        case 'upgrade-prompt':
          // Show contextual upgrade modal
          if (window.showAuthModal) {
            window.showAuthModal('milestone-celebration');
          } else {
            // Fallback to signup page
            window.location.href = '/signup.html?source=milestone&milestone=fifth-tap';
          }
          break;
        default:
          console.log('🎯 Celebration action:', action);
      }
    }
    
    addCelebrationStyles() {
      if (document.getElementById('milestone-celebration-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'milestone-celebration-styles';
      style.textContent = `
        #milestone-celebration {
          animation: celebrationFloat 6s ease-in-out infinite;
        }
        
        #milestone-celebration .celebration-content {
          background: linear-gradient(135deg, rgba(78, 205, 196, 0.95) 0%, rgba(85, 196, 232, 0.95) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 16px 20px;
          text-align: center;
          color: white;
          box-shadow: 
            0 20px 40px rgba(78, 205, 196, 0.3),
            0 4px 12px rgba(0, 0, 0, 0.1);
          max-width: 340px;
          pointer-events: auto;
        }
        
        #milestone-celebration .celebration-message {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        
        #milestone-celebration .celebration-subtitle {
          font-size: 13px;
          opacity: 0.9;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        
        #milestone-celebration .celebration-hint {
          font-size: 12px;
          opacity: 0.75;
          font-style: italic;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        
        #milestone-celebration .celebration-cta {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }
        
        #milestone-celebration .celebration-cta:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        
        @keyframes celebrationFloat {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
        
        @media (max-width: 768px) {
          #milestone-celebration {
            top: 80px;
            left: 16px;
            right: 16px;
            transform: translateY(-10px);
          }
          
          #milestone-celebration .celebration-content {
            padding: 14px 18px;
            margin: 0;
            max-width: 100%;
          }
          
          #milestone-celebration .celebration-message {
            font-size: 15px;
          }
          
          #milestone-celebration .celebration-subtitle {
            font-size: 12px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Initialize when script loads (on all pages)
  window.MilestoneCelebrationSystem = new MilestoneCelebrationSystem();
  
})();