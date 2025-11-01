/**
 * 🚀 HI-GRADE UNIFIED FLOW CONTROLLER
 * 
 * Single source of truth for all user journeys
 * Eliminates multiple entry points and UX confusion  
 * Hi-level systematic approach to flow control
 * 
 * PRESERVES: All existing UI, animations, medallion functionality
 * ENHANCES: Seamless member/anonymous routing without disruption
 * INTEGRATES: Hi Access Tiers system for invite code management
 */

class HiFlowController {
  constructor() {
    this.initialized = false;
    this.currentFlow = null;
    this.userState = {
      authenticated: false,
      membership: null,
      onboarded: false,
      accessTier: null
    };
    
    console.log('🚀 Hi Flow Controller initializing...');
    this.initialize();
  }
  
  async initialize() {
    if (this.initialized) return;
    
    // Wait for dependencies
    await this.waitForDependencies();
    
    // Determine current user state
    await this.assessUserState();
    
    // Execute appropriate flow
    await this.executeFlow();
    
    this.initialized = true;
    console.log('✅ Hi Flow Controller ready');
  }
  
  async waitForDependencies() {
    // Wait for Supabase
    while (!window.sb && !window.supabaseClient) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for Auth Controller if exists
    if (!window.HiAuth) {
      console.log('🔄 Loading Hi Auth Controller...');
      // Could dynamically load if needed
    }
  }
  
  async assessUserState() {
    console.log('🔍 Assessing user state...');
    
    try {
      const sb = window.sb || window.supabaseClient;
      const { data: { session }, error } = await sb.auth.getSession();
      
      this.userState.authenticated = !error && !!session;
      
      if (this.userState.authenticated) {
        // Check membership status
        try {
          const { data: membership } = await sb
            .from('user_memberships')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          this.userState.membership = membership;
        } catch (e) {
          console.log('📝 No membership found, will prompt for upgrade');
        }
        
        // Check onboarding status
        this.userState.onboarded = localStorage.getItem('hi_onboarded') === 'true';
      }
      
      // Integrate access tier system
      if (window.hiAccessManager) {
        this.userState.accessTier = window.hiAccessManager.getAccessInfo();
      }
      
      console.log('🎯 User state:', this.userState);
    } catch (error) {
      console.error('❌ Error assessing user state:', error);
      this.userState = { authenticated: false, membership: null, onboarded: false, accessTier: null };
    }
  }
  
  async executeFlow() {
    const currentPage = this.getCurrentPage();
    console.log('🎯 Executing flow for page:', currentPage);
    
    // HI-GRADE FLOW LOGIC
    switch (currentPage) {
      case 'first-visit-welcome':
        await this.handleFirstVisitWelcome();
        break;
        
      case 'welcome':
        await this.handleWelcomeFlow();
        break;
        
      case 'signin':
        await this.handleSigninFlow();
        break;
        
      case 'signup':
        await this.handleSignupFlow();
        break;
        
      case 'post-auth':
        await this.handlePostAuthFlow();
        break;
        
      case 'index':
      case 'dashboard':
        await this.handleDashboardFlow();
        break;
        
      case 'hi-island':
        await this.handleHiIslandFlow();
        break;
        
      case 'profile':
        await this.handleProfileFlow();
        break;
        
      case 'hi-muscle':
        await this.handleHiMuscleFlow();
        break;
        
      default:
        await this.handleDefaultFlow();
    }
  }
  
  getCurrentPage() {
    const path = window.location.pathname;
    
    if (path.includes('welcome')) return 'welcome';
    if (path.includes('signin')) return 'signin';
    if (path.includes('signup')) return 'signup';
    if (path.includes('post-auth')) return 'post-auth';
    if (path.includes('hi-island')) return 'hi-island';
    if (path.includes('profile')) return 'profile';
    if (path.includes('hi-muscle')) return 'hi-muscle';
    
    // 🚀 FIRST-TIME VISITOR CHECK: Route new visitors to welcome
    if (path.includes('index') || path === '/' || path === '/public/') {
      // Check if first-time visitor (no previous Hi activity stored)
      if (this.isFirstTimeVisitor()) {
        return 'first-visit-welcome';
      }
      return 'index';
    }
    
    return 'unknown';
  }
  
  // ============================================
  // FLOW HANDLERS (Hi-Grade UX)
  // ============================================
  
  async handleWelcomeFlow() {
    console.log('👋 Welcome flow');
    
    if (this.userState.authenticated) {
      // Already authenticated, redirect to dashboard
      await this.smoothRedirect('82815_stayhi_index.html');
      return;
    }
    
    // Show welcome page - no action needed
    this.currentFlow = 'welcome';
  }
  
