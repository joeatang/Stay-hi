/**
 * 🏆 BULLETPROOF HI OS FRONTEND ARCHITECTURE
 * MISSION: Complete tracking system for Global + Individual + Achievements
 * Handles: Medallion taps, Share submissions, User progress, Milestones
 */

class HiOSCompleteTracker {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.cache = {
      globalStats: null,
      userStats: null,
      lastUpdate: null
    };
    
    this.init();
  }
  
  async init() {
    // Get Supabase client with comprehensive fallback
    this.supabase = window.getSupabase?.() || window.supabaseClient || window.sb || 
                   window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
                   
    // Get current user if available
    this.currentUser = await this.getCurrentUser();
    
    console.log('🎯 Hi OS Complete Tracker initialized', {
      hasSupabase: !!this.supabase,
      hasUser: !!this.currentUser
    });
  }
  
  async getCurrentUser() {
    if (!this.supabase) return null;
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user;
    } catch (error) {
      console.warn('⚠️ Could not get current user:', error);
      return null;
    }
  }
  
  /**
   * 🎯 MEDALLION TAP TRACKER
   * Handles: Global hi waves + Individual tracking + Achievements
   */
  async trackMedallionTap(sourcePage = 'hi-dashboard') {
    console.log(`🎯 Tracking medallion tap from ${sourcePage}`);
    
    if (!this.supabase) {
      console.warn('⚠️ No Supabase - using local fallback');
      return this.localFallback('medallion_tap', sourcePage);
    }
    
    try {
      const { data, error } = await this.supabase.rpc('track_medallion_tap', {
        p_user_id: this.currentUser?.id || null,
        p_source_page: sourcePage
      });
      
      if (error) {
        console.error('❌ Medallion tap tracking failed:', error);
        return this.localFallback('medallion_tap', sourcePage);
      }
      
      console.log('✅ Medallion tap tracked successfully:', data);
      
      // Update UI immediately
      await this.updateGlobalStatsUI();
      
      // Show milestone if unlocked
      if (data.milestone_unlocked) {
        this.showMilestoneNotification(data.milestone_unlocked, data.points_earned);
      }
      
      return {
        success: true,
        globalHiWaves: data.global_hi_waves,
        personalHiWaves: data.personal_hi_waves,
        pointsEarned: data.points_earned,
        milestoneUnlocked: data.milestone_unlocked
      };
      
    } catch (error) {
      console.error('❌ Medallion tap error:', error);
      return this.localFallback('medallion_tap', sourcePage);
    }
  }
  
  /**
   * 🎯 SHARE SUBMISSION TRACKER  
   * Handles: Total His + Individual tracking + Achievements
   */
  async trackShareSubmission(sourcePage = 'hi-dashboard', submissionData = {}) {
    console.log(`📤 Tracking share submission from ${sourcePage}:`, submissionData);
    
    if (!this.supabase) {
      console.warn('⚠️ No Supabase - using local fallback');
      return this.localFallback('share_submission', sourcePage);
    }
    
    try {
      const { data, error } = await this.supabase.rpc('track_share_submission', {
        p_user_id: this.currentUser?.id || null,
        p_source_page: sourcePage,
        p_submission_data: submissionData
      });
      
      if (error) {
        console.error('❌ Share submission tracking failed:', error);
        return this.localFallback('share_submission', sourcePage);
      }
      
      console.log('✅ Share submission tracked successfully:', data);
      
      // Update UI immediately
      await this.updateGlobalStatsUI();
      
      // Show milestone if unlocked
      if (data.milestone_unlocked) {
        this.showMilestoneNotification(data.milestone_unlocked, data.points_earned);
      }
      
      return {
        success: true,
        totalHis: data.total_his,
        personalHis: data.personal_his,
        pointsEarned: data.points_earned,
        milestoneUnlocked: data.milestone_unlocked
      };
      
    } catch (error) {
      console.error('❌ Share submission error:', error);
      return this.localFallback('share_submission', sourcePage);
    }
  }
  
  /**
   * 🌍 GET GLOBAL COMMUNITY STATS
   */
  async getGlobalStats() {
    if (!this.supabase) {
      return this.getLocalGlobalStats();
    }
    
    try {
      const { data, error } = await this.supabase.rpc('get_global_community_stats');
      
      if (error || !data || data.length === 0) {
        console.warn('⚠️ Global stats fetch failed, using cache/fallback');
        return this.getLocalGlobalStats();
      }
      
      const stats = data[0];
      
      // Cache the results
      this.cache.globalStats = {
        globalHiWaves: stats.global_hi_waves,
        totalHis: stats.total_his,
        totalUsers: stats.total_users,
        updatedAt: stats.updated_at
      };
      this.cache.lastUpdate = Date.now();
      
      return this.cache.globalStats;
      
    } catch (error) {
      console.error('❌ Global stats error:', error);
      return this.getLocalGlobalStats();
    }
  }
  
  /**
   * 👤 GET INDIVIDUAL USER STATS
   */
  async getUserStats() {
    if (!this.currentUser || !this.supabase) {
      return this.getLocalUserStats();
    }
    
    try {
      const { data, error } = await this.supabase.rpc('get_user_complete_stats', {
        p_user_id: this.currentUser.id
      });
      
      if (error) {
        console.warn('⚠️ User stats fetch failed:', error);
        return this.getLocalUserStats();
      }
      
      // Cache the results
      this.cache.userStats = data;
      
      return data;
      
    } catch (error) {
      console.error('❌ User stats error:', error);
      return this.getLocalUserStats();
    }
  }
  
  /**
   * 🎨 UPDATE UI DISPLAYS
   */
  async updateGlobalStatsUI() {
    const stats = await this.getGlobalStats();
    
    // Update Global Hi Waves displays
    document.querySelectorAll('.global-hi-waves, #globalHiWaves, [data-stat="global-hi-waves"]').forEach(el => {
      el.textContent = stats.globalHiWaves?.toLocaleString() || '0';
    });
    
    // Update Total His displays
    document.querySelectorAll('.total-his-count, #globalTotalHis, #totalHis, [data-stat="total-his"]').forEach(el => {
      el.textContent = stats.totalHis?.toLocaleString() || '0';
    });
    
    // Update Total Users displays
    document.querySelectorAll('.total-users, #totalUsers, [data-stat="total-users"]').forEach(el => {
      el.textContent = stats.totalUsers?.toLocaleString() || '0';
    });
    
    // Update cache for window globals (legacy compatibility)
    window.gWaves = stats.globalHiWaves || 0;
    window.gTotalHis = stats.totalHis || 0;
    
    console.log('🎨 Global stats UI updated:', stats);
  }
  
  async updateUserStatsUI() {
    if (!this.currentUser) return;
    
    const userStats = await this.getUserStats();
    const personalStats = userStats.personal_stats;
    
    if (!personalStats) return;
    
    // Update personal displays
    document.querySelectorAll('[data-stat="personal-hi-waves"]').forEach(el => {
      el.textContent = personalStats.personal_hi_waves?.toLocaleString() || '0';
    });
    
    document.querySelectorAll('[data-stat="personal-his"]').forEach(el => {
      el.textContent = personalStats.personal_his?.toLocaleString() || '0';
    });
    
    document.querySelectorAll('[data-stat="user-level"]').forEach(el => {
      el.textContent = personalStats.user_level || '1';
    });
    
    document.querySelectorAll('[data-stat="experience-points"]').forEach(el => {
      el.textContent = personalStats.experience_points?.toLocaleString() || '0';
    });
    
    document.querySelectorAll('[data-stat="current-streak"]').forEach(el => {
      el.textContent = personalStats.current_streak || '0';
    });
    
    document.querySelectorAll('[data-stat="achievements-count"]').forEach(el => {
      el.textContent = userStats.achievements_unlocked || '0';
    });
    
    console.log('👤 User stats UI updated:', personalStats);
  }
  
  /**
   * 🏆 MILESTONE NOTIFICATIONS
   */
  showMilestoneNotification(achievementId, pointsEarned) {
    console.log('🏆 Milestone unlocked:', achievementId, 'Points:', pointsEarned);
    
    // Create celebration notification
    const notification = document.createElement('div');
    notification.className = 'milestone-notification';
    notification.innerHTML = `
      <div class="milestone-content">
        <div class="milestone-icon">🏆</div>
        <div class="milestone-text">
          <div class="milestone-title">Achievement Unlocked!</div>
          <div class="milestone-name">${this.getAchievementName(achievementId)}</div>
          <div class="milestone-points">+${pointsEarned} XP</div>
        </div>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #000;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Trigger celebration effects if available
    if (window.PremiumUX?.confetti) {
      setTimeout(() => window.PremiumUX.confetti({ count: 50 }), 500);
    }
  }
  
  getAchievementName(achievementId) {
    const names = {
      'first_wave': 'First Wave! 👋',
      'wave_master': 'Wave Master 🌊',
      'first_share': 'First Share! 🎉',
      'share_warrior': 'Share Warrior ⚔️',
      'share_master': 'Share Master 🏆',
      'streak_7': '7-Day Streak 🔥',
      'streak_30': '30-Day Streak ⚡'
    };
    return names[achievementId] || achievementId;
  }
  
  /**
   * 💾 LOCAL FALLBACK SYSTEMS
   */
  localFallback(actionType, sourcePage) {
    console.log(`💾 Using local fallback for ${actionType} from ${sourcePage}`);
    
    if (actionType === 'medallion_tap') {
      window.gWaves = (window.gWaves || 0) + 1;
      
      document.querySelectorAll('.global-hi-waves, #globalHiWaves').forEach(el => {
        el.textContent = window.gWaves.toLocaleString();
      });
      
      return { success: false, fallback: true, globalHiWaves: window.gWaves };
    }
    
    if (actionType === 'share_submission') {
      window.gTotalHis = (window.gTotalHis || 0) + 1;
      
      document.querySelectorAll('.total-his-count, #globalTotalHis, #totalHis').forEach(el => {
        el.textContent = window.gTotalHis.toLocaleString();
      });
      
      return { success: false, fallback: true, totalHis: window.gTotalHis };
    }
  }
  
  getLocalGlobalStats() {
    return {
      globalHiWaves: window.gWaves || 0,
      totalHis: window.gTotalHis || 86,
      totalUsers: window.gTotalUsers || 0,
      updatedAt: new Date().toISOString()
    };
  }
  
  getLocalUserStats() {
    // Return basic local stats structure
    return {
      personal_stats: {
        personal_hi_waves: 0,
        personal_his: 0,
        experience_points: 0,
        user_level: 1,
        current_streak: 0
      },
      achievements_unlocked: 0,
      recent_activity: []
    };
  }
}

// Initialize global tracker
window.HiOSTracker = new HiOSCompleteTracker();

// Export convenient methods for use across pages
window.trackMedallionTap = (sourcePage) => window.HiOSTracker.trackMedallionTap(sourcePage);
window.trackShareSubmission = (sourcePage, data) => window.HiOSTracker.trackShareSubmission(sourcePage, data);
window.updateGlobalStats = () => window.HiOSTracker.updateGlobalStatsUI();
window.updateUserStats = () => window.HiOSTracker.updateUserStatsUI();

console.log('🏆 Hi OS Complete Frontend Tracker loaded and ready!');