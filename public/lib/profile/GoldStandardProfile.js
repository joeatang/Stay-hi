/**
 * 🏆 GOLD STANDARD PROFILE SYSTEM
 * Like Finch/Zero - Complete profile history, real-time sync, own your data
 * 
 * Features:
 * - Profile updates propagate immediately everywhere
 * - Historical streak tracking (see past streaks)
 * - Milestone timeline (view all achievements)
 * - Activity logs with date filtering
 * - Stats growth over time
 */

class GoldStandardProfile {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.cache = {
      profile: null,
      stats: null,
      milestones: [],
      streakHistory: [],
      activityHistory: []
    };
  }

  /**
   * Get complete user profile with all current data
   */
  async getCompleteProfile(userId) {
    try {
      const { data, error } = await this.supabase.rpc('get_user_profile_complete', {
        p_user_id: userId
      });

      if (error) throw error;
      
      this.cache.profile = data.profile;
      this.cache.stats = data.stats;
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching complete profile:', error);
      throw error;
    }
  }

  /**
   * Get streak history for calendar/graph visualization
   * @param {string} userId - User UUID
   * @param {Date} startDate - Start date (default: 90 days ago)
   * @param {Date} endDate - End date (default: today)
   */
  async getStreakHistory(userId, startDate = null, endDate = null) {
    try {
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await this.supabase.rpc('get_streak_history', {
        p_user_id: userId,
        p_start_date: start.toISOString().split('T')[0],
        p_end_date: end.toISOString().split('T')[0]
      });

      if (error) throw error;
      
      this.cache.streakHistory = data;
      return data;
    } catch (error) {
      console.error('❌ Error fetching streak history:', error);
      return [];
    }
  }

  /**
   * Get milestone timeline (all achievements in chronological order)
   * @param {string} userId - User UUID
   * @param {number} limit - Max number of milestones (default: 50)
   */
  async getMilestoneTimeline(userId, limit = 50) {
    try {
      const { data, error } = await this.supabase.rpc('get_milestone_timeline', {
        p_user_id: userId,
        p_limit: limit
      });

      if (error) throw error;
      
      this.cache.milestones = data || [];
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching milestone timeline:', error);
      return [];
    }
  }

  /**
   * Get activity history (Hi submissions, archives) with date filtering
   * @param {string} userId - User UUID
   * @param {Date} startDate - Start date (default: 90 days ago)
   * @param {Date} endDate - End date (default: today)
   * @param {string} shareType - Filter by type ('hi5', 'moment', 'reflection', null=all)
   * @param {number} limit - Max results (default: 100)
   */
  async getActivityHistory(userId, startDate = null, endDate = null, shareType = null, limit = 100) {
    try {
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data, error } = await this.supabase.rpc('get_activity_history', {
        p_user_id: userId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
        p_share_type: shareType,
        p_limit: limit
      });

      if (error) throw error;
      
      this.cache.activityHistory = data || [];
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching activity history:', error);
      return [];
    }
  }

  /**
   * Get stats growth over time (for charts/graphs)
   * @param {string} userId - User UUID
   * @param {Date} startDate - Start date (default: 90 days ago)
   */
  async getStatsGrowth(userId, startDate = null) {
    try {
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase.rpc('get_stats_growth', {
        p_user_id: userId,
        p_start_date: start.toISOString().split('T')[0]
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching stats growth:', error);
      return [];
    }
  }

  /**
   * Get public shares with LIVE profile data (not snapshots)
   * This ensures profile updates appear immediately in community feed
   */
  async getPublicSharesWithLiveProfiles(limit = 20, offset = 0) {
    try {
      const { data, error } = await this.supabase
        .from('public_shares_with_live_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching public shares with live profiles:', error);
      return [];
    }
  }

  /**
   * Update profile and see changes propagate immediately
   * @param {string} userId - User UUID
   * @param {object} updates - Profile fields to update
   */
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache
      this.cache.profile = data;
      
      console.log('✅ Profile updated - changes will appear immediately everywhere');
      return data;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Format streak history for calendar visualization
   */
  formatStreakCalendar(streakHistory) {
    return streakHistory.reduce((acc, entry) => {
      acc[entry.date] = {
        streak: entry.streak_value,
        milestone: entry.milestone_reached,
        active: entry.streak_value > 0
      };
      return acc;
    }, {});
  }

  /**
   * Format milestone timeline for display
   */
  formatMilestoneTimeline(milestones) {
    return milestones.map(m => ({
      id: m.id,
      name: m.milestone_name,
      type: m.milestone_type,
      points: m.points_awarded,
      value: m.milestone_value,
      date: new Date(m.achieved_at).toLocaleDateString(),
      timestamp: m.achieved_at
    }));
  }

  /**
   * Get stats summary for profile card
   */
  getStatsSummary() {
    if (!this.cache.stats) return null;
    
    return {
      totalMoments: this.cache.stats.total_hi_moments || 0,
      currentStreak: this.cache.stats.current_streak || 0,
      longestStreak: this.cache.stats.longest_streak || 0,
      totalWaves: this.cache.stats.total_waves || 0,
      level: this.cache.stats.level || 1,
      daysActive: this.cache.stats.days_active || 0
    };
  }

  /**
   * Clear local cache (force refresh from database)
   */
  clearCache() {
    this.cache = {
      profile: null,
      stats: null,
      milestones: [],
      streakHistory: [],
      activityHistory: []
    };
  }
}

// Make globally available
window.GoldStandardProfile = GoldStandardProfile;
