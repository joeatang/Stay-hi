// Tesla-Grade Activity Tracking System
// Handles all user activity logging with premium UX

(function() {
  'use strict';

  class ActivityTracker {
    constructor() {
      this.isTracking = false;
      this.currentSession = null;
      this.pendingActivities = [];
      this.retryQueue = [];
    }

    // Initialize tracking system
    async init() {
      if (!window.supabaseClient || !window.currentUser) {
        console.warn('Activity tracker: Supabase or user not available');
        return false;
      }

      this.isTracking = true;
      await this.startSession();
      return true;
    }

    // Start activity session
    async startSession(sessionType = 'general') {
      try {
        const { data, error } = await window.supabaseClient
          .from('activity_sessions')
          .insert({
            user_id: window.currentUser.id,
            session_type: sessionType,
            start_time: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        this.currentSession = data;
        
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('light');
        }

        return data.id;
      } catch (error) {
        console.error('Failed to start session:', error);
        return null;
      }
    }

    // End current session
    async endSession() {
      if (!this.currentSession) return;

      try {
        const endTime = new Date();
        const startTime = new Date(this.currentSession.start_time);
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

        await window.supabaseClient
          .from('activity_sessions')
          .update({
            end_time: endTime.toISOString(),
            duration_minutes: durationMinutes,
            activities_completed: this.currentSession.activities_completed || 0
          })
          .eq('id', this.currentSession.id);

        this.currentSession = null;
        
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('success');
        }
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    // Log Island Activity
    async logIslandActivity(activityData) {
      try {
        const activity = {
          user_id: window.currentUser.id,
          activity_type: activityData.type || 'visit',
          location_name: activityData.location,
          latitude: activityData.latitude,
          longitude: activityData.longitude,
          duration_minutes: activityData.duration,
          mood_rating: activityData.mood,
          notes: activityData.notes,
          photo_url: activityData.photo
        };

        // Use database function for proper stat updates
        const { data, error } = await window.supabaseClient
          .rpc('log_island_activity', {
            p_user_id: activity.user_id,
            p_activity_type: activity.activity_type,
            p_location_name: activity.location_name,
            p_latitude: activity.latitude,
            p_longitude: activity.longitude,
            p_duration_minutes: activity.duration_minutes,
            p_mood_rating: activity.mood_rating,
            p_notes: activity.notes
          });

        if (error) throw error;

        // Update session
        if (this.currentSession) {
          this.currentSession.activities_completed = (this.currentSession.activities_completed || 0) + 1;
        }

        // Premium feedback
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('success');
          window.PremiumUX.showToast('Island activity logged! 🏝️', 'success');
        }

        // Emit event for UI updates
        window.dispatchEvent(new CustomEvent('activityLogged', {
          detail: { type: 'island', activity: activity, id: data }
        }));

        return data;
      } catch (error) {
        console.error('Failed to log island activity:', error);
        this.queueForRetry('island', activityData);
        
        if (window.PremiumUX) {
          window.PremiumUX.showToast('Activity saved locally, will sync when online', 'warning');
        }
        
        return null;
      }
    }

    // Log Muscle Activity
    async logMuscleActivity(activityData) {
      try {
        const activity = {
          user_id: window.currentUser.id,
          workout_type: activityData.workoutType || 'strength',
          exercise_name: activityData.exercise,
          category: activityData.category,
          sets: activityData.sets,
          reps: activityData.reps,
          weight_kg: activityData.weight,
          duration_minutes: activityData.duration,
          calories_burned: activityData.calories,
          intensity_level: activityData.intensity,
          notes: activityData.notes
        };

        // Use database function for proper stat updates
        const { data, error } = await window.supabaseClient
          .rpc('log_muscle_activity', {
            p_user_id: activity.user_id,
            p_workout_type: activity.workout_type,
            p_exercise_name: activity.exercise_name,
            p_category: activity.category,
            p_sets: activity.sets,
            p_reps: activity.reps,
            p_weight_kg: activity.weight_kg,
            p_duration_minutes: activity.duration_minutes,
            p_calories_burned: activity.calories_burned,
            p_intensity_level: activity.intensity_level
          });

        if (error) throw error;

        // Update session
        if (this.currentSession) {
          this.currentSession.activities_completed = (this.currentSession.activities_completed || 0) + 1;
        }

        // Premium feedback
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('success');
          window.PremiumUX.showToast(`${activity.exercise_name} logged! 💪`, 'success');
        }

        // Emit event for UI updates
        window.dispatchEvent(new CustomEvent('activityLogged', {
          detail: { type: 'muscle', activity: activity, id: data }
        }));

        return data;
      } catch (error) {
        console.error('Failed to log muscle activity:', error);
        this.queueForRetry('muscle', activityData);
        
        if (window.PremiumUX) {
          window.PremiumUX.showToast('Workout saved locally, will sync when online', 'warning');
        }
        
        return null;
      }
    }

    // Log Daily Hi Moment
    async logDailyMoment(momentData) {
      try {
        const moment = {
          user_id: window.currentUser.id,
          moment_type: momentData.type || 'reflection',
          title: momentData.title,
          description: momentData.description,
          mood_rating: momentData.mood,
          energy_level: momentData.energy,
          tags: momentData.tags || [],
          is_favorite: momentData.favorite || false
        };

        const { data, error } = await window.supabaseClient
          .from('daily_hi_moments')
          .insert(moment)
          .select()
          .single();

        if (error) throw error;

        // Premium feedback
        if (window.PremiumUX) {
          window.PremiumUX.triggerHapticFeedback('success');
          window.PremiumUX.showToast('Hi moment captured! ✨', 'success');
        }

        // Emit event for UI updates
        window.dispatchEvent(new CustomEvent('activityLogged', {
          detail: { type: 'daily', activity: moment, id: data.id }
        }));

        return data.id;
      } catch (error) {
        console.error('Failed to log daily moment:', error);
        this.queueForRetry('daily', momentData);
        return null;
      }
    }

    // Get user streaks
    async getUserStreaks() {
      try {
        const { data, error } = await window.supabaseClient
          .from('user_streaks')
          .select('*')
          .eq('user_id', window.currentUser.id);

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Failed to get user streaks:', error);
        return [];
      }
    }

    // Get recent activities
    async getRecentActivities(limit = 10) {
      try {
        const [islandData, muscleData, momentsData] = await Promise.all([
          window.supabaseClient
            .from('island_activities')
            .select('*, created_at')
            .eq('user_id', window.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit),
          
          window.supabaseClient
            .from('muscle_activities')
            .select('*, created_at')
            .eq('user_id', window.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit),
          
          window.supabaseClient
            .from('daily_hi_moments')
            .select('*, created_at')
            .eq('user_id', window.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit)
        ]);

        // Combine and sort all activities
        const allActivities = [
          ...(islandData.data || []).map(a => ({ ...a, type: 'island' })),
          ...(muscleData.data || []).map(a => ({ ...a, type: 'muscle' })),
          ...(momentsData.data || []).map(a => ({ ...a, type: 'daily' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return allActivities;
      } catch (error) {
        console.error('Failed to get recent activities:', error);
        return [];
      }
    }

    // Queue activity for retry if offline
    queueForRetry(type, data) {
      this.retryQueue.push({ type, data, timestamp: Date.now() });
      
      // Try to sync when online
      if (navigator.onLine) {
        setTimeout(() => this.processPendingActivities(), 5000);
      }
    }

    // Process pending activities when back online
    async processPendingActivities() {
      if (this.retryQueue.length === 0) return;

      const queue = [...this.retryQueue];
      this.retryQueue = [];

      for (const item of queue) {
        try {
          switch (item.type) {
            case 'island':
              await this.logIslandActivity(item.data);
              break;
            case 'muscle':
              await this.logMuscleActivity(item.data);
              break;
            case 'daily':
              await this.logDailyMoment(item.data);
              break;
          }
        } catch (error) {
          // Re-queue if still failing
          this.retryQueue.push(item);
        }
      }

      if (this.retryQueue.length === 0 && window.PremiumUX) {
        window.PremiumUX.showToast('All activities synced! ✅', 'success');
      }
    }
  }

  // Initialize global activity tracker
  window.ActivityTracker = new ActivityTracker();

  // Auto-initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.ActivityTracker.init(), 1000);
    });
  } else {
    setTimeout(() => window.ActivityTracker.init(), 1000);
  }

  // Handle online/offline events
  window.addEventListener('online', () => {
    window.ActivityTracker.processPendingActivities();
  });

  // End session on page unload
  window.addEventListener('beforeunload', () => {
    if (window.ActivityTracker.currentSession) {
      navigator.sendBeacon('/api/end-session', JSON.stringify({
        sessionId: window.ActivityTracker.currentSession.id
      }));
    }
  });

})();