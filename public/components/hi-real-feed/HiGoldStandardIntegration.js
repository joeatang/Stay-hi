/**
 * 🏝️ Hi-Island Gold Standard Feed Integration
 * 
 * This enhanced version integrates the REAL database feed system
 * with the Gold Standard Hi-Island tabbed interface.
 * 
 * FEATURES:
 * - Works with existing tab system (General Shares / My Archive)
 * - Integrates with REAL database tables (public_shares + hi_archives) 
 * - Maintains gold standard UI design
 * - Provides seamless tab switching
 */

class HiIslandGoldStandardFeed {
  constructor() {
    this.realFeedSystem = null;
    this.currentTab = 'general';
    this.initialized = false;
  }

  async init() {
    console.log('🏝️ Initializing Hi-Island Gold Standard Feed...');
    
    try {
      // Wait for the REAL feed system to be available
      await this.waitForRealFeedSystem();
      
      // Enhance the REAL feed system with Gold Standard integration
      this.enhanceRealFeedSystem();
      
      // Set up tab integration
      this.setupTabIntegration();
      
      // Initialize with general tab
      await this.switchTab('general');
      
      console.log('✅ Hi-Island Gold Standard Feed ready');
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ Gold Standard Feed initialization failed:', error);
    }
  }

  async waitForRealFeedSystem() {
    const maxAttempts = 100; // 10 seconds max wait
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (window.hiRealFeed || window.hiIslandIntegration?.feedSystem) {
        this.realFeedSystem = window.hiRealFeed || window.hiIslandIntegration.feedSystem;
        console.log('✅ Found REAL feed system');
        return;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('REAL feed system not available');
  }

  enhanceRealFeedSystem() {
    if (!this.realFeedSystem) return;
    
    // Override the render method to work with Gold Standard tabs
    const originalRender = this.realFeedSystem.render;
    
    this.realFeedSystem.render = () => {
      // Don't render the full interface - we use the Gold Standard tabs
      const container = document.getElementById('hi-island-feed-root');
      if (!container) return;
      
      // Just create the feed containers for content injection
      container.innerHTML = `
        <div id="goldStandardFeedContent" style="background: white; min-height: 400px;">
          <div id="generalContent" class="tab-content" style="display: block;">
            <div class="loading-state" style="padding: 40px; text-align: center; color: #666;">
              <div style="width: 32px; height: 32px; border: 3px solid #ddd; border-top: 3px solid #4ECDC4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
              <p>Loading community Hi shares...</p>
            </div>
          </div>
          <div id="archiveContent" class="tab-content" style="display: none;">
            <div class="loading-state" style="padding: 40px; text-align: center; color: #666;">
              <div style="width: 32px; height: 32px; border: 3px solid #ddd; border-top: 3px solid #4ECDC4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
              <p>Loading your Hi archives...</p>
            </div>
          </div>
        </div>
        
        <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        #goldStandardFeedContent .hi-share-item {
          background: #f8f9fa;
          border: none;
          border-bottom: 1px solid #e9ecef;
          border-radius: 0;
          margin: 0;
          padding: 20px 24px;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }
        
        #goldStandardFeedContent .hi-share-item:hover {
          background: #f0f0f0;
          border-left: 3px solid #4ECDC4;
          padding-left: 21px;
          transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        #goldStandardFeedContent .share-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        #goldStandardFeedContent .share-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        #goldStandardFeedContent .share-avatar, #goldStandardFeedContent .share-avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        #goldStandardFeedContent .share-username {
          font-weight: 600;
          color: #111;
          font-size: 15px;
        }
        
        #goldStandardFeedContent .share-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #666;
        }
        
        #goldStandardFeedContent .share-content {
          margin: 16px 0;
        }
        
        #goldStandardFeedContent .share-text {
          margin: 0 0 8px 0;
          line-height: 1.6;
          color: #1a1a1a;
          font-size: 15px;
        }
        
        #goldStandardFeedContent .share-location {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
        
        #goldStandardFeedContent .share-actions {
          display: flex;
          gap: 12px;
        }
        
        #goldStandardFeedContent .share-action-btn {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 6px 12px;
          color: #495057;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        
        #goldStandardFeedContent .share-action-btn:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }
        </style>
      `;
    };
    
    // Override renderFeedItems to work with Gold Standard layout
    const originalRenderFeedItems = this.realFeedSystem.renderFeedItems;
    
    this.realFeedSystem.renderFeedItems = (tabName, shares) => {
      const contentId = tabName === 'general' ? 'generalContent' : 'archiveContent';
      const container = document.getElementById(contentId);
      if (!container) return;
      
      // Clear loading state on first render
      if (this.realFeedSystem.pagination[tabName].page === 0) {
        container.innerHTML = '';
      }
      
      shares.forEach(share => {
        const shareElement = this.createGoldStandardShareElement(share, tabName);
        container.appendChild(shareElement);
      });
      
      // Show empty state if no shares
      if (this.realFeedSystem.feedData[tabName].length === 0) {
        this.showGoldStandardEmptyState(tabName);
      }
    };
    
    console.log('✅ Enhanced REAL feed system for Gold Standard UI');
  }

  createGoldStandardShareElement(share, tabName) {
    const element = document.createElement('div');
    element.className = 'hi-share-item';
    
    const visibilityIcon = this.getVisibilityIcon(share.visibility);
    const timeAgo = this.formatTimeAgo(share.created_at);
    const location = share.location ? `📍 ${share.location}` : '';

    element.innerHTML = `
      <div class="share-header">
        <div class="share-user">
          ${share.avatar_url ? 
            `<img src="${share.avatar_url}" alt="Avatar" class="share-avatar">` :
            '<div class="share-avatar-placeholder">👤</div>'
          }
          <span class="share-username">${this.escapeHtml(share.display_name || 'Hi 5er')}</span>
        </div>
        <div class="share-meta">
          <span class="share-visibility">${visibilityIcon}</span>
          <span class="share-time">${timeAgo}</span>
        </div>
      </div>
      
      <div class="share-content">
        <p class="share-text">${this.escapeHtml(share.content)}</p>
        ${location ? `<p class="share-location">${this.escapeHtml(location)}</p>` : ''}
      </div>
      
      <div class="share-actions">
        <button class="share-action-btn" data-action="wave" data-share-id="${share.id}">
          👋 Wave Back
        </button>
        ${tabName === 'archives' ? `
          <button class="share-action-btn" data-action="share" data-share-id="${share.id}">
            📤 Share Again
          </button>
        ` : ''}
      </div>
    `;

    return element;
  }

  setupTabIntegration() {
    // Make the switchTab method available globally
    window.hiGoldStandardFeed = this;
  }

  async switchTab(tabName) {
    console.log('🏝️ Gold Standard: Switching to tab:', tabName);
    
    // Map gold standard tab names to REAL feed system tab names
    const tabMapping = {
      'general': 'general',
      'archive': 'archives'
    };
    
    const realTabName = tabMapping[tabName];
    
    if (!realTabName) {
      console.log('🏝️ Tab not handled by REAL feed system:', tabName);
      return;
    }
    
    this.currentTab = realTabName;
    
    // Show/hide appropriate content containers
    const generalContent = document.getElementById('generalContent');
    const archiveContent = document.getElementById('archiveContent');
    
    if (generalContent && archiveContent) {
      generalContent.style.display = realTabName === 'general' ? 'block' : 'none';
      archiveContent.style.display = realTabName === 'archives' ? 'block' : 'none';
    }
    
    // Load data using the REAL feed system
    if (this.realFeedSystem) {
      this.realFeedSystem.currentTab = realTabName;
      
      // Reset pagination for fresh load
      this.realFeedSystem.pagination[realTabName].page = 0;
      
      // Load data
      await this.realFeedSystem.loadFeedData(realTabName);
    }
  }

  showGoldStandardEmptyState(tabName) {
    const contentId = tabName === 'general' ? 'generalContent' : 'archiveContent';
    const container = document.getElementById(contentId);
    if (!container) return;

    const emptyContent = tabName === 'general' ? {
      icon: '🌱',
      title: 'No Community Shares Yet',
      message: 'Be the first to share a Hi 5 moment with the community!'
    } : {
      icon: '📝',
      title: 'No Archives Yet', 
      message: 'Start sharing Hi 5 moments to build your personal archive'
    };

    container.innerHTML = `
      <div style="padding: 60px 40px; text-align: center; color: #666;">
        <div style="font-size: 48px; margin-bottom: 16px;">${emptyContent.icon}</div>
        <h4 style="margin: 0 0 8px 0; color: #333;">${emptyContent.title}</h4>
        <p style="margin: 0; font-size: 14px;">${emptyContent.message}</p>
      </div>
    `;
  }

  // Utility methods
  getVisibilityIcon(visibility) {
    switch (visibility) {
      case 'public': return '🌍 Public';
      case 'anonymous': return '🕶️ Anonymous';
      case 'private': return '🔐 Private';
      default: return '📝 Shared';
    }
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize and make globally available
window.HiIslandGoldStandardFeed = HiIslandGoldStandardFeed;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  setTimeout(async () => {
    try {
      window.hiGoldStandardFeed = new HiIslandGoldStandardFeed();
      await window.hiGoldStandardFeed.init();
      
      console.log('🏝️ Hi-Island Gold Standard Feed system ready!');
      
    } catch (error) {
      console.error('❌ Gold Standard Feed system startup failed:', error);
    }
  }, 1000);
});

export default HiIslandGoldStandardFeed;