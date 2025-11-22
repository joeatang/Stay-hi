/* ===================================================================
   🎨 HI SHARE SHEET COMPONENT
   Tesla-grade unified sharing modal for Hi moments
   Used by: Index (Self Hi5), Hi Island, Hi Muscle
   Version: 2.1.0-auth-required (No Anonymous Sharing)
=================================================================== */

export class HiShareSheet {
  constructor(options = {}) {
    // Auto-enable debug from URL (?debug=1)
    if (typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search)) {
      window.__HI_DEBUG__ = true;
    }
    // Debug logger gate (only logs when window.__HI_DEBUG__ true)
    this._dbg = (...a) => { if (window.__HI_DEBUG__) console.log(...a); };
    this.version = '2.1.0-auth-required';
    this.origin = options.origin || 'hi5'; // 'hi5', 'higym', or 'hi-island'
    this.onSuccess = options.onSuccess || (() => {});
    this.isOpen = false;
    this._isReady = false; // A2: Readiness state tracking
    this.practiceMode = false;
    
    // 🔒 WOZNIAK-GRADE: Log version for debugging
    this._dbg(`🚀 HiShareSheet ${this.version} initialized for origin: ${this.origin}`);
  }

  // Tesla-grade: Update options after initialization
  updateOptions(options = {}) {
    if (options.origin) this.origin = options.origin;
    if (options.onSuccess) this.onSuccess = options.onSuccess;
  }

  // Initialize component (Hi System Pattern)
  async init() {
    // A3: Single-init guard (Hi System Standard)
    if (this._isReady) {
      this._dbg('✅ HiShareSheet already initialized, skipping');
      return;
    }

    try {
      // Wait for HiFlags system to be ready (Hi System Pattern)
      if (window.HiFlags?.waitUntilReady) {
        await window.HiFlags.waitUntilReady();
      }

      this.render();
      // 🔧 TESLA-GRADE FIX: Attach event listeners after DOM elements are rendered
      setTimeout(() => {
        this.attachEventListeners();
      }, 0);
      
      // Expose to global for easy access with enhanced options (Hi System Pattern)
      window.openHiShareSheet = (origin = 'hi5', options = {}) => {
        this.origin = origin;
        this.prefilledData = options; // Store prefilled data for Hi Muscle integration
        this.practiceMode = !!options.practiceMode;
        this.open(options);
      };
      // Convenience helper for practice-only flows
      window.openPracticeShare = (origin = 'hi5', options = {}) => {
        return window.openHiShareSheet(origin, { ...options, practiceMode: true });
      };

      this._isReady = true;
      this._dbg('✅ HiShareSheet initialized (Tesla-grade Hi System)');
      
    } catch (error) {
      console.error('❌ HiShareSheet initialization failed:', error);
      this._isReady = false;
    }
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
    // � TESLA-GRADE: CSS handles positioning, JS only manages pointer-events
    // No inline positioning styles - CSS handles the foundation
    container.innerHTML = `
      <!-- Backdrop -->
      <div class="premium-share-backdrop" id="hi-share-backdrop"></div>

      <!-- Share Sheet Modal -->
      <div id="hi-share-sheet" class="premium-share-sheet glass-card" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" aria-describedby="sheetDesc">
        <div class="share-header">
          <div class="share-icon">✨</div>
          <h3 id="sheetTitle" class="text-gradient">Capture this Hi Moment</h3>
          <p id="sheetDesc" class="share-subtitle">Choose how you want to share your moment</p>
          <!-- Tesla-Grade Close Button with Maximum Z-Index Priority -->
          <button id="hi-sheet-close" class="btn-premium-icon" 
                  style="position:absolute;top:16px;right:16px;z-index:10000;" 
                  aria-label="Close">✕</button>
        </div>

        <!-- Emotional Journey Display (HiGYM) -->
        <div id="hi-emotional-journey" class="hi-emotional-journey" style="display:none;">
          <div class="journey-label">EMOTIONAL JOURNEY</div>
          <div class="journey-flow">
            <span class="journey-current"></span>
            <span class="journey-arrow">→</span>
            <span class="journey-desired"></span>
          </div>
        </div>
        
        <div class="share-input-container">
          <textarea id="hi-share-journal" maxlength="500" class="premium-textarea" placeholder="What was the Hi moment you just noticed? (1–2 lines)"></textarea>
          <div class="character-count"><span id="hi-share-char-count">0</span>/500</div>
        </div>
        
        <!-- Location Status (Gold Standard) -->
        <div class="hi-share-location-status">
          <span class="location-loading">📍 Checking location...</span>
        </div>
        
        <div class="share-options" id="hi-share-options-container">
          <button id="hi-save-private" class="share-option private-option">
            <div class="option-icon">🔒</div>
            <div class="option-content">
              <div class="option-title">Save Privately</div>
              <div class="option-desc">Hi Island • My Archive • Private only</div>
            </div>
          </button>
          
          <!-- 🔐 AUTH REQUIRED: Show for anonymous users only -->
          <button id="hi-share-auth-prompt" class="share-option auth-prompt-option" style="display:none;">
            <div class="option-icon">✨</div>
            <div class="option-content">
              <div class="option-title">Join Community to Share</div>
              <div class="option-desc">Hi Island • Connect & Share • Sign In Required</div>
              <div class="privacy-notice">
                🌟 Create account to share with the community
              </div>
            </div>
          </button>
          
          <!-- ✅ AUTHENTICATED: Show for logged-in users -->
          <button id="hi-share-anon" class="share-option anonymous-option" style="display:none;">
            <div class="option-icon">🥸</div>
            <div class="option-content">
              <div class="option-title">Share Anonymously</div>
              <div class="option-desc">Hi Island • General Shares • Anonymous</div>
              <div class="privacy-notice">
                🔒 Privacy: Only city/state location shared
              </div>
            </div>
          </button>
          
          <button id="hi-share-public" class="share-option public-option primary-option" style="display:none;">
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
    
    // Store reference to root container
    this.root = container;
  }

  // Attach event listeners
  attachEventListeners() {
    const backdrop = document.getElementById('hi-share-backdrop');
    const closeBtn = document.getElementById('hi-sheet-close');
    const journal = document.getElementById('hi-share-journal');
    const charCount = document.getElementById('hi-share-char-count');
    const savePrivateBtn = document.getElementById('hi-save-private');
    const shareAuthPromptBtn = document.getElementById('hi-share-auth-prompt');
    const shareAnonBtn = document.getElementById('hi-share-anon');
    const sharePublicBtn = document.getElementById('hi-share-public');
    const sheet = document.getElementById('hi-share-sheet');

    // 🔧 DEBUG: Log which elements are found
    this._dbg('🧪 Share Sheet Event Listeners:', {
      backdrop: !!backdrop,
      closeBtn: !!closeBtn,
      journal: !!journal,
      charCount: !!charCount,
      savePrivateBtn: !!savePrivateBtn,
      shareAuthPromptBtn: !!shareAuthPromptBtn,
      shareAnonBtn: !!shareAnonBtn,
      sharePublicBtn: !!sharePublicBtn
    });

    // 🔧 SAFETY CHECK: Ensure all elements exist before attaching listeners
    if (!savePrivateBtn || !shareAuthPromptBtn || !shareAnonBtn || !sharePublicBtn) {
      console.error('❌ Critical share buttons not found! Retrying in 100ms...');
      setTimeout(() => this.attachEventListeners(), 100);
      return;
    }

    // Character counter
    journal.addEventListener('input', () => {
      charCount.textContent = journal.value.length;
    });

    // Tesla-Grade Close Handlers with Event Prevention
    backdrop.addEventListener('click', (e) => {
      // Only close if clicking backdrop directly, not child elements
      if (e.target === backdrop) {
        this.close();
      }
    });
    
    closeBtn.addEventListener('click', (e) => {
      // Prevent event bubbling to ensure close button always works
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.close();
    });

    // Focus trap + ESC handling scoped to dialog
    if (sheet) {
      // Remove previous handler if re-attaching
      if (this._keydownHandler) {
        sheet.removeEventListener('keydown', this._keydownHandler);
      }
      this._keydownHandler = (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
          return;
        }
        if (e.key === 'Tab') {
          const focusableSelectors = [
            'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
            'textarea:not([disabled])', 'button:not([disabled])', '[tabindex]:not([tabindex="-1"])'
          ].join(',');
          const focusable = Array.from(sheet.querySelectorAll(focusableSelectors))
            .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (e.shiftKey) {
            if (active === first || !sheet.contains(active)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (active === last || !sheet.contains(active)) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      sheet.addEventListener('keydown', this._keydownHandler);
    }

    // Privacy option handlers
    savePrivateBtn.addEventListener('click', (e) => this.handleSavePrivate(e));
    shareAuthPromptBtn.addEventListener('click', (e) => this.handleShareAuthPrompt(e));
    shareAnonBtn.addEventListener('click', (e) => this.handleShareAnonymous(e));
    sharePublicBtn.addEventListener('click', (e) => this.handleSharePublic(e));
    
    // Location update handler (delegated event)
    this.root.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="update-location"]')) {
        e.preventDefault();
        this.forceUpdateLocation();
      }
    });
  }

  // Standardized isReady method (A2 requirement)
  isReady() {
    return this._isReady;
  }

  // 🔐 TESLA-GRADE: Update share options based on authentication state
  async updateShareOptionsForAuthState() {
    // Check authentication via multiple sources (Hi System Standard)
    const isAuthenticated = await this.checkAuthentication();
    
    const authPromptBtn = document.getElementById('hi-share-auth-prompt');
    const shareAnonBtn = document.getElementById('hi-share-anon');
    const sharePublicBtn = document.getElementById('hi-share-public');
    
    this._dbg('🔐 Auth state check:', { isAuthenticated });
    
    if (isAuthenticated) {
      // ✅ AUTHENTICATED: Show Anonymous + Public options
      if (authPromptBtn) authPromptBtn.style.display = 'none';
      if (shareAnonBtn) shareAnonBtn.style.display = 'block';
      if (sharePublicBtn) sharePublicBtn.style.display = 'block';
    } else {
      // 🔒 ANONYMOUS: Show Auth Prompt only
      if (authPromptBtn) authPromptBtn.style.display = 'block';
      if (shareAnonBtn) shareAnonBtn.style.display = 'none';
      if (sharePublicBtn) sharePublicBtn.style.display = 'none';
    }
  }

  // 🔐 Check authentication across multiple systems
  async checkAuthentication() {
    // Method 1: Supabase auth
    try {
      if (window.sb?.auth) {
        const { data: { session } } = await window.sb.auth.getSession();
        if (session?.user) {
          this._dbg('✅ Auth: Supabase session found');
          return true;
        }
      }
    } catch (err) {
      this._dbg('⚠️ Supabase auth check failed:', err);
    }

    // Method 2: Global auth state
    if (window.__hiAuth?.user || window.__currentUser) {
      this._dbg('✅ Auth: Global auth state found');
      return true;
    }

    // Method 3: Membership system
    if (window.__hiMembership?.tier && window.__hiMembership.tier !== 'free') {
      this._dbg('✅ Auth: Membership tier found');
      return true;
    }

    this._dbg('🔒 Auth: No authenticated session found');
    return false;
  }

  // Open share sheet
  async open(options = {}) {
    if (!this._isReady) {
      console.error('❌ HiShareSheet not ready, call init() first');
      return;
    }

    // Store context and preset for submission
    this.context = options.context || this.origin;
    this.preset = options.preset || 'default';
    this.shareType = options.type || (options.preset === 'hi5' ? 'Hi5' : 'share');
    
    const backdrop = document.getElementById('hi-share-backdrop');
    const sheet = document.getElementById('hi-share-sheet');
    
    // Remember previously focused element for restoration on close
    this._previouslyFocused = document.activeElement;

    // 🔧 TESLA-GRADE FIX: Enable container pointer events ONLY when opening
    if (this.root) {
      this.root.style.pointerEvents = 'auto';
    }
    
    backdrop.classList.add('active');
    sheet.classList.add('active');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // 🔐 AUTHENTICATION CHECK: Show correct buttons based on auth state
    await this.updateShareOptionsForAuthState();

    // Practice mode banner/update
    try {
      const titleEl = document.getElementById('sheetTitle');
      const descEl = document.getElementById('sheetDesc');
      if (this.practiceMode) {
        if (titleEl) titleEl.textContent = 'Practice a Hi';
        if (descEl) descEl.textContent = 'Practice the flow — nothing is saved.';
      } else {
        if (titleEl) titleEl.textContent = 'Capture this Hi Moment';
        if (descEl) descEl.textContent = 'Choose how you want to share your moment';
      }
    } catch {}

    // 🌟 TESLA-GRADE: Handle prefilled data (Hi Muscle + Hi5)
    const textarea = document.getElementById('hi-share-journal');
    const prefilledText = options.prefilledText || this.prefilledData?.prefilledText;
    if (prefilledText) {
      textarea.value = prefilledText;
      this.updateCharCount();
    }
    
    // Store emotional journey for Hi Muscle shares
    if (this.prefilledData?.currentEmoji && this.prefilledData?.desiredEmoji) {
      this.emotionalJourney = {
        current: this.prefilledData.currentEmoji,
        desired: this.prefilledData.desiredEmoji
      };
      
      // 🌟 TESLA-GRADE: Display emotional journey prominently
      const journeyDisplay = document.getElementById('hi-emotional-journey');
      const currentSpan = document.querySelector('.journey-current');
      const desiredSpan = document.querySelector('.journey-desired');
      
      if (journeyDisplay && currentSpan && desiredSpan) {
        currentSpan.textContent = this.prefilledData.currentEmoji;
        desiredSpan.textContent = this.prefilledData.desiredEmoji;
        journeyDisplay.style.display = 'block';
      }
    }
    
    // Focus textarea
    setTimeout(() => {
      textarea.focus();
    }, 100);
    
    // Preload location (profile-first, instant if cached)
    this.preloadLocation();
  }

  // Update character count display
  updateCharCount() {
    const journal = document.getElementById('hi-share-journal');
    const charCount = document.getElementById('hi-share-char-count');
    if (journal && charCount) {
      charCount.textContent = journal.value.length;
    }
  }
  
  // Preload location in background
  async preloadLocation() {
    const locationStatus = document.querySelector('.hi-share-location-status');
    if (!locationStatus) return;
    
    try {
      // This will use profile if available (instant) or detect if needed
      const location = await this.getUserLocation();
      
      if (location && location !== 'Location unavailable') {
        const emoji = this.locationSource === 'profile' ? '📍' : '🌍';
        const sourceLabel = this.locationSource === 'profile' ? 'from profile' : 'detected';
        const cleanLocation = this.normalizeLocation(location);
        
        locationStatus.innerHTML = `
          <span class="location-text">${emoji} ${cleanLocation}</span>
          <span class="location-source">(${sourceLabel})</span>
          <button class="location-update-btn" data-action="update-location" title="Update location">
            ✈️ Traveling?
          </button>
        `;
      } else {
        locationStatus.innerHTML = `
          <span class="location-text">📍 Location unavailable</span>
          <button class="location-update-btn" data-action="update-location">
            Try again
          </button>
        `;
      }
    } catch (error) {
      console.error('❌ Location preload failed:', error);
      locationStatus.innerHTML = `<span class="location-text">📍 Location unavailable</span>`;
    }
  }

  // Close share sheet
  close() {
    if (!this._isReady) return;

    const backdrop = document.getElementById('hi-share-backdrop');
    const sheet = document.getElementById('hi-share-sheet');
    const journal = document.getElementById('hi-share-journal');
    
    // 🔧 TESLA-GRADE FIX: Disable container pointer events when closing
    if (this.root) {
      this.root.style.pointerEvents = 'none';
    }
    
    backdrop.classList.remove('active');
    sheet.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = '';
    // Reset practice mode when closing
    this.practiceMode = false;
    
    // Clear input
    journal.value = '';
    document.getElementById('hi-share-char-count').textContent = '0';

    // Restore focus to the invoking control, if possible
    if (this._previouslyFocused && typeof this._previouslyFocused.focus === 'function') {
      setTimeout(() => {
        try { this._previouslyFocused.focus(); } catch (_) {}
      }, 0);
    }
  }

  // Handle Save Privately
  async handleSavePrivate(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    const button = e.target.closest('button');
    button.dataset.animating = 'true';

    // 🎉 TESLA-GRADE: Premium celebration for private save
    if (window.PremiumUX) {
      window.PremiumUX.glow(button, '#4ECDC4');
      window.PremiumUX.triggerHapticFeedback('medium');
    }

    // Practice mode bypass
    if (this.practiceMode) {
      this.showToast('🧪 Practice complete — nothing saved.');
      this.close();
    } else {
      // � EMERGENCY FIX: Non-blocking persist (don't await - fire and forget)
      this.persist({ toIsland: false, anon: false }).catch(err => {
        console.error('❌ Private save failed:', err);
        this.showToast('❌ Save failed. Please try again.');
      });
      // Close immediately for responsiveness
      this.close();
    }

    setTimeout(() => {
      button.dataset.animating = 'false';
    }, 600);
  }

  // 🚀 WOZNIAK-GRADE: Store share context for post-auth completion
  storeShareForAfterAuth() {
    try {
      const shareContext = {
        content: this.content,
        origin: this.origin,
        timestamp: Date.now(),
        action: 'share'
      };
      localStorage.setItem('pendingShareAfterAuth', JSON.stringify(shareContext));
      this._dbg('💾 [SHARE] Stored share context for post-auth:', this.origin);
    } catch (error) {
      console.error('❌ Failed to store share context:', error);
    }
  }

  // 🚀 WOZNIAK-GRADE: Handle Share Auth Prompt (Replaces Anonymous Sharing)
  async handleShareAuthPrompt(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    const button = e.target.closest('button');
    button.dataset.animating = 'true';

    this._dbg('🔒 [SHARE] Auth required - showing gold standard modal');

    // 🎉 Visual feedback
    if (window.PremiumUX) {
      window.PremiumUX.burst(button, { count: 12, colors: ['#FF7A18', '#FFD166'] });
      window.PremiumUX.triggerHapticFeedback('medium');
    }

    // Practice mode bypass
    if (this.practiceMode) {
      this.showToast('🧪 Practice complete — no account required.');
      this.close();
      setTimeout(() => { button.dataset.animating = 'false'; }, 500);
      return;
    }

    // Close share sheet first
    this.close();

    // 🚀 Show gold standard auth modal with share context
    setTimeout(() => {
      if (window.showShareAuthModal) {
        window.showShareAuthModal(this.origin || 'general', {
          onPrimary: () => {
            // Store the share content for after auth
            this.storeShareForAfterAuth();
            window.location.href = `/auth.html?mode=signin&redirect=${encodeURIComponent(window.location.pathname)}&action=share`;
          },
          onSecondary: () => {
            this.storeShareForAfterAuth();
            window.location.href = `/auth.html?mode=signup&redirect=${encodeURIComponent(window.location.pathname)}&action=share`;
          }
        });
      } else {
        // Fallback: use the Drop Hi modal style
        if (window.showAuthModal) {
          window.showAuthModal(this.origin || 'general');
        } else {
          // Last resort: redirect
          window.location.href = '/auth.html?action=share';
        }
      }
    }, 300); // Allow close animation to finish
    
    // Close immediately for responsiveness
    this.close();

    setTimeout(() => {
      button.dataset.animating = 'false';
    }, 500);
  }

  // Handle Share Anonymously
  async handleShareAnonymous(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    const button = e.target.closest('button');
    button.dataset.animating = 'true';

    // 🎭 TESLA-GRADE: Anonymous celebration
    if (window.PremiumUX) {
      window.PremiumUX.celebrate(button, '🥸 Shared anonymously!');
      setTimeout(() => {
        window.PremiumUX.confetti({ count: 12, colors: ['#A8B2D1', '#4ECDC4', '#FFD700'] });
      }, 100);
      window.PremiumUX.triggerHapticFeedback('subtle');
    }

    // Practice mode bypass
    if (this.practiceMode) {
      this.showToast('🧪 Practice complete — nothing shared.');
      this.close();
    } else {
      // 🔧 TESLA-GRADE: Non-blocking persist (fire and forget)
      this.persist({ toIsland: true, anon: true }).catch(err => {
        console.error('❌ Anonymous share failed:', err);
        this.showToast('❌ Share failed. Please try again.');
      });
      
      // Close immediately for responsiveness
      this.close();
    }

    setTimeout(() => {
      button.dataset.animating = 'false';
    }, 800);
  }

  // Handle Share Publicly
  async handleSharePublic(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    const button = e.target.closest('button');
    button.dataset.animating = 'true';

    // 🎉 TESLA-GRADE: Premium celebration for public share
    if (window.PremiumUX) {
      // Sequence animations to prevent overlap
      window.PremiumUX.celebrate(button, '🌟 Shared publicly!');
      setTimeout(() => {
        window.PremiumUX.confetti({ count: 20, colors: ['#4ECDC4', '#FFD700', '#FF6B6B'] });
      }, 100);
      window.PremiumUX.triggerHapticFeedback('celebration');
    }

    // Practice mode bypass
    if (this.practiceMode) {
      this.showToast('🧪 Practice complete — nothing shared.');
      this.close();
    } else {
      // � EMERGENCY FIX: Non-blocking persist (don't await - fire and forget)
      this.persist({ toIsland: true, anon: false }).catch(err => {
        console.error('❌ Public share failed:', err);
        this.showToast('❌ Share failed. Please try again.');
      });
      
      // Close immediately for responsiveness
      this.close();
    }

    setTimeout(() => {
      button.dataset.animating = 'false';
    }, 800);
  }

  // 🚫 LEGACY METHOD REMOVED: incrementGlobalCounter()
  // Tesla-grade database tracking is handled by persist() → trackShareSubmission() → database RPCs
  // No more localStorage-only fallbacks - database-first architecture only

  // Get user's location (Gold Standard: Profile-First Architecture)
  async getUserLocation() {
    try {
      // STEP 1: Check if user has profile location (home base)
      const profile = await this.getProfileLocation();
      
      if (profile?.location) {
        this._dbg('📍 Using profile location (cached):', profile.location);
        
        // Store in instance for UI display
        this.currentLocation = profile.location;
        this.locationSource = 'profile';
        
        return profile.location;
      }
      
      // STEP 2: No profile location → detect via GPS and save to profile
      this._dbg('🌍 No profile location found, detecting...');
      
      if (!window.GeocodingService) {
        console.warn('⚠️ GeocodingService not available');
        return 'Location unavailable';
      }
      
      // 🚨 EMERGENCY: 4-second timeout for GPS detection
      const detected = await Promise.race([
        window.GeocodingService.getUserLocation(),
        new Promise(resolve => setTimeout(() => resolve('Location unavailable'), 4000))
      ]);
      
      if (detected && detected !== 'Location unavailable') {
        this._dbg('📍 Location detected:', detected);
        
        // Save to profile for future shares (non-blocking)
        this.saveLocationToProfile(detected).catch(err => 
          console.warn('⚠️ Background profile save failed:', err)
        );
        
        this.currentLocation = detected;
        this.locationSource = 'detected';
        
        return detected;
      }
      
      // STEP 3: GPS failed, return unavailable
      console.warn('⚠️ Location detection failed');
      return 'Location unavailable';
      
    } catch (error) {
      console.error('❌ Location capture failed:', error);
      return 'Location unavailable';
    }
  }
  
  // Get user profile (for location check)
  async getProfileLocation() {
    try {
      if (!window.hiDB?.fetchUserProfile) {
        console.warn('⚠️ hiDB.fetchUserProfile not available');
        return null;
      }
      
      // 🚨 EMERGENCY: 3-second timeout for profile fetch
      const profile = await Promise.race([
        window.hiDB.fetchUserProfile(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        )
      ]);
      
      return profile;
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch profile (timeout or error):', error);
      return null;
    }
  }
  
  // Save location to user profile (for future shares)
  async saveLocationToProfile(location) {
    try {
      if (!window.hiDB?.updateProfile) {
        console.warn('⚠️ hiDB.updateProfile not available');
        return;
      }
      
      // Tesla-Grade: Normalize location to prevent duplication
      const cleanLocation = this.normalizeLocation(location);
      this._dbg('💾 Saving location to profile:', cleanLocation);
      
      await window.hiDB.updateProfile({ location: cleanLocation });
      
      this._dbg('✅ Location saved to profile');
      
    } catch (error) {
      console.warn('⚠️ Failed to save location to profile:', error);
    }
  }
  
  // Force update location (for travelers)
  async forceUpdateLocation() {
    try {
      this._dbg('🔄 Force updating location...');
      
      if (!window.GeocodingService) {
        console.warn('⚠️ GeocodingService not available');
        return;
      }
      
      // Clear geocoding cache to force fresh detection
      if (window.GeocodingService.clearCache) {
        window.GeocodingService.clearCache();
      }
      
      const detected = await window.GeocodingService.getUserLocation();
      
      if (detected && detected !== 'Location unavailable') {
        this._dbg('📍 New location detected:', detected);
        
        // Update profile with new location
        await this.saveLocationToProfile(detected);
        
        this.currentLocation = detected;
        this.locationSource = 'updated';
        
        // Update UI to show new location
        this.updateLocationDisplay();
        
        return detected;
      }
      
    } catch (error) {
      console.error('❌ Force update failed:', error);
    }
  }
  
  // Tesla-Grade: Normalize location string to prevent duplication
  normalizeLocation(location) {
    if (!location || typeof location !== 'string') return location;
    
    // Remove any duplicate words (e.g., "Tokyo, Tokyo, Japan" → "Tokyo, Japan")
    const parts = location.split(',').map(part => part.trim());
    const uniqueParts = [];
    
    parts.forEach(part => {
      // Only add if it's not already in the array (case-insensitive)
      if (!uniqueParts.find(existing => existing.toLowerCase() === part.toLowerCase())) {
        uniqueParts.push(part);
      }
    });
    
    const normalized = uniqueParts.join(', ');
    
    // Debug log if normalization occurred
    if (normalized !== location) {
      this._dbg('🔧 Location normalized:', location, '→', normalized);
    }
    
    return normalized;
  }

  // Update location display in UI
  updateLocationDisplay() {
    const locationStatus = document.querySelector('.hi-share-location-status');
    if (locationStatus && this.currentLocation) {
      const emoji = this.locationSource === 'updated' ? '✈️' : '📍';
      const cleanLocation = this.normalizeLocation(this.currentLocation);
      locationStatus.innerHTML = `
        <span class="location-text">${emoji} ${cleanLocation}</span>
        <button class="location-update-btn" data-action="update-location">Update</button>
      `;
    }
  }

  // 🚀 TESLA METHOD: Get authenticated user ID
  async getUserId() {
    try {
      // Use existing auth system to get user ID
      if (window.HiSupabase && window.HiSupabase.getClient) {
        const client = window.HiSupabase.getClient();
        const { data: { user } } = await client.auth.getUser();
        return user?.id || null;
      }
      return null;
    } catch (error) {
      console.warn('Tesla getUserId failed:', error);
      return null;
    }
  }

  // 🎯 TESLA METHOD: Anonymous User Session Management
  // Creates consistent anonymous user IDs for session-based archiving
  async getOrCreateAnonymousUser() {
    const storageKey = 'tesla_anonymous_user_id';
    let anonymousUserId = sessionStorage.getItem(storageKey);
    
    if (!anonymousUserId) {
      // Generate Tesla-grade session ID
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 15);
      anonymousUserId = `anonymous-${timestamp}-${randomPart}`;
      sessionStorage.setItem(storageKey, anonymousUserId);
      this._dbg('🎯 Tesla generated new anonymous user ID:', anonymousUserId);
    } else {
      this._dbg('🔑 Tesla using existing anonymous user ID:', anonymousUserId);
    }
    
    return anonymousUserId;
  }

  // Internal helper: retry with simple exponential backoff
  async _withRetry(factory, attempts = 2, backoff = 500){
    let lastErr;
    for (let i=0;i<=attempts;i++){
      try { return await factory(); }
      catch(err){ lastErr = err; if (i<attempts){ await new Promise(r=>setTimeout(r, backoff * (i+1))); } }
    }
    throw lastErr;
  }

  // � TESLA-GRADE REBUILT: Ultimate share persistence with bug fixes
  async persist({ toIsland = false, anon = false }) {
    // 🔒 DOUBLE SUBMISSION GUARD: Prevent multiple simultaneous submissions
    if (this._persisting) {
      console.warn('⚠️ Submission already in progress, blocking duplicate');
      return;
    }
    
    this._persisting = true;
    const submissionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    if (typeof navigator !== 'undefined' && navigator.onLine === false){
      try { this.showToast('You appear offline — will retry automatically', 'warning'); } catch {}
    }
    
    try {
      const journal = document.getElementById('hi-share-journal');
      const raw = (journal.value || '').trim();
      const text = raw || 'Marked a Hi-5 ✨';
      
      this._dbg('🎯 Tesla persist:', { submissionId, text, toIsland, anon, origin: this.origin, type: this.shareType });
    
      // 🚨 TESLA FIX: Make location completely non-blocking
    let location = 'Location unavailable';
    
    // Fire location detection in background (don't await)
    Promise.race([
      this.getUserLocation(),
      new Promise(resolve => setTimeout(() => resolve('Location unavailable'), 1000))
    ]).then(result => {
      location = result || 'Location unavailable';
      this._dbg('📍 Tesla location result:', location);
    }).catch(err => {
      console.warn('Tesla location failed:', err);
    });
    
    // 🎯 TESLA CRITICAL FIX: Get or create anonymous user ID for consistent archiving
    let userId = null;
    if (!anon) {
      // Authenticated users get real user ID
      userId = await this.getUserId();
    } else {
      // Anonymous users get session-consistent ID for archiving
      userId = await this.getOrCreateAnonymousUser();
      this._dbg('🔑 Tesla anonymous user ID:', userId);
    }
    
    try {
      // 🌟 TESLA: Use emotional journey data if available (Hi Muscle integration)
      const currentEmoji = this.emotionalJourney?.current || '🙌';
      const desiredEmoji = this.emotionalJourney?.desired || '✨';
      
      // 🎯 TESLA FIX #1: ALL users (including anonymous) get archives with proper user IDs
      const archivePayload = {
        currentEmoji,
        desiredEmoji,
        journal: text,
        location,
        origin: this.origin, // 'hi5', 'higym', or 'hi-island'
        type: this.shareType || (this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hi_island' : 'Hi5')),
        user_id: userId // Tesla: Always include user_id (even for anonymous)
      };
      
      // Tesla: ALL shares get archived (fixes anonymous archive bug)
      if (window.hiDB?.insertArchive) {
        let warned=false;
        this._withRetry(() => Promise.race([
          window.hiDB.insertArchive(archivePayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Archive timeout')), 5000))
        ]), 2, 600).catch(err => {
          console.warn('Tesla archive save failed after retries:', err);
          if (!warned){ this.showToast('Save delayed — we\'ll retry in the background', 'warning'); warned=true; }
        });
      }

      // 🎯 TESLA FIX #2: Only public/anonymous shares go to island (NO private leaks)
      if (toIsland && window.hiDB?.insertPublicShare) {
        const publicPayload = {
          currentEmoji,
          currentName: this.origin === 'higym' ? 'Hi GYM' : (this.origin === 'hi-island' ? 'Hi Island' : 'Hi-5'),
          desiredEmoji,
          desiredName: this.origin === 'higym' ? 'Hi GYM' : (this.origin === 'hi-island' ? 'Hi Island' : 'Hi-5'),
          text,
          isAnonymous: anon,
          location,
          isPublic: true,
          type: this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hi_island' : 'self_hi5'),
          user_id: anon ? null : userId // Tesla: Proper user_id handling
        };
        
        // Tesla: Enhanced public share with retry + timeout
        let warned=false;
        this._withRetry(() => Promise.race([
          window.hiDB.insertPublicShare(publicPayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Public share timeout')), 5000))
        ]), 2, 600).catch(err => {
          console.warn('Tesla public share failed after retries:', err);
          if (!warned){ this.showToast('Network hiccup — will retry sharing in background', 'warning'); warned=true; }
        });

        // Update map (retry quietly)
        if (window.hiDB?.updateMap) {
          this._withRetry(() => Promise.race([
            window.hiDB.updateMap(publicPayload),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Map update timeout')), 3000))
          ]), 1, 400).catch(()=>{});
        }
      }

      // Show success toast immediately
      if (toIsland) {
        this.showToast(anon ? '✨ Shared anonymously!' : '🌟 Shared publicly!');
      } else {
        this.showToast('🔒 Saved privately to your archive ✨');
      }

      // Track stats (non-blocking with timeout + retry)
      if (window.trackShareSubmission) {
        const shareType = anon ? 'anonymous' : (toIsland ? 'public' : 'private');
        this._withRetry(() => Promise.race([
          window.trackShareSubmission(this.origin, {
            submissionType: shareType,
            pageOrigin: this.origin,
            origin: this.origin,
            timestamp: Date.now()
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tracking timeout')), 3000))
        ]), 1, 400).catch(err => console.warn('Stats tracking failed:', err));
      }

      // Trigger success callback
      this.onSuccess({ 
        toIsland, 
        anon, 
        origin: this.origin,
        visibility: anon ? 'anonymous' : (toIsland ? 'public' : 'private')
      });

      this._dbg('✅ Share persistence complete, closing sheet...');
      
    } catch (error) {
      console.error('❌ Inner share operation failed:', error);
      this.showToast('❌ Share failed. Please try again.');
      throw error; // Re-throw to be caught by outer catch
    }
      
    } catch (error) {
      console.error('❌ Share persistence failed:', error);
      this.showToast('❌ Failed to save. Please try again.');
      return; // Don't close on error
    } finally {
      // 🔒 Reset submission guard
      this._persisting = false;
    }
    
    // 🔧 EMERGENCY FIX: Don't close here - button handlers close immediately for responsiveness
    // this.close(); // Moved to button handlers for non-blocking UX

    // 🔧 LONG-TERM SOLUTION: Proper feed refresh after share
    if (document.body.dataset.page === 'hi-island' || window.location.pathname.includes('hi-island')) {
      setTimeout(async () => {
        try {
          if (window.hiRealFeed) {
            this._dbg('🔄 Refreshing Hi-Island feed after share submission...');
            
            // Clear cached data to force fresh load
            if (toIsland) {
              window.hiRealFeed.feedData.general = [];
              window.hiRealFeed.pagination.general.page = 0;
            }
            
            // Always refresh archives (user's personal data)
            window.hiRealFeed.feedData.archives = [];
            window.hiRealFeed.pagination.archives.page = 0;
            
            // Refresh current tab
            const currentTab = window.hiRealFeed.currentTab || 'general';
            await window.hiRealFeed.loadFeedData(currentTab);
            
            console.log('✅ Hi-Island feed refreshed successfully');
          }
          
          // Update global stats
          if (window.loadCurrentStatsFromDatabase) {
            window.loadCurrentStatsFromDatabase();
          }
        } catch (error) {
          console.error('❌ Feed refresh failed:', error);
        }
      }, 1000);
    }
  }


  // 🎉 TESLA-GRADE: Premium celebration toast system
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
      // Enhanced success celebration for shares
      if (message.includes('Shared') || message.includes('✨') || message.includes('🌟')) {
        this.showCelebrationToast(message);
      } else {
        // Standard toast
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 3000);
      }
    } else {
      console.log('📢', message);
    }
  }

  // Premium celebration toast with Tesla-grade animation
  showCelebrationToast(message) {
    // Remove any existing celebration toasts
    const existing = document.querySelector('.celebration-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'celebration-toast';
    toast.textContent = message;
    // Accessibility: ensure SR announcement
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%) translateY(30px) scale(0.8);
      background: linear-gradient(135deg, #4ECDC4 0%, #FFD93D 100%);
      color: #111;
      padding: 16px 28px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 16px;
      z-index: 12000;
      pointer-events: none;
      opacity: 0;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      max-width: calc(100vw - 40px);
      text-align: center;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    `;
    
    document.body.appendChild(toast);
    
    // Tesla-grade slide-up animation
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    });
    
    // Gentle exit animation
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px) scale(0.95)';
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }
}

