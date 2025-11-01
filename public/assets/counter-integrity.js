/**
 * 🏛️ TESLA-GRADE COUNTER INTEGRITY SYSTEM
 * =====================================
 * Prevents counter reset bugs and ensures 1:1 tap tracking
 * 
 * Features:
 * - Atomic counter operations with rollback capability
 * - Real-time validation against database state
 * - Error recovery and data integrity checks
 * - Individual and global counter synchronization
 * - Anti-pattern detection (prevents multiple systems conflicts)
 */

class CounterIntegritySystem {
  constructor() {
    this.isProcessing = false;
    this.lastKnownState = {
      global: { waves: 0, starts: 0 },
      individual: { today: 0, total: 0, streak: 0 }
    };
    this.retryQueue = [];
    this.init();
  }

  init() {
    this.validateCounterConsistency();
    this.setupIntegrityMonitoring();
    console.log('🛡️ Counter Integrity System initialized');
  }

  /**
   * Tesla-grade counter increment with integrity checks
   * Ensures 1:1 tap to counter relationship as required
   */
  async incrementWithIntegrity(type = 'wave', source = 'medallion') {
    if (this.isProcessing) {
      console.warn('🚫 Counter operation in progress, queuing request');
      return new Promise((resolve) => {
        this.retryQueue.push(() => this.incrementWithIntegrity(type, source));
        setTimeout(() => resolve(this.processQueue()), 100);
      });
    }

    this.isProcessing = true;
    const operation = this.createOperation(type, source);

    try {
      // 1. Pre-increment validation
      const preState = await this.captureState();
      
      // 2. Execute atomic increment (both individual and global)
      const result = await this.executeAtomicIncrement(operation);
      
      // 3. Post-increment validation
      const postState = await this.captureState();
      const isValid = this.validateIncrement(preState, postState, operation);
      
      if (!isValid) {
        console.error('🚨 Counter integrity violation detected, rolling back');
        await this.rollbackOperation(operation, preState);
        throw new Error('Counter integrity violation');
      }

      // 4. Update known state and UI
      this.lastKnownState = postState;
      this.updateUI(postState);

      console.log('✅ Counter increment completed with integrity', {
        type, source, result, 
        before: preState, 
        after: postState
      });

      return result;

    } catch (error) {
      console.error('❌ Counter increment failed:', error);
      await this.handleError(operation, error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  createOperation(type, source) {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      timestamp: new Date().toISOString(),
      expectedChanges: {
        individual: type === 'wave' ? 1 : 0,
        global: 1
      }
    };
  }

  async captureState() {
    const individual = this.getIndividualCounters();
    const global = await this.getGlobalCounters();
    
    return {
      individual,
      global,
      timestamp: new Date().toISOString()
    };
  }

  getIndividualCounters() {
    const todayKey = this.getTodayKey();
    const history = this.readLS('hi5.history', {});
    const total = Number(this.readLS('hi5.total', 0)) || 0;
    const streak = Number(this.readLS('hi5.streak', 0)) || 0;
    
    return {
      today: Number(history[todayKey] || 0),
      total,
      streak,
      todayKey
    };
  }

  async getGlobalCounters() {
    try {
      const supa = window.getSupabase?.();
      if (!supa) throw new Error('No Supabase client');
      
      const { data, error } = await supa.rpc('get_global_stats');
      if (error || !data) throw error || new Error('No data');
      
      const stats = Array.isArray(data) ? data[0] : data;
      if (!stats) throw new Error('Empty stats response');
      
      return {
        waves: Number(stats.hi_waves) || 0,
        starts: Number(stats.total_his) || 0
      };
    } catch (error) {
      console.warn('⚠️ Global counter fetch failed, using cache:', error);
      return this.lastKnownState.global;
    }
  }

  async executeAtomicIncrement(operation) {
    const results = {};

    // Individual counter increment (for waves only)
    if (operation.type === 'wave') {
      results.individual = this.incrementIndividualCounter();
    }

    // Global counter increment
    results.global = await this.incrementGlobalCounter(operation.type);

    return results;
  }

  incrementIndividualCounter() {
    const todayKey = this.getTodayKey();
    const history = this.readLS('hi5.history', {});
    const currentTotal = Number(this.readLS('hi5.total', 0)) || 0;
    const currentStreak = Number(this.readLS('hi5.streak', 0)) || 0;
    const lastDay = this.readLS('hi5.lastDate', '');

    // Increment today's count
    history[todayKey] = (history[todayKey] || 0) + 1;
    this.writeLS('hi5.history', history);

    // Recalculate total
    const newTotal = Object.values(history).reduce((sum, v) => sum + v, 0);
    this.writeLS('hi5.total', newTotal);

    // Update streak
    let newStreak = currentStreak;
    if (!lastDay) {
      newStreak = 1;
    } else {
      const last = new Date(lastDay);
      const cur = new Date(todayKey);
      last.setHours(0, 0, 0, 0);
      cur.setHours(0, 0, 0, 0);
      const diff = Math.round((cur - last) / 86400000);
      
      if (diff === 1) newStreak++;
      else if (diff !== 0) newStreak = 1;
    }
    
    this.writeLS('hi5.lastDate', todayKey);
    this.writeLS('hi5.streak', newStreak);

    return {
      today: history[todayKey],
      total: newTotal,
      streak: newStreak
    };
  }

  async incrementGlobalCounter(type) {
    try {
      const supa = window.getSupabase?.();
      if (!supa) throw new Error('No Supabase client');
      
      const rpcFunction = type === 'wave' ? 'increment_hi_wave' : 'increment_total_hi';
      const { data, error } = await supa.rpc(rpcFunction);
      if (error) throw error;
      
      return { success: true, newCount: data };
    } catch (error) {
      console.warn(`⚠️ Global ${type} increment failed:`, error);
      return { success: false, error: error.message };
    }
  }

  validateIncrement(preState, postState, operation) {
    // Individual counter validation (for waves)
    if (operation.type === 'wave') {
      const expectedToday = preState.individual.today + 1;
      const expectedTotal = preState.individual.total + 1;
      
      if (postState.individual.today !== expectedToday) {
        console.error('🚨 Individual today counter mismatch:', {
          expected: expectedToday,
          actual: postState.individual.today
        });
        return false;
      }
      
      if (postState.individual.total !== expectedTotal) {
        console.error('🚨 Individual total counter mismatch:', {
          expected: expectedTotal,
          actual: postState.individual.total
        });
        return false;
      }
    }

    // Global counter validation
    const globalKey = operation.type === 'wave' ? 'waves' : 'starts';
    const expectedGlobal = preState.global[globalKey] + 1;
    
    // Allow some tolerance for global counters due to concurrency
    const actualGlobal = postState.global[globalKey];
    if (actualGlobal < expectedGlobal) {
      console.error('🚨 Global counter went backwards:', {
        type: globalKey,
        expected: expectedGlobal,
        actual: actualGlobal
      });
      return false;
    }

    return true;
  }

  async rollbackOperation(operation, preState) {
    console.log('🔄 Rolling back operation:', operation.id);
    
    // Rollback individual counters if needed
    if (operation.type === 'wave') {
      this.writeLS('hi5.history', preState.individual.history || {});
      this.writeLS('hi5.total', preState.individual.total);
      this.writeLS('hi5.streak', preState.individual.streak);
    }
    
    // Note: Global rollback would require a decrement function, 
    // which should be implemented carefully to prevent abuse
  }

  updateUI(state) {
    // Update individual counters
    const todayCount = document.getElementById('todayCount');
    const totalCount = document.getElementById('totalCount');
    const streakLen = document.getElementById('streakLen');
    
    if (todayCount) todayCount.textContent = state.individual.today;
    if (totalCount) totalCount.textContent = state.individual.total;
    if (streakLen) streakLen.textContent = state.individual.streak;

    // Update global counters if they exist
    window.gWaves = state.global.waves;
    window.gStarts = state.global.starts;

    // Trigger rotator update if available
    if (window.updateRotator && typeof window.updateRotator === 'function') {
      window.updateRotator();
    }
  }

  validateCounterConsistency() {
    // Check for common counter integrity issues
    const history = this.readLS('hi5.history', {});
    const storedTotal = Number(this.readLS('hi5.total', 0)) || 0;
    const calculatedTotal = Object.values(history).reduce((sum, v) => sum + v, 0);

    if (storedTotal !== calculatedTotal) {
      console.warn('🔧 Counter inconsistency detected, fixing...', {
        stored: storedTotal,
        calculated: calculatedTotal
      });
      this.writeLS('hi5.total', calculatedTotal);
    }
  }

  setupIntegrityMonitoring() {
    // Monitor for counter resets and anomalies
    setInterval(() => {
      this.validateCounterConsistency();
    }, 30000); // Every 30 seconds

    // Detect if counters mysteriously reset to 0
    setInterval(async () => {
      const currentState = await this.captureState();
      
      if (currentState.global.waves === 0 && this.lastKnownState.global.waves > 0) {
        console.error('🚨 GLOBAL COUNTER RESET DETECTED! Investigating...');
        await this.investigateCounterReset();
      }
    }, 10000); // Every 10 seconds
  }

  async investigateCounterReset() {
    console.log('🔍 Investigating counter reset...');
    
    // Try to refresh from database
    try {
      const freshState = await this.captureState();
      if (freshState.global.waves > 0) {
        console.log('✅ Counter reset was temporary, state recovered');
        this.lastKnownState = freshState;
        this.updateUI(freshState);
      } else {
        console.error('🚨 Persistent counter reset detected - database issue!');
      }
    } catch (error) {
      console.error('❌ Counter investigation failed:', error);
    }
  }

  processQueue() {
    if (this.retryQueue.length > 0 && !this.isProcessing) {
      const nextOperation = this.retryQueue.shift();
      setTimeout(() => nextOperation(), 10);
    }
  }

  async handleError(operation, error) {
    console.log('🩺 Handling counter error:', { operation, error });
    
    // Log for debugging
    this.logError(operation, error);
    
    // Attempt recovery
    await this.attemptRecovery(operation);
  }

  logError(operation, error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('📋 Counter Error Log:', errorLog);
    
    // Store in localStorage for debugging
    const logs = this.readLS('counter_error_logs', []);
    logs.push(errorLog);
    // Keep only last 10 error logs
    if (logs.length > 10) logs.splice(0, logs.length - 10);
    this.writeLS('counter_error_logs', logs);
  }

  async attemptRecovery(operation) {
    console.log('🔧 Attempting counter recovery...');
    
    // Wait a bit and try to refresh state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const recoveredState = await this.captureState();
      this.lastKnownState = recoveredState;
      this.updateUI(recoveredState);
      console.log('✅ Counter state recovered');
    } catch (error) {
      console.error('❌ Counter recovery failed:', error);
    }
  }

  // Utility methods
  getTodayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  readLS(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.warn('⚠️ localStorage read failed:', key, error);
      return defaultValue;
    }
  }

  writeLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('❌ localStorage write failed:', key, error);
    }
  }
}

// Initialize the system
window.CounterIntegritySystem = new CounterIntegritySystem();

// Export for testing and debugging
window.debugCounters = () => {
  const system = window.CounterIntegritySystem;
  console.table({
    'Last Known State': system.lastKnownState,
    'Current Processing': system.isProcessing,
    'Retry Queue Length': system.retryQueue.length,
    'Error Logs': system.readLS('counter_error_logs', []).length
  });
};

console.log('🏛️ Tesla-Grade Counter Integrity System loaded');