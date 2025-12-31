/**
 * HiDash.cta.js - S-DASH Hero CTA Wiring
 * 
 * Flag-gated Hi-5 interaction handler with debouncing, local counter updates,
 * server sync, offline queuing, and replay logic.
 */

// Flag-gated initialization
(async function initSDashHeroCTA() {
  try {
    // Wait for HiFlags to be available with initialization delay
    let attempts = 0;
    while (!window.HiFlags && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.HiFlags) {
      console.warn('[S-DASH] HiFlags not available after timeout, skipping hero CTA wiring');
      return;
    }

    // Check required flags
    const [dashV3, medallionCta] = await Promise.all([
      window.HiFlags.getFlag('hi_dash_v3', false),
      window.HiFlags.getFlag('hi_dash_medallion_cta_v1', false)
    ]);

    if (!dashV3 || !medallionCta) {
      console.log('[S-DASH] Hero CTA disabled by flags', { dashV3, medallionCta });
      return;
    }

    console.log('[S-DASH] Hero CTA wiring enabled');
    
    // Initialize CTA handler
    await initHeroCTAHandler();

    // 🎯 QUEUE REPLAY DISABLED - dashboard-main.mjs handles all persistence
    // await replayQueuedTaps();

    // Listen for HiBase (no longer needed for database sync, kept for future use)
    if (window.HiBase?.stats?.insertMedallionTap) {
      console.log('[S-DASH] HiBase available (visual feedback mode)');
    }

  } catch (error) {
    console.error('[S-DASH] Hero CTA initialization failed:', error);
  }
})();

// State management
const CTAState = {
  lastTapTime: 0,
  sessionTapCount: 0,
  debounceDelay: 200, // Max 5 taps/sec (200ms min interval)
  targetElement: null
};

/**
 * Initialize hero CTA handler
 */
async function initHeroCTAHandler() {
  // Find target element - prefer #hiMedallion, fallback to #giveHiBtn
  const hiMedallion = document.getElementById('hiMedallion');
  const giveHiBtn = document.getElementById('giveHiBtn');
  
  CTAState.targetElement = hiMedallion || giveHiBtn;
  
  if (!CTAState.targetElement) {
    console.warn('[S-DASH] No hero CTA target found (#hiMedallion or #giveHiBtn)');
    return;
  }

  const targetId = CTAState.targetElement.id;
  console.log(`[S-DASH] Hero CTA target: #${targetId}`);

  // Attach click handler
  CTAState.targetElement.addEventListener('click', handleHeroTap);
  CTAState.targetElement.addEventListener('touchstart', handleHeroTap);

  console.log('[S-DASH] Hero CTA handler attached');
}

/**
 * Handle hero tap/click with debouncing and local updates
 */
async function handleHeroTap(event) {
  event.preventDefault();
  event.stopPropagation();

  const now = Date.now();
  
  // Debounce check (max 5 taps/sec)
  if (now - CTAState.lastTapTime < CTAState.debounceDelay) {
    console.log('[S-DASH] Tap debounced (too fast)');
    return;
  }

  CTAState.lastTapTime = now;
  CTAState.sessionTapCount++;

  // Visual feedback - pulse effect
  addPulseEffect();

  // Increment local counter immediately
  incrementLocalCounter();

  // 🎯 DATABASE SYNC DISABLED - dashboard-main.mjs handles all database writes
  // This prevents double-incrementing while keeping visual feedback responsive
  const success = false; // Skip server sync (handled by dashboard-main.mjs)
  
  // Don't queue for replay either (dashboard-main.mjs handles persistence)
  // queueTapForReplay(now);

  // Emit telemetry
  console.log('hibase.hi5.tap', {
    queued: false,
    ts: now,
    sessionCount: CTAState.sessionTapCount,
    note: 'Visual feedback only - sync handled by dashboard-main.mjs'
  });
}

/**
 * Add visual pulse effect
 */
function addPulseEffect() {
  if (!CTAState.targetElement) return;

  CTAState.targetElement.classList.add('pulse');
  
  setTimeout(() => {
    CTAState.targetElement.classList.remove('pulse');
  }, 150);
}