// Auto-initialize if on compatible page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 🔧 BACKUP INITIALIZATION: Force init after a delay if not already done
setTimeout(() => {
  if (!window.openHiShareSheet) {
    console.warn('⚠️ Share sheet not initialized, forcing backup initialization...');
    
    // Detect page type from URL or title
    const url = window.location.pathname;
    const title = document.title;
    let origin = 'hi5'; // default
    
    if (url.includes('hi-muscle') || title.includes('Hi Gym')) {
      origin = 'higym';
    } else if (url.includes('hi-island')) {
      origin = 'hi-island';
    }
    
    console.log('🔄 Backup init with origin:', origin);
    const shareSheet = new HiShareSheet({ origin });
    shareSheet.init();
    console.log('✅ Backup Hi Share Sheet initialized');
  }
}, 2000); // 2 second delay

function init() {
  const page = document.body.dataset.page;
  console.log('🔧 Hi Share Sheet init check:', { 
    page, 
    bodyElement: !!document.body,
    shouldInit: page === 'hi-island' || page === 'index' || page === 'hi-muscle' || page === 'hi-dashboard'
  });
  
  // Tesla-grade: Skip auto-init for hi-dashboard (manual initialization preferred)
  if (page === 'hi-dashboard') {
    console.log('✅ Hi Share Sheet: hi-dashboard uses manual initialization');
    return;
  }
  
  if (page === 'hi-island' || page === 'index' || page === 'hi-muscle') {
    const shareSheet = new HiShareSheet({ origin: page === 'hi-muscle' ? 'higym' : 'hi5' });
    shareSheet.init();
    console.log('✅ Hi Share Sheet component initialized for page:', page);
  } else {
    console.warn('❌ Hi Share Sheet NOT initialized - unsupported page:', page);
  }
}
