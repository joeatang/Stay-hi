/**
 * HiDash.share.js
 * S-DASH/5: Share CTA Wiring Module
 * 
 * Flag-gated share button integration with existing HiShareSheet
 * Handles online/offline submission with localStorage queue
 */

// Guard: Only proceed if S-DASH flags are enabled
(async function initShareCTA() {
  try {
    // Wait for HiFlags to be ready
    if (typeof window.HiFlags?.isEnabled !== 'function') {
      console.log('[S-DASH/5] HiFlags not available, skipping share CTA initialization');
      return;
    }

    // Check feature flags
    const dashV3 = window.HiFlags.isEnabled('hi_dash_v3');
    const shareCta = window.HiFlags.isEnabled('hi_dash_share_cta_v1');

    if (!dashV3 || !shareCta) {
      console.log('[S-DASH/5] Share CTA disabled by flags:', { dashV3, shareCta });
      return;
    }

    console.log('[S-DASH/5] Initializing share CTA wiring...');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initShareHandler);
    } else {
      initShareHandler();
    }

  } catch (error) {
    console.warn('[S-DASH/5] Share CTA initialization error:', error);
  }
})();

function initShareHandler() {
  try {
    // Find target element: prefer #giveHiBtn, fallback to #selfHi5Enhanced
    const shareBtn = document.getElementById('giveHiBtn') || document.getElementById('selfHi5Enhanced');
    
    if (!shareBtn) {
      console.log('[S-DASH/5] Share CTA target not found (#giveHiBtn or #selfHi5Enhanced)');
      return;
    }

    console.log('[S-DASH/5] Share CTA target found:', shareBtn.id);

    // Attach click handler with debouncing
    let lastClickTime = 0;
    shareBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastClickTime < 300) {
        console.log('[S-DASH/5] Share CTA click debounced');
        return;
      }
      lastClickTime = now;

      await handleShareClick(shareBtn);
    });

    // Replay queued shares on load
    setTimeout(replayQueuedShares, 1000);

    console.log('[S-DASH/5] Share CTA handler attached successfully');

  } catch (error) {
    console.error('[S-DASH/5] Share CTA handler setup failed:', error);
  }
}

async function handleShareClick(shareBtn) {
  try {
    console.log('hibase.share.open', { 
      timestamp: Date.now(), 
      button: shareBtn.id, 
      context: 'dashboard' 
    });

    // Add pulse feedback
    shareBtn.classList.add('pulse');
    setTimeout(() => shareBtn.classList.remove('pulse'), 150);

    // Check if HiShareSheet is available
    const shareSheetInstance = window.__hiComponentsInitialized?.shareSheetInstance;
    
    if (!shareSheetInstance) {
      console.error('[S-DASH/5] HiShareSheet instance not found');
      return;
    }

    // Set up submission handler
    shareSheetInstance.onSuccess = async (shareData) => {
      await handleShareSubmission(shareData);
    };

    // Open share sheet
    shareSheetInstance.open({
      context: 'dashboard',
      preset: 'hi5',
      prefilledText: '🙌 Giving myself a Hi5! ',
      type: 'Hi5'
    });

  } catch (error) {
    console.error('[S-DASH/5] Share CTA click failed:', error);
  }
}

async function handleShareSubmission(shareData) {
  const timestamp = Date.now();
  
  try {
    // Build payload from share sheet data
    const payload = {
      ts: timestamp,
      text: shareData.text || shareData.message || '',
      mood: shareData.mood || null,
      anon: shareData.visibility === 'anonymous',
      visibility: shareData.visibility || 'private'
    };

    // Try server submission first
    const success = await attemptServerSubmission(payload);
    
    if (success) {
      // Success: update local UI and emit telemetry
      updateLocalUI();
      console.log('hibase.share.submit', { 
        queued: false, 
        ts: timestamp,
        visibility: payload.visibility 
      });
    } else {
      // Failed: queue for offline replay
      queueShareForReplay(payload);
      console.log('hibase.share.submit', { 
        queued: true, 
        ts: timestamp,
        visibility: payload.visibility 
      });
    }

  } catch (error) {
    console.error('[S-DASH/5] Share submission failed:', error);
    
    // Queue for retry on any error
    const payload = { ts: timestamp, text: shareData.text || '', visibility: 'private' };
    queueShareForReplay(payload);
    console.log('hibase.share.submit', { 
      queued: true, 
      ts: timestamp, 
      error: error.message 
    });
  }
}

async function attemptServerSubmission(payload) {
  try {
    // Try HiBase.shares.create() first
    if (window.HiBase?.shares?.createHiShare) {
      const { data, error } = await window.HiBase.shares.createHiShare({
        message: payload.text,
        visibility: payload.visibility,
        mood_context: payload.mood,
        type: 'Hi5'
      });

      if (data && !error) {
        return true;
      }
    }

    // Fallback to legacy API if available
    if (window.insertArchive && window.insertPublicShare) {
      if (payload.visibility === 'public' || payload.visibility === 'anonymous') {
        await window.insertPublicShare({
          text: payload.text,
          visibility: payload.visibility
        });
      } else {
        await window.insertArchive({
          text: payload.text,
          type: 'Hi5'
        });
      }
      return true;
    }

    return false;

  } catch (error) {
    console.warn('[S-DASH/5] Server submission failed:', error);
    return false;
  }
}

function updateLocalUI() {
  try {
    // Update global pill hi-5s count if visible
    const globalPill = document.getElementById('globalPill');
    if (globalPill && globalPill.textContent) {
      const text = globalPill.textContent;
      const match = text.match(/(\d+)\s*hi-5s/);
      if (match) {
        const currentCount = parseInt(match[1]);
        const newText = text.replace(/(\d+)(\s*hi-5s)/, (currentCount + 1) + '$2');
        globalPill.textContent = newText;
      }
    }
  } catch (error) {
    console.warn('[S-DASH/5] Local UI update failed:', error);
  }
}

function queueShareForReplay(payload) {
  try {
    const queue = JSON.parse(localStorage.getItem('hi_share_queue') || '[]');
    queue.push({
      ...payload,
      queuedAt: Date.now()
    });
    localStorage.setItem('hi_share_queue', JSON.stringify(queue));
  } catch (error) {
    console.error('[S-DASH/5] Failed to queue share:', error);
  }
}

async function replayQueuedShares() {
  try {
    const queue = JSON.parse(localStorage.getItem('hi_share_queue') || '[]');
    
    if (queue.length === 0) {
      return;
    }

    console.log(`[S-DASH/5] Replaying ${queue.length} queued shares...`);
    
    const successfulReplays = [];
    
    for (const payload of queue) {
      // Add delay between replays to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const success = await attemptServerSubmission(payload);
      
      if (success) {
        successfulReplays.push(payload);
        console.log('hibase.share.submit', { 
          queued: false, 
          replayed: true,
          ts: payload.ts,
          originalTs: payload.queuedAt 
        });
      }
    }

    // Remove successfully replayed items from queue
    if (successfulReplays.length > 0) {
      const remainingQueue = queue.filter(item => 
        !successfulReplays.some(replayed => replayed.ts === item.ts)
      );
      localStorage.setItem('hi_share_queue', JSON.stringify(remainingQueue));
      
      console.log(`[S-DASH/5] Replayed ${successfulReplays.length}/${queue.length} queued shares`);
    }

  } catch (error) {
    console.error('[S-DASH/5] Queue replay failed:', error);
  }
}
