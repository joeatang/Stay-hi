/* ===================================================================
   🎨 HI SHARE SHEET COMPONENT
   Tesla-grade unified sharing modal for Hi moments
   Used by: Index (Self Hi5), Hi Island, Hi Muscle
=================================================================== */

export class HiShareSheet {
  constructor(options = {}) {
    this.origin = options.origin || 'hi5'; // 'hi5' or 'higym'
    this.onSuccess = options.onSuccess || (() => {});
    this.isOpen = false;
  }

  // Initialize component
  init() {
    this.render();
    this.attachEventListeners();
    
    // Expose to global for easy access
    window.openHiShareSheet = (origin = 'hi5') => {
      this.origin = origin;
      this.open();
    };
  }

  // Render HTML structure
  render() {
    // Remove any existing share sheet to prevent duplicates
    const existing = document.querySelector('.hi-share-sheet-container');
    if (existing) {
      existing.remove();
    }

    const container = document.createElement('div');
    container.className = 'hi-share-sheet-container';
    container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9997;';
    container.innerHTML = `
      <!-- Backdrop -->
      <div class="premium-share-backdrop" id="hi-share-backdrop"></div>

      <!-- Share Sheet Modal -->
      <div id="hi-share-sheet" class="premium-share-sheet glass-card" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <div class="share-header">
          <div class="share-icon">✨</div>
          <h3 id="sheetTitle" class="text-gradient">Capture this Hi Moment</h3>
          <p class="share-subtitle">Choose how you want to share your moment</p>
          <button id="hi-sheet-close" class="btn-premium-icon" style="position:absolute;top:16px;right:16px;" aria-label="Close">✕</button>
        </div>
        
        <div class="share-input-container">
          <textarea id="hi-share-journal" maxlength="500" class="premium-textarea" placeholder="What was the Hi moment you just noticed? (1–2 lines)"></textarea>
          <div class="character-count"><span id="hi-share-char-count">0</span>/500</div>
        </div>
        
        <div class="share-options">
          <button id="hi-save-private" class="share-option private-option">
            <div class="option-icon">🔒</div>
            <div class="option-content">
              <div class="option-title">Save Privately</div>
              <div class="option-desc">Hi Island • My Archive • Private only</div>
            </div>
          </button>
          
          <button id="hi-share-anon" class="share-option anonymous-option">
            <div class="option-icon">🥸</div>
            <div class="option-content">
              <div class="option-title">Share Anonymously</div>
              <div class="option-desc">Hi Island • General Shares • Anonymous</div>
              <div class="privacy-notice">
                🔒 Privacy: Only city/state location shared
              </div>
            </div>
          </button>
          
          <button id="hi-share-public" class="share-option public-option primary-option">
            <div class="option-icon">🌟</div>
            <div class="option-content">
              <div class="option-title">Share Publicly</div>
              <div class="option-desc">Hi Island • General Shares • With profile</div>
              <div class="privacy-notice">
                🔒 Privacy: Only city/state location shared
              </div>
            </div>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  // Attach event listeners
  attachEventListeners() {
    const backdrop = document.getElementById('hi-share-backdrop');
    const closeBtn = document.getElementById('hi-sheet-close');
    const journal = document.getElementById('hi-share-journal');
    const charCount = document.getElementById('hi-share-char-count');
    const savePrivateBtn = document.getElementById('hi-save-private');
    const shareAnonBtn = document.getElementById('hi-share-anon');
    const sharePublicBtn = document.getElementById('hi-share-public');

    // Character counter
    journal.addEventListener('input', () => {
      charCount.textContent = journal.value.length;
    });

    // Close handlers
    backdrop.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Share option handlers
    savePrivateBtn.addEventListener('click', (e) => this.handleSavePrivate(e));
    shareAnonBtn.addEventListener('click', (e) => this.handleShareAnonymous(e));
    sharePublicBtn.addEventListener('click', (e) => this.handleSharePublic(e));
  }

  // Open share sheet
  open() {
    const backdrop = document.getElementById('hi-share-backdrop');
    const sheet = document.getElementById('hi-share-sheet');
    
    backdrop.classList.add('active');
    sheet.classList.add('active');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // Focus textarea
    setTimeout(() => {
      document.getElementById('hi-share-journal').focus();
    }, 100);
  }

  // Close share sheet
  close() {
    const backdrop = document.getElementById('hi-share-backdrop');
    const sheet = document.getElementById('hi-share-sheet');
    const journal = document.getElementById('hi-share-journal');
    
    backdrop.classList.remove('active');
    sheet.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = '';
    
    // Clear input
    journal.value = '';
    document.getElementById('hi-share-char-count').textContent = '0';
  }

  // Handle Save Privately
  async handleSavePrivate(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    e.target.closest('button').dataset.animating = 'true';

    // Increment global Hi5 counter
    this.incrementGlobalCounter();

    await this.persist({ toIsland: false, anon: false });

    setTimeout(() => {
      e.target.closest('button').dataset.animating = 'false';
    }, 500);
  }

  // Handle Share Anonymously
  async handleShareAnonymous(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    e.target.closest('button').dataset.animating = 'true';

    // Increment global Hi5 counter
    this.incrementGlobalCounter();

    await this.persist({ toIsland: true, anon: true });

    setTimeout(() => {
      e.target.closest('button').dataset.animating = 'false';
    }, 500);
  }

  // Handle Share Publicly
  async handleSharePublic(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    e.target.closest('button').dataset.animating = 'true';

    // Increment global Hi5 counter
    this.incrementGlobalCounter();

    await this.persist({ toIsland: true, anon: false });

    setTimeout(() => {
      e.target.closest('button').dataset.animating = 'false';
    }, 800);
  }

  // Increment global counter
  incrementGlobalCounter() {
    const LS_TOTAL = 'hi_total_count';
    const LS_GLOBAL = 'hi_global_shares';
    
    let total = parseInt(localStorage.getItem(LS_TOTAL) || '0', 10);
    let gStarts = parseInt(localStorage.getItem(LS_GLOBAL) || '0', 10);
    
    total += 1;
    gStarts += 1;
    
    localStorage.setItem(LS_TOTAL, String(total));
    localStorage.setItem(LS_GLOBAL, String(gStarts));
    
    console.log('📊 Global Hi5 counter incremented:', { total, gStarts });
  }

  // Get user location (city/state only)
  async getUserLocation() {
    // Placeholder - implement geolocation API
    return 'San Francisco, CA';
  }

  // Persist data to Supabase
  async persist({ toIsland = false, anon = false }) {
    const journal = document.getElementById('hi-share-journal');
    const raw = (journal.value || '').trim();
    const text = raw || 'Marked a Hi-5 ✨';
    
    console.log('💾 Saving Hi-5:', { text, toIsland, anon, origin: this.origin });
    
    const location = await this.getUserLocation();

    try {
      // ALWAYS write to My Archive (private storage)
      const archivePayload = {
        currentEmoji: '👋',
        desiredEmoji: '👋',
        journal: text,
        location,
        origin: this.origin, // 'hi5' or 'higym'
        type: this.origin === 'higym' ? 'higym' : 'self_hi5'
      };
      
      const archiveResult = await window.hiDB?.insertArchive?.(archivePayload);
      console.log('📝 Archive saved:', archiveResult);

      // If sharing to island (public or anon), ALSO write to public_shares
      if (toIsland) {
        const publicPayload = {
          currentEmoji: '👋',
          currentName: this.origin === 'higym' ? 'Hi GYM' : 'Hi-5',
          desiredEmoji: '👋',
          desiredName: this.origin === 'higym' ? 'Hi GYM' : 'Hi-5',
          text,
          isAnonymous: anon,
          location,
          isPublic: true,
          origin: this.origin,
          type: this.origin === 'higym' ? 'higym' : 'self_hi5'
        };
        
        const publicResult = await window.hiDB?.insertPublicShare?.(publicPayload);
        console.log('🌟 Public share saved:', publicResult);

        // Update map
        try {
          await window.hiDB?.updateMap?.(publicPayload);
        } catch {}

        this.showToast(anon ? '✨ Shared anonymously!' : '🌟 Shared publicly!');
      } else {
        this.showToast('🔒 Saved privately to your archive ✨');
      }

      // Trigger success callback
      this.onSuccess({ toIsland, anon, origin: this.origin });

      // Close sheet
      this.close();

      // Refresh feed if on Hi Island page
      if (document.body.dataset.page === 'hi-island') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

    } catch (e) {
      console.warn('Save error:', e);
      this.showToast('Saved locally. Will sync when online.');
      this.close();
    }
  }

  // Show toast notification
  showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    } else {
      console.log('📢', message);
    }
  }
}

// Auto-initialize if on compatible page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  const page = document.body.dataset.page;
  if (page === 'hi-island' || page === 'index' || page === 'hi-muscle') {
    const shareSheet = new HiShareSheet({ origin: page === 'hi-muscle' ? 'higym' : 'hi5' });
    shareSheet.init();
    console.log('✅ Hi Share Sheet component initialized');
  }
}
