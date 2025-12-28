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
      // Check if hiDB is available
      if (!window.hiDB || !window.hiDB.fetchUserProfile) {
        console.error('❌ hiDB not available:', {
          hiDB: !!window.hiDB,
          fetchUserProfile: window.hiDB?.fetchUserProfile
        });
        throw new Error('Profile service not available');
      }

      console.log('🔍 Loading profile for user:', userId);

      // Tesla UX-Preserving: Fetch limited community profile data (username, display_name, avatar only)
      const profile = await this.fetchCommunityProfile(userId);

      console.log('📦 Profile result:', profile);

      if (!profile) {
        console.error('❌ Profile not found for userId:', userId);
        throw new Error('Profile not found');
      }

      console.log('✅ Profile loaded successfully:', {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        has_avatar: !!profile.avatar_url
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
    
    // 🌟 TESLA-GRADE: Smart profile defaults for incomplete profiles
    const hasRealProfile = profile.display_name || profile.username || profile.bio;
    const isAnonymousUser = !hasRealProfile;
    
    // Default profile data with intelligent fallbacks
    const displayName = profile.display_name || profile.username || (isAnonymousUser ? 'Hi Friend' : 'New Member');
    const handle = profile.username || (isAnonymousUser ? '@anonymous' : '@newmember');
    const bio = profile.bio || (isAnonymousUser ? 
      'This user shares anonymously. You can see their public interactions but not personal details.' :
      'New to Stay Hi! This member hasn\'t added a bio yet.');

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

    // Update bio with intelligent defaults
    const bioEl = this.root.querySelector('#profile-modal-bio');
    if (bioEl) {
      bioEl.textContent = bio;
      bioEl.style.display = 'block';
      bioEl.style.opacity = (profile.bio && profile.bio.trim()) ? '1' : '0.7';
      bioEl.style.fontStyle = (profile.bio && profile.bio.trim()) ? 'normal' : 'italic';
    }

    // Update location
    const locationContainer = this.root.querySelector('#profile-modal-location');
    const locationText = this.root.querySelector('#profile-modal-location-text');
    
    if (locationContainer && locationText) {
      if (profile.location && profile.location.trim()) {
        locationText.textContent = profile.location;
        locationContainer.style.display = 'flex';
      } else {
        locationContainer.style.display = 'none';
      }
    }

    // Update tier display with branded labels
    const tierLabelEl = this.root.querySelector('#profile-modal-tier-label');
    const tierIconEl = this.root.querySelector('#profile-modal-tier-icon');
    
    if (tierLabelEl && profile.tier) {
      // Branded tier labels with emojis
      const tierLabels = {
        'free': 'Free Member',
        'bronze': 'Hi Pathfinder',
        'silver': 'Hi Explorer',
        'gold': 'Hi Trailblazer',
        'platinum': 'Hi Legend',
        'premium': 'Hi Pioneer',
        'diamond': 'Hi Icon'
      };
      
      const tierIcons = {
        'free': '🌟',
        'bronze': '🧭',
        'silver': '🗺️',
        'gold': '⭐',
        'platinum': '💎',
        'premium': '🔥',
        'diamond': '👑'
      };
      
      const brandedLabel = tierLabels[profile.tier] || 'Member';
      const tierIcon = tierIcons[profile.tier] || '🌟';
      
      tierLabelEl.textContent = brandedLabel;
      if (tierIconEl) {
        tierIconEl.textContent = tierIcon;
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

  // Tesla UX-Preserving: Fetch community profile (username, display_name, avatar, bio - safe public data only)
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

      // Use the secure RPC function that only returns basic info
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
        has_bio: !!profile.bio,
        tier: profile.tier
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
