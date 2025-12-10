/**
 * 🏆 Profile History Timeline Component
 * Shows milestones, streaks, and activity history
 * Maintains Stay Hi vibe while adding depth
 */

class ProfileHistoryTimeline {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.goldProfile = window.goldProfile;
    this.userId = null;
  }

  async init(userId) {
    this.userId = userId;
    if (!this.container || !this.goldProfile) {
      console.warn('⚠️ Profile history not available');
      return;
    }

    await this.render();
  }

  async render() {
    if (!this.userId) return;

    this.container.innerHTML = `
      <div class="history-timeline">
        <div class="timeline-section">
          <h3 style="color: #fff; font-size: 18px; margin-bottom: 16px;">
            🏆 Recent Achievements
          </h3>
          <div id="milestones-list" class="milestones-container">
            <div class="loading">Loading milestones...</div>
          </div>
        </div>

        <div class="timeline-section" style="margin-top: 32px;">
          <h3 style="color: #fff; font-size: 18px; margin-bottom: 16px;">
            🔥 Streak History
          </h3>
          <div id="streak-calendar" class="streak-calendar">
            <div class="loading">Loading streak data...</div>
          </div>
        </div>

        <div class="timeline-section" style="margin-top: 32px;">
          <h3 style="color: #fff; font-size: 18px; margin-bottom: 16px;">
            📝 Recent Activity
          </h3>
          <div id="activity-feed" class="activity-feed">
            <div class="loading">Loading activity...</div>
          </div>
        </div>
      </div>
    `;

    // Load data
    await Promise.all([
      this.loadMilestones(),
      this.loadStreakHistory(),
      this.loadActivityHistory()
    ]);
  }

  async loadMilestones() {
    try {
      const milestones = await this.goldProfile.getMilestoneTimeline(this.userId, 10);
      const container = document.getElementById('milestones-list');
      
      if (!milestones || milestones.length === 0) {
        container.innerHTML = '<div class="empty-state">No milestones yet. Keep going! 🚀</div>';
        return;
      }

      container.innerHTML = milestones.map(m => {
        const date = new Date(m.achieved_at);
        const emoji = this.getMilestoneEmoji(m.milestone_type);
        
        return `
          <div class="milestone-card" style="
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.08)'" 
             onmouseout="this.style.background='rgba(255,255,255,0.05)'">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 32px;">${emoji}</span>
              <div style="flex: 1;">
                <div style="color: #fff; font-weight: 600; font-size: 16px;">
                  ${m.milestone_name}
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 4px;">
                  ${this.formatMilestoneValue(m)} · ${this.formatDate(date)}
                </div>
              </div>
              ${m.points_awarded ? `
                <div style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: #fff;
                  padding: 6px 12px;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 14px;
                ">
                  +${m.points_awarded} pts
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('❌ Error loading milestones:', error);
      document.getElementById('milestones-list').innerHTML = 
        '<div class="error-state">Could not load milestones</div>';
    }
  }

  async loadStreakHistory() {
    try {
      const history = await this.goldProfile.getStreakHistory(this.userId);
      const container = document.getElementById('streak-calendar');
      
      if (!history || history.length === 0) {
        container.innerHTML = '<div class="empty-state">No streak data yet</div>';
        return;
      }

      // Simple visual representation of last 30 days
      const last30Days = history.slice(0, 30);
      const maxStreak = Math.max(...last30Days.map(d => d.streak_value));
      
      container.innerHTML = `
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${last30Days.map(day => {
            const intensity = day.streak_value / maxStreak;
            const color = day.streak_value > 0 
              ? `rgba(102, 126, 234, ${0.3 + intensity * 0.7})`
              : 'rgba(255,255,255,0.05)';
            
            return `
              <div title="${day.date}: ${day.streak_value} day streak" style="
                width: 24px;
                height: 24px;
                background: ${color};
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.1);
              "></div>
            `;
          }).join('')}
        </div>
        <div style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 12px;">
          Last 30 days · Darker = stronger streak
        </div>
      `;
    } catch (error) {
      console.error('❌ Error loading streak history:', error);
      document.getElementById('streak-calendar').innerHTML = 
        '<div class="error-state">Could not load streak history</div>';
    }
  }

  async loadActivityHistory() {
    try {
      const activities = await this.goldProfile.getActivityHistory(this.userId, null, null, null, 10);
      const container = document.getElementById('activity-feed');
      
      if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="empty-state">No activity yet</div>';
        return;
      }

      container.innerHTML = activities.map(activity => {
        const date = new Date(activity.created_at);
        const emoji = this.getActivityEmoji(activity.share_type);
        
        return `
          <div class="activity-card" style="
            background: rgba(255,255,255,0.03);
            border-left: 3px solid rgba(102, 126, 234, 0.5);
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
          ">
            <div style="display: flex; gap: 12px; align-items: start;">
              <span style="font-size: 20px;">${emoji}</span>
              <div style="flex: 1;">
                <div style="color: #fff; font-size: 14px; line-height: 1.5;">
                  ${activity.content.substring(0, 100)}${activity.content.length > 100 ? '...' : ''}
                </div>
                <div style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 4px;">
                  ${this.formatDate(date)} · ${activity.share_type}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('❌ Error loading activity:', error);
      document.getElementById('activity-feed').innerHTML = 
        '<div class="error-state">Could not load activity</div>';
    }
  }

  getMilestoneEmoji(type) {
    const emojis = {
      waves: '👋',
      shares: '📝',
      streaks: '🔥',
      global: '🌍',
      special: '⭐'
    };
    return emojis[type] || '🏆';
  }

  getActivityEmoji(type) {
    const emojis = {
      hi5: '👋',
      moment: '✨',
      reflection: '💭',
      private: '🔒'
    };
    return emojis[type] || '📝';
  }

  formatMilestoneValue(milestone) {
    if (milestone.milestone_value) {
      return `${milestone.milestone_value} ${milestone.milestone_type}`;
    }
    return milestone.milestone_type;
  }

  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
  }
}

// Make globally available
window.ProfileHistoryTimeline = ProfileHistoryTimeline;
