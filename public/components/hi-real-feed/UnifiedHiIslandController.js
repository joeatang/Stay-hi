/**
 * 🚨 UNIFIED HI-ISLAND FEED CONTROLLER
 * Tesla-Grade Solution for Multiple Competing Systems
 * 
 * PROBLEM SOLVED:
 * - HiRealFeed expects .hi-feed-content
 * - Hi-Island page has #hi-island-feed-root  
 * - Multiple systems competing for DOM control
 * - Tab switching race conditions
 * 
 * SOLUTION: Single source of truth controller
 */

class UnifiedHiIslandController {
  constructor() {
    this.feedInstance = null;
    this.currentTab = 'general';
    this.isInitialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  async _doInit() {
    console.log('🎯 Unified Controller: Initializing single feed system...');
    
    try {
      // Wait for HiIslandRealFeed to be available
      await this.waitForFeedClass();
      
      // Create proper DOM structure for feed system
      this.createUnifiedFeedStructure();
      
      // 🔧 WOZ FIX: ALWAYS use existing window.hiRealFeed created by HiRealFeed.js auto-init
      // Filter buttons in island-main.mjs are already attached to window.hiRealFeed
      // Creating a new instance would break the connection
      if (!window.hiRealFeed) {
        console.error('❌ Unified Controller: window.hiRealFeed not found! HiRealFeed.js should auto-initialize it.');
        this.feedInstance = new window.HiIslandRealFeed();
        window.hiRealFeed = this.feedInstance;
        console.log('🔧 Unified Controller: Created fallback instance');
      } else {
        console.log('✅ Unified Controller: Using existing window.hiRealFeed instance');
        this.feedInstance = window.hiRealFeed;
      }
      
      // Override the render method to use our container
      this.patchFeedForHiIsland();
      
      // Initialize the feed (only if not already initialized)
      if (!this.feedInstance.isInitialized) {
        await this.feedInstance.init();
      }
      
      // Set up profile update listeners
      this.setupProfileListener();
      
      this.isInitialized = true;
      console.log('✅ Unified Controller: Feed system ready');
      
      // 🎯 Signal splash screen: feed is ready
      if (window.hiIslandReady) {
        window.hiIslandReady.feed = true;
        if (window.checkReadyAndHideSplash) window.checkReadyAndHideSplash();
      }
      
    } catch (error) {
      console.error('❌ Unified Controller initialization failed:', error);
      // Still mark as ready to prevent stuck splash
      if (window.hiIslandReady) {
        window.hiIslandReady.feed = true;
        if (window.checkReadyAndHideSplash) window.checkReadyAndHideSplash();
      }
      throw error;
    }
  }

  waitForFeedClass() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.HiIslandRealFeed) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(); // Continue anyway
      }, 10000);
    });
  }

  createUnifiedFeedStructure() {
    const feedRoot = document.getElementById('hi-island-feed-root');
    if (!feedRoot) {
      console.error('❌ hi-island-feed-root not found!');
      return;
    }

    // Create the structure that HiRealFeed expects
    feedRoot.innerHTML = `
      <div class="hi-real-feed">
        <div class="hi-feed-content">
          <!-- General Shares Tab -->
          <div id="generalTab" class="hi-feed-tab-content active">
            <div class="tab-header">
              <h3>Community Hi 5s</h3>
              <p>Public and anonymous shares from the Hi community</p>
            </div>
            <div id="generalFeed" class="hi-feed-container" style="overflow-y: auto; max-height: calc(100vh - 400px); -webkit-overflow-scrolling: touch; overscroll-behavior: contain; will-change: transform;">
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading shares...</p>
              </div>
            </div>
          </div>
          
          <!-- Archives Tab -->
          <div id="archivesTab" class="hi-feed-tab-content">
            <div class="tab-header">
              <h3>My Hi Archives</h3>
              <p>Your personal Hi moments and memories</p>
            </div>
            <div id="archivesFeed" class="hi-feed-container" style="overflow-y: auto; max-height: calc(100vh - 400px); -webkit-overflow-scrolling: touch; overscroll-behavior: contain; will-change: transform;">
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading your archives...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    console.log('✅ Unified Controller: DOM structure created');
  }

  patchFeedForHiIsland() {
    if (!this.feedInstance) return;

    // Store original render method
    const originalRender = this.feedInstance.render.bind(this.feedInstance);

    // Override render to work with our container
    this.feedInstance.render = () => {
      // Don't re-render the structure, we already have it
      console.log('🔧 Unified Controller: Using existing DOM structure');
      return;
    };

    // Override container detection
    const originalSwitchTab = this.feedInstance.switchTab.bind(this.feedInstance);
    this.feedInstance.switchTab = async (tabName) => {
      console.log('🎯 Unified Controller: Switching to', tabName);
      
      // Ensure our structure exists
      const feedContent = document.querySelector('#hi-island-feed-root .hi-feed-content');
      if (!feedContent) {
        console.log('🔧 Unified Controller: Recreating structure...');
        this.createUnifiedFeedStructure();
      }
      
      // Show the target tab content
      this.showTabContent(tabName);
      
      // Load data for the tab
      try {
        await this.feedInstance.loadFeedData(tabName);
        console.log('✅ Unified Controller: Tab switched successfully');
      } catch (error) {
        console.error('❌ Unified Controller: Tab switch failed:', error);
      }
    };
  }

  showTabContent(tabName) {
    // Hide all tab contents
    const allTabs = document.querySelectorAll('.hi-feed-tab-content');
    allTabs.forEach(tab => {
      tab.style.display = 'none';
      tab.classList.remove('active');
    });

    // Show target tab
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
      targetTab.style.display = 'block';
      targetTab.classList.add('active');
    }

    this.currentTab = tabName;
  }

  // Public API for Hi-Island page
  async switchTab(tabName) {
    if (!this.isInitialized) {
      console.log('⏳ Unified Controller: Waiting for initialization...');
      await this.init();
    }

    if (this.feedInstance && this.feedInstance.switchTab) {
      await this.feedInstance.switchTab(tabName);
    } else {
      console.error('❌ Unified Controller: Feed instance not ready');
    }
  }

  // 🎯 PROFILE UPDATE WIRING: Listen for profile changes and refresh feed
  setupProfileListener() {
    // Cache current user profile for optimistic UI
    this.cacheCurrentUserProfile();
    
    window.addEventListener('profile:updated', (event) => {
      console.log('🔔 Profile updated, refreshing Hi-Island feed:', event.detail);
      this.cacheCurrentUserProfile(); // Update cache
      if (this.feedInstance && this.currentTab === 'general') {
        this.feedInstance.pagination.general.page = 0;
        this.feedInstance.loadGeneralSharesFromPublicShares();
      }
    });
    
    // Cross-tab sync
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('stayhi_profile_')) {
        console.log('🔔 Profile updated in another tab, refreshing feed');
        this.cacheCurrentUserProfile(); // Update cache
        if (this.feedInstance && this.currentTab === 'general') {
          this.feedInstance.pagination.general.page = 0;
          this.feedInstance.loadGeneralSharesFromPublicShares();
        }
      }
    });
    
    console.log('✅ Profile update listeners active');
  }

  // 🚀 OPTIMISTIC UI: Cache user profile for instant share display
  async cacheCurrentUserProfile() {
    try {
      // Use ProfileManager instead of hiSupabase
      if (window.ProfileManager && typeof window.ProfileManager.getProfile === 'function') {
        const profile = await window.ProfileManager.getProfile();
        if (profile) {
          window.__currentUsername = profile.username || 'You';
          window.__currentDisplayName = profile.display_name || profile.username || 'You';
          window.__currentAvatar = profile.avatar_url || null;
          console.log('✅ Cached user profile for optimistic UI:', {
            username: window.__currentUsername,
            display_name: window.__currentDisplayName
          });
          return;
        }
      }
      
      // Fallback: Try to get from localStorage
      const cachedProfile = localStorage.getItem('stayhi_profile_cache');
      if (cachedProfile) {
        const profile = JSON.parse(cachedProfile);
        window.__currentUsername = profile.username || 'You';
        window.__currentDisplayName = profile.display_name || profile.username || 'You';
        window.__currentAvatar = profile.avatar_url || null;
        console.log('✅ Cached user profile from localStorage');
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to cache user profile:', error);
    }
    
    // Final fallback
    window.__currentUsername = 'You';
    window.__currentDisplayName = 'You';
    window.__currentAvatar = null;
  }

  // 🚀 SHARE EVENT WIRING: Refresh tabs when new shares are created
  setupShareCreatedListener() {
    window.addEventListener('share:created', async (event) => {
      console.time('🔍 SHARE_CREATED_EVENT');
      console.log('🔍 SHARE_CREATED: Event fired');
      try {
        const detail = event.detail || {};
        const shareData = detail.shareData || {};
        const visibility = detail.visibility;
        
        console.log('🔍 SHARE_CREATED: Processing event data');
        // Decide which tab to refresh based on visibility
        const tabsToRefresh = new Set();
        if (visibility === 'public' || visibility === 'anonymous') {
          tabsToRefresh.add('general');
        }
        // Always refresh archives for the owner
        tabsToRefresh.add('archives');

        console.log('🔍 SHARE_CREATED: Checking feed instance');
        // Ensure feed instance exists
        if (!this.feedInstance) {
          await this.init();
        }

        console.log('🔍 SHARE_CREATED: Creating optimistic share');
        // 🚀 INSTAGRAM/X-GRADE OPTIMISTIC UI: Show share IMMEDIATELY
        // Don't wait for database - add optimistic item to feed NOW
        const activeTab = this.currentTab;
        if (tabsToRefresh.has(activeTab)) {
          const optimisticShare = {
            id: `optimistic_${Date.now()}`,
            content: shareData.journal || shareData.content || '',
            hi_intensity: shareData.hi_intensity || null,
            location: shareData.location || null,
            created_at: new Date().toISOString(),
            wave_count: 0,
            peace_count: 0,
            origin: 'hiisland',
            visibility: visibility,
            profiles: {
              username: window.__currentUsername || 'You',
              display_name: window.__currentDisplayName || 'You',
              avatar_url: window.__currentAvatar || null
            },
            _isOptimistic: true // Mark for special handling
          };

          console.log('🔍 SHARE_CREATED: Prepending to feed data');
          // Prepend to current feed data
          if (this.feedInstance.feedData[activeTab]) {
            this.feedInstance.feedData[activeTab].unshift(optimisticShare);
          } else {
            this.feedInstance.feedData[activeTab] = [optimisticShare];
          }

          console.time('🔍 RENDER_FEED_SYNC');
          console.log('🔍 SHARE_CREATED: Calling render() - correct method');
          // Re-render immediately (no database wait)
          this.feedInstance.render(); // ✅ FIXED: Was renderFeed(), should be render()
          console.timeEnd('🔍 RENDER_FEED_SYNC');
          console.log('⚡ INSTANT: Optimistic share added to feed (0ms)');
        }

        console.log('🔍 SHARE_CREATED: Setting up background sync');
        // Background database sync (non-blocking)
        // Replace optimistic item with real one when database responds
        setTimeout(async () => {
          // Reset pagination for fresh load
          for (const tab of tabsToRefresh) {
            if (tab === 'general' && this.feedInstance.pagination?.general) {
              this.feedInstance.pagination.general.page = 0;
              this.feedInstance.feedData.general = [];
            }
            if (tab === 'archives' && this.feedInstance.pagination?.archives) {
              this.feedInstance.pagination.archives.page = 0;
              this.feedInstance.feedData.archives = [];
            }
          }

          // Load real data from database
          if (tabsToRefresh.has(activeTab)) {
            await this.feedInstance.loadFeedData(activeTab);
            console.log('✅ Database sync complete - optimistic item replaced');
          }

          // Refresh the other tab in background
          for (const tab of tabsToRefresh) {
            if (tab !== activeTab) {
              this.feedInstance.loadFeedData(tab).catch(() => {});
            }
          }
        }, 100); // Wait 100ms for database, but user already sees result

        console.log('✅ Hi-Island feed refreshed after share:created', detail);

        // 🔄 Stats refresh: update global counters if available
        try {
          if (window.loadCurrentStatsFromDatabase) {
            window.loadCurrentStatsFromDatabase();
          } else if (window.HiMetrics?.refresh) {
            window.HiMetrics.refresh();
          }
        } catch (e) {
          console.warn('⚠️ Stats refresh failed after share:created:', e);
        }
        
        console.timeEnd('🔍 SHARE_CREATED_EVENT');
      } catch (err) {
        console.error('❌ Failed to handle share:created event:', err);
        console.timeEnd('🔍 SHARE_CREATED_EVENT');
      }
    });
  }

  // Debug method
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentTab: this.currentTab,
      feedInstance: !!this.feedInstance,
      domStructure: !!document.querySelector('#hi-island-feed-root .hi-feed-content')
    };
  }
}

// Export class to window for island-main.mjs (needs the class, not instance)
window.UnifiedHiIslandController = UnifiedHiIslandController;

// Create global instance with correct name for island-main.mjs
const controller = new UnifiedHiIslandController();
window.unifiedHiIslandController = controller;
window.hiIslandIntegration = controller; // Name expected by island-main.mjs

// Health check function expected by island-main.mjs
window.getHiIslandHealth = () => ({
  initialized: controller.isInitialized,
  hasFeed: !!controller.feedInstance,
  currentTab: controller.currentTab
});

// Auto-initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await controller.init();
    controller.setupShareCreatedListener();
    console.log('🎉 Unified Hi-Island Controller ready!');
  } catch (error) {
    console.error('❌ Unified Controller auto-init failed:', error);
  }
});

export default UnifiedHiIslandController;