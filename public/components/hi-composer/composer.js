// ===================================================================
// 🎯 HI COMPOSER COMPONENT
// Tesla-grade modal for creating Hi shares with emoji picker
// ===================================================================

class HiComposer {
  constructor() {
    this.isOpen = false;
    this.formData = {
      currentEmoji: '😔',
      desiredEmoji: '😊',
      text: '',
      visibility: 'public', // public, private, anonymous
      location: ''
    };
    
    this.emojiOptions = {
      current: ['😔', '😰', '😢', '😞', '🥺', '😣', '😩', '😫', '😤', '😠'],
      desired: ['😊', '😄', '🥰', '😌', '🙏', '💪', '🎉', '✨', '🌟', '🚀']
    };
    
    this.init();
  }

  // Initialize component
  init() {
    this.render();
    this.attachEventListeners();
    this.captureLocation();
    
    // Expose to global for "Drop a Hi" button
    window.openHiComposer = () => this.open();
  }

  // Render HTML structure
  render() {
    const container = document.createElement('div');
    container.className = 'hi-composer-container';
    container.innerHTML = `
      <!-- Floating Action Button -->
      <button class="hi-composer-fab" id="hi-composer-fab" aria-label="Drop a Hi">
        👋
      </button>

      <!-- Modal Overlay -->
      <div class="hi-composer-overlay" id="hi-composer-overlay">
        <div class="hi-composer-modal">
          <!-- Header -->
          <div class="hi-composer-header">
            <h2 class="hi-composer-title">Drop a Hi 👋</h2>
            <button class="hi-composer-close" id="hi-composer-close" aria-label="Close">×</button>
          </div>

          <!-- Body -->
          <div class="hi-composer-body">
            <form id="hi-composer-form">
              <!-- Current Feeling -->
              <div class="hi-composer-group">
                <label class="hi-composer-label">
                  How are you feeling now?
                  <span class="hi-composer-helper">Pick an emoji that matches your current mood</span>
                </label>
                <div class="hi-composer-emoji-grid" id="current-emoji-grid"></div>
              </div>

              <!-- Desired Feeling -->
              <div class="hi-composer-group">
                <label class="hi-composer-label">
                  How do you want to feel?
                  <span class="hi-composer-helper">Choose where you'd like to be emotionally</span>
                </label>
                <div class="hi-composer-emoji-grid" id="desired-emoji-grid"></div>
              </div>

              <!-- Message -->
              <div class="hi-composer-group">
                <label class="hi-composer-label">Share your thoughts (optional)</label>
                <textarea 
                  class="hi-composer-textarea" 
                  id="hi-composer-text"
                  placeholder="What's on your mind?"
                  maxlength="500"
                ></textarea>
              </div>

              <!-- Privacy Options -->
              <div class="hi-composer-group">
                <label class="hi-composer-label">Who can see this?</label>
                <div class="hi-composer-privacy-options">
                  <label class="hi-composer-privacy-option">
                    <input type="radio" name="visibility" value="public" checked>
                    <div class="hi-composer-privacy-card">
                      <span class="hi-composer-privacy-icon">🌍</span>
                      <span class="hi-composer-privacy-label">Public</span>
                      <span class="hi-composer-privacy-desc">Everyone can see</span>
                    </div>
                  </label>
                  <label class="hi-composer-privacy-option">
                    <input type="radio" name="visibility" value="anonymous">
                    <div class="hi-composer-privacy-card">
                      <span class="hi-composer-privacy-icon">🎭</span>
                      <span class="hi-composer-privacy-label">Anonymous</span>
                      <span class="hi-composer-privacy-desc">Public but nameless</span>
                    </div>
                  </label>
                  <label class="hi-composer-privacy-option">
                    <input type="radio" name="visibility" value="private">
                    <div class="hi-composer-privacy-card">
                      <span class="hi-composer-privacy-icon">🔒</span>
                      <span class="hi-composer-privacy-label">Private</span>
                      <span class="hi-composer-privacy-desc">Only you can see</span>
                    </div>
                  </label>
                </div>
              </div>
            </form>
          </div>

          <!-- Footer -->
          <div class="hi-composer-footer">
            <button class="hi-composer-btn hi-composer-btn-secondary" id="hi-composer-cancel">
              Cancel
            </button>
            <button class="hi-composer-btn hi-composer-btn-primary" id="hi-composer-submit">
              Drop Hi 🚀
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.renderEmojiGrids();
  }

  // Render emoji selection grids
  renderEmojiGrids() {
    const currentGrid = document.getElementById('current-emoji-grid');
    const desiredGrid = document.getElementById('desired-emoji-grid');

    // Current emojis
    this.emojiOptions.current.forEach(emoji => {
      const btn = this.createEmojiButton(emoji, 'current');
      currentGrid.appendChild(btn);
    });

    // Desired emojis
    this.emojiOptions.desired.forEach(emoji => {
      const btn = this.createEmojiButton(emoji, 'desired');
      desiredGrid.appendChild(btn);
    });

    // Set default selections
    this.selectEmoji('current', '😔');
    this.selectEmoji('desired', '😊');
  }

  // Create emoji button
  createEmojiButton(emoji, type) {
    const btn = document.createElement('button');
    btn.className = 'hi-composer-emoji-btn';
    btn.type = 'button';
    btn.textContent = emoji;
    btn.dataset.emoji = emoji;
    btn.dataset.type = type;
    
    btn.addEventListener('click', () => {
      this.selectEmoji(type, emoji);
    });

    return btn;
  }

  // Select emoji
  selectEmoji(type, emoji) {
    const grid = type === 'current' 
      ? document.getElementById('current-emoji-grid')
      : document.getElementById('desired-emoji-grid');

    grid.querySelectorAll('.hi-composer-emoji-btn').forEach(btn => {
      btn.classList.remove('selected');
      if (btn.dataset.emoji === emoji) {
        btn.classList.add('selected');
      }
    });

    if (type === 'current') {
      this.formData.currentEmoji = emoji;
    } else {
      this.formData.desiredEmoji = emoji;
    }
  }

  // Attach event listeners
  attachEventListeners() {
    const fab = document.getElementById('hi-composer-fab');
    const overlay = document.getElementById('hi-composer-overlay');
    const closeBtn = document.getElementById('hi-composer-close');
    const cancelBtn = document.getElementById('hi-composer-cancel');
    const submitBtn = document.getElementById('hi-composer-submit');
    const textArea = document.getElementById('hi-composer-text');
    const visibilityRadios = document.querySelectorAll('input[name="visibility"]');

    // Open modal
    fab.addEventListener('click', () => this.open());

    // Close modal
    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    // Form inputs
    textArea.addEventListener('input', (e) => {
      this.formData.text = e.target.value;
    });

    visibilityRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.formData.visibility = e.target.value;
      });
    });

    // Submit
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.submit();
    });
  }

  // Open modal
  open() {
    const overlay = document.getElementById('hi-composer-overlay');
    overlay.classList.add('active');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    console.log('🎨 Hi Composer opened');
  }

  // Close modal
  close() {
    const overlay = document.getElementById('hi-composer-overlay');
    overlay.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = '';
    this.resetForm();
    console.log('🎨 Hi Composer closed');
  }

  // Reset form
  resetForm() {
    this.formData = {
      currentEmoji: '😔',
      desiredEmoji: '😊',
      text: '',
      visibility: 'public',
      location: this.formData.location // Keep location
    };

    document.getElementById('hi-composer-text').value = '';
    document.querySelector('input[name="visibility"][value="public"]').checked = true;
    this.selectEmoji('current', '😔');
    this.selectEmoji('desired', '😊');
  } this.selectEmoji('current', '😔');
    this.selectEmoji('desired', '😊');
  }

  // Capture user location
  async captureLocation() {
    try {
      // Try to get geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // Reverse geocode to city/state (simplified - would use geocoding API)
            this.formData.location = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            console.log('📍 Location captured:', this.formData.location);
          },
          (error) => {
            console.warn('⚠️ Location permission denied');
            this.formData.location = '';
          }
        );
      }
    } catch (error) {
      console.warn('⚠️ Geolocation not available');
    }
  }

  // Submit form
  async submit() {
    const submitBtn = document.getElementById('hi-composer-submit');
    
    // Validate
    if (!this.formData.currentEmoji || !this.formData.desiredEmoji) {
      this.showToast('Please select your emotions', 'error');
      return;
    }

    // Show loading
    submitBtn.disabled = true;
    try {
      // Submit via hiDB
      const isPrivate = this.formData.visibility === 'private';
      const isAnonymous = this.formData.visibility === 'anonymous';
      
      const result = isPrivate 
        ? await window.hiDB.insertArchive({
            currentEmoji: this.formData.currentEmoji,
            desiredEmoji: this.formData.desiredEmoji,
            journal: this.formData.text,
            location: this.formData.location
          })
        : await window.hiDB.insertPublicShare({
            currentEmoji: this.formData.currentEmoji,
            currentName: '',
            desiredEmoji: this.formData.desiredEmoji,
            desiredName: '',
            text: this.formData.text,
            isAnonymous: isAnonymous,
            location: this.formData.location,
            isPublic: true,
            origin: 'quick'
          });sPublic: true,
        origin: 'quick' // Quick Hi-5 from island page
      });

      if (result.ok || result.offline) {
        // 🎉 CELEBRATION ANIMATION
        this.celebrate();
        
        // Success feedback
        this.showToast('Hi dropped! 🎉', 'success');
        
        // Small delay for celebration, then close
        setTimeout(() => {
          this.close();
          
          // Refresh feed if available
          if (window.hiIslandFeed) {
            setTimeout(() => window.hiIslandFeed.loadData(), 300);
          }
          
          // Refresh map if available
          if (window.hiIslandMap) {
            setTimeout(() => window.hiIslandMap.refresh(), 300);
          }
        }, 1200);
        
      } else {
        throw new Error(result.error || 'Failed to submit');
      }

    } catch (error) {
      console.error('❌ Submit error:', error);
      this.showToast('Failed to drop Hi. Try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Drop Hi 🚀';
    }
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.className = `toast ${type === 'success' ? 'ok' : type === 'error' ? 'err' : ''}`;
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    } else {
      console.log(`📢 ${message}`);
    }
  }

  // 🎉 Celebration animation
  celebrate() {
    const modal = document.querySelector('.hi-composer-modal');
    if (!modal) return;

    // Create confetti burst
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'hi-composer-confetti';
    confettiContainer.innerHTML = `
      <div class="confetti">🎉</div>
      <div class="confetti">✨</div>
      <div class="confetti">🌟</div>
      <div class="confetti">💫</div>
      <div class="confetti">⭐</div>
      <div class="confetti">🎊</div>
    `;
    modal.appendChild(confettiContainer);

    // Remove after animation
    setTimeout(() => confettiContainer.remove(), 1200);
  }
}

// ===================================================================
// 🚀 AUTO-INITIALIZE
// ===================================================================
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Only initialize on hi-island page
    if (document.body.dataset.page === 'hi-island') {
      window.hiComposer = new HiComposer();
      console.log('✅ Hi Composer component initialized');
    }
  }
})();
