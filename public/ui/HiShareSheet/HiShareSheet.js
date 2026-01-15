/* ===================================================================
   🎨 HI SHARE SHEET COMPONENT
   Tesla-grade unified sharing modal for Hi moments
   Used by: Index (Self Hi5), Hi Island, Hi Muscle
   Version: 2.2.0-hi-scale (Optional Intensity Rating)
=================================================================== */

import HiScale from '../HiScale/HiScale.js';

export class HiShareSheet {
  constructor(options = {}) {
    // Auto-enable debug from URL (?debug=1)
    if (typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search)) {
      window.__HI_DEBUG__ = true;
    }
    // Debug logger gate (only logs when window.__HI_DEBUG__ true)
    this._dbg = (...a) => { if (window.__HI_DEBUG__) console.log(...a); };
    this.version = '2.2.0-hi-scale';
    this.origin = options.origin || 'hi5'; // 'hi5', 'higym', or 'hi-island'
    this.onSuccess = options.onSuccess || (() => {});
    this.isOpen = false;
    this._isReady = false; // A2: Readiness state tracking
    this.practiceMode = false;
    this.hiScale = null; // 🎯 Hi Scale component instance
    
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
        
        <!-- 🎯 Hi Scale Intensity Selector (Optional) -->
        <div class="hi-scale-container" style="margin: 16px 0; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 12px;">
          <label class="hi-scale-label" style="display: block; font-size: 13px; color: #888; margin-bottom: 8px; text-align: center;">
            How Hi are you? <span style="color: #aaa; font-size: 11px;">(optional)</span>
          </label>
          <div id="hiScaleWidget"></div>
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
    console.log('🔐 [updateShareOptionsForAuthState] FUNCTION CALLED');
    
