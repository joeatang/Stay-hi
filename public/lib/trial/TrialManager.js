/**
 * TrialManager.js
 * Jobs/Gary Vee/Woz-approved 14-day trial system
 * 
 * PHILOSOPHY:
 * - Give full value upfront (Gary Vee: Give, give, give)
 * - Make it feel seamless (Jobs: Invisible elegance)
 * - Build it to last (Woz: Sustainable architecture)
 */

(function() {
  'use strict';
  
  class TrialManager {
    constructor() {
      this.trialStatus = null;
      this.checkInterval = null;
    }
    
    /**
     * Get effective tier for user
     * Maps database 'trial' tier to frontend tier based on expiration
     * 
     * @param {Object} membership - User membership from database
     * @returns {string} Effective tier name (free, bronze, gold, premium, collective)
     */
    getEffectiveTier(membership) {
      if (!membership) return 'free';
      
      const dbTier = membership.tier;
      const trialEnd = membership.trial_end;
      
      // If user is on trial and trial hasn't expired → Grant Bronze features
      if (dbTier === 'trial' && trialEnd) {
        const now = new Date();
        const expiresAt = new Date(trialEnd);
        
        if (now < expiresAt) {
          console.log('[TrialManager] ✨ User in active trial, granting Bronze features');
          return 'bronze';
        } else {
          console.log('[TrialManager] ⏰ Trial expired, downgrading to Free');
          return 'free';
        }
      }
      
      // Map database tier names to frontend tier names
      const tierMap = {
        'trial': 'free',      // Expired trial
        'beta': 'bronze',     // Beta users get Bronze
        'standard': 'gold',   // Standard = Gold
        'premium': 'premium', // Premium = Premium
        'lifetime': 'collective' // Lifetime = Collective
      };
      
      return tierMap[dbTier] || 'free';
    }
    
    /**
     * Check trial status for current user
     * Returns days left, urgency level, etc.
     */
    async checkTrialStatus(userId) {
      if (!userId) return { active: false, tier: 'free' };
      
      try {
        // 🚀 FIX: Use HiSupabase.getClient() which auto-recreates after pageshow
        const client = window.HiSupabase?.getClient?.() || window.getSupabase?.() || window.hiSupabase || window.supabaseClient;
        if (!client) {
          console.warn('[TrialManager] No Supabase client available');
          return { active: false, tier: 'free' };
        }
        
        // Get user membership
        const { data: membership, error } = await client
          .from('user_memberships')
          .select('tier, trial_start, trial_end, status')
          .eq('user_id', userId)
          .single();
        
        if (error || !membership) {
          console.log('[TrialManager] No membership found, user is free tier');
          return { active: false, tier: 'free' };
        }
        
        // Check if trial is active
        if (membership.tier === 'trial' && membership.trial_end) {
          const now = Date.now();
          const endsAt = new Date(membership.trial_end).getTime();
          const daysLeft = Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000));
          
          const status = {
            active: now < endsAt,
            tier: now < endsAt ? 'bronze' : 'free',
            daysLeft: Math.max(0, daysLeft),
            endsAt: membership.trial_end,
            shouldShowReminder: daysLeft <= 4 && daysLeft > 0,
            showUrgency: daysLeft <= 1,
            trialExpired: now >= endsAt
          };
          
          this.trialStatus = status;
          return status;
        }
        
        // Not on trial - return their actual tier
        const effectiveTier = this.getEffectiveTier(membership);
        return { 
          active: false, 
          tier: effectiveTier,
          isPaid: ['bronze', 'gold', 'premium', 'collective'].includes(effectiveTier)
        };
        
      } catch (err) {
        console.error('[TrialManager] Error checking trial status:', err);
        return { active: false, tier: 'free' };
      }
    }
    
    /**
     * Show trial countdown banner (Jobs: Elegant, not desperate)
     */
    showTrialBanner(status) {
      // Don't show banner if trial not active or already expired
      if (!status.active || status.trialExpired) {
        this.hideTrialBanner();
        return;
      }
      
      // 🎯 TIER CHECK: Don't nag paid users (bronze, gold, premium, collective)
      if (status.isPaid) {
        this.hideTrialBanner();
        return;
      }
      
      // Only show if 4 days or less remaining
      if (!status.shouldShowReminder) {
        this.hideTrialBanner();
        return;
      }
      
      let banner = document.getElementById('hi-trial-banner');
      
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'hi-trial-banner';
        banner.style.cssText = `
          position: fixed;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          z-index: 999998;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
          display: flex;
          align-items: center;
          gap: 16px;
          animation: slideDown 0.3s ease-out;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideDown {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(banner);
      }
      
      // Set content based on urgency
      const daysText = status.daysLeft === 1 ? '1 day' : `${status.daysLeft} days`;
      const emoji = status.showUrgency ? '⏰' : '✨';
      
      banner.innerHTML = `
        <span>${emoji} Exploring Hi Bronze • ${daysText} left</span>
        <button onclick="window.location.href='/membership.html'" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
           onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Keep Creating
        </button>
      `;
    }
    
    /**
     * Hide trial banner
     */
    hideTrialBanner() {
      const banner = document.getElementById('hi-trial-banner');
      if (banner) {
        banner.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
      }
    }
    
    /**
     * Start monitoring trial status
     * Checks every 5 minutes and updates UI
     */
    async startMonitoring(userId) {
      if (!userId) return;
      
      // Check immediately
      const status = await this.checkTrialStatus(userId);
      if (status.active && status.shouldShowReminder) {
        this.showTrialBanner(status);
      }
      
      // Check every 5 minutes
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      
      this.checkInterval = setInterval(async () => {
        const status = await this.checkTrialStatus(userId);
        if (status.active && status.shouldShowReminder) {
          this.showTrialBanner(status);
        } else {
          this.hideTrialBanner();
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      this.hideTrialBanner();
    }
  }
  
  // Initialize global instance
  window.TrialManager = new TrialManager();
  console.log('✅ TrialManager initialized');
  
  // Auto-start monitoring when user signs in
  window.addEventListener('hi:auth-ready', async (e) => {
    const userId = e.detail?.session?.user?.id;
    if (userId) {
      console.log('[TrialManager] Auth ready, starting trial monitoring for user:', userId);
      await window.TrialManager.startMonitoring(userId);
    }
  });
  
})();
