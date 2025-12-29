/* ===================================================================
   👤 PROFILE PREVIEW MODAL - Tesla-Grade User Profile Viewer
   Floating sheet modal for viewing user profiles from Hi Island
   Features: Avatar, username, bio, location, smooth transitions
=================================================================== */

export class ProfilePreviewModal {
  constructor() {
    this.isOpen = false;
    this.currentUserId = null;
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

    try {
      console.log('🔍 Loading profile for user:', userId);

      // 🔐 GOLD STANDARD: Check if viewing own profile vs someone else's
      const isOwnProfile = await this.checkIsOwnProfile(userId);
      console.log('🔍 Is own profile:', isOwnProfile);

      // Fetch appropriate profile data based on viewer
      const profile = isOwnProfile 
        ? await this.fetchOwnProfile()  // Full data (includes bio, location, stats)
        : await this.fetchCommunityProfile(userId);  // Public data only

      console.log('📦 Profile result:', profile);

      if (!profile) {
        console.error('❌ Profile not found for userId:', userId);
        throw new Error('Profile not found');
      }

      console.log('✅ Profile loaded successfully:', {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        has_avatar: !!profile.avatar_url,
        is_own: isOwnProfile,
        has_bio: !!profile.bio
      });

      // Display profile data
      this.displayProfile(profile);

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
  displayProfile(profile) {
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

    // 🔐 WARM PRIVACY: Bio display logic
    const bioEl = this.root.querySelector('#profile-modal-bio');
    const bioContainer = bioEl?.closest('.modal-stat');
    
    if (profile.bio !== undefined) {
      // OWN PROFILE: Show full bio (field exists in get_own_profile response)
      if (bioEl) {
        if (profile.bio && profile.bio.trim()) {
          bioEl.textContent = profile.bio;
          bioEl.style.fontStyle = 'normal';
          bioEl.style.opacity = '1';
        } else {
          bioEl.textContent = 'No bio yet';
          bioEl.style.fontStyle = 'italic';
          bioEl.style.opacity = '0.6';
        }
        bioEl.style.display = 'block';
      }
      if (bioContainer) bioContainer.style.display = 'block';
    } else {
      // COMMUNITY PROFILE: Bio is private - show public message instead
      if (bioEl) {
        bioEl.textContent = publicMessage;
        bioEl.style.display = 'block';
        bioEl.style.opacity = '0.8';
        bioEl.style.fontStyle = 'normal';
      }
    }

    // 🔐 WARM PRIVACY: Location logic
    const locationContainer = this.root.querySelector('#profile-modal-location');
    
    if (profile.location !== undefined) {
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

    // 🎯 JOURNEY LEVEL: Show tier as progression badge (not financial status)
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
        'platinum': 'Hi Legend',
        'premium': 'Hi Legend',          // Current premium tier
        'diamond': 'Hi Legend'
      };
      
      const journeyIcons = {
        'free': '🧭',
        'bronze': '🧭',
        'silver': '⭐',
        'gold': '⭐',
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

  // 🔐 Check if viewing own profile (uses RPC helper)
  async checkIsOwnProfile(userId) {
    try {
      const supa = window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb;
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
      const supa = window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb;
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

  // 🔐 Fetch community profile (public data only - NO bio, NO location)
  async fetchCommunityProfile(userId) {
    try {
      // Get Supabase client (Tesla-grade compatibility with all possible aliases)
      const supa = window.__HI_SUPABASE_CLIENT || window.hiSupabase || window.supabaseClient || window.sb;
      if (!supa) {
        console.error('❌ Supabase client not available:', {
          __HI_SUPABASE_CLIENT: !!window.__HI_SUPABASE_CLIENT,
          hiSupabase: !!window.hiSupabase,
          supabaseClient: !!window.supabaseClient,
          sb: !!window.sb
        });
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
      
      console.log('✅ Community profile fetched (PUBLIC DATA ONLY):', {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        has_avatar: !!profile.avatar_url,
        journey_level: profile.journey_level,
        active_today: profile.active_today,
        total_waves: profile.total_waves,
        member_since: profile.member_since,
        has_bio: false  // Never included in community view
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
