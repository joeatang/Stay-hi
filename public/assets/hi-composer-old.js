/**
 * Shared Self Hi-5 Composer Component
 * Extracted from index.html for reuse across the app
 */
(function() {
  'use strict';

  class HiComposer {
    constructor() {
      this.isOpen = false;
      this.sheet = null;
      this.backdrop = null;
      this.journal = null;
      this.charCount = null;
      this.savePrivate = null;
      this.sharePublic = null;
      this.shareAnonymous = null;
    }

    init() {
      this.createModal();
      this.setupEventListeners();
    }

    createModal() {
      // Create backdrop
      this.backdrop = document.createElement('div');
      this.backdrop.id = 'hiComposerBackdrop';
      this.backdrop.className = 'premium-share-backdrop';
      this.backdrop.setAttribute('aria-hidden', 'true');

      // Create modal
      this.sheet = document.createElement('div');
      this.sheet.id = 'hiComposerSheet';
      this.sheet.className = 'premium-share-sheet glass-card';
      this.sheet.setAttribute('role', 'dialog');
      this.sheet.setAttribute('aria-modal', 'true');
      this.sheet.setAttribute('aria-labelledby', 'hiComposerTitle');
      this.sheet.setAttribute('aria-hidden', 'true');

      this.sheet.innerHTML = `
        <div class="share-header">
          <div class="share-icon">✨</div>
          <h3 id="hiComposerTitle" class="text-gradient">Capture this Hi Moment</h3>
          <p class="share-subtitle">Choose how you want to share your moment</p>
        </div>
        
        <div class="share-input-container">
          <textarea id="hiComposerJournal" maxlength="500" class="premium-textarea" placeholder="What was the Hi moment you just noticed? (1–2 lines)"></textarea>
          <div class="character-count"><span id="hiComposerCharCount">0</span>/500</div>
        </div>
        
        <div class="share-options">
          <button id="hiComposerSavePrivate" class="share-option private-option">
            <div class="option-icon">🔒</div>
            <div class="option-content">
              <div class="option-title">Save Privately</div>
              <div class="option-desc">Saved to My Archive</div>
            </div>
          </button>
          
          <button id="hiComposerShareAnonymous" class="share-option anonymous-option">
            <div class="option-icon">🎭</div>
            <div class="option-content">
              <div class="option-title">Share Anonymously</div>
              <div class="option-desc">Share as "Hi Friend" with city/state only</div>
            </div>
          </button>
          
          <button id="hiComposerSharePublic" class="share-option public-option primary-option">
            <div class="option-icon">🌍</div>
            <div class="option-content">
              <div class="option-title">Share with Hi Island</div>
              <div class="option-desc">Inspire others & spread the Hi</div>
            </div>
          </button>
        </div>
      `;

      // Append to document
      document.body.appendChild(this.backdrop);
      document.body.appendChild(this.sheet);

      // Get references
      this.journal = document.getElementById('hiComposerJournal');
      this.charCount = document.getElementById('hiComposerCharCount');
      this.savePrivate = document.getElementById('hiComposerSavePrivate');
      this.shareAnonymous = document.getElementById('hiComposerShareAnonymous');
      this.sharePublic = document.getElementById('hiComposerSharePublic');
    }

    setupEventListeners() {
      // Character counter
      this.journal?.addEventListener('input', () => {
        const len = this.journal.value.length;
        if (this.charCount) this.charCount.textContent = len;
      });

      // Save privately
      this.savePrivate?.addEventListener('click', () => {
        if (window.PremiumUX) {
          window.PremiumUX.glow(this.savePrivate, '#4ECDC4');
          window.PremiumUX.confetti({ count: 20, colors: ['#4ECDC4', '#FFD700', '#FF6B6B'] });
          window.PremiumUX.triggerHapticFeedback('celebration');
        }
        this.persist({ toIsland: false, anon: false });
      });

      // Share anonymously
      this.shareAnonymous?.addEventListener('click', () => {
        if (window.PremiumUX) {
          window.PremiumUX.glow(this.shareAnonymous, '#FF9F43');
          window.PremiumUX.confetti({ count: 20, colors: ['#FF9F43', '#FFD700', '#4ECDC4'] });
          window.PremiumUX.triggerHapticFeedback('celebration');
        }
        this.persist({ toIsland: true, anon: true });
      });

      // Share publicly
      this.sharePublic?.addEventListener('click', () => {
        if (window.PremiumUX) {
          window.PremiumUX.glow(this.sharePublic, '#FFD700');
          window.PremiumUX.confetti({ count: 20, colors: ['#4ECDC4', '#FFD700', '#FF6B6B'] });
          window.PremiumUX.triggerHapticFeedback('celebration');
        }
        this.persist({ toIsland: true, anon: false });
      });

      // Close on backdrop click
      this.backdrop?.addEventListener('click', () => this.close());

      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    open() {
      if (this.isOpen) return;
      
      this.isOpen = true;
      
      // FIXED: Consistent centering with scroll lock
      document.body.classList.add('modal-open');
      this.backdrop.style.display = 'block';
      this.sheet.classList.remove('hide');
      this.sheet.classList.add('show');
      this.sheet.setAttribute('aria-hidden', 'false');
      
      // Focus journal
      setTimeout(() => {
        this.journal?.focus();
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
      }, 100);
    }

    close() {
      if (!this.isOpen) return;
      
      this.isOpen = false;
      
      // FIXED: Proper cleanup with scroll unlock
      document.body.classList.remove('modal-open');
      this.sheet.classList.remove('show');
      this.sheet.classList.add('hide');
      this.sheet.setAttribute('aria-hidden', 'true');
      
      setTimeout(() => {
        this.backdrop.style.display = 'none';
      }, 300);
      
      // Reset form
      if (this.journal) this.journal.value = '';
      if (this.charCount) this.charCount.textContent = '0';
    }

    persist({ toIsland = false, anon = false } = {}) {
      const entryText = this.journal?.value.trim() || '';
      
      // Private save to archive (always happens)
      try {
        const archiveEntry = {
          currentEmoji: '⭘', 
          desiredEmoji: '⭘',
          journal: entryText, 
          location: ''
        };
        window.hiDB?.insertArchive?.(archiveEntry);
      } catch (e) { 
        console.warn('Archive save failed:', e); 
      }

      // Public share if requested
      if (toIsland && entryText) {
        const publicEntry = {
          currentEmoji: '⭘', 
          currentName: '', 
          desiredEmoji: '⭘', 
          desiredName: '',
          text: entryText, 
          isAnonymous: anon, 
          location: '', 
          isPublic: true,
          origin: this.detectOrigin(),
          type: 'self_hi5'
        };
        
        if (window.hiDB?.insertPublicShare) {
          window.hiDB.insertPublicShare(publicEntry).then(result => {
            if (result?.offline) this.addToQueue(publicEntry);
          }).catch(() => this.addToQueue(publicEntry));
        } else {
          this.addToQueue(publicEntry);
        }
      }

      this.close();
      
      // Show success toast
      if (window.PremiumUX) {
        window.PremiumUX.showToast('Hi moment captured! ✨', 'success');
      }
    }

    detectOrigin() {
      const path = window.location.pathname;
      if (path.includes('hi-muscle.html')) return 'guided';
      return 'quick';
    }

    addToQueue(entry) {
      try {
        const q = JSON.parse(localStorage.getItem('hi.queue') || '[]');
        q.unshift(entry);
        localStorage.setItem('hi.queue', JSON.stringify(q.slice(0, 20)));
      } catch (e) {
        console.warn('Queue save failed:', e);
      }
    }
  }

  // Create global instance
  window.HiComposer = new HiComposer();

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.HiComposer.init());
  } else {
    window.HiComposer.init();
  }

  // Export for manual usage
  window.openHiComposer = () => window.HiComposer.open();

})();