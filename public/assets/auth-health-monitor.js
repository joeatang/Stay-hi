/**
 * 🚀 Tesla-Grade Authentication Health Monitor
 * 
 * Bulletproof session validation and auto-recovery system
 * Prevents corruption issues while maintaining innovation velocity
 */

class AuthHealthMonitor {
  constructor() {
    this.healthCheckInterval = null;
    this.corruptionDetected = false;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.sessionValidationCache = new Map();
    this.lastHealthCheck = null;
    
    // Development mode detection
    this.isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    
    console.log('[AuthHealthMonitor] 🚀 Tesla-grade auth monitoring initialized');
  }

  /**
   * Comprehensive session health validation
   */
  async validateSessionHealth() {
    try {
      const healthReport = {
        timestamp: Date.now(),
        sessionExists: false,
        tokenValid: false,
        localStorageIntact: false,
        cookiesIntact: false,
        supabaseClientHealthy: false,
        corruptionSignals: [],
        recommendations: []
      };

      // Check Supabase client health
      if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
        healthReport.supabaseClientHealthy = true;
        
        // Validate session
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (error) {
          healthReport.corruptionSignals.push(`Session error: ${error.message}`);
        } else if (session) {
          healthReport.sessionExists = true;
          
          // Validate token structure
          if (session.access_token && session.refresh_token) {
            healthReport.tokenValid = true;
            
            // Check token expiration
            const expiresAt = session.expires_at * 1000;
            const now = Date.now();
            const timeUntilExpiry = expiresAt - now;
            
            if (timeUntilExpiry < 0) {
              healthReport.corruptionSignals.push('Access token expired');
            } else if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
              healthReport.recommendations.push('Token expiring soon - consider refresh');
            }
          } else {
            healthReport.corruptionSignals.push('Missing or malformed tokens');
          }
        }
      } else {
        healthReport.corruptionSignals.push('Supabase client not initialized');
      }

      // Check localStorage health
      try {
        const testKey = 'auth-health-test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        healthReport.localStorageIntact = true;
      } catch (error) {
        healthReport.corruptionSignals.push(`localStorage corrupted: ${error.message}`);
      }

      // Check for specific corruption patterns
      this.detectCorruptionPatterns(healthReport);

      // Cache health report
      this.sessionValidationCache.set('latest', healthReport);
      this.lastHealthCheck = healthReport.timestamp;

