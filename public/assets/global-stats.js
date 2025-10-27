/* ==========================================================================
   Stay Hi — Global Stats Tracking System
   Tesla-style global and individual metrics tracking
   ========================================================================== */

class GlobalStatsTracker {
  constructor() {
    this.stats = {
      // Global counters (across all users)
      globalHiMoments: 0,
      globalHiWaves: 0,
      
      // Individual user stats
      individualHiWaves: 0,
      individualHiMoments: 0,
      individualStreak: 0,
      totalDaysActive: 0,
      
      // Achievements
      achievements: [],
      lastUpdated: Date.now()
    };
    
    this.init();
  }

  init() {
    this.loadStats();
    this.setupEventListeners();
    console.log('📊 Global Stats Tracker initialized');
  }

  loadStats() {
    // Load individual stats from localStorage
    const stored = localStorage.getItem('stay-hi-global-stats');
    if (stored) {
      try {
        this.stats = { ...this.stats, ...JSON.parse(stored) };
      } catch (e) {
        console.warn('Failed to parse stats data');
      }
    }

    // Load global stats (would come from Supabase in production)
    this.loadGlobalStats();
  }

  async loadGlobalStats() {
    // Simulate global stats - in production, this would be a Supabase query
    // For now, we'll use localStorage with a global key
    const globalStored = localStorage.getItem('stay-hi-global-community-stats');
    if (globalStored) {
      try {
        const globalData = JSON.parse(globalStored);
        this.stats.globalHiMoments = globalData.globalHiMoments || 0;
        this.stats.globalHiWaves = globalData.globalHiWaves || 0;
      } catch (e) {
        console.warn('Failed to parse global stats');
      }
    }
  }

  saveStats() {
    localStorage.setItem('stay-hi-global-stats', JSON.stringify(this.stats));
    this.saveGlobalStats();
  }

  saveGlobalStats() {
    // Save global stats (would be a Supabase insert/update in production)
    const globalData = {
      globalHiMoments: this.stats.globalHiMoments,
      globalHiWaves: this.stats.globalHiWaves,
      lastUpdated: Date.now()
    };
    localStorage.setItem('stay-hi-global-community-stats', JSON.stringify(globalData));
  }

  // Individual tracking methods
  trackHiWave() {
    this.stats.individualHiWaves++;
    this.stats.globalHiWaves++;
    this.checkAchievements();
    this.saveStats();
    this.broadcastStatsUpdate();
  }

  trackHiMoment(isPublic = false) {
    this.stats.individualHiMoments++;
    if (isPublic) {
      this.stats.globalHiMoments++;
    }
    this.checkAchievements();
    this.saveStats();
    this.broadcastStatsUpdate();
  }

  updateStreak(newStreak) {
    this.stats.individualStreak = newStreak;
    this.saveStats();
    this.broadcastStatsUpdate();
  }

  // Achievement system
  checkAchievements() {
    const newAchievements = [];

    // Hi Wave milestones
    if (this.stats.individualHiWaves === 1 && !this.hasAchievement('first-wave')) {
      newAchievements.push({
        id: 'first-wave',
        title: 'First Wave! 👋',
        description: 'Your journey begins',
        timestamp: Date.now()
      });
    }

    if (this.stats.individualHiWaves === 100 && !this.hasAchievement('century-waves')) {
      newAchievements.push({
        id: 'century-waves',
        title: 'Century Club! 💯',
        description: '100 Hi Waves achieved',
        timestamp: Date.now()
      });
    }

    // Hi Moment milestones
    if (this.stats.individualHiMoments === 10 && !this.hasAchievement('moment-master')) {
      newAchievements.push({
        id: 'moment-master',
        title: 'Moment Master ✨',
        description: '10 Hi Moments shared',
        timestamp: Date.now()
      });
    }

    // Add new achievements
    if (newAchievements.length > 0) {
      this.stats.achievements.push(...newAchievements);
      this.showAchievementNotification(newAchievements);
    }
  }

  hasAchievement(achievementId) {
    return this.stats.achievements.some(a => a.id === achievementId);
  }

  showAchievementNotification(achievements) {
    if (window.PremiumUX) {
      achievements.forEach(achievement => {
        setTimeout(() => {
          window.PremiumUX.celebrate(document.body, achievement.title);
          window.PremiumUX.confetti({ count: 50 });
        }, 500);
      });
    }
  }

  // Event system for real-time updates
  setupEventListeners() {
    // Listen for Hi Wave events
    window.addEventListener('hi-wave-triggered', () => {
      this.trackHiWave();
    });

    // Listen for Hi Moment events
    window.addEventListener('hi-moment-shared', (event) => {
      this.trackHiMoment(event.detail?.isPublic || false);
    });

    // Listen for streak updates
    window.addEventListener('streak-updated', (event) => {
      this.updateStreak(event.detail?.streak || 0);
    });
  }

  broadcastStatsUpdate() {
    window.dispatchEvent(new CustomEvent('stats-updated', {
      detail: { stats: this.stats }
    }));
  }

  // Public API methods
  getStats() {
    return { ...this.stats };
  }

  getFormattedStats() {
    return {
      // Global stats with formatting
      globalHiMoments: this.formatNumber(this.stats.globalHiMoments),
      globalHiWaves: this.formatNumber(this.stats.globalHiWaves),
      
      // Individual stats
      individualHiWaves: this.formatNumber(this.stats.individualHiWaves),
      individualHiMoments: this.formatNumber(this.stats.individualHiMoments),
      individualStreak: this.stats.individualStreak,
      
      // Achievements
      achievementCount: this.stats.achievements.length,
      latestAchievement: this.stats.achievements[this.stats.achievements.length - 1]
    };
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // Generate stats display HTML
  generateStatsHTML(type = 'compact') {
    const stats = this.getFormattedStats();

    if (type === 'compact') {
      return `
        <div class="premium-stats-compact">
          <div class="stat-item">
            <span class="stat-value">${stats.individualHiWaves}</span>
            <span class="stat-label">Hi Waves</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${stats.individualStreak}</span>
            <span class="stat-label">🔥 Streak</span>
          </div>
        </div>
      `;
    }

    if (type === 'detailed') {
      return `
        <div class="premium-stats-detailed">
          <div class="stats-section">
            <h4 class="stats-section-title">Your Journey</h4>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${stats.individualHiWaves}</div>
                <div class="stat-name">Hi Waves</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.individualHiMoments}</div>
                <div class="stat-name">Hi Moments</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.individualStreak}</div>
                <div class="stat-name">🔥 Streak</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${stats.achievementCount}</div>
                <div class="stat-name">🏆 Achievements</div>
              </div>
            </div>
          </div>
          
          <div class="stats-section">
            <h4 class="stats-section-title">Global Community</h4>
            <div class="stats-grid">
              <div class="stat-card global">
                <div class="stat-number">${stats.globalHiWaves}</div>
                <div class="stat-name">Global Hi Waves</div>
              </div>
              <div class="stat-card global">
                <div class="stat-number">${stats.globalHiMoments}</div>
                <div class="stat-name">Global Hi Moments</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.GlobalStatsTracker = new GlobalStatsTracker();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalStatsTracker;
}