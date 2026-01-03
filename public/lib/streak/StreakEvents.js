/**
 * StreakEvents.js
 * Synchronized streak updates across dashboard and calendar
 * 
 * PROBLEM: Race conditions cause flicker (dashboard shows 4, calendar updates to 5)
 * SOLUTION: Event-driven atomic updates with state locking
 * 
 * Usage:
 *   await StreakEvents.broadcast(newStreakValue);
 *   // All displays update simultaneously, no flicker
 */

class StreakEvents {
  static #updateInProgress = false;
  static #pendingValue = null;

  /**
   * Broadcast streak update to all displays (atomic)
   * @param {number} newValue - New streak value
   * @returns {Promise<void>}
   */
  static async broadcast(newValue) {
    // 🔒 LOCK: Prevent concurrent updates
    if (this.#updateInProgress) {
      console.log('🔄 [StreakEvents] Update in progress, queueing:', newValue);
      this.#pendingValue = newValue;
      return;
    }

    this.#updateInProgress = true;
    
    try {
      console.log('📢 [StreakEvents] Broadcasting streak update:', newValue);
      
      // 🎯 ATOMIC: Update all displays simultaneously
      await Promise.all([
        this.#updateDashboardPill(newValue),
        this.#updateWeeklyGrid(),
        this.#updateCalendarDisplay(newValue)
      ]);
      
      // 📢 EVENT: Notify any listeners
      window.dispatchEvent(new CustomEvent('hi:streak-synced', {
        detail: { 
          value: newValue, 
          timestamp: Date.now(),
          source: 'StreakEvents'
        }
      }));
      
      console.log('✅ [StreakEvents] Broadcast complete');
      
    } catch (error) {
      console.error('❌ [StreakEvents] Broadcast failed:', error);
    } finally {
      // 🔓 UNLOCK: Release lock
      this.#updateInProgress = false;
      
      // 🔄 PROCESS QUEUE: Handle pending update if any
      if (this.#pendingValue !== null) {
        const pending = this.#pendingValue;
        this.#pendingValue = null;
        console.log('🔄 [StreakEvents] Processing queued update:', pending);
        setTimeout(() => this.broadcast(pending), 50);
      }
    }
  }

  /**
   * Update dashboard stat pill (private)
   * @private
   */
  static async #updateDashboardPill(value) {
    const el = document.getElementById('userStreak');
    if (el) {
      el.textContent = value;
      console.log('📊 [StreakEvents] Dashboard pill updated:', value);
    }
  }

  /**
   * Update 7-day visual grid (private)
   * @private
   */
  static async #updateWeeklyGrid() {
    if (typeof window.setupWeeklyProgress === 'function') {
      await window.setupWeeklyProgress();
      console.log('📅 [StreakEvents] Weekly grid updated');
    }
  }

  /**
   * Update calendar display if open (private)
   * @private
   */
  static async #updateCalendarDisplay(value) {
    if (window.PremiumCalendar?.instance?.remoteStreak) {
      window.PremiumCalendar.instance.remoteStreak.current = value;
      if (typeof window.PremiumCalendar.instance.updateCalendar === 'function') {
        window.PremiumCalendar.instance.updateCalendar();
        console.log('📆 [StreakEvents] Calendar updated');
      }
    }
  }

  /**
   * Listen for streak updates from any source
   * @param {Function} callback - Called with new streak value
   */
  static onUpdate(callback) {
    window.addEventListener('hi:streak-synced', (event) => {
      callback(event.detail.value, event.detail);
    });
  }
}

// Global export
window.StreakEvents = StreakEvents;
