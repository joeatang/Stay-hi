/**
 * 🌟 Hi Scale Prompt Modal
 * Tesla-grade elegance for capturing emotional state after check-in
 * Part of Analytics Gold Standard v2.0 (Backend deployed 2026-01-18)
 */

class HiScalePrompt {
  constructor() {
    this.modal = null;
    this.backdrop = null;
    this.isOpen = false;
    this.currentRating = null;
  }

  /**
   * Create and inject modal HTML
   */
  init() {
    if (this.modal) return; // Already initialized

    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'hi-scale-backdrop';
    this.backdrop.onclick = () => this.dismiss();

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'hi-scale-modal';
    this.modal.innerHTML = `
      <div class="hi-scale-header">
        <h3>How are you feeling?</h3>
        <button class="hi-scale-close" aria-label="Close">&times;</button>
      </div>
      
      <div class="hi-scale-content">
        <div class="hi-scale-emoji-row">
          <div class="hi-scale-emoji-start">😫</div>
          <div class="hi-scale-emoji-end">😊</div>
        </div>
        
        <div class="hi-scale-rating-row">
          ${[1,2,3,4,5].map(n => `
            <button class="hi-scale-btn" data-rating="${n}" aria-label="Rate ${n} out of 5">
              ${n}
            </button>
          `).join('')}
        </div>
        
        <div class="hi-scale-note-section">
          <textarea 
            class="hi-scale-note" 
            placeholder="Optional: How are you feeling? (private note)"
            maxlength="200"
            rows="2"
          ></textarea>
        </div>
      </div>
      
      <div class="hi-scale-footer">
        <button class="hi-scale-skip">Skip</button>
        <button class="hi-scale-submit" disabled>Submit</button>
      </div>
    `;

    // Append to body
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.modal);

    // Attach event listeners
    this.attachListeners();

