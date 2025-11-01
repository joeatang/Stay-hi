// ===============================================
// 🏆 HI REWARDS BETA SYSTEM
// ===============================================
// Beta version for user testing and engagement

class HiRewardsBeta {
  constructor() {
    this.initialized = false;
    this.points = 0;
    this.level = 1;
    this.streakDays = 0;
    this.achievements = new Set();
    this.dailyActions = new Map();
    
    this.init();
  }

  async init() {
    console.log('🏆 Initializing Hi Rewards Beta System...');
    
    // Load user data from localStorage for beta testing
    this.loadBetaData();
    
    // Set up UI
    this.createRewardsUI();
    
    // Listen for user actions
    this.setupActionListeners();
    
    // Start daily reset timer
    this.setupDailyReset();
    
    this.initialized = true;
    console.log('✅ Hi Rewards Beta System ready!');
    
    // Show welcome message if first time
    if (this.points === 0 && this.achievements.size === 0) {
      setTimeout(() => this.showWelcomeMessage(), 2000);
    }
  }

  loadBetaData() {
    try {
      // 🎯 TESLA-GRADE: Sync with REAL localStorage data first
      this.syncWithRealData();
      
      const saved = localStorage.getItem('hi_rewards_beta');
      if (saved) {
        const data = JSON.parse(saved);
        this.points = data.points || this.points; // Keep calculated points if higher
        this.level = data.level || this.level; // Keep calculated level if higher
        this.streakDays = data.streakDays || 0;
        this.achievements = new Set(data.achievements || []);
        this.dailyActions = new Map(data.dailyActions || []);
      }
      
      console.log('🏆 Rewards system synced with real data:', {
        level: this.level,
        points: this.points,
        achievements: this.achievements.size
      });
    } catch (error) {
      console.warn('⚠️ Failed to load beta rewards data:', error);
    }
  }

  syncWithRealData() {
    try {
      // Get REAL INDIVIDUAL user data from localStorage
      const hiTotal = parseInt(localStorage.getItem('hi_total') || '0');
      const hiHistory = JSON.parse(localStorage.getItem('hi_history') || '{}');
      const generalShares = JSON.parse(localStorage.getItem('hi_general_shares') || '[]');
      const myArchive = JSON.parse(localStorage.getItem('hi_my_archive') || '[]');
      const hiStreak = parseInt(localStorage.getItem('hi_streak') || '0');
      
      // Calculate INDIVIDUAL user metrics (NOT global community stats)
      const personalHis = Math.max(hiTotal, myArchive.length, Object.values(hiHistory).reduce((sum, count) => sum + count, 0));
      const personalShares = generalShares.length;
      const currentStreak = hiStreak;
      
      // 🏆 TESLA-GRADE 5-YEAR PROGRESSION SCALE
      // Level Formula: Exponential curve for long-term engagement
      // Levels 1-100: Rapid early progression (1-25 His per level)
      // Levels 100-500: Moderate progression (25-100 His per level)  
      // Levels 500-1000+: Expert territory (100-500 His per level)
      const calculatedLevel = this.calculateLevelFromHis(personalHis);
      const calculatedPoints = (personalHis * 10) + (personalShares * 25) + (currentStreak * 5);
      
      // Update with real data if it's higher than stored
      this.level = Math.max(this.level || 1, calculatedLevel);
      this.points = Math.max(this.points || 0, calculatedPoints);
      this.streakDays = Math.max(this.streakDays || 0, currentStreak);
      
      // Auto-unlock achievements based on real data
      this.checkRealDataAchievements(personalHis, personalShares, currentStreak);
      
      console.log('✅ Individual data sync complete:', {
        personalHis,
        personalShares,
        currentStreak,
        calculatedLevel,
        calculatedPoints,
        nextLevelAt: this.getHisForLevel(calculatedLevel + 1)
      });
      
    } catch (error) {
      console.warn('⚠️ Real data sync failed:', error);
    }
  }

