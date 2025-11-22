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
      
      // Initialize the feed with proper container
      this.feedInstance = new window.HiIslandRealFeed();
      
      // Override the render method to use our container
      this.patchFeedForHiIsland();
      
      // Initialize the feed
      await this.feedInstance.init();
      
      this.isInitialized = true;
      console.log('✅ Unified Controller: Feed system ready');
      
    } catch (error) {
      console.error('❌ Unified Controller initialization failed:', error);
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
            <div id="generalFeed" class="hi-feed-container">
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading community shares...</p>
              </div>
            </div>
          </div>
          
          <!-- Archives Tab -->
          <div id="archivesTab" class="hi-feed-tab-content">
            <div class="tab-header">
              <h3>My Hi Archives</h3>
              <p>Your personal Hi moments and memories</p>
            </div>
            <div id="archivesFeed" class="hi-feed-container">
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
    console.log('🎉 Unified Hi-Island Controller ready!');
  } catch (error) {
    console.error('❌ Unified Controller auto-init failed:', error);
  }
});

export default UnifiedHiIslandController;