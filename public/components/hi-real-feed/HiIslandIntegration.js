/**
 * 🏝️ Hi-Island Page Integration: REAL Database Solution
 * 
 * EVIDENCE-BASED INTEGRATION:
 * This integrates the corrected Hi-Island feed system that uses ACTUAL database tables:
 * - public_shares table (for community shares)
 * - hi_archives table (for user's personal archives)
 * 
 * VERIFIED DATA FLOW:
 * 1. HiShareSheet submissions → hiDB → public_shares + hi_archives
 * 2. Hi-Island feed reads from SAME tables where data is actually stored
 * 3. Stats tracking via increment_total_hi() function on public_shares.total_his
 * 
 * DEPLOYMENT READY: This file can be directly included in hi-island.html
 */

class HiIslandIntegration {
  constructor() {
    this.feedSystem = null;
    this.initialized = false;
  }

  // Main initialization method for Hi-Island page
  async init() {
    console.log('🏝️ Starting Hi-Island REAL integration...');
    
    try {
      // Wait for dependencies
      await this.waitForDependencies();
      
      // Create feed container if it doesn't exist
      this.createFeedContainer();
      
      // Initialize the REAL feed system
      await this.initializeFeedSystem();
      
      // Set up real-time updates
      this.setupRealTimeUpdates();
      
      console.log('✅ Hi-Island REAL integration complete');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Hi-Island REAL integration failed:', error);
    }
  }

  // Wait for required dependencies to be available
  async waitForDependencies() {
    const maxAttempts = 50; // 5 seconds max wait
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      // Check for Supabase client
      const supabase = window.getSupabase?.() || window.supabaseClient || 
                      window.sb || window.HiSupabase?.getClient?.() || 
                      window.__HI_SUPABASE_CLIENT;
      
      // Check for HiIslandRealFeed class
      const feedClass = window.HiIslandRealFeed;
      
      if (supabase && feedClass) {
        console.log('✅ Dependencies ready: Supabase + HiIslandRealFeed');
        return;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Required dependencies not available (Supabase or HiIslandRealFeed)');
  }

  // Create the feed container in Hi-Island page
  createFeedContainer() {
    let container = document.getElementById('hi-island-feed-root');
    
    if (!container) {
      // Find the best place to insert the feed
      const targetSelectors = [
        '.hi-island-content',
        '.main-content', 
        '#hi-island-main',
        '.page-content',
        'main',
        'body'
      ];
      
      let targetElement = null;
      for (const selector of targetSelectors) {
        targetElement = document.querySelector(selector);
        if (targetElement) break;
      }
      
      if (!targetElement) {
        console.warn('⚠️ No suitable container found, creating in body');
        targetElement = document.body;
      }
      
      // Create the container
      container = document.createElement('div');
      container.id = 'hi-island-feed-root';
      container.className = 'hi-island-feed-container';
      
      // Add container styles
      container.style.cssText = `
        width: 100%;
        max-width: 800px;
        margin: 20px auto;
        padding: 0 20px;
      `;
      
      targetElement.appendChild(container);
      console.log('📦 Created Hi-Island feed container');
    }
  }

  // Initialize the REAL feed system
  async initializeFeedSystem() {
    if (!window.HiIslandRealFeed) {
      throw new Error('HiIslandRealFeed class not available');
    }
    
    this.feedSystem = new window.HiIslandRealFeed();
    await this.feedSystem.init();
    
    // Make it globally accessible for debugging
    window.hiIslandFeedSystem = this.feedSystem;
    
    console.log('✅ Hi-Island REAL feed system initialized');
  }

  // Set up real-time updates when new shares are submitted
  setupRealTimeUpdates() {
    const supabase = this.getSupabase();
    if (!supabase) {
      console.warn('⚠️ No Supabase client for real-time updates');
      return;
    }

    try {
      // Listen for new public shares
      const publicSharesSubscription = supabase
        .channel('public_shares_changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'public_shares' 
          },
          (payload) => {
            console.log('🔔 New public share detected:', payload.new);
            this.handleNewPublicShare(payload.new);
          }
        )
        .subscribe();

      // Listen for new archive entries (user-specific)
      if (this.feedSystem?.currentUserId) {
        const archivesSubscription = supabase
          .channel('hi_archives_changes')
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public', 
              table: 'hi_archives',
              filter: `user_id=eq.${this.feedSystem.currentUserId}`
            },
            (payload) => {
              console.log('🔔 New archive entry detected:', payload.new);
              this.handleNewArchiveEntry(payload.new);
            }
          )
          .subscribe();
      }

