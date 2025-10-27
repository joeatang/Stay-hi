/**
 * Modal Base - Shared modal functionality
 * Handles centering, focus trap, scroll lock, and animations
 */
(function() {
  'use strict';

  class ModalBase {
    constructor(options = {}) {
      this.options = {
        id: options.id || 'modal',
        className: options.className || 'modal-sheet',
        backdropClassName: options.backdropClassName || 'modal-backdrop',
        content: options.content || '',
        onOpen: options.onOpen || null,
        onClose: options.onClose || null,
        ...options
      };
      
      this.isOpen = false;
      this.sheet = null;
      this.backdrop = null;
      this.focusableElements = [];
      this.lastFocusedElement = null;
    }

    create() {
      // Create backdrop
      this.backdrop = document.createElement('div');
      this.backdrop.id = `${this.options.id}Backdrop`;
      this.backdrop.className = this.options.backdropClassName;
      this.backdrop.setAttribute('aria-hidden', 'true');

      // Create modal
      this.sheet = document.createElement('div');
      this.sheet.id = `${this.options.id}Sheet`;
      this.sheet.className = this.options.className;
      this.sheet.setAttribute('role', 'dialog');
      this.sheet.setAttribute('aria-modal', 'true');
      this.sheet.setAttribute('aria-hidden', 'true');
      
      if (this.options.labelledBy) {
        this.sheet.setAttribute('aria-labelledby', this.options.labelledBy);
      }

      // Set content
      this.sheet.innerHTML = this.options.content;

      // Append to document
      document.body.appendChild(this.backdrop);
      document.body.appendChild(this.sheet);

      this.setupEventListeners();
      return this.sheet;
    }

    setupEventListeners() {
      // Close on backdrop click
      this.backdrop?.addEventListener('click', () => this.close());

      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
        
        // Focus trap
        if (this.isOpen && e.key === 'Tab') {
          this.handleTabKey(e);
        }
      });
    }

    open() {
      if (this.isOpen) return;
      
      this.isOpen = true;
      this.lastFocusedElement = document.activeElement;
      
      // Show modal
      document.body.classList.add('modal-open');
      this.backdrop.style.display = 'block';
      
      // Force reflow for smooth animation
      this.sheet.offsetHeight;
      
      this.sheet.classList.remove('hide');
      this.sheet.classList.add('show');
      this.sheet.setAttribute('aria-hidden', 'false');
      
      // Update focusable elements
      this.updateFocusableElements();
      
      // Focus first element
      setTimeout(() => {
        this.focusFirst();
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
        
        // Call custom onOpen handler
        if (this.options.onOpen) {
          this.options.onOpen();
        }
      }, 100);
    }

    close() {
      if (!this.isOpen) return;
      
      this.isOpen = false;
      
      // Hide modal
      document.body.classList.remove('modal-open');
      this.sheet.classList.remove('show');
      this.sheet.classList.add('hide');
      this.sheet.setAttribute('aria-hidden', 'true');
      
      setTimeout(() => {
        this.backdrop.style.display = 'none';
      }, 300);
      
      // Restore focus
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
      }
      
      // Call custom onClose handler
      if (this.options.onClose) {
        this.options.onClose();
      }
    }

    updateFocusableElements() {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])'
      ];
      
      this.focusableElements = this.sheet.querySelectorAll(focusableSelectors.join(', '));
    }

    focusFirst() {
      if (this.focusableElements.length > 0) {
        this.focusableElements[0].focus();
      }
    }

    handleTabKey(e) {
      if (this.focusableElements.length === 0) return;
      
      const firstElement = this.focusableElements[0];
      const lastElement = this.focusableElements[this.focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    destroy() {
      if (this.backdrop) {
        this.backdrop.remove();
      }
      if (this.sheet) {
        this.sheet.remove();
      }
      
      document.body.classList.remove('modal-open');
      this.isOpen = false;
    }
  }

  // Export to global scope
  window.ModalBase = ModalBase;

})();