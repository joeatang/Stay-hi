/**
 * 🎯 Tesla-Grade Medallion Curiosity System
 * Replaces information overload with natural discovery
 * Simple, elegant, zero-confusion first interaction
 */

(function() {
  'use strict';

  const MEDALLION_HINT_SEEN_KEY = 'hi_medallion_hint_seen';
  
  class MedallionCuriositySystem {
    constructor() {
      this.hintShown = false;
      this.hintElement = null;
      this.checkCount = 0;
      this.maxChecks = 50; // 5 seconds max waiting
      
      // Initialize when medallion is available
      this.init();
    }
    
    init() {
      // Only show hint for truly first-time visitors
      if (this.shouldShowHint()) {
        this.waitForMedallion();
      }
    }
    
    shouldShowHint() {
      try {
        // Check if hint was already shown
        const hintSeen = localStorage.getItem(MEDALLION_HINT_SEEN_KEY);
        if (hintSeen) return false;
        
        // Check if user has any Hi activity (returning user)
        const hasHiActivity = this.hasAnyHiActivity();
        if (hasHiActivity) return false;
        
        // Show hint for clean first-time visitors only
        return true;
      } catch (error) {
        console.warn('⚠️ Medallion hint check failed:', error);
        return false; // Fail safe
      }
    }
    
    hasAnyHiActivity() {
      const indicators = [
        'hi-usage-start',
        'hi_total',
        'hi_anonymous_usage',
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
    
    waitForMedallion() {
      const checkForMedallion = () => {
        this.checkCount++;
        
        const medallion = document.querySelector('#hiMedallionContainer');
        const medallionElement = medallion ? medallion.querySelector('.hi-medallion') : null;
        
        if (medallionElement && medallionElement.offsetParent !== null) {
          // Medallion is visible, show hint
          setTimeout(() => this.showCuriosityHint(medallionElement), 2000);
        } else if (this.checkCount < this.maxChecks) {
          // Keep checking every 100ms for up to 5 seconds
          setTimeout(checkForMedallion, 100);
        }
      };
      
      // Start checking when page is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForMedallion);
      } else {
        checkForMedallion();
      }
    }
    
    showCuriosityHint(medallionElement) {
      if (this.hintShown) return;
      this.hintShown = true;
      
      // Create subtle floating hint
      this.hintElement = document.createElement('div');
      this.hintElement.id = 'medallion-curiosity-hint';
      this.hintElement.innerHTML = `
        <div class="hint-content">
          <span class="hint-text">👆 Tap to feel what Hi is about</span>
        </div>
      `;
      
      // Position relative to medallion
      const medallionRect = medallionElement.getBoundingClientRect();
      const medallionCenterX = medallionRect.left + medallionRect.width / 2;
      const medallionTop = medallionRect.top;
      
      this.hintElement.style.cssText = `
        position: fixed;
        left: ${medallionCenterX}px;
        top: ${medallionTop - 60}px;
        transform: translateX(-50%);
        z-index: 1000;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        opacity: 0;
        transition: opacity 0.6s ease-in-out;
      `;
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        #medallion-curiosity-hint {
          animation: gentleFloat 3s ease-in-out infinite;
        }
        
        #medallion-curiosity-hint .hint-content {
          background: rgba(255, 215, 102, 0.95);
          color: #1a1a1a;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 
            0 8px 24px rgba(255, 215, 102, 0.3),
            0 2px 8px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 215, 102, 0.2);
          white-space: nowrap;
        }
        
        @keyframes gentleFloat {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
        
        @media (max-width: 768px) {
          #medallion-curiosity-hint {
            left: 50% !important;
            top: calc(50vh - 120px) !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(this.hintElement);
      
      // Animate in
      requestAnimationFrame(() => {
        this.hintElement.style.opacity = '1';
      });
      
      // Set up medallion tap listener
      this.setupMedallionListener(medallionElement);
      
      // Auto-hide after 12 seconds if not interacted with
      setTimeout(() => {
        if (this.hintElement && !this.hintElement.classList.contains('hiding')) {
          this.hideHint();
        }
      }, 12000);
    }
    
    setupMedallionListener(medallionElement) {
      const handleMedallionInteraction = () => {
        console.log('🎉 First medallion interaction detected');
        
        // Mark hint as seen so it never shows again
        try {
          localStorage.setItem(MEDALLION_HINT_SEEN_KEY, 'true');
        } catch (error) {
          console.warn('⚠️ Could not save medallion hint state:', error);
        }
        
        // Hide hint immediately
        this.hideHint();
        
        // Remove listeners
        medallionElement.removeEventListener('click', handleMedallionInteraction);
        medallionElement.removeEventListener('touchstart', handleMedallionInteraction);
        
        // Optional: Show brief celebration
        this.showFirstTapCelebration(medallionElement);
      };
      
      // Listen for both click and touch
      medallionElement.addEventListener('click', handleMedallionInteraction);
      medallionElement.addEventListener('touchstart', handleMedallionInteraction);
    }
    
    hideHint() {
      if (!this.hintElement) return;
      
      this.hintElement.classList.add('hiding');
      this.hintElement.style.opacity = '0';
      
      setTimeout(() => {
        if (this.hintElement && this.hintElement.parentNode) {
          this.hintElement.parentNode.removeChild(this.hintElement);
        }
        this.hintElement = null;
      }, 600);
    }
    
    showFirstTapCelebration(medallionElement) {
      // Create subtle celebration that doesn't interrupt flow
      const celebration = document.createElement('div');
      celebration.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(78, 205, 196, 0.95);
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 600;
        z-index: 2000;
        opacity: 0;
        transition: all 0.4s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px rgba(78, 205, 196, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      celebration.textContent = '🎉 You just sent your first Hi wave!';
      
      document.body.appendChild(celebration);
      
      // Animate in
      requestAnimationFrame(() => {
        celebration.style.opacity = '1';
        celebration.style.transform = 'translateX(-50%) translateY(10px)';
      });
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        celebration.style.opacity = '0';
        celebration.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => {
          if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
          }
        }, 400);
      }, 3000);
    }
  }
  
  // Initialize when script loads (only on welcome page)
  if (window.location.pathname.includes('welcome.html')) {
    window.MedallionCuriositySystem = new MedallionCuriositySystem();
  }
  
})();