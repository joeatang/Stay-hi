// 🛡️ Tesla-Grade Counter Integrity System
// Prevents double increments, tracks click ratios, ensures data consistency

class CounterIntegrityGuard {
  constructor() {
    this.clickCount = 0;
    this.incrementCount = 0;
    this.lastClickTime = 0;
    this.isProcessing = false;
    this.clickHistory = [];
    
    console.log('🛡️ Counter Integrity Guard initialized');
  }
  
  // Prevent rapid-fire clicks and double processing
  shouldProcessClick() {
    const now = Date.now();
    const timeSinceLastClick = now - this.lastClickTime;
    
    // Prevent clicks faster than 100ms (debounce)
    if (timeSinceLastClick < 100) {
      console.log('🚫 Click debounced (too fast)');
      return false;
    }
    
    // Prevent processing if already in progress
    if (this.isProcessing) {
      console.log('🚫 Click rejected (already processing)');
      return false;
    }
    
    this.lastClickTime = now;
    return true;
  }
  
  // Start processing a click
  startProcessing() {
    if (!this.shouldProcessClick()) {
      return false;
    }
    
    this.isProcessing = true;
    this.clickCount++;
    
    console.log(`🎯 Processing click #${this.clickCount}`);
    
    // Add to history for analysis
    this.clickHistory.push({
      timestamp: Date.now(),
      clickNumber: this.clickCount
    });
    
    // Keep only last 10 clicks in history
    if (this.clickHistory.length > 10) {
      this.clickHistory.shift();
    }
    
    return true;
  }
  
  // Mark increment as completed
  completeIncrement(success = true) {
    if (!this.isProcessing) {
      console.warn('⚠️ Increment completion called without active processing');
      return;
    }
    
    this.isProcessing = false;
    
    if (success) {
      this.incrementCount++;
      console.log(`✅ Increment #${this.incrementCount} completed (Ratio: ${this.clickCount}:${this.incrementCount})`);
    } else {
      console.log(`❌ Increment #${this.clickCount} failed`);
    }
    
    // Check integrity
    this.checkIntegrity();
  }
  
  // Verify 1:1 click to increment ratio
  checkIntegrity() {
    const ratio = this.clickCount / (this.incrementCount || 1);
    
    if (ratio > 1.1) {
      console.warn(`⚠️ INTEGRITY WARNING: Click ratio is ${ratio.toFixed(2)}:1 (expected ~1:1)`);
    } else if (ratio >= 0.9 && ratio <= 1.1) {
      console.log(`✅ INTEGRITY OK: Perfect 1:1 ratio (${ratio.toFixed(2)}:1)`);
    }
  }
  
  // Get current statistics
  getStats() {
    return {
      clickCount: this.clickCount,
      incrementCount: this.incrementCount,
      ratio: this.clickCount / (this.incrementCount || 1),
      isProcessing: this.isProcessing,
      lastClickTime: this.lastClickTime,
      clickHistory: this.clickHistory
    };
  }
  
  // Reset counters (for testing)
  reset() {
    console.log('🔄 Resetting Counter Integrity Guard');
    this.clickCount = 0;
    this.incrementCount = 0;
    this.lastClickTime = 0;
    this.isProcessing = false;
    this.clickHistory = [];
  }
}

// Global instance
window.CounterGuard = new CounterIntegrityGuard();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CounterIntegrityGuard;
}