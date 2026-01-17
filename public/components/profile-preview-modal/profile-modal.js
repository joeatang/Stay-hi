/* ===================================================================
   👤 PROFILE PREVIEW MODAL - Tesla-Grade User Profile Viewer
   Floating sheet modal for viewing user profiles from Hi Island
   Features: Avatar, username, bio, location, smooth transitions
=================================================================== */

export class ProfilePreviewModal {
  constructor() {
    this.isOpen = false;
    this.currentUserId = null;
    // 🚀 PERFORMANCE: Cache profiles for instant repeat views (5 min TTL)
    this.profileCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // Initialize component
  init() {
    console.log('🚀 ProfilePreviewModal initializing...');
    this.render();
    this.attachEventListeners();
    
    // Expose to global for easy access
    window.openProfileModal = (userId) => {
      console.log('👤 Opening profile modal for userId:', userId);
      this.open(userId);
    };
    
    console.log('✅ ProfilePreviewModal initialized - window.openProfileModal available');
  }

  // Render HTML structure
  render() {
    // Remove any existing modal to prevent duplicates
    const existing = document.querySelector('.profile-modal-container');
    if (existing) {
      existing.remove();
    }

    const container = document.createElement('div');
    container.className = 'profile-modal-container';
    container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9997;';
    container.innerHTML = `
      <!-- Backdrop -->
      <div class="profile-modal-backdrop" id="profile-modal-backdrop"></div>

      <!-- Profile Modal -->
      <div id="profile-preview-modal" class="profile-preview-modal" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
        <button id="profile-modal-close" class="profile-modal-close" aria-label="Close">✕</button>
        
        <!-- Loading State -->
        <div class="profile-modal-loading" id="profile-modal-loading">
          <div class="profile-modal-spinner"></div>
          <p>Loading profile...</p>
        </div>

        <!-- Error State -->
        <div class="profile-modal-error" id="profile-modal-error" style="display: none;">
          <div class="profile-modal-error-icon">⚠️</div>
          <p class="profile-modal-error-text">Failed to load profile</p>
        </div>

        <!-- Profile Content -->
        <div class="profile-modal-content" id="profile-modal-content" style="display: none;">
          <!-- Avatar -->
          <div class="profile-modal-avatar-wrapper">
            <div class="profile-modal-avatar" id="profile-modal-avatar">
              <!-- Avatar will be injected here -->
            </div>
          </div>

          <!-- Username & Display Name -->
          <h2 class="profile-modal-username" id="profileModalTitle">Loading...</h2>
          <p class="profile-modal-handle" id="profile-modal-handle">@username</p>

          <!-- Bio -->
          <p class="profile-modal-bio" id="profile-modal-bio"></p>

          <!-- Location -->
          <div class="profile-modal-location" id="profile-modal-location" style="display: none;">
            <span>📍</span>
            <span id="profile-modal-location-text"></span>
          </div>

          <!-- Social Links -->
          <div class="profile-modal-social-links" id="profile-modal-social-links" style="display: none;">
            <a class="social-link twitter-link" id="social-twitter" href="#" target="_blank" rel="noopener" style="display: none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a class="social-link instagram-link" id="social-instagram" href="#" target="_blank" rel="noopener" style="display: none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a class="social-link linkedin-link" id="social-linkedin" href="#" target="_blank" rel="noopener" style="display: none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a class="social-link website-link" id="social-website" href="#" target="_blank" rel="noopener" style="display: none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 16.057v-3.057h2.994c-.059 1.143-.212 2.24-.456 3.279-.823-.12-1.674-.188-2.538-.222zm1.957 2.162c-.499 1.33-1.159 2.497-1.957 3.456v-3.62c.666.028 1.319.081 1.957.164zm-1.957-7.219v-3.015c.868-.034 1.721-.103 2.548-.224.238 1.027.389 2.111.446 3.239h-2.994zm0-5.014v-3.661c.806.969 1.471 2.15 1.971 3.496-.642.084-1.3.137-1.971.165zm2.703-3.267c1.237.496 2.354 1.228 3.29 2.146-.642.234-1.311.442-2.019.607-.344-.992-.775-1.91-1.271-2.753zm-7.241 13.56c-.244-1.039-.398-2.136-.456-3.279h2.994v3.057c-.865.034-1.714.102-2.538.222zm2.538 1.776v3.62c-.798-.959-1.458-2.126-1.957-3.456.638-.083 1.291-.136 1.957-.164zm-2.994-7.055c.057-1.128.207-2.212.446-3.239.827.121 1.68.19 2.548.224v3.015h-2.994zm1.024-5.179c.5-1.346 1.165-2.527 1.97-3.496v3.661c-.671-.028-1.329-.081-1.97-.165zm-2.005-.35c-.708-.165-1.377-.373-2.018-.607.937-.918 2.053-1.65 3.29-2.146-.496.844-.927 1.762-1.272 2.753zm-.549 1.918c-.264 1.151-.434 2.36-.492 3.611h-3.933c.165-1.658.739-3.197 1.617-4.518.88.361 1.816.67 2.808.907zm.009 9.262c-.988.236-1.92.542-2.797.9-.89-1.328-1.471-2.879-1.637-4.551h3.934c.058 1.265.231 2.488.5 3.651zm.553 1.917c.342.976.768 1.881 1.257 2.712-1.223-.49-2.326-1.211-3.256-2.115.636-.229 1.299-.435 1.999-.597zm9.924 0c.7.163 1.362.367 1.999.597-.931.903-2.034 1.625-3.257 2.116.489-.832.915-1.737 1.258-2.713zm.553-1.917c.27-1.163.442-2.386.501-3.651h3.934c-.167 1.672-.748 3.223-1.638 4.551-.877-.358-1.81-.664-2.797-.9zm.501-5.651c-.058-1.251-.229-2.46-.492-3.611.992-.237 1.929-.546 2.809-.907.877 1.321 1.451 2.86 1.616 4.518h-3.933z"/></svg>
            </a>
          </div>

          <!-- Divider -->
          <div class="profile-modal-divider"></div>

          <!-- Membership Tier -->
          <div class="profile-modal-stats">
            <div class="profile-modal-stat">
              <div class="profile-modal-stat-value" id="profile-modal-tier-icon">🌟</div>
              <div class="profile-modal-stat-label" id="profile-modal-tier-label">Member</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    
    // Store reference to root container
    this.root = container;
  }

  // Attach event listeners
  attachEventListeners() {
    const backdrop = this.root.querySelector('#profile-modal-backdrop');
    const closeBtn = this.root.querySelector('#profile-modal-close');

    // Close on backdrop click
    backdrop?.addEventListener('click', () => this.close());
    
    // Close on close button click
    closeBtn?.addEventListener('click', () => this.close());

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  // Open modal with user ID
  async open(userId) {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.currentUserId = userId;

    const modal = this.root.querySelector('#profile-preview-modal');
    const backdrop = this.root.querySelector('#profile-modal-backdrop');

    // Show modal and backdrop
    backdrop?.classList.add('active');
    modal?.classList.add('active');

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Load profile data
    await this.loadProfile(userId);
  }

  // Close modal
  close() {
    if (!this.isOpen) return;
    
    const modal = this.root.querySelector('#profile-preview-modal');
    const backdrop = this.root.querySelector('#profile-modal-backdrop');

    backdrop?.classList.remove('active');
    modal?.classList.remove('active');

    // Unlock body scroll
    document.body.style.overflow = '';

    // Reset state after animation completes
    setTimeout(() => {
      this.isOpen = false;
      this.currentUserId = null;
      this.showLoading();
    }, 400);
  }

  // Load profile data from database
  async loadProfile(userId) {
    this.showLoading();
    const startTime = performance.now();

    try {
      console.log('🔍 Loading profile for user:', userId);

      // 🚀 PERFORMANCE: Check cache first (instant response for repeat views)
      const cached = this.getCachedProfile(userId);
      if (cached) {
        console.log('⚡ Cache hit! Displaying cached profile in', (performance.now() - startTime).toFixed(0), 'ms');
        this.displayProfile(cached.profile, cached.isOwnProfile);
        return;
      }

      // 🚀 PERFORMANCE: Run both checks in PARALLEL instead of sequential
      // This cuts latency in half for most users
      // Use HiSupabase.getClient() which recreates client after BFCache clears it
      const supa = (typeof HiSupabase !== 'undefined' && HiSupabase.getClient) 
        ? HiSupabase.getClient() 
        : (window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb);
      if (!supa) throw new Error('Supabase client not available');

      // Get current user ID from session for quick local check
      let currentUserId = null;
      try {
        const session = await supa.auth.getSession();
        currentUserId = session?.data?.session?.user?.id;
      } catch (e) { /* ignore */ }

      // Quick local check - no RPC needed if we have current user
      const isOwnProfile = currentUserId && currentUserId === userId;
      console.log('🔍 Is own profile (local check):', isOwnProfile);

      // Fetch profile data
      let profile;
      if (isOwnProfile) {
        profile = await this.fetchOwnProfile();
      } else {
        profile = await this.fetchCommunityProfile(userId);
      }

      console.log('📦 Profile result:', profile);

      if (!profile) {
        console.error('❌ Profile not found for userId:', userId);
        throw new Error('Profile not found');
      }

      // 🚀 PERFORMANCE: Cache the result
      this.setCachedProfile(userId, profile, isOwnProfile);

      const elapsed = performance.now() - startTime;
      console.log(`✅ Profile loaded in ${elapsed.toFixed(0)}ms:`, {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        has_avatar: !!profile.avatar_url,
        is_own: isOwnProfile,
        has_bio: !!profile.bio
      });

      // Display profile data
      this.displayProfile(profile, isOwnProfile);

    } catch (error) {
      console.error('❌ Failed to load profile:', {
        error: error.message,
        userId,
        stack: error.stack
      });
      this.showError();
    }
  }

  // Display profile data in modal
  // isOwnProfile parameter used to determine privacy level of displayed data
  displayProfile(profile, isOwnProfile = false) {
    const content = this.root.querySelector('#profile-modal-content');
    const loading = this.root.querySelector('#profile-modal-loading');
    const error = this.root.querySelector('#profile-modal-error');

    // Hide loading/error, show content
    loading.style.display = 'none';
    error.style.display = 'none';
    content.style.display = 'flex';
    
    // 🔐 WARM PRIVACY: Limited public profile data only
    const hasRealProfile = profile.display_name || profile.username;
    const isAnonymousUser = !hasRealProfile;
    
    // Default profile data with intelligent fallbacks
    const displayName = profile.display_name || profile.username || (isAnonymousUser ? 'Hi Friend' : 'New Member');
    const handle = profile.username || (isAnonymousUser ? '@anonymous' : '@newmember');
    
    // 🔐 PRIVACY: Bio is now private - show warm public message instead
    const publicMessage = isAnonymousUser ? 
      'Anonymous member sharing wellness moments' :
      `Member since ${this.formatMemberSince(profile.member_since)}`;

    // Update avatar with anonymous handling
    const avatarContainer = this.root.querySelector('#profile-modal-avatar');
    if (window.AvatarUtils && avatarContainer) {
      avatarContainer.innerHTML = ''; // Clear existing
      
      const avatarElement = window.AvatarUtils.createAvatar({
        avatar_url: profile.avatar_url,
        display_name: displayName,
        username: profile.username,
        email: null
      }, {
        size: '96px',
        className: '',
        showInitials: true,
        isAnonymous: isAnonymousUser
      });
      
      if (avatarElement) {
        avatarContainer.appendChild(avatarElement);
      }
    }

    // Update username/display name with defaults
    const usernameEl = this.root.querySelector('#profileModalTitle');
    const handleEl = this.root.querySelector('#profile-modal-handle');
    
    if (usernameEl) {
      usernameEl.textContent = displayName;
    }
    
    if (handleEl) {
      handleEl.textContent = handle;
      handleEl.style.display = 'block';
      handleEl.style.opacity = isAnonymousUser ? '0.6' : '1';
    }

    // 🌟 BIO: Public - users want to show their personality!
    const bioEl = this.root.querySelector('#profile-modal-bio');
    const bioContainer = bioEl?.closest('.modal-stat');
    
    if (bioEl) {
      if (profile.bio && profile.bio.trim()) {
        // Has bio - show it with style
        bioEl.textContent = profile.bio;
        bioEl.style.fontStyle = 'normal';
        bioEl.style.opacity = '1';
      } else {
        // No bio - show friendly fallback
        bioEl.textContent = isAnonymousUser 
          ? 'Anonymous member sharing wellness moments'
          : `Member since ${this.formatMemberSince(profile.member_since)}`;
        bioEl.style.fontStyle = 'italic';
        bioEl.style.opacity = '0.7';
      }
      bioEl.style.display = 'block';
    }
    if (bioContainer) bioContainer.style.display = 'block';

    // 🔐 PRIVATE: Location only shown for own profile
    const locationContainer = this.root.querySelector('#profile-modal-location');
    
    if (isOwnProfile && profile.location !== undefined) {
      // OWN PROFILE: Show location (field exists in get_own_profile response)
      const locationEl = this.root.querySelector('#profile-modal-location-text');
      if (locationEl) {
        locationEl.textContent = profile.location || 'No location set';
      }
      if (locationContainer) locationContainer.style.display = 'block';
    } else {
      // COMMUNITY PROFILE: Location is private - hide completely
      if (locationContainer) locationContainer.style.display = 'none';
    }

    // � SOCIAL LINKS: Public - users want to share these!
    const socialLinksContainer = this.root.querySelector('#profile-modal-social-links');
    if (socialLinksContainer) {
      const twitterLink = this.root.querySelector('#social-twitter');
      const instagramLink = this.root.querySelector('#social-instagram');
      const linkedinLink = this.root.querySelector('#social-linkedin');
      const websiteLink = this.root.querySelector('#social-website');
      
      let hasSocialLinks = false;
      
      // Twitter/X
      if (profile.twitter_handle && twitterLink) {
        const handle = profile.twitter_handle.replace(/^@/, '');
        twitterLink.href = `https://x.com/${handle}`;
        twitterLink.title = `@${handle} on X`;
        twitterLink.style.display = 'flex';
        hasSocialLinks = true;
      } else if (twitterLink) {
        twitterLink.style.display = 'none';
      }
      
      // Instagram
      if (profile.instagram_handle && instagramLink) {
        const handle = profile.instagram_handle.replace(/^@/, '');
        instagramLink.href = `https://instagram.com/${handle}`;
        instagramLink.title = `@${handle} on Instagram`;
        instagramLink.style.display = 'flex';
        hasSocialLinks = true;
      } else if (instagramLink) {
        instagramLink.style.display = 'none';
      }
      
      // LinkedIn
      if (profile.linkedin_url && linkedinLink) {
        linkedinLink.href = profile.linkedin_url;
        linkedinLink.title = 'LinkedIn Profile';
        linkedinLink.style.display = 'flex';
        hasSocialLinks = true;
      } else if (linkedinLink) {
        linkedinLink.style.display = 'none';
      }
      
      // Website
      if (profile.website_url && websiteLink) {
        websiteLink.href = profile.website_url;
        websiteLink.title = profile.website_url;
        websiteLink.style.display = 'flex';
        hasSocialLinks = true;
      } else if (websiteLink) {
        websiteLink.style.display = 'none';
      }
      
      // Show container only if at least one social link exists
      socialLinksContainer.style.display = hasSocialLinks ? 'flex' : 'none';
    }

