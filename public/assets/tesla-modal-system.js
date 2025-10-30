/**
 * Tesla-Grade Universal Modal Management System
 * Bulletproof modal system for consistent behavior across all Stay Hi pages
 * Prevents modal failures, provides fallbacks, and ensures accessibility
 */
(function() {
  'use strict';
  
  class TeslaModalSystem {
    constructor() {
      this.activeModals = new Set();
      this.modalStack = [];
      this.scrollPosition = 0;
      this.initialized = false;
      
      // Modal configurations
      this.config = {
        zIndexBase: 99990,
        animationDuration: 300,
        backdropBlur: 8,
        emergencyTimeout: 5000,
        maxRetries: 3
      };
      
      this.init();
    }
    
    init() {
      if (this.initialized) return;
      
      console.log('🚀 Tesla Modal System: Initializing...');
      
      // Create global modal container
      this.createGlobalContainer();
      
      // Setup global event listeners
      this.setupEventListeners();
      
      // Setup emergency modal recovery
      this.setupEmergencyRecovery();
      
      this.initialized = true;
      console.log('✅ Tesla Modal System: Ready');
    }
    
    createGlobalContainer() {
      if (document.getElementById('teslaModalContainer')) return;
      
      const container = document.createElement('div');
      container.id = 'teslaModalContainer';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: ${this.config.zIndexBase};
      `;
      
      document.body.appendChild(container);
    }
    
    setupEventListeners() {
      // Global escape key handler
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalStack.length > 0) {
          this.closeTopModal();
        }
      });
      
      // Prevent background scroll
      document.addEventListener('wheel', (e) => {
        if (this.modalStack.length > 0) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // Handle browser back button
      window.addEventListener('popstate', () => {
        if (this.modalStack.length > 0) {
          this.closeAllModals();
        }
      });
    }
    
    setupEmergencyRecovery() {
      // Emergency modal recovery system
      window.addEventListener('error', (e) => {
        if (e.message.includes('modal') || e.message.includes('Modal')) {
          console.warn('🚨 Tesla Modal System: Error detected, initiating recovery');
          this.emergencyRecovery();
        }
      });
    }
    
    // Open modal with Tesla-grade reliability
    openModal(modalId, options = {}) {
      console.log(`🎯 Tesla Modal: Opening ${modalId}`);
      
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(`❌ Tesla Modal: Element ${modalId} not found`);
        return this.createEmergencyModal(modalId, options);
      }
      
      // Configure modal
      const config = {
        backdrop: true,
        keyboard: true,
        focus: true,
        ...options
      };
      
      // Store scroll position
      if (this.modalStack.length === 0) {
        this.scrollPosition = window.pageYOffset;
      }
      
      // Add to stack
      this.modalStack.push({ id: modalId, element: modal, config });
      this.activeModals.add(modalId);
      
      // Apply Tesla display system
      this.applyTeslaDisplay(modal, config);
      
      // Lock body scroll
      this.lockBodyScroll();
      
      // Focus management
      if (config.focus) {
        this.manageFocus(modal);
      }
      
      // Verify success
      this.verifyModalOpen(modal, modalId);
      
      return modal;
    }
    
    applyTeslaDisplay(modal, config) {
      // Remove conflicting styles
      modal.classList.remove('hide', 'hidden');
      modal.removeAttribute('hidden');
      
      // Apply Tesla-grade display properties
      const displayStyles = {
        display: 'flex',
        visibility: 'visible',
        opacity: '1',
        zIndex: this.config.zIndexBase + this.modalStack.length,
        position: 'fixed',
        inset: '0',
        pointerEvents: 'auto'
      };
      
      if (config.backdrop) {
        displayStyles.background = 'rgba(0, 0, 0, 0.8)';
        displayStyles.backdropFilter = `blur(${this.config.backdropBlur}px)`;
      }
      
      Object.assign(modal.style, displayStyles);
      modal.classList.add('tesla-modal-active');
      
      // Animate in
      setTimeout(() => {
        modal.classList.add('tesla-modal-show');
      }, 10);
    }
    
    closeModal(modalId) {
      console.log(`🚪 Tesla Modal: Closing ${modalId}`);
      
      const stackIndex = this.modalStack.findIndex(m => m.id === modalId);
      if (stackIndex === -1) {
        console.warn(`⚠️ Tesla Modal: ${modalId} not in stack`);
        return;
      }
      
      const modalInfo = this.modalStack[stackIndex];
      const modal = modalInfo.element;
      
      // Animate out
      modal.classList.remove('tesla-modal-show');
      
      setTimeout(() => {
        // Hide modal
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.classList.remove('tesla-modal-active');
        
        // Remove from stack and active set
        this.modalStack.splice(stackIndex, 1);
        this.activeModals.delete(modalId);
        
        // Restore scroll if no modals left
        if (this.modalStack.length === 0) {
          this.unlockBodyScroll();
        }
        
        console.log(`✅ Tesla Modal: ${modalId} closed`);
      }, this.config.animationDuration);
    }
    
    closeTopModal() {
      if (this.modalStack.length > 0) {
        const topModal = this.modalStack[this.modalStack.length - 1];
        this.closeModal(topModal.id);
      }
    }
    
    closeAllModals() {
      console.log('🧹 Tesla Modal: Closing all modals');
      
      [...this.modalStack].forEach(modalInfo => {
        this.closeModal(modalInfo.id);
      });
    }
    
    lockBodyScroll() {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
    }
    
    unlockBodyScroll() {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Restore scroll position
      window.scrollTo(0, this.scrollPosition);
    }
    
    getScrollbarWidth() {
      const scrollDiv = document.createElement('div');
      scrollDiv.style.cssText = 'width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;';
      document.body.appendChild(scrollDiv);
      const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return scrollbarWidth;
    }
    
    manageFocus(modal) {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        setTimeout(() => {
          focusableElements[0].focus();
        }, this.config.animationDuration);
      }
    }
    
    verifyModalOpen(modal, modalId) {
      setTimeout(() => {
        const isVisible = modal.offsetHeight > 0 && 
                         modal.offsetWidth > 0 && 
                         getComputedStyle(modal).display !== 'none';
        
        if (!isVisible) {
          console.error(`❌ Tesla Modal: ${modalId} failed to open properly`);
          this.emergencyDisplay(modal, modalId);
        } else {
          console.log(`✅ Tesla Modal: ${modalId} verified open`);
        }
      }, 100);
    }
    
    emergencyDisplay(modal, modalId) {
      console.log(`🚨 Tesla Modal: Emergency display for ${modalId}`);
      
      modal.setAttribute('style', 
        'display: flex !important; ' +
        'visibility: visible !important; ' +
        'opacity: 1 !important; ' +
        'z-index: 99999 !important; ' +
        'position: fixed !important; ' +
        'inset: 0 !important; ' +
        'background: rgba(0,0,0,0.8) !important; ' +
        'backdrop-filter: blur(8px) !important; ' +
        'align-items: center !important; ' +
        'justify-content: center !important; ' +
        'pointer-events: auto !important;'
      );
    }
    
    createEmergencyModal(modalId, options) {
      console.log(`🆘 Tesla Modal: Creating emergency modal for ${modalId}`);
      
      const modal = document.createElement('div');
      modal.id = modalId + '_emergency';
      modal.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #0F0F23 0%, #1A1A2E 50%, #16213E 100%);
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          color: white;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
          <h3 style="color: #4ECDC4; margin: 0 0 16px 0;">⚡ System Recovery</h3>
          <p style="margin: 0 0 24px 0; opacity: 0.8;">
            The ${modalId.replace(/([A-Z])/g, ' $1').toLowerCase()} system is being optimized.
          </p>
          <button onclick="window.teslaModalSystem.closeModal('${modal.id}')" 
            style="
              background: #4ECDC4;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              color: #0F0F23;
              font-weight: 600;
              cursor: pointer;
            ">
            Continue
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      return this.openModal(modal.id, options);
    }
    
    emergencyRecovery() {
      console.log('🛠️ Tesla Modal: Emergency recovery initiated');
      
      // Close all modals
      this.closeAllModals();
      
      // Reset body styles
      this.unlockBodyScroll();
      
      // Clear stacks
      this.modalStack = [];
      this.activeModals.clear();
      
      console.log('✅ Tesla Modal: Emergency recovery completed');
    }
    
    // Public API
    isModalOpen(modalId) {
      return this.activeModals.has(modalId);
    }
    
    getActiveModals() {
      return Array.from(this.activeModals);
    }
    
    hasActiveModals() {
      return this.modalStack.length > 0;
    }
  }
  
  // Initialize global Tesla Modal System
  window.teslaModalSystem = new TeslaModalSystem();
  
  // Global helper functions
  window.openTeslaModal = (modalId, options) => window.teslaModalSystem.openModal(modalId, options);
  window.closeTeslaModal = (modalId) => window.teslaModalSystem.closeModal(modalId);
  
  // Add CSS for Tesla Modal System
  const style = document.createElement('style');
  style.textContent = `
    .tesla-modal-active {
      transition: opacity ${window.teslaModalSystem.config.animationDuration}ms ease,
                  transform ${window.teslaModalSystem.config.animationDuration}ms ease !important;
    }
    
    .tesla-modal-show {
      opacity: 1 !important;
      transform: scale(1) !important;
    }
    
    .tesla-modal-active:not(.tesla-modal-show) {
      opacity: 0;
      transform: scale(0.95);
    }
    
    .tesla-modal-active .edit-sheet,
    .tesla-modal-active .calendar-modal-content {
      transition: transform ${window.teslaModalSystem.config.animationDuration}ms cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }
    
    .tesla-modal-show .edit-sheet {
      transform: translateY(0) !important;
    }
    
    .tesla-modal-active:not(.tesla-modal-show) .edit-sheet {
      transform: translateY(100%) !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('🏆 Tesla Modal System: Fully loaded and operational');
})();