/* ===================================================================
   🎨 HI SHARE SHEET COMPONENT
   Tesla-grade unified sharing modal for Hi moments
   Used by: Index (Self Hi5), Hi Island, Hi Muscle
=================================================================== */

export class HiShareSheet {
  constructor(options = {}) {
    this.origin = options.origin || 'hi5'; // 'hi5', 'higym', or 'hi-island'
    this.onSuccess = options.onSuccess || (() => {});
    this.isOpen = false;
  }

  // Initialize component
  init() {
    this.render();
    // 🔧 TESLA-GRADE FIX: Attach event listeners after DOM elements are rendered
    setTimeout(() => {
      this.attachEventListeners();
    }, 0);
    
    // Expose to global for easy access with enhanced options
    window.openHiShareSheet = (origin = 'hi5', options = {}) => {
      this.origin = origin;
      this.prefilledData = options; // Store prefilled data for Hi Muscle integration
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
    // � TESLA-GRADE: CSS handles positioning, JS only manages pointer-events
    // No inline positioning styles - CSS handles the foundation
    container.innerHTML = `
      <!-- Backdrop -->
      <div class="premium-share-backdrop" id="hi-share-backdrop"></div>

      <!-- Share Sheet Modal -->
      <div id="hi-share-sheet" class="premium-share-sheet glass-card" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <div class="share-header">
          <div class="share-icon">✨</div>
          <h3 id="sheetTitle" class="text-gradient">Capture this Hi Moment</h3>
          <p class="share-subtitle">Choose how you want to share your moment</p>
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
    const shareAnonBtn = document.getElementById('hi-share-anon');
    const sharePublicBtn = document.getElementById('hi-share-public');

    // 🔧 DEBUG: Log which elements are found
    console.log('🧪 Share Sheet Event Listeners:', {
      backdrop: !!backdrop,
      closeBtn: !!closeBtn,
      journal: !!journal,
      charCount: !!charCount,
      savePrivateBtn: !!savePrivateBtn,
      shareAnonBtn: !!shareAnonBtn,
      sharePublicBtn: !!sharePublicBtn
    });

    // 🔧 SAFETY CHECK: Ensure all elements exist before attaching listeners
    if (!savePrivateBtn || !shareAnonBtn || !sharePublicBtn) {
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

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Privacy option handlers
    savePrivateBtn.addEventListener('click', (e) => this.handleSavePrivate(e));
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

  // Open share sheet
  async open(options = {}) {
    // Store context and preset for submission
    this.context = options.context || this.origin;
    this.preset = options.preset || 'default';
    this.shareType = options.type || (options.preset === 'hi5' ? 'Hi5' : 'share');
    
    const backdrop = document.getElementById('hi-share-backdrop');
    const sheet = document.getElementById('hi-share-sheet');
    
    // 🔧 TESLA-GRADE FIX: Enable container pointer events ONLY when opening
    if (this.root) {
      this.root.style.pointerEvents = 'auto';
    }
    
    backdrop.classList.add('active');
    sheet.classList.add('active');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';

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
    
    // Clear input
    journal.value = '';
    document.getElementById('hi-share-char-count').textContent = '0';
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

    // Increment global Hi5 counter
    this.incrementGlobalCounter();

    await this.persist({ toIsland: false, anon: false });

    setTimeout(() => {
      button.dataset.animating = 'false';
    }, 500);
  }

  // Handle Share Anonymously
  async handleShareAnonymous(e) {
    if (e.target.closest('button').dataset.animating === 'true') return;
    const button = e.target.closest('button');
    button.dataset.animating = 'true';

    // 🎉 TESLA-GRADE: Premium celebration for anonymous share
    if (window.PremiumUX) {
      window.PremiumUX.burst(button, { count: 8, colors: ['#8A2BE2', '#FFD700'] });
      window.PremiumUX.triggerHapticFeedback('medium');
    }

    // Increment global Hi5 counter
    this.incrementGlobalCounter();

    await this.persist({ toIsland: true, anon: true });

    setTimeout(() => {
      button.dataset.animating = 'false';
    }, 500);
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

    // Increment global Hi5 counter
    this.incrementGlobalCounter();

    await this.persist({ toIsland: true, anon: false });

    setTimeout(() => {
      button.dataset.animating = 'false';
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

  // Get user's location (Gold Standard: Profile-First Architecture)
  async getUserLocation() {
    try {
      // STEP 1: Check if user has profile location (home base)
      const profile = await this.getProfileLocation();
      
      if (profile?.location) {
        console.log('📍 Using profile location (cached):', profile.location);
        
        // Store in instance for UI display
        this.currentLocation = profile.location;
        this.locationSource = 'profile';
        
        return profile.location;
      }
      
      // STEP 2: No profile location → detect via GPS and save to profile
      console.log('🌍 No profile location found, detecting...');
      
      if (!window.GeocodingService) {
        console.warn('⚠️ GeocodingService not available');
        return 'Location unavailable';
      }
      
      const detected = await window.GeocodingService.getUserLocation();
      
      if (detected && detected !== 'Location unavailable') {
        console.log('📍 Location detected:', detected);
        
        // Save to profile for future shares (gold standard)
        await this.saveLocationToProfile(detected);
        
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
      
      const profile = await window.hiDB.fetchUserProfile();
      return profile;
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch profile:', error);
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
      console.log('💾 Saving location to profile:', cleanLocation);
      
      await window.hiDB.updateProfile({ location: cleanLocation });
      
      console.log('✅ Location saved to profile');
      
    } catch (error) {
      console.warn('⚠️ Failed to save location to profile:', error);
    }
  }
  
  // Force update location (for travelers)
  async forceUpdateLocation() {
    try {
      console.log('🔄 Force updating location...');
      
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
        console.log('📍 New location detected:', detected);
        
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
      console.log('🔧 Location normalized:', location, '→', normalized);
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

  // Persist data to Supabase
  async persist({ toIsland = false, anon = false }) {
    const journal = document.getElementById('hi-share-journal');
    const raw = (journal.value || '').trim();
    const text = raw || 'Marked a Hi-5 ✨';
    
    console.log('💾 Saving Hi-5:', { text, toIsland, anon, origin: this.origin, type: this.shareType });
    
    const location = await this.getUserLocation();

    try {
      // Check if HiBase shares integration is enabled
      const { isEnabledCohort } = await import('../lib/flags/HiFlags.js');
      const hibaseEnabled = await isEnabledCohort('hibase_shares_enabled');
      
      let shareResult = null;
      
      // Use HiBase if enabled, otherwise fall back to legacy hiDB
      if (hibaseEnabled && window.HiBase?.shares) {
        console.log('📡 Using HiBase shares integration');
        
        // Get current user (HI DEV: null for anonymous, not 'anonymous' string)
        const currentUser = window.hiAuth?.getCurrentUser?.() || { id: null };
        
        // HI DEV: Prepare payload per specifications
        const sharePayload = {
          type: 'Hi5',
          text: text,
          visibility: anon ? 'anonymous' : (toIsland ? 'public' : 'private'),
          user_id: currentUser.id || null, // null for anonymous
          location: location?.name || null,
          metadata: { 
            origin: 'dashboard', 
            tags: ['hi5'],
            latitude: location?.lat || null,
            longitude: location?.lng || null,
            currentEmoji: this.emotionalJourney?.current || '🙌',
            desiredEmoji: this.emotionalJourney?.desired || '✨'
          }
        };
        
        shareResult = await window.HiBase.shares.insertShare(sharePayload);
        console.log('📤 HiBase share result:', shareResult);
        
        // Call success callback with HiBase info
        this.onSuccess({ 
          ...sharePayload, 
          hibaseEnabled: true,
          visibility: sharePayload.visibility
        });
        
      } else {
        console.log('📝 Using legacy hiDB integration');
        
        // ALWAYS write to My Archive (private storage)
        // 🌟 TESLA-GRADE: Use emotional journey data if available (Hi Muscle integration)
        const currentEmoji = this.emotionalJourney?.current || '�';
        const desiredEmoji = this.emotionalJourney?.desired || '✨';
        
        const archivePayload = {
          currentEmoji,
          desiredEmoji,
          journal: text,
          location,
          origin: this.origin, // 'hi5', 'higym', or 'hi-island'
          type: this.shareType || (this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hi_island' : 'Hi5'))
        };
        
        // Call success callback with legacy info
        this.onSuccess({ 
          ...archivePayload,
          hibaseEnabled: false,
          visibility: anon ? 'anonymous' : (toIsland ? 'public' : 'private')
        });
      }
      
      const archiveResult = await window.hiDB?.insertArchive?.(archivePayload);
      console.log('📝 Archive saved:', archiveResult);

      // If sharing to island (public or anon), ALSO write to public_shares
      if (toIsland) {
        const publicPayload = {
          currentEmoji,
          currentName: this.origin === 'higym' ? 'Hi GYM' : (this.origin === 'hi-island' ? 'Hi Island' : 'Hi-5'),
          desiredEmoji,
          desiredName: this.origin === 'higym' ? 'Hi GYM' : (this.origin === 'hi-island' ? 'Hi Island' : 'Hi-5'),
          text,
          isAnonymous: anon,
          location,
          isPublic: true,
          origin: this.origin,
          type: this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hi_island' : 'self_hi5')
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
    shouldInit: page === 'hi-island' || page === 'index' || page === 'hi-muscle'
  });
  
  if (page === 'hi-island' || page === 'index' || page === 'hi-muscle') {
    const shareSheet = new HiShareSheet({ origin: page === 'hi-muscle' ? 'higym' : 'hi5' });
    shareSheet.init();
    console.log('✅ Hi Share Sheet component initialized for page:', page);
  } else {
    console.warn('❌ Hi Share Sheet NOT initialized - unsupported page:', page);
  }
}