    try {
      // Check authentication via multiple sources (Hi System Standard)
      console.log('🔍 [AUTH CHECK] Calling checkAuthentication()...');
      const isAuthenticated = await this.checkAuthentication();
      console.log('✅ [AUTH CHECK] Result:', isAuthenticated);
    
    // 🎯 TIER SYSTEM ACTIVE: Check membership tier for feature gating
    console.log('🔍 [TIER CHECK] Calling getMembershipTier()...');
    const membership = await this.getMembershipTier();
    console.log('✅ [TIER CHECK] Result:', membership);
    const tier = membership?.tier || 'free';
    console.log('✅ [TIER] Final tier value:', tier);
    
    const authPromptBtn = document.getElementById('hi-share-auth-prompt');
    const shareAnonBtn = document.getElementById('hi-share-anon');
    const sharePublicBtn = document.getElementById('hi-share-public');
    const sharePrivateBtn = document.getElementById('hi-save-private'); // FIXED: Correct ID
    
    console.log('🔍 [BUTTONS] Found:', { authPromptBtn: !!authPromptBtn, shareAnonBtn: !!shareAnonBtn, sharePublicBtn: !!sharePublicBtn, sharePrivateBtn: !!sharePrivateBtn });
    
    this._dbg('🔐 Auth state check:', { isAuthenticated });
    
    if (isAuthenticated) {
      // ✅ AUTHENTICATED: Show ALL 3 options (SOURCES_OF_TRUTH standard)
      // Per SOURCES_OF_TRUTH.md lines 61-73: Authenticated users get Private, Anonymous, Public
      if (authPromptBtn) authPromptBtn.style.display = 'none';
      if (sharePrivateBtn) sharePrivateBtn.style.display = 'block';
      if (shareAnonBtn) shareAnonBtn.style.display = 'block';
      if (sharePublicBtn) sharePublicBtn.style.display = 'block';
      
      console.log('🔓 [SHARE SHEET] Before tier enforcement - all buttons shown');
      
      // 🎯 TIER ENFORCEMENT ACTIVE: Filter share options by membership tier
      await this.enforceTierLimits(tier, { shareAnonBtn, sharePublicBtn, sharePrivateBtn });
      
      console.log('✅ [SHARE SHEET] After tier enforcement for tier:', tier);
      this._dbg('✅ Share options configured for tier:', tier);
    } else {
      // 🔒 ANONYMOUS: Show Auth Prompt only (SOURCES_OF_TRUTH standard)
      // Per SOURCES_OF_TRUTH.md lines 75-80: Anonymous users get Private + Join prompt
      if (authPromptBtn) authPromptBtn.style.display = 'block';
      if (shareAnonBtn) shareAnonBtn.style.display = 'none';
      if (sharePublicBtn) sharePublicBtn.style.display = 'none';
      if (sharePrivateBtn) sharePrivateBtn.style.display = 'block';  // Anonymous can still save privately to local storage
      
      this._dbg('🔒 Anonymous user: showing auth prompt');
    }
    } catch (error) {
      console.error('💥 [updateShareOptionsForAuthState] ERROR CAUGHT:', error);
      console.error('💥 [updateShareOptionsForAuthState] Stack:', error.stack);
      // Fail open - show all buttons if auth check fails
      const sharePrivateBtn = document.getElementById('hi-save-private');
      const shareAnonBtn = document.getElementById('hi-share-anon');
      const sharePublicBtn = document.getElementById('hi-share-public');
      if (sharePrivateBtn) sharePrivateBtn.style.display = 'block';
      if (shareAnonBtn) shareAnonBtn.style.display = 'block';
      if (sharePublicBtn) sharePublicBtn.style.display = 'block';
    }
  }

  // 🎯 Enforce tier-based feature limits
  async enforceTierLimits(tier, buttons) {
    console.log('🔥 [enforceTierLimits] CALLED with tier:', tier, '| buttons:', buttons);
    try {
      console.log('🔥 [enforceTierLimits] Inside try block');
      console.log('🔥 [enforceTierLimits] window.HiTierConfig:', window.HiTierConfig);
      console.log('🔥 [enforceTierLimits] getTierFeatures function:', window.HiTierConfig?.getTierFeatures);
      
      // 🎯 DEFENSIVE FIX: Fail-open if TIER_CONFIG not loaded yet
      // Get tier features from TIER_CONFIG with safe fallback
      const features = window.HiTierConfig?.getTierFeatures?.(tier) || {
        shareTypes: ['private', 'anonymous', 'public'], // Show all buttons by default
        shareCreation: true // Allow sharing by default
      };
      console.log('🎯 [TIER CHECK] Tier:', tier, '| Features:', features);
      
      // ✅ REMOVED FREE TIER HARD BLOCK: Now uses quota system below
      
      // Check monthly quota for free/bronze/silver tiers
      if (typeof features.shareCreation === 'number') {
        const quota = await this.checkShareQuota(tier, features.shareCreation);
        if (quota.exceeded) {
          this._dbg(`🚫 Monthly limit reached: ${quota.used}/${quota.limit}`);
          this.showQuotaReached(quota.used, quota.limit, tier);
          if (buttons.shareAnonBtn) buttons.shareAnonBtn.style.display = 'none';
          if (buttons.sharePublicBtn) buttons.sharePublicBtn.style.display = 'none';
          if (buttons.sharePrivateBtn) buttons.sharePrivateBtn.style.display = 'none';
          return;
        } else {
          // Show quota counter
          this.displayShareQuota(quota.used, quota.limit);
        }
      }
      
      // Filter share types by tier
      const allowedTypes = features.shareTypes || ['public'];
      console.log('🎯 [BUTTON FILTER] Allowed types:', allowedTypes, '| Buttons:', Object.keys(buttons));
      if (buttons.shareAnonBtn) {
        buttons.shareAnonBtn.style.display = allowedTypes.includes('anonymous') ? 'block' : 'none';
        console.log('  → Anonymous button:', allowedTypes.includes('anonymous') ? 'SHOW' : 'HIDE');
      }
      if (buttons.sharePublicBtn) {
        buttons.sharePublicBtn.style.display = allowedTypes.includes('public') ? 'block' : 'none';
        console.log('  → Public button:', allowedTypes.includes('public') ? 'SHOW' : 'HIDE');
      }
      if (buttons.sharePrivateBtn) {
        buttons.sharePrivateBtn.style.display = allowedTypes.includes('private') ? 'block' : 'none';
        console.log('  → Private button:', allowedTypes.includes('private') ? 'SHOW' : 'HIDE');
      }
      
      this._dbg('✅ Tier limits enforced:', { tier, allowed: allowedTypes });
      
    } catch (err) {
      console.error('⚠️ Tier enforcement failed:', err);
      // Fail open: Don't block user if tier check fails
    }
  }

  // 🎯 Check monthly share quota
  async checkShareQuota(tier, limit) {
    try {
      // Try server-side count first (with 2s timeout to prevent lockups)
      if (window.sb?.rpc) {
        try {
          const rpcPromise = window.sb.rpc('get_user_share_count', { period: 'month' });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC timeout')), 2000)
          );
          
          const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
          if (!error && data) {
            return {
              used: data.count || 0,
              limit: limit,
              exceeded: (data.count || 0) >= limit
            };
          }
        } catch (rpcErr) {
          console.warn('⚠️ get_user_share_count RPC failed (using fallback):', rpcErr.message);
          // Fall through to client-side tracking
        }
      }
      
      // Fallback: Client-side tracking (less reliable but better than nothing)
      const monthKey = new Date().toISOString().slice(0, 7); // '2025-12'
      const storageKey = `hi_share_count_${monthKey}`;
      const stored = localStorage.getItem(storageKey);
      const count = stored ? parseInt(stored, 10) : 0;
      
      return {
        used: count,
        limit: limit,
        exceeded: count >= limit
      };
    } catch (err) {
      console.warn('⚠️ Quota check failed:', err);
      return { used: 0, limit: limit, exceeded: false }; // Fail open
    }
  }

  // 🎯 Display share quota counter
  displayShareQuota(used, limit) {
    try {
      const container = document.querySelector('.hi-share-modal');
      if (!container) return;
      
      // Remove existing counter
      const existing = container.querySelector('.hi-share-quota');
      if (existing) existing.remove();
      
      // Add quota display
      const quotaHtml = `
        <div class="hi-share-quota" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(78, 205, 196, 0.1);
          border: 1px solid rgba(78, 205, 196, 0.3);
          border-radius: 12px;
          padding: 6px 12px;
          font-size: 12px;
          color: #4ECDC4;
          font-weight: 500;
        ">
          ${used}/${limit} shares this month
        </div>
      `;
      container.insertAdjacentHTML('afterbegin', quotaHtml);
    } catch (err) {
      console.warn('⚠️ Quota display failed:', err);
    }
  }

  // 🎯 Show tier upgrade prompt
  showTierUpgradePrompt(feature, requiredTier) {
    const tierNames = {
      'bronze': 'Hi Pathfinder',
      'silver': 'Hi Trailblazer',
      'gold': 'Hi Champion'
    };
    
    const messages = {
      'sharing': `Upgrade to ${tierNames[requiredTier] || 'Bronze'} to start sharing your Hi-5s with the community!`
    };
    
    this.showToast(messages[feature] || 'This feature requires a membership upgrade', 'info');
    
    // Show upgrade button in modal
    setTimeout(() => {
      const container = document.querySelector('.hi-share-modal');
      if (container && !container.querySelector('.hi-upgrade-cta')) {
        const upgradeHtml = `
          <div class="hi-upgrade-cta" style="
            margin: 16px 0;
            padding: 16px;
            background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(255, 107, 107, 0.1));
            border-radius: 16px;
            text-align: center;
          ">
            <p style="margin: 0 0 12px; color: #4ECDC4; font-weight: 600;">Unlock Sharing</p>
            <a href="/upgrade.html?feature=${feature}" style="
              display: inline-block;
              padding: 10px 24px;
              background: linear-gradient(135deg, #4ECDC4, #FF6B6B);
              color: white;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              transition: transform 0.2s;
            ">View Plans</a>
          </div>
        `;
        const journal = container.querySelector('#hi-share-journal');
        if (journal) {
          journal.parentElement.insertAdjacentHTML('beforebegin', upgradeHtml);
        }
      }
    }, 100);
  }

  // 🎯 Show quota reached message
  showQuotaReached(used, limit, tier) {
    const nextTier = tier === 'bronze' ? 'Silver (Hi Trailblazer)' : 'Gold (Hi Champion)';
    this.showToast(`You've used all ${limit} shares this month. Upgrade to ${nextTier} for more!`, 'info');
    
    setTimeout(() => {
      const container = document.querySelector('.hi-share-modal');
      if (container && !container.querySelector('.hi-quota-reached')) {
        const quotaHtml = `
          <div class="hi-quota-reached" style="
            margin: 16px 0;
            padding: 16px;
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid rgba(255, 107, 107, 0.3);
            border-radius: 16px;
            text-align: center;
          ">
            <p style="margin: 0 0 8px; color: #FF6B6B; font-weight: 600;">Monthly Limit Reached</p>
            <p style="margin: 0 0 12px; font-size: 14px; color: #888;">You've shared ${used}/${limit} times this month</p>
            <a href="/upgrade.html?from=quota" style="
              display: inline-block;
              padding: 10px 24px;
              background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
              color: white;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
            ">Upgrade for Unlimited</a>
          </div>
        `;
        const journal = container.querySelector('#hi-share-journal');
        if (journal) {
          journal.parentElement.insertAdjacentHTML('beforebegin', quotaHtml);
        }
      }
    }, 100);
  }

  // 🎯 Get user membership tier
  async getMembershipTier() {
    try {
      // Method 1: Global membership system
      if (window.__hiMembership?.tier) {
        return { tier: window.__hiMembership.tier };
      }
      
      // Method 2: HiMembership module
      if (window.HiMembership?.getMembership) {
        const membership = await window.HiMembership.getMembership();
        return membership;
      }
      
      // Method 3: Query database directly
      if (window.sb?.rpc) {
        const { data } = await window.sb.rpc('get_unified_membership');
        if (data?.tier) {
          return data;
        }
      }
    } catch (err) {
      this._dbg('⚠️ Membership tier check failed:', err);
    }
    
    // Default to free tier
    return { tier: 'free' };
  }

  // 🎯 Increment share count (client-side tracking)
  incrementShareCount() {
    try {
      const monthKey = new Date().toISOString().slice(0, 7); // '2025-12'
      const storageKey = `hi_share_count_${monthKey}`;
      const current = localStorage.getItem(storageKey);
      const count = current ? parseInt(current, 10) : 0;
      localStorage.setItem(storageKey, (count + 1).toString());
      this._dbg('📊 Share count updated:', count + 1);
    } catch (err) {
      console.warn('⚠️ Share count increment failed:', err);
    }
  }

  // 🔐 Check authentication across multiple systems
  async checkAuthentication() {
    // Method 1: Membership system (FASTEST - synchronous check)
    if (window.__hiMembership?.tier && window.__hiMembership.tier !== 'free') {
      this._dbg('✅ Auth: Membership tier found');
      return true;
    }

    // Method 2: Global auth state (synchronous)
    if (window.__hiAuth?.user || window.__currentUser) {
      this._dbg('✅ Auth: Global auth state found');
      return true;
    }

    // Method 3: Supabase auth (SLOWEST - async with timeout)
    try {
      if (window.sb?.auth) {
        // Add 1-second timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 1000)
        );
        const authPromise = window.sb.auth.getSession();
        
        const { data: { session } } = await Promise.race([authPromise, timeoutPromise]);
        if (session?.user) {
          this._dbg('✅ Auth: Supabase session found');
          return true;
        }
      }
    } catch (err) {
      this._dbg('⚠️ Supabase auth check failed or timed out:', err.message);
    }

    this._dbg('🔒 Auth: No authenticated session found');
    return false;
  }

  // Open share sheet
  async open(options = {}) {
    console.log('🚀 [SHARE SHEET] open() called with options:', options);
    
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
    
    // 🎯 Initialize Hi Scale component
    try {
      console.log('🎯 Hi Scale: Checking for HiScale class...', typeof HiScale);
      const hiScaleContainer = document.getElementById('hiScaleWidget');
      console.log('🎯 Hi Scale: Container found?', !!hiScaleContainer);
      if (hiScaleContainer && !this.hiScale) {
        console.log('🎯 Hi Scale: Creating new HiScale instance...');
        this.hiScale = new HiScale(hiScaleContainer, {
          onChange: (value) => {
            this._dbg('🎯 Hi Scale changed:', value);
          }
        });
        console.log('✅ Hi Scale: Initialized successfully!', this.hiScale);
      }
    } catch (err) {
      console.error('❌ Failed to initialize HiScale:', err);
      console.error('❌ HiScale error stack:', err.stack);
      // Continue without intensity - it's optional
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
    console.time('🔍 SHARESHEET_CLOSE');
    console.log('🔍 CLOSE: Starting close sequence');
    
    if (!this._isReady) {
      console.log('🔍 CLOSE: Not ready, aborting');
      console.timeEnd('🔍 SHARESHEET_CLOSE');
      return;
    }

    console.log('🔍 CLOSE: Getting DOM elements');
    const backdrop = document.getElementById('hi-share-backdrop');
    const sheet = document.getElementById('hi-share-sheet');
    const journal = document.getElementById('hi-share-journal');
    
    console.log('🔍 CLOSE: Disabling pointer events');
    // 🔧 TESLA-GRADE FIX: Disable container pointer events when closing
    if (this.root) {
      this.root.style.pointerEvents = 'none';
    }
    
    console.log('🔍 CLOSE: Removing active classes');
    backdrop.classList.remove('active');
    sheet.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = '';
    // Reset practice mode when closing
    this.practiceMode = false;
    
    console.log('🔍 CLOSE: Clearing form fields');
    // 🎯 GOLD STANDARD: Clear ALL form fields for clean reset
    journal.value = '';
    document.getElementById('hi-share-char-count').textContent = '0';
    
    console.log('🔍 CLOSE: Resetting Hi Scale');
    // 🎯 Reset Hi Scale intensity selector
    if (this.hiScale) {
      this.hiScale.reset();
    }
    
    console.log('🔍 CLOSE: Clearing location');
    // Clear location field
    const locationInput = document.getElementById('hi-share-location');
    if (locationInput) {
      locationInput.value = '';
    }
    
    console.log('🔍 CLOSE: Clearing emotional journey');
    // Clear emotional journey display (Hi Gym)
    const emotionalJourney = document.getElementById('hi-emotional-journey');
    if (emotionalJourney) {
      emotionalJourney.style.display = 'none';
    }
    
    console.log('🔍 CLOSE: Clearing prefilled data');
    // Clear prefilled data to prevent stale content on reopen
    this.prefilledData = null;
    this.origin = '';

    console.log('🔍 CLOSE: Restoring focus');
    // Restore focus to the invoking control, if possible
    if (this._previouslyFocused && typeof this._previouslyFocused.focus === 'function') {
      setTimeout(() => {
        try { this._previouslyFocused.focus(); } catch (_) {}
      }, 0);
    }
    
    console.log('🔍 CLOSE: Complete');
    console.timeEnd('🔍 SHARESHEET_CLOSE');
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
      // 🏆 WOZ FIX: AWAIT persist() and check result before closing
      try {
        const result = await this.persist({ toIsland: false, anon: false });
        
        if (result && result.success === false) {
          this.showToast('❌ Save failed. Please try again.', 'error');
          button.dataset.animating = 'false';
          return; // Don't close on failure
        }
        
        // ✅ Check if anonymous user - show archive nudge with celebration toast
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
          // Anonymous user saved private share - show gold standard center toast
          setTimeout(() => {
            this.showCelebrationToast('✅ Saved to your archive! Sign up to view all your moments.');
          }, 1500); // Wait for modal close animation + confetti to complete
        }
        
        // Only close if successful
        this.close();
        
      } catch (err) {
        console.error('❌ Private save failed:', err);
        this.showToast('❌ Save failed. Please try again.', 'error');
        button.dataset.animating = 'false';
        return; // Don't close on error
      }
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
      // 🏆 WOZ FIX: AWAIT persist() and check result before closing
      try {
        const result = await this.persist({ toIsland: true, anon: true });
        
        if (result && result.success === false) {
          this.showToast('❌ Share failed. Please try again.', 'error');
          button.dataset.animating = 'false';
          return; // Don't close on failure
        }
        
        // Close immediately for responsiveness
        this.close();
        
      } catch (err) {
        console.error('❌ Anonymous share failed:', err);
        this.showToast('❌ Share failed. Please try again.', 'error');
        button.dataset.animating = 'false';
        return; // Don't close on error
      }
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
      // 🏆 WOZ FIX: AWAIT persist() and check result before closing
      try {
        const result = await this.persist({ toIsland: true, anon: false });
        
        if (result && result.success === false) {
          this.showToast('❌ Share failed. Please try again.', 'error');
          button.dataset.animating = 'false';
          return; // Don't close on failure
        }
        
        // Only close if successful
        this.close();
        
      } catch (err) {
        console.error('❌ Public share failed:', err);
        this.showToast('❌ Share failed. Please try again.', 'error');
        button.dataset.animating = 'false';
        return; // Don't close on error
      }
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
  // WOZ FIX: Use ProfileManager when available
  async getUserId() {
    try {
      // Use ProfileManager if available (guaranteed non-null for authenticated users)
      if (window.ProfileManager?.isReady()) {
        return await window.ProfileManager.ensureUserId();
      }
      
      // Fallback to direct auth (legacy)
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
      // 🚧 SERVER-SIDE VALIDATION TEMPORARILY DISABLED
      // TODO: Deploy tier_enforcement_share_validation.sql to enable
      // Missing: validate_share_creation() RPC + user_share_tracking table
      // See: /sql/migrations/tier_enforcement_share_validation.sql
      
      // if (toIsland && window.sb?.rpc) {
      //   const shareType = anon ? 'anonymous' : 'public';
      //   const { data: validation, error: validationError } = await window.sb.rpc('validate_share_creation', {
      //     p_share_type: shareType,
      //     p_origin: this.origin
      //   });
      //   
      //   if (validationError || !validation?.allowed) {
      //     this._persisting = false;
      //     const reason = validation?.reason || 'Share validation failed';
      //     this.showToast(`❌ ${reason}`, 'error');
      //     
      //     if (validation?.upgrade_required) {
      //       this.showQuotaReached(
      //         validation.quota?.used || 0,
      //         validation.quota?.limit || 0,
      //         validation.tier || 'free'
      //       );
      //     }
      //     return;
      //   }
      //   
      //   this._dbg('✅ Server validation passed:', validation);
      // }
      
      const journal = document.getElementById('hi-share-journal');
      const raw = (journal.value || '').trim();
      const text = raw || 'Marked a Hi-5 ✨';
      
      this._dbg('🎯 Tesla persist:', { submissionId, text, toIsland, anon, origin: this.origin, type: this.shareType });
    
      // 🔥 FIX: Make location BLOCKING - get it BEFORE creating shares
      let location = 'Location unavailable';
      try {
        location = await Promise.race([
          this.getUserLocation(),
          new Promise(resolve => setTimeout(() => resolve('Location unavailable'), 2000))
        ]);
        this._dbg('📍 Tesla location captured:', location);
      } catch (err) {
        console.warn('Tesla location failed:', err);
      }
    
    // 🎯 TESLA CRITICAL FIX: Get authenticated user ID for all shares
    // Archives ALWAYS use real user_id (even for anonymous shares - it's YOUR archive)
    // Public shares will handle anonymous visibility separately (user_id = NULL in public_shares)
    const authenticatedUserId = await this.getUserId();
    
    // For public shares: anonymous means NULL user_id, authenticated means real ID
    const publicShareUserId = anon ? null : authenticatedUserId;
    
    this._dbg('🔑 Tesla user IDs:', { 
      authenticated: authenticatedUserId, 
      forPublicShare: publicShareUserId,
      isAnonymous: anon 
    });
    
    try {
      // 🌟 TESLA: Use emotional journey data if available (Hi Muscle integration)
      const currentEmoji = this.emotionalJourney?.current || '🙌';
      const desiredEmoji = this.emotionalJourney?.desired || '✨';
      
      // 🎯 HI SCALE: Capture intensity rating (1-5 or null)
      console.log('🎯 Hi Scale: this.hiScale exists?', !!this.hiScale);
      console.log('🎯 Hi Scale: getValue method?', typeof this.hiScale?.getValue);
      const hiIntensity = this.hiScale?.getValue() || null;
      console.log('🎯 Hi Scale captured value:', hiIntensity, '(type:', typeof hiIntensity, ')');
      
      // 🎯 TESLA FIX #1: ALL users (including anonymous) get archives with proper user IDs
      // 🔒 Single-writer policy: disable HiBase inserts (use hiDB only)
      try {
        if (window.HiFlags && typeof window.HiFlags.set === 'function') {
          window.HiFlags.set('hibase_shares_enabled', false);
        }
      } catch {}
      const archivePayload = {
        currentEmoji,
        desiredEmoji,
        journal: text,
        location,
        origin: this.origin, // 'hi5', 'higym', or 'hi-island'
        type: this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hi_island' : 'self_hi5'),
        user_id: authenticatedUserId, // Tesla: ALWAYS use real authenticated user_id for archives
        hi_intensity: hiIntensity // 🎯 Hi Scale: Optional intensity rating (1-5 or null)
      };
      
      // 🔬 DEBUG: Log archive payload to trace type issue
      console.log('🔬 Archive Payload:', {
        origin: this.origin,
        computed_type: archivePayload.type,
        full_payload: archivePayload
      });
      
      // Tesla: ALL shares get archived (fixes anonymous archive bug)
      if (window.hiDB?.insertArchive) {
        let warned=false;
        await this._withRetry(() => Promise.race([
          window.hiDB.insertArchive(archivePayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Archive timeout')), 5000))
        ]), 2, 600).then(res => {
          try {
            const statusEl = document.querySelector('#hi-archive-status');
            const stamp = new Date().toLocaleTimeString();
            const msg = res?.ok
              ? `Archive OK via ${res?.source || 'rpc/direct'} @ ${stamp}`
              : `Archive FAILED (${res?.error || 'unknown'}) @ ${stamp}`;
            window.HiArchiveStatus = msg;
            if (statusEl) {
              statusEl.textContent = msg;
              statusEl.style.display = 'inline-block';
            }
          } catch {}
        }).catch(err => {
          console.error('❌ CRITICAL: Archive save failed after retries:', err);
          try {
            const statusEl = document.querySelector('#hi-archive-status');
            const stamp = new Date().toLocaleTimeString();
            const msg = `Archive FAILED (${err?.message || 'timeout'}) @ ${stamp}`;
            window.HiArchiveStatus = msg;
            if (statusEl) {
              statusEl.textContent = msg;
              statusEl.style.display = 'inline-block';
            }
          } catch {}
          throw new Error(`Archive failed: ${err?.message || 'unknown'}`); // 🔥 FIX: Throw to fail persist()
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
          // isPublic removed - let isAnonymous determine visibility
          type: this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hi_island' : 'self_hi5'),
          origin: this.origin, // Will be 'higym', 'hi-island', or 'hi5'
          pill: this.origin === 'higym' ? 'higym' : (this.origin === 'hi-island' ? 'hiisland' : 'hi5'), // 🎯 FIX: Changed 'island' to 'hiisland'
          user_id: publicShareUserId, // Tesla: NULL for anonymous, real ID for public
          hi_intensity: hiIntensity // 🎯 Hi Scale: Optional intensity rating (1-5 or null)
        };
        
        // Tesla: Enhanced public share with retry + timeout
        let warned=false;
        await this._withRetry(() => Promise.race([
          window.hiDB.insertPublicShare(publicPayload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Public share timeout')), 5000))
        ]), 2, 600).catch(err => {
          console.error('❌ CRITICAL: Public share failed after retries:', err);
          throw new Error(`Public share failed: ${err?.message || 'unknown'}`); // 🔥 FIX: Throw to fail persist()
        });

        // Update map (retry quietly)
        if (window.hiDB?.updateMap) {
          this._withRetry(() => Promise.race([
            window.hiDB.updateMap(publicPayload),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Map update timeout')), 3000))
          ]), 1, 400).catch(()=>{});
        }
      }

      // 🚧 TIER TRACKING TEMPORARILY DISABLED
      // 🚧 TIER TRACKING TEMPORARILY DISABLED
      // TODO: Deploy tier_enforcement_share_validation.sql to enable
      // if (toIsland && window.sb?.rpc) {
      //   const shareType = anon ? 'anonymous' : 'public';
      //   window.sb.rpc('track_share_submission', {
      //     p_share_type: shareType,
      //     p_origin: this.origin,
      //     p_content_preview: text
      //   }).catch(err => console.warn('⚠️ Server-side tracking failed:', err));
      // }
      
      // 🎯 TIER TRACKING: Increment client-side share counter (fallback)
      this.incrementShareCount();
      
      // Show success toast immediately
      if (toIsland) {
        this.showToast(anon ? '✨ Shared anonymously!' : '🌟 Shared publicly!');
      } else {
        this.showToast('🔒 Saved privately to your archive ✨');
      }

      // 🎯 HI POINTS: Award share points (10 base pts, paid tiers only)
      try {
        const supabase = window.HiSupabase?.getClient?.() || window.supabaseClient;
        if (supabase && authenticatedUserId) {
          const shareType = anon ? 'anonymous' : (toIsland ? 'public' : 'private');
          const { data: pointsData } = await supabase.rpc('award_share_points', { p_share_type: shareType });
          if (pointsData?.awarded) {
            console.log('🎯 SHARE POINTS EARNED:', pointsData.points, 'pts (', pointsData.tier, ')');
            // Show points toast after share toast
            setTimeout(() => {
              this.showToast(`+${pointsData.points} Hi Points! 🎯`);
            }, 1500);
            window.dispatchEvent(new CustomEvent('hi:points-earned', { 
              detail: { points: pointsData.points, source: 'share', balance: pointsData.balance, tier: pointsData.tier }
            }));
          } else if (pointsData?.reason === 'daily_cap_reached') {
            console.log('ℹ️ Share points cap reached for today');
          } else if (pointsData?.reason === 'free_tier') {
            console.log('ℹ️ Free tier - upgrade to earn points');
          }
        }
      } catch (pointsErr) { console.warn('⚠️ Share points (non-critical):', pointsErr.message); }

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

      // 🚀 EVENT BUS: Notify listeners (Hi Island feed, stats, etc.)
      try {
        const visibility = anon ? 'anonymous' : (toIsland ? 'public' : 'private');
        const detail = {
          origin: this.origin,
          visibility,
          location,
          userId: authenticatedUserId, // Fixed: use correct variable name
          timestamp: Date.now(),
          context: this.context,
          shareData: {
            journal: text,
            content: text,
            hi_intensity: hiIntensity,
            location: location,
            origin: this.origin
          }
        };
        window.dispatchEvent(new CustomEvent('share:created', { detail }));
      } catch (err) {
        console.warn('⚠️ share:created dispatch failed:', err);
      }

      // Trigger success callback
      this.onSuccess({ 
        toIsland, 
        anon, 
        origin: this.origin,
        visibility: anon ? 'anonymous' : (toIsland ? 'public' : 'private')
      });
      
      // Gold Standard: Refresh calendar and streak data after share
      if (window.hiCalendarInstance) {
        setTimeout(() => {
          window.hiCalendarInstance.loadHiMoments();
          window.hiCalendarInstance.loadRemoteStreaks();
          console.log('🔥 Calendar and streak data refreshed after share');
        }, 500);
      }

      this._dbg('✅ Share persistence complete, closing sheet...');
      return { success: true }; // Signal success to caller
      
    } catch (error) {
      console.error('❌ Inner share operation failed:', error);
      this.showToast('❌ Share failed. Please try again.');
      throw error; // Re-throw to be caught by outer catch
    }
      
    } catch (error) {
      console.error('❌ Share persistence failed:', error);
      this.showToast('❌ Failed to save. Please try again.');
      return { success: false, error }; // Return failure to caller
    } finally {
      // 🔒 CRITICAL: Reset persisting flag so user can retry
      this._persisting = false;
    }
    
    // 🔧 EMERGENCY FIX: Don't close here - button handlers close immediately for responsiveness
    // this.close(); // Moved to button handlers for non-blocking UX

    // 🔧 LONG-TERM SOLUTION: Feed refresh handled by share:created event listeners
    // Pages should listen for 'share:created' and refresh the active tab accordingly.
  }


  // 🎉 TESLA-GRADE: Premium celebration toast system
  showToast(message, type = 'info') {
    // ✅ FIX: Always show errors prominently, regardless of celebration logic
    if (type === 'error' || message.includes('❌') || message.includes('failed')) {
      this.showErrorToast(message);
      return;
    }
    
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
  
  // ✅ NEW: Always-visible error toast with high z-index
  showErrorToast(message) {
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #FF6B6B;
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(255, 107, 107, 0.4);
      animation: slideDown 0.3s ease;
      max-width: 90vw;
      text-align: center;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
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
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      background: linear-gradient(135deg, rgba(78, 205, 196, 0.98) 0%, rgba(107, 91, 149, 0.98) 100%);
      color: white;
      padding: 20px 32px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 16px;
      z-index: 100000;
      pointer-events: none;
      opacity: 0;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(12px);
      border: 2px solid rgba(255, 255, 255, 0.25);
      max-width: calc(100vw - 60px);
      text-align: center;
      line-height: 1.5;
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    
    document.body.appendChild(toast);
    
    // Tesla-grade scale-up + fade-in animation
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Hold center stage for readability, then gentle exit
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -50%) scale(0.95)';
      setTimeout(() => toast.remove(), 500);
    }, 3500); // Longer display for important message
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