    // Inject styles
    this.injectStyles();
  }

  /**
   * Attach event listeners
   */
  attachListeners() {
    // Close button
    const closeBtn = this.modal.querySelector('.hi-scale-close');
    closeBtn.onclick = () => this.dismiss();

    // Rating buttons
    const ratingBtns = this.modal.querySelectorAll('.hi-scale-btn');
    ratingBtns.forEach(btn => {
      btn.onclick = () => {
        const rating = parseInt(btn.dataset.rating);
        this.selectRating(rating);
      };
    });

    // Skip button
    const skipBtn = this.modal.querySelector('.hi-scale-skip');
    skipBtn.onclick = () => this.dismiss();

    // Submit button
    const submitBtn = this.modal.querySelector('.hi-scale-submit');
    submitBtn.onclick = () => this.submit();

    // Prevent backdrop clicks from closing when clicking modal
    this.modal.onclick = (e) => e.stopPropagation();
  }

  /**
   * Select a rating (1-5)
   */
  selectRating(rating) {
    this.currentRating = rating;

    // Update button states
    const ratingBtns = this.modal.querySelectorAll('.hi-scale-btn');
    ratingBtns.forEach(btn => {
      const btnRating = parseInt(btn.dataset.rating);
      if (btnRating === rating) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    // Enable submit button
    const submitBtn = this.modal.querySelector('.hi-scale-submit');
    submitBtn.disabled = false;
  }

  /**
   * Show the modal
   */
  show() {
    if (!this.modal) this.init();
    
    this.isOpen = true;
    this.currentRating = null;
    
    // Reset form
    const ratingBtns = this.modal.querySelectorAll('.hi-scale-btn');
    ratingBtns.forEach(btn => btn.classList.remove('selected'));
    
    const noteField = this.modal.querySelector('.hi-scale-note');
    noteField.value = '';
    
    const submitBtn = this.modal.querySelector('.hi-scale-submit');
    submitBtn.disabled = true;

    // Show with animation
    this.backdrop.classList.add('visible');
    this.modal.classList.add('visible');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Dismiss the modal
   */
  dismiss() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    // Hide with animation
    this.backdrop.classList.remove('visible');
    this.modal.classList.remove('visible');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    console.log('✅ Hi Scale prompt dismissed');
  }

  /**
   * Submit rating
   */
  async submit() {
    if (!this.currentRating) return;

    const noteField = this.modal.querySelector('.hi-scale-note');
    const note = noteField.value.trim() || null;
    const submitBtn = this.modal.querySelector('.hi-scale-submit');

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      // Get Supabase client
      const client = window.HiSupabase?.getClient?.() || window.supabaseClient || window.supabase;
      if (!client) {
        throw new Error('Supabase client not available');
      }

      // Call RPC function (deployed in migration 003)
      const { data, error } = await client.rpc('record_hi_scale_rating', {
        p_rating: this.currentRating,
        p_note: note
      });

      if (error) throw error;

      console.log('✅ Hi Scale rating recorded:', { rating: this.currentRating, hasNote: !!note });

      // Show success feedback
      submitBtn.textContent = '✓ Saved!';
      submitBtn.classList.add('success');

      // Close after 800ms
      setTimeout(() => {
        this.dismiss();
        submitBtn.textContent = 'Submit';
        submitBtn.classList.remove('success');
      }, 800);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('hi:scale-recorded', { 
        detail: { rating: this.currentRating, note } 
      }));

    } catch (error) {
      console.error('❌ Failed to record Hi Scale rating:', error);
      
      // Show error feedback
      submitBtn.textContent = 'Failed';
      submitBtn.classList.add('error');
      
      // Reset after 2s
      setTimeout(() => {
        submitBtn.textContent = 'Submit';
        submitBtn.classList.remove('error');
        submitBtn.disabled = false;
      }, 2000);
    }
  }

  /**
   * Inject CSS styles (Tesla-grade elegance)
   */
  injectStyles() {
    if (document.getElementById('hi-scale-styles')) return; // Already injected

    const style = document.createElement('style');
    style.id = 'hi-scale-styles';
    style.textContent = `
      /* Hi Scale Prompt - Tesla-grade design */
      .hi-scale-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        z-index: 9998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .hi-scale-backdrop.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .hi-scale-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        width: 90%;
        max-width: 420px;
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      }

      .hi-scale-modal.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
      }

      .hi-scale-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 24px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }

      .hi-scale-header h3 {
        font-size: 22px;
        font-weight: 600;
        margin: 0;
        color: #1a1a1a;
        letter-spacing: -0.02em;
      }

      .hi-scale-close {
        background: none;
        border: none;
        font-size: 32px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .hi-scale-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #666;
      }

      .hi-scale-content {
        padding: 32px 24px;
      }

      .hi-scale-emoji-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        padding: 0 8px;
      }

      .hi-scale-emoji-start,
      .hi-scale-emoji-end {
        font-size: 32px;
        filter: grayscale(0.3);
        opacity: 0.8;
      }

      .hi-scale-rating-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 24px;
      }

      .hi-scale-btn {
        flex: 1;
        height: 56px;
        border: 2px solid #e0e0e0;
        background: white;
        border-radius: 12px;
        font-size: 20px;
        font-weight: 600;
        color: #666;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .hi-scale-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .hi-scale-btn span {
        position: relative;
        z-index: 1;
      }

      .hi-scale-btn:hover {
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      .hi-scale-btn.selected {
        border-color: #667eea;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
      }

      .hi-scale-note-section {
        margin-top: 20px;
      }

      .hi-scale-note {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #333;
        resize: none;
        transition: all 0.2s ease;
        background: #f8f9fa;
      }

      .hi-scale-note:focus {
        outline: none;
        border-color: #667eea;
        background: white;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .hi-scale-note::placeholder {
        color: #999;
      }

      .hi-scale-footer {
        display: flex;
        gap: 12px;
        padding: 16px 24px 24px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }

      .hi-scale-skip,
      .hi-scale-submit {
        flex: 1;
        height: 48px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .hi-scale-skip {
        background: #f0f0f0;
        color: #666;
      }

      .hi-scale-skip:hover {
        background: #e0e0e0;
      }

      .hi-scale-submit {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .hi-scale-submit:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }

      .hi-scale-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .hi-scale-submit.success {
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
      }

      .hi-scale-submit.error {
        background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
      }

      /* Mobile responsiveness */
      @media (max-width: 480px) {
        .hi-scale-modal {
          width: 95%;
          border-radius: 16px;
        }

        .hi-scale-header h3 {
          font-size: 20px;
        }

        .hi-scale-rating-row {
          gap: 8px;
        }

        .hi-scale-btn {
          height: 48px;
          font-size: 18px;
        }

        .hi-scale-emoji-start,
        .hi-scale-emoji-end {
          font-size: 28px;
        }
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .hi-scale-modal {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }

        .hi-scale-header {
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }

        .hi-scale-header h3 {
          color: #ffffff;
        }

        .hi-scale-btn {
          background: #2d2d2d;
          border-color: #404040;
          color: #999;
        }

        .hi-scale-note {
          background: #2d2d2d;
          border-color: #404040;
          color: #ffffff;
        }

        .hi-scale-note:focus {
          background: #1a1a1a;
        }

        .hi-scale-footer {
          border-top-color: rgba(255, 255, 255, 0.1);
        }

        .hi-scale-skip {
          background: #2d2d2d;
          color: #999;
        }

        .hi-scale-skip:hover {
          background: #404040;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Export singleton instance
if (typeof window !== 'undefined') {
  window.HiScalePrompt = window.HiScalePrompt || new HiScalePrompt();
}