  // 🏆 TESLA-GRADE 5-YEAR PROGRESSION SYSTEM
  calculateLevelFromHis(his) {
    if (his <= 0) return 1;
    
    // Progressive difficulty curve designed for 5+ years
    // Levels 1-50: Beginner (1-10 His per level) - Months 1-6
    if (his <= 500) return Math.floor(his / 10) + 1;
    
    // Levels 51-150: Intermediate (10-25 His per level) - Year 1-2  
    if (his <= 3000) return 50 + Math.floor((his - 500) / 25);
    
    // Levels 151-300: Advanced (25-50 His per level) - Year 2-3
    if (his <= 10500) return 150 + Math.floor((his - 3000) / 50);
    
    // Levels 301-500: Expert (50-100 His per level) - Year 3-4
    if (his <= 30500) return 300 + Math.floor((his - 10500) / 100);
    
    // Levels 501-750: Master (100-200 His per level) - Year 4-5
    if (his <= 80500) return 500 + Math.floor((his - 30500) / 200);
    
    // Levels 751-1000+: Legend (200+ His per level) - Year 5+
    return 750 + Math.floor((his - 80500) / 250);
  }
  
  getHisForLevel(targetLevel) {
    if (targetLevel <= 1) return 0;
    if (targetLevel <= 50) return (targetLevel - 1) * 10;
    if (targetLevel <= 150) return 500 + (targetLevel - 50) * 25;  
    if (targetLevel <= 300) return 3000 + (targetLevel - 150) * 50;
    if (targetLevel <= 500) return 10500 + (targetLevel - 300) * 100;
    if (targetLevel <= 750) return 30500 + (targetLevel - 500) * 200;
    return 80500 + (targetLevel - 750) * 250;
  }
  
  getLevelTier(level) {
    if (level <= 50) return { name: 'Beginner', color: '#4CAF50', icon: '🌱' };
    if (level <= 150) return { name: 'Intermediate', color: '#2196F3', icon: '⚡' };
    if (level <= 300) return { name: 'Advanced', color: '#FF9800', icon: '🔥' };
    if (level <= 500) return { name: 'Expert', color: '#9C27B0', icon: '💎' };
    if (level <= 750) return { name: 'Master', color: '#FF5722', icon: '👑' };
    return { name: 'Legend', color: '#FFD700', icon: '🏆' };
  }

  checkRealDataAchievements(personalHis, personalShares, streak) {
    const achievements = [
      { id: 'first_hi', name: 'First Hi!', requirement: personalHis >= 1 },
      { id: 'hi_10', name: 'Hi Starter', requirement: personalHis >= 10 },
      { id: 'hi_50', name: 'Hi Enthusiast', requirement: personalHis >= 50 },
      { id: 'hi_100', name: 'Hi Champion', requirement: personalHis >= 100 },
      { id: 'hi_250', name: 'Hi Master', requirement: personalHis >= 250 },
      { id: 'hi_500', name: 'Hi Legend', requirement: personalHis >= 500 },
      { id: 'hi_1000', name: 'Hi Grandmaster', requirement: personalHis >= 1000 },
      { id: 'hi_2500', name: 'Hi Deity', requirement: personalHis >= 2500 },
      
      { id: 'level_5', name: 'Level 5 Reached', requirement: this.level >= 5 },
      { id: 'level_25', name: 'Level 25 Reached', requirement: this.level >= 25 },
      { id: 'level_50', name: 'Beginner Mastery', requirement: this.level >= 50 },
      { id: 'level_150', name: 'Intermediate Expert', requirement: this.level >= 150 },
      { id: 'level_300', name: 'Advanced Master', requirement: this.level >= 300 },
      { id: 'level_500', name: 'Expert Legend', requirement: this.level >= 500 },
      { id: 'level_750', name: 'Master Deity', requirement: this.level >= 750 },
      
      { id: 'first_share', name: 'First Share', requirement: personalShares >= 1 },
      { id: 'social_5', name: 'Social Starter', requirement: personalShares >= 5 },
      { id: 'social_25', name: 'Social Butterfly', requirement: personalShares >= 25 },
      
      { id: 'streak_3', name: '3-Day Streak', requirement: streak >= 3 },
      { id: 'streak_7', name: '1-Week Streak', requirement: streak >= 7 },
      { id: 'streak_30', name: '1-Month Streak', requirement: streak >= 30 }
    ];
    
    achievements.forEach(achievement => {
      if (achievement.requirement && !this.achievements.has(achievement.id)) {
        this.achievements.add(achievement.id);
        console.log('🏆 Achievement unlocked:', achievement.name);
      }
    });
  }