      console.log('✅ Real-time subscriptions active');
      
    } catch (error) {
      console.warn('⚠️ Could not set up real-time updates:', error);
    }
  }

  // Handle new public share in real-time
  handleNewPublicShare(shareData) {
    if (!this.feedSystem || !shareData) return;
    
    try {
      // Only refresh if user is currently viewing general tab
      if (this.feedSystem.currentTab === 'general') {
        console.log('🔄 Refreshing general feed for new share');
        this.feedSystem.pagination.general.page = 0; // Reset pagination
        this.feedSystem.loadGeneralSharesFromPublicShares();
      }
      
      // Update stats counter if available
      this.updateStatsCounter();
      
    } catch (error) {
      console.error('❌ Error handling new public share:', error);
    }
  }

  // Handle new archive entry in real-time  
  handleNewArchiveEntry(archiveData) {
    if (!this.feedSystem || !archiveData) return;
    
    try {
      // Only refresh if user is currently viewing archives tab
      if (this.feedSystem.currentTab === 'archives') {
        console.log('🔄 Refreshing archives feed for new entry');
        this.feedSystem.pagination.archives.page = 0; // Reset pagination
        this.feedSystem.loadUserArchivesFromHiArchives();
      }
      
    } catch (error) {
      console.error('❌ Error handling new archive entry:', error);
    }
  }

  // Update the global stats counter
  async updateStatsCounter() {
    try {
      const supabase = this.getSupabase();
      if (!supabase) return;
      
      // Call the REAL increment_total_hi function to get updated count
      const { data, error } = await supabase.rpc('increment_total_hi');
      
      if (error) {
        console.warn('⚠️ Could not update stats counter:', error);
        return;
      }
      
      // Update any stats display elements on the page
      const statsElements = document.querySelectorAll('.hi-stats-count, .total-hi-count, #hiStatsCounter');
      statsElements.forEach(element => {
        if (element && data !== null) {
          element.textContent = data.toLocaleString();
        }
      });
      
      console.log('📊 Stats counter updated:', data);
      
    } catch (error) {
      console.warn('⚠️ Error updating stats counter:', error);
    }
  }

  // Get Supabase client (same method as feed system)
  getSupabase() {
    return window.getSupabase?.() || window.supabaseClient || window.sb || 
           window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
  }

  // Public method to manually refresh feed data
  async refreshFeedData() {
    if (!this.feedSystem) {
      console.warn('⚠️ Feed system not initialized');
      return;
    }
    
    try {
      console.log('🔄 Manually refreshing feed data...');
      
      // Reset pagination
      this.feedSystem.pagination.general.page = 0;
      this.feedSystem.pagination.archives.page = 0;
      
      // Clear existing data
      this.feedSystem.feedData.general = [];
      this.feedSystem.feedData.archives = [];
      
      // Reload current tab data
      await this.feedSystem.loadFeedData(this.feedSystem.currentTab);
      
      console.log('✅ Feed data refreshed');
      
    } catch (error) {
      console.error('❌ Error refreshing feed data:', error);
    }
  }

  // Public method to check system health
  getSystemHealth() {
    const supabase = this.getSupabase();
    const feedSystemReady = this.feedSystem && this.feedSystem.currentTab;
    const containerExists = !!document.getElementById('hi-island-feed-root');
    
    return {
      initialized: this.initialized,
      supabaseConnected: !!supabase,
      feedSystemReady: feedSystemReady,
      containerExists: containerExists,
      currentTab: this.feedSystem?.currentTab || null,
      currentUserId: this.feedSystem?.currentUserId || null,
      dataLoaded: {
        general: this.feedSystem?.feedData?.general?.length || 0,
        archives: this.feedSystem?.feedData?.archives?.length || 0
      }
    };
  }
}

// Initialize and make globally available
window.HiIslandIntegration = HiIslandIntegration;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Give a small delay for other systems to initialize
  setTimeout(async () => {
    try {
      window.hiIslandIntegration = new HiIslandIntegration();
      await window.hiIslandIntegration.init();
      
      // Global helper functions for debugging/manual control
      window.refreshHiIslandFeed = () => window.hiIslandIntegration?.refreshFeedData();
      window.getHiIslandHealth = () => window.hiIslandIntegration?.getSystemHealth();
      
      console.log('🏝️ Hi-Island integration ready! Use refreshHiIslandFeed() or getHiIslandHealth() for manual control.');
      
    } catch (error) {
      console.error('❌ Hi-Island integration startup failed:', error);
    }
  }, 500);
});

export default HiIslandIntegration;