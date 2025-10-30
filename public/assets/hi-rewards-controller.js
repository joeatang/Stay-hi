// ===============================================
// 🏆 HI REWARDS FEATURE FLAG INTEGRATION
// ===============================================
// Tesla-grade Hi Rewards system with feature flag controls

class HiRewardsController {
  constructor() {
    this.initialized = false;
    this.activeFeatures = new Set();
    
    // Listen for feature flag changes
    window.addEventListener('hi-flags-ready', this.handleFlagsReady.bind(this));
    window.addEventListener('hi-flag-changed', this.handleFlagChange.bind(this));
  }

  // Initialize when flags are ready
  handleFlagsReady(event) {
    console.log('🏆 Hi Rewards: Flags ready, initializing...');
    this.checkAndActivateFeatures();
  }

  // React to flag changes (real-time updates)
  handleFlagChange(event) {
    const { flag, enabled } = event.detail;
    
    if (flag.startsWith('rewards_')) {
      console.log(`🏆 Hi Rewards: Flag changed - ${flag} = ${enabled}`);
      this.toggleFeature(flag, enabled);
    }
  }

  // Check which reward features should be active
  checkAndActivateFeatures() {
    if (!window.HiFlags?.initialized) {
      console.warn('🏆 Hi Rewards: Flags not ready yet');
      return;
    }

    const rewardFlags = {
      'rewards_enabled': this.toggleRewardsSystem.bind(this),
      'rewards_waves_enabled': this.toggleWaveRewards.bind(this),
      'rewards_shares_enabled': this.toggleShareRewards.bind(this),
      'rewards_streaks_enabled': this.toggleStreakRewards.bind(this),
      'rewards_global_events': this.toggleGlobalEvents.bind(this)
    };

    Object.entries(rewardFlags).forEach(([flag, handler]) => {
      if (window.HiFlags.isEnabled(flag)) {
        handler(true);
      }
    });

    this.initialized = true;
    console.log('🏆 Hi Rewards: Initialization complete');
  }

  // Toggle individual features
  toggleFeature(flag, enabled) {
    const toggleMethods = {
      'rewards_enabled': this.toggleRewardsSystem.bind(this),
      'rewards_waves_enabled': this.toggleWaveRewards.bind(this),
      'rewards_shares_enabled': this.toggleShareRewards.bind(this),
      'rewards_streaks_enabled': this.toggleStreakRewards.bind(this),
      'rewards_global_events': this.toggleGlobalEvents.bind(this)
    };

    const method = toggleMethods[flag];
    if (method) {
      method(enabled);
    }
  }

  // Main rewards system
  toggleRewardsSystem(enabled) {
    if (enabled) {
      this.activeFeatures.add('rewards_system');
      this.initializeRewardsUI();
      this.startPointsTracking();
      console.log('🏆 Hi Rewards: Main system ENABLED');
    } else {
      this.activeFeatures.delete('rewards_system');
      this.hideRewardsUI();
      this.stopPointsTracking();
      console.log('🏆 Hi Rewards: Main system DISABLED');
    }
  }

  // Wave rewards (Hi → others)
  toggleWaveRewards(enabled) {
    if (enabled && this.activeFeatures.has('rewards_system')) {
      this.activeFeatures.add('wave_rewards');
      this.enableWaveTracking();
      console.log('🌊 Wave Rewards: ENABLED');
    } else {
      this.activeFeatures.delete('wave_rewards');
      this.disableWaveTracking();
      console.log('🌊 Wave Rewards: DISABLED');
    }
  }

  // Share rewards (location sharing)
  toggleShareRewards(enabled) {
    if (enabled && this.activeFeatures.has('rewards_system')) {
      this.activeFeatures.add('share_rewards');
      this.enableShareTracking();
      console.log('📍 Share Rewards: ENABLED');
    } else {
      this.activeFeatures.delete('share_rewards');
      this.disableShareTracking();
      console.log('📍 Share Rewards: DISABLED');
    }
  }

  // Streak rewards (consecutive days)
  toggleStreakRewards(enabled) {
    if (enabled && this.activeFeatures.has('rewards_system')) {
      this.activeFeatures.add('streak_rewards');
      this.enableStreakTracking();
      console.log('🔥 Streak Rewards: ENABLED');
    } else {
      this.activeFeatures.delete('streak_rewards');
      this.disableStreakTracking();
      console.log('🔥 Streak Rewards: DISABLED');
    }
  }

  // Global events (community challenges)
  toggleGlobalEvents(enabled) {
    if (enabled && this.activeFeatures.has('rewards_system')) {
      this.activeFeatures.add('global_events');
      this.enableGlobalEvents();
      console.log('🌍 Global Events: ENABLED');
    } else {
      this.activeFeatures.delete('global_events');
      this.disableGlobalEvents();
      console.log('🌍 Global Events: DISABLED');
    }
  }

  // === UI METHODS ===

