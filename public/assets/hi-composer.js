/**
 * Shared Self Hi-5 Composer Component
 * Now uses ModalBase for consistent modal behavior
 */
(function() {
  'use strict';

  class HiComposer {
    constructor() {
      this.isOpen = false;
      this.modal = null;
      this.journal = null;
      this.charCount = null;
      this.savePrivate = null;
      this.shareAnonymous = null;
      this.sharePublic = null;
    }

    init() {
      // Wait for ModalBase to be available
      if (window.ModalBase) {
        this.createModal();
      } else {
        // Wait for ModalBase to load
        const checkModalBase = () => {
          if (window.ModalBase) {
            this.createModal();
          } else {
            setTimeout(checkModalBase, 50);
          }
        };
        checkModalBase();
      }
    }

    createModal() {
      const content = `
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

      // Create modal using ModalBase
      this.modal = new window.ModalBase({
        id: 'hiComposer',
        className: 'modal-sheet',
        backdropClassName: 'modal-backdrop',
        content: content,
        labelledBy: 'hiComposerTitle',
        onOpen: () => {
          // Focus journal after modal opens
          setTimeout(() => {
            this.journal?.focus();
          }, 150);
        },
        onClose: () => {
          // Reset form
          if (this.journal) this.journal.value = '';
          if (this.charCount) this.charCount.textContent = '0';
        }
      });

      // Create the modal
      this.modal.create();

      // Get references to elements
      this.journal = document.getElementById('hiComposerJournal');
      this.charCount = document.getElementById('hiComposerCharCount');
      this.savePrivate = document.getElementById('hiComposerSavePrivate');
      this.shareAnonymous = document.getElementById('hiComposerShareAnonymous');
      this.sharePublic = document.getElementById('hiComposerSharePublic');

      this.setupEventListeners();
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
        
        // Increment global Hi starts counter for actual submission to feed
        this.incrementHiStarts();
        
        this.persist({ toIsland: true, anon: true });
      });

      // Share publicly
      this.sharePublic?.addEventListener('click', () => {
        if (window.PremiumUX) {
          window.PremiumUX.glow(this.sharePublic, '#FFD700');
          window.PremiumUX.confetti({ count: 20, colors: ['#4ECDC4', '#FFD700', '#FF6B6B'] });
          window.PremiumUX.triggerHapticFeedback('celebration');
        }
        
        // Increment global Hi starts counter for actual submission to feed
        this.incrementHiStarts();
        
        this.persist({ toIsland: true, anon: false });
      });
    }

    open() {
      if (this.modal) {
        this.isOpen = true;
        this.modal.open();
      }
    }

    // Increment global Hi starts counter (matches index.html logic)
    incrementHiStarts() {
      try {
        const currentCount = Number(localStorage.getItem('hi.starts') || 0);
        const newCount = currentCount + 1;
        localStorage.setItem('hi.starts', String(newCount));
        console.log('📊 Hi starts counter incremented in composer:', newCount);
      } catch (error) {
        console.warn('Failed to increment Hi starts counter:', error);
      }
    }

    close() {
      if (this.modal) {
        this.isOpen = false;
        this.modal.close();
      }
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
          location: this.getMaskedLocation(anon), 
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
        const message = anon ? 'Hi moment shared anonymously! 🎭' : 'Hi moment captured! ✨';
        window.PremiumUX.showToast(message, 'success');
      }
    }

    detectOrigin() {
      const path = window.location.pathname;
      if (path.includes('hi-muscle.html')) return 'guided';
      return 'quick';
    }

    getMaskedLocation(isAnonymous) {
      if (!isAnonymous) return '';
      
      // For anonymous posts, return city/state only (no exact location)
      // In a real app, this would extract city/state from GPS coordinates
      // For now, return empty since we don't have location input
      return '';
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

})();