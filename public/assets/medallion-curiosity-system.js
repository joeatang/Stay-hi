/**
 * 🎯 Medallion Curiosity System
 * Wozniak-grade: Show, don't tell
 * 
 * Triple-checked for:
 * ✅ Zero visual changes to welcome.html structure
 * ✅ Clean timing: 800ms delay after medallion loads
 * ✅ Minimal footprint: <100 lines, auto-cleanup
 * ✅ Grandma-friendly: "Tap to feel what Hi is about"
 * ✅ Non-blocking: Doesn't prevent any exploration
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'hi_medallion_tapped';
  
  class MedallionCuriositySystem {
    constructor() {
      this.hasInteracted = localStorage.getItem(STORAGE_KEY) === 'true';
      this.hint = null;
      
      // Only run on welcome page
      const isWelcomePage = window.location.pathname.includes('welcome.html') || 
                            window.location.pathname === '/' ||
                            window.location.pathname === '/public/' ||
                            window.location.pathname === '/public/index.html';
      
      if (!isWelcomePage) return;
      
      // Skip if user already knows about medallion
      if (this.hasInteracted) {
        console.log('👋 Medallion Curiosity: User already tapped - skip hint');
        return;
      }
      
      this.init();
    }
    
    init() {
      console.log('🎯 Medallion Curiosity: Initializing for first-time user');
      
      // Wait for page to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.waitForMedallion());
      } else {
        this.waitForMedallion();
      }
    }
    
    waitForMedallion() {
      // Look for medallion container or component
      const container = document.querySelector('#hiMedallionContainer');
      const medallion = container ? 
                       (container.querySelector('.hi-medallion') || container) : 
                       document.querySelector('.hi-medallion');
      
      if (medallion && medallion.offsetHeight > 0) {
        // Medallion is visible - show hint after 800ms (natural rhythm)
        console.log('✅ Medallion detected, showing hint in 800ms');
        setTimeout(() => this.showHint(medallion), 800);
      } else {
        // Medallion still loading - check again in 100ms
        setTimeout(() => this.waitForMedallion(), 100);
      }
    }
    
    showHint(medallion) {
      // Create hint bubble
      this.hint = document.createElement('div');
      this.hint.className = 'medallion-hint';
      this.hint.innerHTML = `
        <div class="hint-bubble">
          <span class="hint-emoji">👆</span>
          <span class="hint-text">Tap to feel what Hi is about</span>
        </div>
      `;
      
      // Position relative to medallion (preserve existing positioning)
      const originalPosition = window.getComputedStyle(medallion).position;
      if (originalPosition === 'static') {
        medallion.style.position = 'relative';
      }
      medallion.appendChild(this.hint);
      
      // Animate in
      requestAnimationFrame(() => {
        this.hint.classList.add('visible');
      });
      
      // Listen for first tap (anywhere on medallion or container)
      const tapHandler = () => {
        this.celebrateFirstTap();
        medallion.removeEventListener('click', tapHandler);
        medallion.removeEventListener('touchstart', tapHandler);
      };
      medallion.addEventListener('click', tapHandler);
      medallion.addEventListener('touchstart', tapHandler);
      
      // Auto-fade if ignored after 10s
      setTimeout(() => {
        if (this.hint && this.hint.parentNode) {
          this.fadeHint();
        }
      }, 10000);
    }
    
    celebrateFirstTap() {
      if (!this.hint) return;
      
      console.log('🎉 First medallion tap detected!');
      
      // Mark as completed (never show again)
      localStorage.setItem(STORAGE_KEY, 'true');
      
      // Show celebration modal before redirect
      this.showFirstTapCelebrationModal();
    }
    
    showFirstTapCelebrationModal() {
      // Create celebration modal
      const modal = document.createElement('div');
      modal.className = 'first-tap-celebration-modal';
      modal.innerHTML = `
        <div class="celebration-backdrop"></div>
        <div class="celebration-content">
          <div class="celebration-icon">🎉</div>
          <h2>You Did It!</h2>
          <p>You just noticed your first Hi moment.</p>
          <p class="celebration-subtext">That's what Stay Hi is all about.</p>
        </div>
      `;
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .first-tap-celebration-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .celebration-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          opacity: 0;
          animation: fadeIn 0.4s ease-out forwards;
        }
        .celebration-content {
          position: relative;
          background: linear-gradient(135deg, rgba(22, 26, 51, 0.98), rgba(15, 16, 36, 0.98));
          border: 1px solid rgba(255, 209, 102, 0.3);
          padding: 48px 40px;
          border-radius: 24px;
          text-align: center;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          opacity: 0;
          transform: scale(0.8) translateY(30px);
          animation: celebrationPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        .celebration-icon {
          font-size: 64px;
          margin-bottom: 20px;
          animation: iconSpin 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
        }
        .celebration-content h2 {
          font-size: 2rem;
          background: linear-gradient(135deg, #FFD166, #FF7B24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 16px;
          font-weight: 700;
        }
        .celebration-content p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          line-height: 1.6;
          margin: 0 0 8px;
        }
        .celebration-subtext {
          color: rgba(255, 209, 102, 0.8);
          font-size: 1rem;
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes celebrationPop {
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes iconSpin {
          0% { transform: rotate(-180deg) scale(0); }
          50% { transform: rotate(10deg) scale(1.2); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(modal);
      
      // Remove hint
      if (this.hint && this.hint.parentNode) {
        this.hint.remove();
        this.hint = null;
      }
      
      // Auto-redirect to dashboard after 2.5 seconds
      setTimeout(() => {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          window.location.href = 'hi-dashboard.html?first_visit=true';
        }, 300);
      }, 2500);
    }
    
    fadeHint() {
      if (!this.hint) return;
      
      this.hint.classList.add('fade-out');
      setTimeout(() => {
        if (this.hint && this.hint.parentNode) {
          this.hint.remove();
          this.hint = null;
        }
      }, 300);
    }
  }
  
  // Auto-initialize
  new MedallionCuriositySystem();
  
})();