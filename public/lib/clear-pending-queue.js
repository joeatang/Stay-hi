/**
 * Emergency LocalStorage Queue Clearer
 * 
 * This script clears the corrupted pending queue that's causing 400 errors.
 * Run this in the browser console on mobile to fix the "Loading Issue".
 * 
 * Usage:
 * 1. Open browser console on mobile
 * 2. Type: window.clearPendingQueue()
 * 3. Reload the page
 */

(function() {
  'use strict';
  
  function clearPendingQueue() {
    const LS_PENDING = "hi_pending_queue";
    
    try {
      const queue = localStorage.getItem(LS_PENDING);
      
      if (!queue) {
        console.log('✅ No pending queue found - already clear');
        return { cleared: false, reason: 'empty' };
      }
      
      const parsed = JSON.parse(queue);
      const count = Array.isArray(parsed) ? parsed.length : 0;
      
      console.log(`🗑️ Clearing ${count} corrupted items from pending queue...`);
      console.log('Queue contents:', parsed);
      
      localStorage.removeItem(LS_PENDING);
      
      console.log('✅ Pending queue cleared successfully');
      console.log('🔄 Please reload the page now');
      
      return { 
        cleared: true, 
        itemsRemoved: count,
        message: 'Queue cleared - please reload page'
      };
      
    } catch (error) {
      console.error('❌ Error clearing queue:', error);
      return { 
        cleared: false, 
        error: error.message 
      };
    }
  }
  
  // Make globally available
  window.clearPendingQueue = clearPendingQueue;
  console.log('🛠️ Emergency queue clearer loaded - run: window.clearPendingQueue()');
  
})();