    // �🎯 JOURNEY LEVEL: Show tier as progression badge (not financial status)
    const tierLabelEl = this.root.querySelector('#profile-modal-tier-label');
    const tierIconEl = this.root.querySelector('#profile-modal-tier-icon');
    
    if (tierLabelEl && tierIconEl) {
      // 🔥 GOLD STANDARD: Journey Level mapping (matches TIER_CONFIG.js branding)
      const journeyLabels = {
        // Free tier
        'free': 'Hi Pathfinder',
        // Paid tiers (legacy + current)
        'bronze': 'Hi Pathfinder',      // Trial users
        'silver': 'Hi Trailblazer',
        'gold': 'Hi Trailblazer',
        'collective': 'Hi Collective',   // Community tier
        'platinum': 'Hi Legend',
        'premium': 'Hi Legend',          // Current premium tier
        'diamond': 'Hi Legend'
      };
      
      const journeyIcons = {
        'free': '🧭',
        'bronze': '🧭',
        'silver': '⭐',
        'gold': '⭐',
        'collective': '🤝',              // Community icon
        'platinum': '💎',
        'premium': '💎',
        'diamond': '💎'
      };
      
      // Use journey_level from RPC (community) or tier (own profile)
      const level = (profile.journey_level || profile.tier || 'free').toLowerCase();
      const journeyLabel = journeyLabels[level] || 'Hi Pathfinder';
      const journeyIcon = journeyIcons[level] || '🧭';
      
      tierLabelEl.textContent = journeyLabel;
      tierIconEl.textContent = journeyIcon;
    }
    
