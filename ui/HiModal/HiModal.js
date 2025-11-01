// ui/HiModal/HiModal.js  
// Tesla-Grade Hi Modal Component
(function() {
  'use strict';

  class HiModal {
    constructor(options = {}) {
      this.options = {
        title: options.title || 'Hi Modal',
        content: options.content || '',
        showCloseButton: options.showCloseButton !== false,
        closeOnBackdrop: options.closeOnBackdrop !== false,
        closeOnEscape: options.closeOnEscape !== false,
        buttons: options.buttons || [],
        className: options.className || '',
        ...options
      };
      
      this.isOpen = false;
      this.backdrop = null;
      this.modal = null;
      this.focusedElementBeforeModal = null;
    }

    create() {
      // Create backdrop
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'hi-modal-backdrop';
      
      // Create modal
      this.modal = document.createElement('div');
      this.modal.className = `hi-modal-sheet ${this.options.className}`;
      this.modal.setAttribute('role', 'dialog');
      this.modal.setAttribute('aria-modal', 'true');
      this.modal.setAttribute('tabindex', '-1');
      
      if (this.options.title) {
        this.modal.setAttribute('aria-labelledby', 'hi-modal-title');
      }

      // Build modal content
      let html = '';
      
      // Header
      if (this.options.title || this.options.showCloseButton) {
        html += '<div class="hi-modal-header">';
        if (this.options.title) {
          html += `<h3 class="hi-modal-title" id="hi-modal-title">${this.options.title}</h3>`;
        }
        if (this.options.showCloseButton) {
          html += '<button class="hi-modal-close" aria-label="Close modal">×</button>';
        }
        html += '</div>';
      }
      
      // Content
      if (this.options.content) {
        html += `<div class="hi-modal-content">${this.options.content}</div>`;
      }
      
      // Footer with buttons
      if (this.options.buttons && this.options.buttons.length > 0) {
        html += '<div class="hi-modal-footer">';
        this.options.buttons.forEach(button => {
          const btnClass = button.primary ? 'hi-modal-btn hi-modal-btn-primary' : 'hi-modal-btn hi-modal-btn-secondary';
          html += `<button class="${btnClass}" data-action="${button.action || 'close'}">${button.text}</button>`;
        });
        html += '</div>';
      }
      
      this.modal.innerHTML = html;
      
      // Add event listeners
      this.addEventListeners();
      
      return this;
    }

    addEventListeners() {
      // Close button
      const closeBtn = this.modal.querySelector('.hi-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }
      
      // Action buttons
      const actionBtns = this.modal.querySelectorAll('[data-action]');
      actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = e.target.getAttribute('data-action');
          if (action === 'close') {
            this.close();
          } else if (this.options.onButtonClick) {
            this.options.onButtonClick(action, e.target);
          }
        });
      });
      
      // Backdrop click
      if (this.options.closeOnBackdrop) {
        this.backdrop.addEventListener('click', () => this.close());
      }
      
      // Escape key
      if (this.options.closeOnEscape) {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
      }
    }

    handleKeyDown(e) {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
      
      // Focus trap
      if (e.key === 'Tab' && this.isOpen) {
        this.trapFocus(e);
      }
    }

    trapFocus(e) {
      const focusableElements = this.modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }

    open() {
      if (this.isOpen) return this;
      
      // Store currently focused element
      this.focusedElementBeforeModal = document.activeElement;
      
      // Add to DOM
      document.body.appendChild(this.backdrop);
      document.body.appendChild(this.modal);
      
      // Show with animation
      requestAnimationFrame(() => {
        this.backdrop.style.display = 'block';
        this.backdrop.style.opacity = '1';
        this.modal.classList.add('show');
        
        // Lock body scroll
        document.body.classList.add('hi-modal-open');
        
        // Focus modal
        this.modal.focus();
      });
      
      this.isOpen = true;
      
      // Trigger open callback
      if (this.options.onOpen) {
        this.options.onOpen(this);
      }
      
      return this;
    }

    close() {
      if (!this.isOpen) return this;
      
      // Hide with animation
      this.modal.classList.remove('show');
      this.modal.classList.add('hide');
      this.backdrop.style.opacity = '0';
      
      // Clean up after animation
      setTimeout(() => {
        if (this.backdrop && this.backdrop.parentNode) {
          this.backdrop.parentNode.removeChild(this.backdrop);
        }
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        
        // Unlock body scroll
        document.body.classList.remove('hi-modal-open');
        
        // Restore focus
        if (this.focusedElementBeforeModal) {
          this.focusedElementBeforeModal.focus();
        }
        
        this.isOpen = false;
        
        // Trigger close callback
        if (this.options.onClose) {
          this.options.onClose(this);
        }
      }, 300);
      
      return this;
    }

    destroy() {
      this.close();
      // Remove event listeners would go here if we stored references
    }
  }

  // Static helper methods
  HiModal.alert = function(message, title = 'Alert') {
    const modal = new HiModal({
      title: title,
      content: message,
      buttons: [{ text: 'OK', primary: true, action: 'close' }]
    });
    
    modal.create().open();
    return modal;
  };

  HiModal.confirm = function(message, title = 'Confirm', callback) {
    const modal = new HiModal({
      title: title,
      content: message,
      buttons: [
        { text: 'Cancel', action: 'cancel' },
        { text: 'OK', primary: true, action: 'confirm' }
      ],
      onButtonClick: (action) => {
        if (callback) {
          callback(action === 'confirm');
        }
        modal.close();
      }
    });
    
    modal.create().open();
    return modal;
  };

  // Global HiModal interface
  window.HiModal = HiModal;
  
  console.log('[HiModal] Component loaded');
})();