      return healthReport;

    } catch (error) {
      console.error('[AuthHealthMonitor] ❌ Health check failed:', error);
      return {
        timestamp: Date.now(),
        sessionExists: false,
        tokenValid: false,
        localStorageIntact: false,
        cookiesIntact: false,
        supabaseClientHealthy: false,
        corruptionSignals: [`Critical error: ${error.message}`],
        recommendations: ['Perform emergency session recovery']
      };
    }
  }

  /**
   * Detect specific corruption patterns based on observed issues
   */
  detectCorruptionPatterns(healthReport) {
    try {
      // Pattern 1: Stale session data
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      
      if (supabaseKeys.length > 10) {
        healthReport.corruptionSignals.push('Excessive Supabase localStorage entries detected');
        healthReport.recommendations.push('Clear redundant session data');
      }

      // Pattern 2: Conflicting auth states
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('auth') || key.includes('session') || key.includes('token')
      );

      if (authKeys.length > 5 && !healthReport.sessionExists) {
        healthReport.corruptionSignals.push('Auth data present but no valid session');
        healthReport.recommendations.push('Clear orphaned auth data');
      }

      // Pattern 3: Multiple session entries
      const sessionKeys = supabaseKeys.filter(key => key.includes('session'));
      if (sessionKeys.length > 2) {
        healthReport.corruptionSignals.push('Multiple session entries detected');
        healthReport.recommendations.push('Consolidate session data');
      }

      // Pattern 4: Timestamp inconsistencies
      if (healthReport.sessionExists) {
        const now = Date.now();
        const lastActivity = localStorage.getItem('last-auth-activity');
        if (lastActivity && now - parseInt(lastActivity) > 24 * 60 * 60 * 1000) {
          healthReport.recommendations.push('Session may be stale - consider refresh');
        }
      }

    } catch (error) {
      healthReport.corruptionSignals.push(`Pattern detection error: ${error.message}`);
    }
  }

  /**
   * Automatic session recovery for detected corruption
   */
  async performRecovery(healthReport) {
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.warn('[AuthHealthMonitor] 🚨 Max recovery attempts reached');
      return false;
    }

    this.recoveryAttempts++;
    console.log(`[AuthHealthMonitor] 🔧 Attempting recovery #${this.recoveryAttempts}`);

    try {
      // Recovery Strategy 1: Selective cleanup
      if (healthReport.recommendations.includes('Clear redundant session data')) {
        await this.clearRedundantData();
      }

      // Recovery Strategy 2: Token refresh
      if (healthReport.recommendations.includes('Token expiring soon - consider refresh')) {
        await this.attemptTokenRefresh();
      }

      // Recovery Strategy 3: Nuclear option for severe corruption
      if (healthReport.corruptionSignals.length >= 3) {
        console.warn('[AuthHealthMonitor] 🧹 Severe corruption detected - performing surgical cleanup');
        await this.surgicalSessionCleanup();
      }

      // Validate recovery
      const postRecoveryHealth = await this.validateSessionHealth();
      const recovered = postRecoveryHealth.corruptionSignals.length < healthReport.corruptionSignals.length;

      if (recovered) {
        console.log('[AuthHealthMonitor] ✅ Recovery successful');
        this.recoveryAttempts = 0; // Reset counter on success
        return true;
      }

      return false;

    } catch (error) {
      console.error('[AuthHealthMonitor] ❌ Recovery failed:', error);
      return false;
    }
  }

  /**
   * Clear redundant data while preserving valid sessions
   */
  async clearRedundantData() {
    const keysToRemove = [];
    
    // Identify redundant keys
    Object.keys(localStorage).forEach(key => {
      if (key.includes('auth-guard-') || 
          key.includes('temp-') || 
          key.includes('cache-')) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[AuthHealthMonitor] 🧹 Cleaned ${keysToRemove.length} redundant keys`);
  }

  /**
   * Attempt to refresh tokens
   */
  async attemptTokenRefresh() {
    try {
      if (window.supabaseClient) {
        const { error } = await window.supabaseClient.auth.refreshSession();
        if (!error) {
          console.log('[AuthHealthMonitor] ✅ Token refresh successful');
          return true;
        }
      }
    } catch (error) {
      console.error('[AuthHealthMonitor] ❌ Token refresh failed:', error);
    }
    return false;
  }

  /**
   * Surgical cleanup that preserves user data but removes corruption
   */
  async surgicalSessionCleanup() {
    // Backup critical user data - TESLA-GRADE DATA PROTECTION
    const backupData = {};
    const preserveKeys = [
      'stayhi_profile',    // User profile data
      'demo-profile',      // Demo profile data
      'hi5.total',         // Hi moments count
      'hi5.streak',        // Current streak
      'hi5.history',       // Complete history
      'hi.waves',          // Wave count
      'hi.starts',         // Start count
      'user-preferences',  // User settings
      'app-settings',      // App configuration
      'draft-',            // Draft content
      'tesla-',            // Tesla features data
      'location-',         // Location data
      'achievement-',      // Achievement progress
      'premium-'           // Premium feature data
    ];
    
    Object.keys(localStorage).forEach(key => {
      if (preserveKeys.some(preserve => key.includes(preserve))) {
        backupData[key] = localStorage.getItem(key);
      }
    });

    // Clear auth-related data
    const authKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session')
    );

    authKeys.forEach(key => localStorage.removeItem(key));

    // Restore preserved data
    Object.entries(backupData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    console.log(`[AuthHealthMonitor] 🔧 Surgical cleanup: removed ${authKeys.length} keys, preserved ${Object.keys(backupData).length} keys`);
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs = 60000) { // Default: 1 minute
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const healthReport = await this.validateSessionHealth();
      
      if (healthReport.corruptionSignals.length > 0) {
        console.warn('[AuthHealthMonitor] 🚨 Corruption detected:', healthReport.corruptionSignals);
        
        if (this.isDev) {
          // In development, be more aggressive with recovery
          await this.performRecovery(healthReport);
        } else {
          // In production, be more conservative
          if (healthReport.corruptionSignals.length >= 2) {
            await this.performRecovery(healthReport);
          }
        }
      }
    }, intervalMs);

    console.log('[AuthHealthMonitor] 🔄 Continuous monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[AuthHealthMonitor] ⏹️ Monitoring stopped');
    }
  }

  /**
   * Get current health status for debugging
   */
  getHealthStatus() {
    return {
      lastHealthCheck: this.lastHealthCheck,
      recoveryAttempts: this.recoveryAttempts,
      corruptionDetected: this.corruptionDetected,
      monitoring: !!this.healthCheckInterval,
      cachedReports: this.sessionValidationCache.size
    };
  }
}

// Global instance
window.AuthHealthMonitor = window.AuthHealthMonitor || new AuthHealthMonitor();

// Auto-start monitoring in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.AuthHealthMonitor.startMonitoring(30000); // Every 30 seconds in dev
}

console.log('[AuthHealthMonitor] 🚀 Tesla-grade auth health system loaded');