/**
 * Increment local counter display
 */
function incrementLocalCounter() {
  const statTotal = document.getElementById('statTotal');
  if (statTotal) {
    const current = parseInt(statTotal.textContent) || 0;
    statTotal.textContent = (current + 1).toString();
    console.log(`[S-DASH] Local counter updated: ${current + 1}`);
  }
}

/**
 * Attempt server sync for the tap
 */
async function attemptServerSync() {
  try {
    // Check if we're online
    if (!navigator.onLine) {
      console.log('[S-DASH] Offline - queueing tap');
      return false;
    }

    // Try HiBase.stats.insertMedallionTap first
    if (window.HiBase?.stats?.insertMedallionTap) {
      console.log('[S-DASH] Syncing tap via HiBase...');
      
      // Get current user (null for anonymous)
      const user = window.HiBase?.auth?.getCurrentUser();
      const userId = user?.data?.id || null;
      
      const result = await window.HiBase.stats.insertMedallionTap(userId);
      
      if (result.error) {
        console.warn('[S-DASH] HiBase sync failed:', result.error);
        return false;
      }
      
      console.log('[S-DASH] ✅ HiBase sync successful:', result.data);
      return true;
    }

    // Fallback: try existing incrementHiWave function
    if (typeof window.incrementHiWave === 'function') {
      console.log('[S-DASH] Syncing tap via incrementHiWave...');
      await window.incrementHiWave();
      console.log('[S-DASH] ✅ incrementHiWave sync successful');
      return true;
    }

    console.warn('[S-DASH] No sync method available');
    return false;

  } catch (error) {
    console.error('[S-DASH] Server sync failed:', error);
    return false;
  }
}

/**
 * Queue tap for offline replay
 */
function queueTapForReplay(timestamp) {
  try {
    const queueKey = 'hi_wave_queue';
    const existing = localStorage.getItem(queueKey);
    const queue = existing ? JSON.parse(existing) : [];
    
    queue.push({ ts: timestamp });
    localStorage.setItem(queueKey, JSON.stringify(queue));
    
    console.log(`[S-DASH] Tap queued for replay (queue size: ${queue.length})`);
  } catch (error) {
    console.error('[S-DASH] Failed to queue tap:', error);
  }
}

/**
 * Replay queued taps on load
 */
async function replayQueuedTaps() {
  try {
    const queueKey = 'hi_wave_queue';
    const existing = localStorage.getItem(queueKey);
    
    if (!existing) {
      console.log('[S-DASH] No queued taps to replay');
      return;
    }

    const queue = JSON.parse(existing);
    if (queue.length === 0) {
      console.log('[S-DASH] Queue empty');
      return;
    }

    console.log(`[S-DASH] Replaying ${queue.length} queued taps...`);

    // Check if we're online
    if (!navigator.onLine) {
      console.log('[S-DASH] Still offline - keeping queue');
      return;
    }

    // Replay each tap (best effort)
    let successCount = 0;
    const failedTaps = [];

    for (const tap of queue) {
      const success = await attemptServerSync();
      if (success) {
        successCount++;
        console.log('hibase.hi5.tap', {
          queued: false,
          ts: tap.ts,
          replayed: true
        });
      } else {
        failedTaps.push(tap);
      }

      // Small delay between replays to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update queue with failed taps only
    if (failedTaps.length > 0) {
      localStorage.setItem(queueKey, JSON.stringify(failedTaps));
      console.log(`[S-DASH] Replay complete: ${successCount} success, ${failedTaps.length} still queued`);
    } else {
      localStorage.removeItem(queueKey);
      console.log(`[S-DASH] ✅ All ${successCount} queued taps replayed successfully`);
    }

  } catch (error) {
    console.error('[S-DASH] Tap replay failed:', error);
  }
}

// Add CSS for pulse effect if not already present
if (!document.getElementById('sdash-pulse-styles')) {
  const style = document.createElement('style');
  style.id = 'sdash-pulse-styles';
  style.textContent = `
    .pulse {
      animation: sdash-pulse 150ms ease-out;
    }
    
    @keyframes sdash-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}