  saveBetaData() {
    try {
      const data = {
        points: this.points,
        level: this.level,
        streakDays: this.streakDays,
        achievements: Array.from(this.achievements),
        dailyActions: Array.from(this.dailyActions.entries()),
        lastSaved: Date.now()
      };
      localStorage.setItem('hi_rewards_beta', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save beta rewards data:', error);
    }
  }

  createRewardsUI() {
    // Don't create UI if already exists
    if (document.getElementById('hi-rewards-beta-btn')) {
      this.updateRewardsUI();
      return;
    }
    
    // Create floating rewards button
    const rewardsBtn = document.createElement('div');
    rewardsBtn.id = 'hi-rewards-beta-btn';
    rewardsBtn.className = 'hi-rewards-beta-button';
    const tier = this.getLevelTier(this.level);
    rewardsBtn.innerHTML = `
      <div class="rewards-icon">${tier.icon}</div>
      <div class="rewards-info">
        <div class="points-display">${this.points.toLocaleString()}</div>
        <div class="level-display">Level ${this.level} ${tier.name}</div>
      </div>
    `;
    
    rewardsBtn.addEventListener('click', () => this.showRewardsDashboard());
    
    document.body.appendChild(rewardsBtn);
    
    // Add CSS styles
    this.addRewardsStyles();
    
    // Show level up notification if high level
    if (this.level >= 10) {
      setTimeout(() => this.showLevelUpCelebration(), 2000);
    }
  }

  updateRewardsUI() {
    const pointsDisplay = document.querySelector('.points-display');
    const levelDisplay = document.querySelector('.level-display');
    const tier = this.getLevelTier(this.level);
    
    if (pointsDisplay) pointsDisplay.textContent = this.points.toLocaleString();
    if (levelDisplay) levelDisplay.textContent = `${tier.icon} Level ${this.level}`;
  }

  showLevelUpCelebration() {
    if (this.level < 10) return;
    
    const celebration = document.createElement('div');
    celebration.className = 'level-up-celebration';
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <div class="celebration-title">Level ${this.level} Master!</div>
        <div class="celebration-subtitle">${this.points.toLocaleString()} points earned</div>
      </div>
    `;
    
    document.body.appendChild(celebration);
    
    setTimeout(() => {
      celebration.style.opacity = '0';
      setTimeout(() => celebration.remove(), 500);
    }, 4000);
  }

  addRewardsStyles() {
    if (document.getElementById('hi-rewards-beta-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'hi-rewards-beta-styles';
    styles.textContent = `
      .hi-rewards-beta-button {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000;
        border-radius: 20px;
        padding: 12px 16px;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        user-select: none;
        animation: rewardsGlow 3s ease-in-out infinite alternate;
      }
      
      .hi-rewards-beta-button:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 12px 35px rgba(255, 215, 0, 0.5);
      }
      
      @keyframes rewardsGlow {
        0% { box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4); }
        100% { box-shadow: 0 8px 25px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.3); }
      }
      
      .rewards-icon {
        font-size: 20px;
        animation: bounce 2s infinite;
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-4px); }
        60% { transform: translateY(-2px); }
      }
      
      .rewards-info {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }
      
      .points-display {
        font-weight: 900;
        font-size: 16px;
      }
      
      .level-display {
        font-weight: 600;
        font-size: 11px;
        opacity: 0.8;
      }
      
      .rewards-toast {
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 12px 20px;
        border-radius: 16px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        z-index: 1001;
        transform: translateX(400px);
        opacity: 0;
        animation: slideInToast 0.5s ease forwards, fadeOutToast 0.5s ease 3s forwards;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }
      
      @keyframes slideInToast {
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes fadeOutToast {
        to {
          opacity: 0;
          transform: translateX(400px);
        }
      }
      
      .level-up-celebration {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000;
        padding: 2rem;
        border-radius: 24px;
        text-align: center;
        z-index: 3000;
        box-shadow: 0 20px 60px rgba(255, 215, 0, 0.6);
        animation: celebrationPop 0.6s ease forwards;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }
      
      @keyframes celebrationPop {
        to {
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      .celebration-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      
      .celebration-icon {
        font-size: 4rem;
        animation: celebrationBounce 1s ease infinite;
      }
      
      @keyframes celebrationBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .celebration-title {
        font-size: 2rem;
        font-weight: 900;
        margin: 0;
      }
      
      .celebration-subtitle {
        font-size: 1.1rem;
        font-weight: 600;
        opacity: 0.8;
        margin: 0;
      }
      
      .rewards-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      }
      
      .rewards-modal-content {
        background: linear-gradient(135deg, #2d1e4f, #1a1f3a);
        border-radius: 24px;
        padding: 2rem;
        max-width: 500px;
        width: 100%;
        color: white;
        border: 2px solid rgba(255, 215, 0, 0.3);
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        animation: modalSlideIn 0.4s ease;
      }
      
      @keyframes modalSlideIn {
        from { transform: scale(0.8) translateY(30px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      
      .modal-title {
        font-size: 1.5rem;
        font-weight: 900;
        background: linear-gradient(135deg, #FFD166, #FF7B24);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .modal-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        border-radius: 8px;
        transition: all 0.2s ease;
      }
      
      .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }
      
      .rewards-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      
      .stat-item {
        background: rgba(255, 215, 0, 0.1);
        border-radius: 12px;
        padding: 1rem;
        text-align: center;
        border: 1px solid rgba(255, 215, 0, 0.2);
      }
      
      .stat-value {
        font-size: 1.5rem;
        font-weight: 900;
        color: #FFD166;
      }
      
      .stat-label {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 0.25rem;
      }
      
      .achievements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 0.5rem;
      }
      
      .achievement-item {
        background: rgba(255, 215, 0, 0.1);
        border-radius: 12px;
        padding: 0.75rem;
        text-align: center;
        border: 1px solid rgba(255, 215, 0, 0.2);
        transition: all 0.2s ease;
      }
      
      .achievement-item.unlocked {
        background: rgba(76, 175, 80, 0.2);
        border-color: rgba(76, 175, 80, 0.4);
      }
      
      .achievement-item:hover {
        transform: scale(1.05);
      }
      
      .achievement-icon {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
      }
      
      .achievement-name {
        font-size: 0.7rem;
        opacity: 0.8;
      }
      
      @media (max-width: 768px) {
        .hi-rewards-beta-button {
          top: 15px;
          right: 15px;
          padding: 10px 12px;
        }
        
        .rewards-modal {
          padding: 10px;
        }
        
        .rewards-modal-content {
          padding: 1.5rem;
        }
        
        .rewards-stats {
          grid-template-columns: 1fr;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  setupActionListeners() {
    // Listen for hi waves
    document.addEventListener('click', (e) => {
      // Check if clicking the main Hi button
      if (e.target.closest('#hiBtn') || e.target.closest('.hi-btn') || e.target.id === 'mainHiBtn') {
        this.awardPoints(5, 'Hi Wave Sent! 👋', 'wave');
      }
    });
    
    // Listen for location shares
    window.addEventListener('location-shared', () => {
      this.awardPoints(10, 'Location Shared! 📍', 'share');
    });
    
    // Listen for profile updates
    window.addEventListener('profile-updated', () => {
      this.awardPoints(15, 'Profile Updated! ✨', 'profile');
    });
    
    // Daily login bonus
    this.checkDailyLogin();
  }

  awardPoints(amount, message, actionType) {
    // Check daily limits to prevent spam
    const today = new Date().toDateString();
    const dailyKey = `${today}_${actionType}`;
    const dailyCount = this.dailyActions.get(dailyKey) || 0;
    
    // Set daily limits
    const limits = {
      wave: 20,    // Max 20 waves per day for points
      share: 5,    // Max 5 shares per day for points  
      profile: 2   // Max 2 profile updates per day for points
    };
    
    if (dailyCount >= (limits[actionType] || 10)) {
      // Show limit reached message occasionally
      if (Math.random() < 0.1) {
        this.showToast(`Daily limit reached for ${actionType}! Try again tomorrow.`, 'warning');
      }
      return;
    }
    
    // Award points
    this.points += amount;
    this.dailyActions.set(dailyKey, dailyCount + 1);
    
    // Check for level up
    const newLevel = Math.floor(this.points / 100) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.showToast(`🎉 Level Up! You're now Level ${this.level}!`, 'levelup');
      this.checkAchievements();
    }
    
    // Update UI
    this.updateRewardsUI();
    
    // Show points toast
    this.showToast(`+${amount} points • ${message}`, 'points');
    
    // Save progress
    this.saveBetaData();
    
    // Check for achievements
    this.checkAchievements();
  }

  checkAchievements() {
    const achievements = [
      { id: 'first_wave', name: 'First Wave', icon: '👋', condition: () => this.points >= 5 },
      { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', condition: () => this.points >= 50 },
      { id: 'century_club', name: 'Century Club', icon: '💯', condition: () => this.points >= 100 },
      { id: 'level_up', name: 'Level Up!', icon: '⬆️', condition: () => this.level >= 2 },
      { id: 'high_five', name: 'High Five', icon: '✋', condition: () => this.level >= 5 },
      { id: 'perfect_ten', name: 'Perfect Ten', icon: '🔟', condition: () => this.level >= 10 }
    ];
    
    achievements.forEach(achievement => {
      if (!this.achievements.has(achievement.id) && achievement.condition()) {
        this.achievements.add(achievement.id);
        this.showToast(`🏆 Achievement Unlocked: ${achievement.name}!`, 'achievement');
      }
    });
    
    this.saveBetaData();
  }

  checkDailyLogin() {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem('hi_rewards_last_login');
    
    if (lastLogin !== today) {
      // Award daily login bonus
      setTimeout(() => {
        this.awardPoints(20, 'Daily Login Bonus! 🌅', 'login');
        
        // Check streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
          this.streakDays++;
        } else if (lastLogin) {
          this.streakDays = 1; // Reset streak
        } else {
          this.streakDays = 1; // First login
        }
        
        if (this.streakDays > 1) {
          this.showToast(`🔥 ${this.streakDays} day streak!`, 'streak');
        }
        
        localStorage.setItem('hi_rewards_last_login', today);
        this.saveBetaData();
        
      }, 1000);
    }
  }

  setupDailyReset() {
    // Reset daily actions at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyActions.clear();
      this.saveBetaData();
      this.showToast('Daily limits reset! 🌅', 'reset');
      
      // Set up next daily reset
      this.setupDailyReset();
    }, msUntilMidnight);
  }

  updateRewardsUI() {
    const btn = document.getElementById('hi-rewards-beta-btn');
    if (btn) {
      const pointsDisplay = btn.querySelector('.points-display');
      const levelDisplay = btn.querySelector('.level-display');
      
      if (pointsDisplay) pointsDisplay.textContent = this.points;
      if (levelDisplay) levelDisplay.textContent = `Level ${this.level}`;
    }
  }

  showToast(message, type = 'points') {
    const toast = document.createElement('div');
    toast.className = 'rewards-toast';
    
    const colors = {
      points: 'linear-gradient(135deg, #4CAF50, #45a049)',
      achievement: 'linear-gradient(135deg, #FFD700, #FFA500)',
      levelup: 'linear-gradient(135deg, #9C27B0, #673AB7)',
      warning: 'linear-gradient(135deg, #FF9800, #F57C00)',
      streak: 'linear-gradient(135deg, #FF5722, #E64A19)'
    };
    
    toast.style.background = colors[type] || colors.points;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 4000);
  }

  showWelcomeMessage() {
    this.showToast('🎉 Welcome to Hi Rewards Beta! Start earning points by saying Hi!', 'achievement');
  }

  showRewardsDashboard() {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'rewards-modal';
    modal.innerHTML = `
      <div class="rewards-modal-content">
        <div class="modal-header">
          <div class="modal-title">🏆 Hi Rewards Beta</div>
          <button class="modal-close">&times;</button>
        </div>
        
        <div class="rewards-stats">
          <div class="stat-item">
            <div class="stat-value">${this.points}</div>
            <div class="stat-label">Total Points</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.level}</div>
            <div class="stat-label">Current Level</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.streakDays}</div>
            <div class="stat-label">Day Streak</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.achievements.size}</div>
            <div class="stat-label">Achievements</div>
          </div>
        </div>
        
        <h3 style="margin: 1.5rem 0 1rem 0; color: #FFD166;">Achievements</h3>
        <div class="achievements-grid">
          <div class="achievement-item ${this.achievements.has('first_wave') ? 'unlocked' : ''}">
            <div class="achievement-icon">👋</div>
            <div class="achievement-name">First Wave</div>
          </div>
          <div class="achievement-item ${this.achievements.has('social_butterfly') ? 'unlocked' : ''}">
            <div class="achievement-icon">🦋</div>
            <div class="achievement-name">Social Butterfly</div>
          </div>
          <div class="achievement-item ${this.achievements.has('century_club') ? 'unlocked' : ''}">
            <div class="achievement-icon">💯</div>
            <div class="achievement-name">Century Club</div>
          </div>
          <div class="achievement-item ${this.achievements.has('level_up') ? 'unlocked' : ''}">
            <div class="achievement-icon">⬆️</div>
            <div class="achievement-name">Level Up!</div>
          </div>
          <div class="achievement-item ${this.achievements.has('high_five') ? 'unlocked' : ''}">
            <div class="achievement-icon">✋</div>
            <div class="achievement-name">High Five</div>
          </div>
          <div class="achievement-item ${this.achievements.has('perfect_ten') ? 'unlocked' : ''}">
            <div class="achievement-icon">🔟</div>
            <div class="achievement-name">Perfect Ten</div>
          </div>
        </div>
        
        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255, 215, 0, 0.1); border-radius: 12px; border: 1px solid rgba(255, 215, 0, 0.2);">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">Daily Limits:</div>
          <div style="font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">
            • Hi Waves: 20 per day<br>
            • Location Shares: 5 per day<br>
            • Profile Updates: 2 per day<br>
            • Daily Login: 20 points bonus
          </div>
        </div>
      </div>
    `;
    
    // Add close functionality
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => modal.remove(), 300);
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => modal.remove(), 300);
      }
    });
    
    document.body.appendChild(modal);
  }

  // Reset beta data (for testing)
  resetBetaData() {
    this.points = 0;
    this.level = 1;
    this.streakDays = 0;
    this.achievements.clear();
    this.dailyActions.clear();
    
    localStorage.removeItem('hi_rewards_beta');
    localStorage.removeItem('hi_rewards_last_login');
    
    this.updateRewardsUI();
    this.showToast('Beta data reset! Start earning points again! 🚀', 'reset');
  }
}

// Initialize Hi Rewards Beta System
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other systems load first
  setTimeout(() => {
    window.HiRewardsBeta = new HiRewardsBeta();
    
    // Development helper
    if (window.location.hostname === 'localhost') {
      window.resetRewards = () => window.HiRewardsBeta.resetBetaData();
      console.log('🔧 Beta rewards helper: resetRewards()');
    }
  }, 1000);
});

// Global exposure for compatibility
window.HiRewardsBeta = HiRewardsBeta;