  async handleSigninFlow() {
    console.log('🔐 Signin flow');
    
    if (this.userState.authenticated) {
      // Already signed in, redirect to appropriate destination
      const nextUrl = this.getNextUrl() || '82815_stayhi_index.html';
      await this.smoothRedirect(nextUrl);
      return;
    }
    
    // Show signin page - no action needed
    this.currentFlow = 'signin';
  }
  
  async handleSignupFlow() {
    console.log('📝 Signup flow');
    
    if (this.userState.authenticated) {
      // Already signed in, redirect to dashboard
      await this.smoothRedirect('82815_stayhi_index.html');
      return;
    }
    
    // Show signup page - no action needed  
    this.currentFlow = 'signup';
  }
  
  async handlePostAuthFlow() {
    console.log('✅ Post-auth flow');
    
    if (!this.userState.authenticated) {
      // Should not be here without auth, redirect to welcome
      await this.smoothRedirect('welcome.html');
      return;
    }
    
    // Determine destination based on membership and onboarding
    let destination = '82815_stayhi_index.html';
    
    const nextUrl = this.getNextUrl();
    if (nextUrl && this.isValidDestination(nextUrl)) {
      destination = nextUrl;
    }
    
    console.log('🎯 Post-auth redirecting to:', destination);
    await this.smoothRedirect(destination);
  }
  
  async handleDashboardFlow() {
    console.log('📊 Dashboard flow');
    
    // 🚀 ANONYMOUS DISCOVERY MODE: Allow Hi medallion access for everyone!
    if (!this.userState.authenticated) {
      console.log('🔓 Anonymous discovery mode - Hi medallion accessible');
      // Track usage for contextual prompts later
      this.incrementAnonymousUsage();
      // Allow full access to Hi medallion dashboard
    }
    
    // Check if needs membership upgrade (for authenticated users)
    if (this.userState.authenticated && this.needsMembershipPrompt()) {
      this.showMembershipPrompt();
    }
    
    // Check if needs onboarding (for authenticated users)
    if (this.userState.authenticated && !this.userState.onboarded) {
      this.showOnboarding();
    }
    
    this.currentFlow = 'dashboard';
  }
  
  async handleHiIslandFlow() {
    console.log('🏝️ Hi Island flow');
    
    // Hi Island allows anonymous access for discovery
    if (!this.userState.authenticated) {
      this.showAnonymousHiIsland();
    } else {
      this.showAuthenticatedHiIsland();
    }
    
    this.currentFlow = 'hi-island';
  }
  
  async handleProfileFlow() {
    console.log('👤 Profile flow');
    
    if (!this.userState.authenticated) {
      await this.redirectToWelcome();
      return;
    }
    
    this.currentFlow = 'profile';
  }
  
  async handleHiMuscleFlow() {
    console.log('💪 Hi Muscle flow');
    
    // ✅ Use unified membership system for access control
    if (window.UnifiedMembershipSystem) {
      if (!window.UnifiedMembershipSystem.canAccess('hiMuscleAccess')) {
        await this.showHiMuscleAccessModal();
        return;
      }
    } else if (!this.userState.authenticated) {
      await this.showHiMuscleAccessModal();
      return;
    }
    
    this.currentFlow = 'hi-muscle';
  }
  
  async handleDefaultFlow() {
    console.log('❓ Unknown page flow');
    
    if (!this.userState.authenticated) {
      await this.redirectToWelcome();
    } else {
      await this.smoothRedirect('82815_stayhi_index.html');
    }
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  async redirectToWelcome() {
    console.log('🚀 Redirecting to welcome (unauthenticated)');
    // Store current URL for return after auth
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== '/welcome.html' && currentUrl !== '/') {
      localStorage.setItem('hi_return_to', currentUrl);
    }
    
    await this.smoothRedirect('welcome.html');
  }
  
  getNextUrl() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const nextParam = urlParams.get('next');
    if (nextParam) return nextParam;
    
    // Check localStorage
    const stored = localStorage.getItem('hi_return_to');
    if (stored) {
      localStorage.removeItem('hi_return_to');
      return stored;
    }
    