    // Show public wellness stats (Warm Privacy model)
    const statsContainer = this.root.querySelector('.profile-modal-stats');
    if (statsContainer) {
      // Remove any existing dynamic stats first
      statsContainer.querySelectorAll('.waves-stat, .active-stat').forEach(el => el.remove());
      
      // Always show total waves (even if 0 - shows engagement level)
      if (profile.total_waves !== undefined) {
        const wavesStat = document.createElement('div');
        wavesStat.className = 'profile-modal-stat waves-stat';
        wavesStat.innerHTML = `
          <div class="profile-modal-stat-value">👋</div>
          <div class="profile-modal-stat-label">${profile.total_waves || 0} waves sent</div>
        `;
        statsContainer.appendChild(wavesStat);
      }
      
      // Show "Active Today" indicator (public engagement signal)
      if (profile.active_today) {
        const activeStat = document.createElement('div');
        activeStat.className = 'profile-modal-stat active-stat';
        activeStat.innerHTML = `
          <div class="profile-modal-stat-value">✨</div>
          <div class="profile-modal-stat-label">Active today</div>
        `;
        statsContainer.appendChild(activeStat);
      }
    }
  }

  // Show loading state
  showLoading() {
    const content = this.root?.querySelector('#profile-modal-content');
    const loading = this.root?.querySelector('#profile-modal-loading');
    const error = this.root?.querySelector('#profile-modal-error');

    if (content) content.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
  }

  // � PERFORMANCE: Cache management for instant repeat views
  getCachedProfile(userId) {
    const cached = this.profileCache.get(userId);
    if (!cached) return null;
    
    // Check TTL
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.profileCache.delete(userId);
      return null;
    }
    
    return cached;
  }
  
  setCachedProfile(userId, profile, isOwnProfile) {
    this.profileCache.set(userId, {
      profile,
      isOwnProfile,
      timestamp: Date.now()
    });
    
    // Limit cache size to 50 profiles
    if (this.profileCache.size > 50) {
      const oldestKey = this.profileCache.keys().next().value;
      this.profileCache.delete(oldestKey);
    }
  }

  // 🔐 Check if viewing own profile (uses RPC helper)
  async checkIsOwnProfile(userId) {
    try {
      const supa = (typeof HiSupabase !== 'undefined' && HiSupabase.getClient) 
        ? HiSupabase.getClient() 
        : (window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb);
      if (!supa) return false;

      const { data, error } = await supa.rpc('is_viewing_own_profile', {
        target_user_id: userId
      });

      if (error) {
        console.error('❌ is_viewing_own_profile error:', error);
        return false;
      }

      return data || false;
    } catch (err) {
      console.error('❌ Failed to check own profile:', err);
      return false;
    }
  }

  // 🔓 Fetch OWN profile (full data - includes bio, location, stats)
  async fetchOwnProfile() {
    try {
      const supa = (typeof HiSupabase !== 'undefined' && HiSupabase.getClient) 
        ? HiSupabase.getClient() 
        : (window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb);
      if (!supa) {
        throw new Error('Supabase client not available');
      }

      console.log('🔍 Fetching OWN profile (full data)');

      const { data, error } = await supa.rpc('get_own_profile');

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No profile data returned');
        return null;
      }

      const profile = data[0];
      
      console.log('✅ Own profile fetched (FULL DATA):', {
        id: profile.id,
        username: profile.username,
        has_bio: !!profile.bio,
        has_location: !!profile.location,
        tier: profile.tier,
        active_today: profile.active_today,
        total_waves: profile.total_waves,
        points_balance: profile.points_balance
      });

      return profile;
    } catch (error) {
      console.error('❌ Failed to fetch own profile:', error);
      throw error;
    }
  }

  // 🌟 Fetch community profile (public data including bio - location is private)
  async fetchCommunityProfile(userId) {
    try {
      // Get Supabase client using HiSupabase.getClient() which recreates after BFCache
      const supa = (typeof HiSupabase !== 'undefined' && HiSupabase.getClient) 
        ? HiSupabase.getClient() 
        : (window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb);
      if (!supa) {
        console.error('❌ Supabase client not available (even after HiSupabase.getClient())');
        throw new Error('Supabase client not available');
      }

      console.log('🔍 Fetching community profile for:', userId);

      // Use the secure RPC function that only returns public info
      const { data, error } = await supa.rpc('get_community_profile', {
        target_user_id: userId
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No profile data returned for userId:', userId);
        return null;
      }

      const profile = data[0]; // RPC returns array
      
      console.log('✅ Community profile fetched:', {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        has_avatar: !!profile.avatar_url,
        has_bio: !!profile.bio,           // 🔓 Bio is PUBLIC (the flex!)
        journey_level: profile.journey_level,
        active_today: profile.active_today,
        total_waves: profile.total_waves,
        member_since: profile.member_since
      });

      return profile;

    } catch (error) {
      console.error('❌ Failed to fetch community profile:', error);
      return null;
    }
  }

  // Show error state
  showError() {
    const content = this.root?.querySelector('#profile-modal-content');
    const loading = this.root?.querySelector('#profile-modal-loading');
    const error = this.root?.querySelector('#profile-modal-error');

    if (content) content.style.display = 'none';
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'flex';
  }
  
  // Format member since date (e.g., "November 2024", "Jan 2025")
  formatMemberSince(dateString) {
    if (!dateString) return 'Recently';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
      
      // Gold Standard: Always show month + year (no "Recently")
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      
      // Less than 2 months: "December 2025"
      if (monthsAgo < 2) {
        const fullMonth = date.toLocaleDateString('en-US', { month: 'long' });
        return `${fullMonth} ${year}`;
      }
      
      // 2+ months: "Oct 2024" (abbreviated)
      return `${month} ${year}`;
    } catch (e) {
      return 'Recently';
    }
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
    // Only initialize on Hi Island page
    const isHiIsland = document.body.dataset.page === 'hi-island' || 
                       window.location.pathname.includes('hi-island');
    
    if (isHiIsland) {
      window.profilePreviewModal = new ProfilePreviewModal();
      window.profilePreviewModal.init();
      console.log('✅ Profile Preview Modal initialized');
    }
  }
})();