  initializeRewardsUI() {
    // Add rewards button to navigation if not exists
    if (!document.getElementById('hi-rewards-btn')) {
      const rewardsBtn = document.createElement('button');
      rewardsBtn.id = 'hi-rewards-btn';
      rewardsBtn.innerHTML = '🏆 <span id="points-display">0</span>';
      rewardsBtn.className = 'hi-rewards-button fade-in';
      rewardsBtn.onclick = () => this.showRewardsModal();
      
      // Add to navigation area
      const nav = document.querySelector('.nav-buttons') || document.querySelector('nav') || document.body;
      nav.appendChild(rewardsBtn);
    }
  }

  hideRewardsUI() {
    const rewardsBtn = document.getElementById('hi-rewards-btn');
    if (rewardsBtn) {
      rewardsBtn.classList.add('fade-out');
      setTimeout(() => rewardsBtn.remove(), 300);
    }
  }

  showRewardsModal() {
    console.log('🏆 Opening Hi Rewards dashboard...');
    // This will integrate with your existing modal system
    // For now, just show current status
    alert(`Hi Rewards Dashboard\n\nActive Features: ${Array.from(this.activeFeatures).join(', ')}\nPoints: ${this.getCurrentPoints()}`);
  }

  // === TRACKING METHODS ===

  startPointsTracking() {
    // Initialize points system
    this.pointsTracker = new HiPointsTracker();
    this.updatePointsDisplay();
  }

  stopPointsTracking() {
    if (this.pointsTracker) {
      this.pointsTracker.stop();
      this.pointsTracker = null;
    }
  }

  enableWaveTracking() {
    // Listen for wave events
    window.addEventListener('hi-wave-sent', this.handleWaveReward.bind(this));
  }

  disableWaveTracking() {
    window.removeEventListener('hi-wave-sent', this.handleWaveReward.bind(this));
  }

  enableShareTracking() {
    // Listen for share events
    window.addEventListener('location-shared', this.handleShareReward.bind(this));
  }

  disableShareTracking() {
    window.removeEventListener('location-shared', this.handleShareReward.bind(this));
  }

  enableStreakTracking() {
    // Check daily streak
    this.streakChecker = setInterval(() => this.checkStreak(), 60000); // Check every minute
  }

  disableStreakTracking() {
    if (this.streakChecker) {
      clearInterval(this.streakChecker);
      this.streakChecker = null;
    }
  }

  enableGlobalEvents() {
    // Listen for global events
    this.subscribeToGlobalEvents();
  }

  disableGlobalEvents() {
    this.unsubscribeFromGlobalEvents();
  }

  // === REWARD HANDLERS ===

  handleWaveReward(event) {
    if (this.activeFeatures.has('wave_rewards')) {
      this.awardPoints(5, 'Wave sent! 👋');
    }
  }

  handleShareReward(event) {
    if (this.activeFeatures.has('share_rewards')) {
      this.awardPoints(10, 'Location shared! 📍');
    }
  }

  checkStreak() {
    if (this.activeFeatures.has('streak_rewards')) {
      // Implementation for streak checking
      const streak = this.calculateCurrentStreak();
      if (streak > 0) {
        this.awardPoints(streak * 2, `${streak} day streak! 🔥`);
      }
    }
  }

  // === UTILITY METHODS ===

  awardPoints(amount, message) {
    if (this.pointsTracker) {
      this.pointsTracker.addPoints(amount, message);
      this.updatePointsDisplay();
      this.showPointsNotification(amount, message);
    }
  }

  getCurrentPoints() {
    return this.pointsTracker ? this.pointsTracker.getTotal() : 0;
  }

  updatePointsDisplay() {
    const display = document.getElementById('points-display');
    if (display) {
      display.textContent = this.getCurrentPoints();
    }
  }

  showPointsNotification(points, message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'hi-points-toast';
    toast.innerHTML = `+${points} 🏆 ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  calculateCurrentStreak() {
    // Placeholder - implement actual streak calculation
    return 1;
  }

  subscribeToGlobalEvents() {
    console.log('🌍 Subscribing to global events...');
  }

  unsubscribeFromGlobalEvents() {
    console.log('🌍 Unsubscribing from global events...');
  }
}

// Simple points tracker
class HiPointsTracker {
  constructor() {
    this.points = parseInt(localStorage.getItem('hi_points') || '0');
    this.transactions = JSON.parse(localStorage.getItem('hi_points_history') || '[]');
  }

  addPoints(amount, reason) {
    this.points += amount;
    this.transactions.push({
      amount,
      reason,
      timestamp: Date.now()
    });
    
    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
      this.transactions = this.transactions.slice(-100);
    }
    
    this.save();
  }

  getTotal() {
    return this.points;
  }

  getHistory() {
    return this.transactions;
  }

  save() {
    localStorage.setItem('hi_points', this.points.toString());
    localStorage.setItem('hi_points_history', JSON.stringify(this.transactions));
  }

  stop() {
    // Cleanup if needed
  }
}

// Initialize Hi Rewards Controller
window.HiRewards = new HiRewardsController();

export default HiRewardsController;