    return null;
  }
  
  isValidDestination(url) {
    // Prevent open redirects
    const validPaths = [
      'index.html', 'profile.html', 'hi-island-NEW.html', 
      'hi-muscle.html', 'calendar.html'
    ];
    
    // Remove leading slash and query params for comparison
    const cleanUrl = url.replace(/^\/+/, '').split('?')[0];
    
    return validPaths.includes(cleanUrl) || cleanUrl === '';
  }
  
  needsMembershipPrompt() {
    // Show membership prompt if no membership and used app 3+ times
    const usageCount = parseInt(localStorage.getItem('hi_usage_count') || '0');
    return !this.userState.membership && usageCount >= 3;
  }
  
  incrementAnonymousUsage() {
    const currentCount = parseInt(localStorage.getItem('hi_usage_count') || '0');
    const newCount = currentCount + 1;
    localStorage.setItem('hi_usage_count', newCount.toString());
    
    console.log(`📈 Anonymous usage: ${newCount}`);
    
    // Show contextual prompt after 3 uses
    if (newCount >= 3) {
      setTimeout(() => {
        this.showMembershipPrompt();
      }, 2000); // Show after 2 seconds of using the app
    }
  }
  
  showMembershipPrompt() {
    // Only show if no membership and not already shown recently
    const lastShown = localStorage.getItem('hi_prompt_shown');
    const now = Date.now();
    
    if (lastShown && (now - parseInt(lastShown)) < 86400000) {
      return; // Don't show more than once per day
    }
    
    // Simple contextual prompt
    const prompt = document.createElement('div');
    prompt.className = 'hi-membership-prompt';
    prompt.innerHTML = `
      <div class="hi-prompt-content">
        <h3>✨ Loving Hi?</h3>
        <p>Join our community for exclusive features and connect with others sharing positivity worldwide.</p>
        <div class="hi-prompt-buttons">
          <button class="hi-btn-primary" onclick="hiFlowController.joinCommunity()">Join Community</button>
          <button class="hi-btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Maybe Later</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(prompt);
    localStorage.setItem('hi_prompt_shown', now.toString());
  }
  
  joinCommunity() {
    // Route to sign up flow
    window.location.href = '/auth/signup';
  }
  
  showMembershipPrompt() {
    // Show contextual membership upgrade prompt
    console.log('💎 Showing membership prompt');
    
    if (window.MembershipPrompt) {
      window.MembershipPrompt.show();
    } else {
      // Fallback inline prompt
      this.createInlineMembershipPrompt();
    }
  }
  
  showOnboarding() {
    console.log('🎓 Showing onboarding');
    
    if (window.OnboardingController) {
      window.OnboardingController.start();
    }
  }
  
  showAnonymousHiIsland() {
    console.log('🏝️ Anonymous Hi Island mode');
    // Enable read-only mode with upgrade prompts
    document.body.classList.add('anonymous-mode');
  }
  
  showAuthenticatedHiIsland() {
    console.log('🏝️ Authenticated Hi Island mode');
    // Enable full features
    document.body.classList.remove('anonymous-mode');
  }
  
  createInlineMembershipPrompt() {
    // Create beautiful, non-intrusive membership prompt
    const prompt = document.createElement('div');
    prompt.className = 'hi-membership-prompt';
    prompt.innerHTML = `
      <div class="prompt-content">
        <h3>✨ Ready to save your Hi journey?</h3>
        <p>Join our community to track streaks, share moments, and unlock premium features!</p>
        <div class="prompt-actions">
          <button onclick="window.location.href='signup.html'" class="btn-primary">
            Get Membership
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="btn-secondary">
            Maybe later
          </button>
        </div>
      </div>
    `;
    
    // Add styles
    if (!document.getElementById('hi-prompt-styles')) {
      const styles = document.createElement('style');
      styles.id = 'hi-prompt-styles';
      styles.textContent = `
        .hi-membership-prompt {
          position: fixed;
          bottom: 20px;
          right: 20px;
          max-width: 350px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          z-index: 1000;
          animation: slideInUp 0.3s ease-out;
        }
        
        .prompt-content h3 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 18px;
        }
        
        .prompt-content p {
          margin: 0 0 16px 0;
          color: #666;
          line-height: 1.4;
        }
        
        .prompt-actions {
          display: flex;
          gap: 8px;
        }
        
        .prompt-actions button {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background: #f8f9fa;
          color: #666;
        }
        
        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(prompt);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      prompt.style.animation = 'slideInUp 0.3s ease-out reverse';
      setTimeout(() => prompt.remove(), 300);
    }, 10000);
  }
  
  async smoothRedirect(url) {
    console.log('🚀 GOLD-STANDARD REDIRECT to:', url);
    
    // 🎯 BULLETPROOF REDIRECT: Multiple fallback strategies
    try {
      // Strategy 1: Tesla Smooth Redirect (if available)
      if (window.TeslaSmoothRedirect) {
        await window.TeslaSmoothRedirect.redirect(url);
        return;
      }
      
      // Strategy 2: Immediate redirect with error handling
      console.log('🔄 Executing immediate redirect to:', url);
      
      // Add slight delay to ensure console logging
      setTimeout(() => {
        window.location.href = url;
      }, 50);
      
      // Also try direct assignment as backup
      window.location = url;
      
    } catch (error) {
      console.error('❌ Redirect failed, using document fallback:', error);
      // Strategy 3: Document-level redirect as last resort
      document.location.href = url;
    }
  }
  
  // ============================================
  // PUBLIC API
  // ============================================
  
  // Force refresh user state (after signin/signup)
  async refreshUserState() {
    await this.assessUserState();
    await this.executeFlow();
  }
  
  // Get current flow for debugging
  getCurrentFlow() {
    return {
      flow: this.currentFlow,
      userState: this.userState,
      page: this.getCurrentPage()
    };
  }
  
  // Manual flow execution (for testing)
  async executeManualFlow(flowType) {
    this.currentFlow = flowType;
    await this.executeFlow();
  }
  
  // Show Tesla-grade Hi Muscle access modal instead of abrupt redirect
  async showHiMuscleAccessModal() {
    console.log('🔒 Showing Hi Muscle access modal');
    
    // Hide page content first to prevent flash
    if (document.body) {
      document.body.style.opacity = '0.3';
      document.body.style.pointerEvents = 'none';
    }
    
    // Create access modal
    const accessModal = document.createElement('div');
    accessModal.className = 'hi-muscle-access-modal';
    accessModal.innerHTML = `
      <div class="access-modal-backdrop"></div>
      <div class="access-modal-content">
        <div class="access-icon">💪</div>
        <h2 class="access-title">Hi Muscle is Member-Only</h2>
        <p class="access-subtitle">
          Hi Muscle provides deeper emotional insights and community connections.
          Join the Hi community to unlock this powerful feature.
        </p>
        
        <div class="access-benefits">
          <div class="benefit-item">
            <span class="benefit-icon">🧠</span>
            <span class="benefit-text">Emotional pattern tracking</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🌱</span>
            <span class="benefit-text">Personal growth insights</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🤝</span>
            <span class="benefit-text">Community connections</span>
          </div>
        </div>
        
        <div class="access-actions">
          <button class="access-btn primary" id="access-join">
            ✨ Join Hi Community
          </button>
          <button class="access-btn secondary" id="access-explore">
            Explore Hi Island Instead
          </button>
        </div>
      </div>
    `;
    
    // Add styles
    this.addHiMuscleAccessStyles();
    
    // Add event listeners
    const joinBtn = accessModal.querySelector('#access-join');
    const exploreBtn = accessModal.querySelector('#access-explore');
    const backdrop = accessModal.querySelector('.access-modal-backdrop');
    
    joinBtn.onclick = () => {
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent('hi_muscle_access_join_clicked', {
          source: 'access_modal'
        });
      }
      accessModal.remove();
      this.smoothRedirect('signup.html?source=hi_muscle_access&feature=hi_muscle');
    };
    
    exploreBtn.onclick = () => {
      if (window.hiAnalytics) {
        window.hiAnalytics.trackEvent('hi_muscle_access_explore_clicked', {
          source: 'access_modal'
        });
      }
      accessModal.remove();
      this.smoothRedirect('hi-island-NEW.html?source=hi_muscle_redirect');
    };
    
    backdrop.onclick = () => {
      accessModal.remove();
      this.smoothRedirect('welcome.html?source=hi_muscle_access_denied');
    };
    
    document.body.appendChild(accessModal);
  }
  
  addHiMuscleAccessStyles() {
    if (document.getElementById('hi-muscle-access-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'hi-muscle-access-styles';
    styles.textContent = `
      .hi-muscle-access-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      }
      
      .access-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(12px);
      }
      
      .access-modal-content {
        position: relative;
        background: rgba(15, 16, 34, 0.95);
        backdrop-filter: blur(25px);
        border: 2px solid rgba(255, 215, 102, 0.3);
        border-radius: 24px;
        padding: 40px 32px;
        max-width: 480px;
        width: calc(100vw - 48px);
        text-align: center;
        animation: slideIn 0.4s ease-out;
        box-shadow: 
          0 25px 50px rgba(0, 0, 0, 0.4),
          0 8px 32px rgba(255, 123, 24, 0.2);
      }
      
      .access-icon {
        font-size: 64px;
        margin-bottom: 24px;
        filter: drop-shadow(0 8px 20px rgba(255, 123, 24, 0.3));
      }
      
      .access-title {
        font-size: 28px;
        font-weight: 800;
        background: linear-gradient(135deg, #FFD166, #FF7B24);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 16px 0;
        line-height: 1.2;
      }
      
      .access-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 16px;
        line-height: 1.5;
        margin: 0 0 32px 0;
      }
      
      .access-benefits {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 32px;
        text-align: left;
      }
      
      .benefit-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 215, 102, 0.2);
      }
      
      .benefit-icon {
        font-size: 24px;
        width: 32px;
        text-align: center;
      }
      
      .benefit-text {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }
      
      .access-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .access-btn {
        border: none;
        border-radius: 16px;
        padding: 16px 24px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 56px;
      }
      
      .access-btn.primary {
        background: linear-gradient(135deg, #FF7B24, #FFD166);
        color: #000;
        box-shadow: 0 8px 24px rgba(255, 123, 24, 0.3);
      }
      
      .access-btn.primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 32px rgba(255, 123, 24, 0.5);
      }
      
      .access-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .access-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        transform: translateY(-2px);
      }
      
      @keyframes slideIn {
        from {
          transform: translateY(40px) scale(0.9);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
      
      /* Mobile optimization */
      @media (max-width: 480px) {
        .access-modal-content {
          padding: 32px 24px;
          margin: 16px;
        }
        
        .access-title {
          font-size: 24px;
        }
        
        .access-icon {
          font-size: 48px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  // 🎯 GOLD-STANDARD FIRST-TIME VISITOR DETECTION
  isFirstTimeVisitor() {
    console.log('🔍 AUDIT: Checking first-time visitor status...');
    
    // Check multiple indicators of previous Hi activity
    const indicators = {
      'hi-usage-start': localStorage.getItem('hi-usage-start'),
      'hi-anonymous-usage': localStorage.getItem('hi-anonymous-usage'),
      'hiAccess': localStorage.getItem('hiAccess'),
      'visited-before': sessionStorage.getItem('visited-before'),
      'hi_discovery_mode': localStorage.getItem('hi_discovery_mode'),
      'sb-access-token': localStorage.getItem('sb-access-token'),
      'hiCounts': localStorage.getItem('hiCounts'),
      'hiHistory': localStorage.getItem('hiHistory')
    };
    
    console.log('📊 VISITOR INDICATORS:', indicators);
    
    // Consider returning visitor if ANY indicator exists
    const hasAnyHistory = Object.values(indicators).some(value => value !== null);
    
    const isFirstTime = !hasAnyHistory;
    console.log(isFirstTime ? '👋 FIRST-TIME VISITOR detected' : '🔄 RETURNING VISITOR detected');
    
    return isFirstTime;
  }
  
  async handleFirstVisitWelcome() {
    console.log('🎯 EXECUTING: First-visit welcome redirect');
    
    try {
      // Mark as visited to prevent redirect loops
      sessionStorage.setItem('visited-before', 'true');
      console.log('✅ Marked session as visited');
      
      // Add visual feedback for debugging
      if (document.body) {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
          position: fixed; top: 10px; left: 10px; 
          background: #4CAF50; color: white; 
          padding: 8px 12px; border-radius: 4px; 
          z-index: 10000; font-size: 12px;
        `;
        indicator.textContent = 'Redirecting to Welcome...';
        document.body.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 2000);
      }
      
      // Execute redirect with logging
      console.log('🚀 INITIATING WELCOME REDIRECT');
      await this.smoothRedirect('welcome.html');
      
    } catch (error) {
      console.error('❌ CRITICAL: First-visit welcome redirect failed:', error);
    }
  }
}

// ============================================
// GLOBAL INITIALIZATION
// ============================================

// Initialize Hi Flow Controller  
window.HiFlowController = HiFlowController;

// 🚀 GOLD-STANDARD INITIALIZATION: Execute immediately with multiple strategies
console.log('🎯 Hi Flow Controller: Initializing with priority execution');

// Strategy 1: Immediate execution if possible
try {
  window.hiFlow = new HiFlowController();
  console.log('✅ Flow Controller: Immediate initialization successful');
} catch (error) {
  console.log('🔄 Flow Controller: Immediate init failed, using DOM ready fallback');
  
  // Strategy 2: DOM ready fallback
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.hiFlow = new HiFlowController();
    });
  } else {
    // Strategy 3: Micro-task delay for safety
    setTimeout(() => {
      window.hiFlow = new HiFlowController();
    }, 10);
  }
}

// Debug helper
window.debugFlow = () => {
  if (window.hiFlow) {
    console.log('🔍 Current Flow State:', window.hiFlow.getCurrentFlow());
  } else {
    console.log('❌ Hi Flow Controller not initialized');
  }
};

console.log('🚀 Hi Flow Controller loaded');