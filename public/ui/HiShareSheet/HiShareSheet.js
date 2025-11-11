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
    this._isReady = false; // A2: Readiness state tracking
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
      console.log('✅ HiShareSheet already initialized, skipping');
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
        this.open();
      };

      this._isReady = true;
      console.log('✅ HiShareSheet initialized (Tesla-grade Hi System)');
      
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

  // Standardized isReady method (A2 requirement)
  isReady() {
    return this._isReady;
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

    // � EMERGENCY FIX: Non-blocking persist (don't await - fire and forget)
    this.persist({ toIsland: false, anon: false }).catch(err => {
      console.error('❌ Private save failed:', err);
      this.showToast('❌ Save failed. Please try again.');
    });
    
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

    // 🎉 TESLA-GRADE: Premium celebration for anonymous share
    if (window.PremiumUX) {
      window.PremiumUX.burst(button, { count: 8, colors: ['#8A2BE2', '#FFD700'] });
      window.PremiumUX.triggerHapticFeedback('medium');
    }

    // � EMERGENCY FIX: Non-blocking persist (don't await - fire and forget)
    this.persist({ toIsland: true, anon: true }).catch(err => {
      console.error('❌ Anonymous share failed:', err);
      this.showToast('❌ Share failed. Please try again.');
    });
    
    // Close immediately for responsiveness
    this.close();

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

    // � EMERGENCY FIX: Non-blocking persist (don't await - fire and forget)
    this.persist({ toIsland: true, anon: false }).catch(err => {
      console.error('❌ Public share failed:', err);
      this.showToast('❌ Share failed. Please try again.');
    });
    
    // Close immediately for responsiveness
    this.close();

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
      
      // 🚨 EMERGENCY: 4-second timeout for GPS detection
      const detected = await Promise.race([
        window.GeocodingService.getUserLocation(),
        new Promise(resolve => setTimeout(() => resolve('Location unavailable'), 4000))
      ]);
      
      if (detected && detected !== 'Location unavailable') {
        console.log('📍 Location detected:', detected);
        
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
      console.log('🎯 Tesla generated new anonymous user ID:', anonymousUserId);
    } else {
      console.log('🔑 Tesla using existing anonymous user ID:', anonymousUserId);
    }
    
    return anonymousUserId;
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
    
    try {
      const journal = document.getElementById('hi-share-journal');
      const raw = (journal.value || '').trim();
      const text = raw || 'Marked a Hi-5 ✨';
      
      console.log('🎯 Tesla persist:', { submissionId, text, toIsland, anon, origin: this.origin, type: this.shareType });
    
      // 🚨 TESLA FIX: Make location completely non-blocking
    let location = 'Location unavailable';
    
    // Fire location detection in background (don't await)
    Promise.race([
      this.getUserLocation(),
      new Promise(resolve => setTimeout(() => resolve('Location unavailable'), 1000))
    ]).then(result => {
      location = result || 'Location unavailable';
      console.log('📍 Tesla location result:', location);
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
      console.log('🔑 Tesla anonymous user ID:', userId);
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
        Promise.race([
          window.hiDB.insertArchive(archivePayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Archive timeout')), 5000))
        ]).catch(err => {
          console.warn('Tesla archive save failed:', err);
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
        
        // Tesla: Enhanced public share with proper error handling
        Promise.race([
          window.hiDB.insertPublicShare(publicPayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Public share timeout')), 5000))
        ]).catch(err => {
          console.warn('Tesla public share failed:', err);
        });

        // Update map (fire and forget with timeout)
        if (window.hiDB?.updateMap) {
          Promise.race([
            window.hiDB.updateMap(publicPayload),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Map update timeout')), 3000))
          ]).catch(() => {});
        }
      }

      // Show success toast immediately
      if (toIsland) {
        this.showToast(anon ? '✨ Shared anonymously!' : '🌟 Shared publicly!');
      } else {
        this.showToast('🔒 Saved privately to your archive ✨');
      }

      // Track stats (non-blocking with timeout)
      if (window.trackShareSubmission) {
        const shareType = anon ? 'anonymous' : (toIsland ? 'public' : 'private');
        Promise.race([
          window.trackShareSubmission(this.origin, {
            submissionType: shareType,
            pageOrigin: this.origin,
            origin: this.origin,
            timestamp: Date.now()
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tracking timeout')), 3000))
        ]).catch(err => console.warn('Stats tracking failed:', err));
      }

      // Trigger success callback
      this.onSuccess({ 
        toIsland, 
        anon, 
        origin: this.origin,
        visibility: anon ? 'anonymous' : (toIsland ? 'public' : 'private')
      });

      console.log('✅ Share persistence complete, closing sheet...');
      
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
            console.log('🔄 Refreshing Hi-Island feed after share submission...');
            
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
