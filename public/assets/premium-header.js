// Enhanced Premium Header with Stats Integration
(function () {
  const mount = document.getElementById("app-header");
  if (!mount) return;

  // Detect current page for navigation highlighting
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Create enhanced header with stats
  mount.innerHTML = `
    <div class="premium-header">
      <div class="header-left">
        <button id="btnCal" class="icon-btn premium-glow" aria-label="Open calendar" title="View Hi Calendar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <circle cx="8" cy="16" r="1.5" fill="currentColor"></circle>
            <circle cx="16" cy="16" r="1.5" fill="currentColor"></circle>
          </svg>
        </button>
        
        <div id="headerStats" class="header-stats">
          <!-- Stats populated by JavaScript -->
        </div>
      </div>
      
      <a class="brand-enhanced" href="index.html" aria-label="Stay Hi home">
        <img class="logo" src="assets/brand/hi-logo-light.png" alt="" />
        <div class="brand-text">
          <span class="brand-name">Stay Hi</span>
          <div class="brand-tagline">Today</div>
        </div>
      </a>
      
      <div class="header-right">
        <div class="quick-nav">
          <a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}" title="Home">
            <span class="nav-icon">🏠</span>
          </a>
          <a href="hi-island.html" class="nav-link ${currentPage === 'hi-island.html' ? 'active' : ''}" title="Hi Island">
            <span class="nav-icon">🏝️</span>
          </a>
          <a href="hi-muscle.html" class="nav-link ${currentPage === 'hi-muscle.html' ? 'active' : ''}" title="Hi Muscle">
            <span class="nav-icon">💪</span>
          </a>
          <a href="profile.html" class="nav-link ${currentPage.includes('profile') ? 'active' : ''}" title="Profile">
            <span class="nav-icon">👤</span>
          </a>
        </div>
        
        <button id="btnMore" class="icon-btn premium-glow" aria-label="More options" aria-haspopup="menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
        
        <div id="menuSheet" class="premium-menu" role="menu">
          <div class="menu-header">
            <div class="menu-title">Stay Hi Menu</div>
            <button id="closeMenu" class="close-btn">×</button>
          </div>
          <div class="menu-content">
            <div class="menu-section">
              <div class="menu-section-title">Navigate</div>
              <a href="index.html" class="menu-item" role="menuitem">
                <span class="menu-icon">🏠</span>
                <span>Home</span>
              </a>
              <a href="hi-island.html" class="menu-item" role="menuitem">
                <span class="menu-icon">🏝️</span>
                <span>Hi Island</span>
              </a>
              <a href="hi-muscle.html" class="menu-item" role="menuitem">
                <span class="menu-icon">💪</span>
                <span>Build Your Hi Muscle</span>
              </a>
              <a href="profile.html" class="menu-item" role="menuitem">
                <span class="menu-icon">👤</span>
                <span>Profile</span>
              </a>
            </div>
            
            <div class="menu-section">
              <div class="menu-section-title">Actions</div>
              <button id="btnCalendarMenu" class="menu-item menu-btn" role="menuitem">
                <span class="menu-icon">📅</span>
                <span>View Calendar</span>
              </button>
              <button id="btnShare" class="menu-item menu-btn" role="menuitem">
                <span class="menu-icon">🔗</span>
                <span>Share Progress</span>
              </button>
            </div>
            
            <div class="menu-section">
              <div class="menu-section-title">Account</div>
              <button id="btnSignOut" class="menu-item menu-btn sign-out" role="menuitem">
                <span class="menu-icon">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="menuBackdrop" class="menu-backdrop"></div>
  `;

  // Add premium header styles
  if (!document.getElementById('premium-header-styles')) {
    const style = document.createElement('style');
    style.id = 'premium-header-styles';
    style.textContent = `
      .premium-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: var(--glass-bg);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        margin: 16px;
        box-shadow: var(--shadow-premium);
        position: relative;
        z-index: 100;
        animation: slideDown 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .header-left, .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .brand-enhanced {
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        transition: all 0.3s ease;
        padding: 8px 12px;
        border-radius: 12px;
      }
      
      .brand-enhanced:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.02);
      }
      
      .brand-enhanced .logo {
        width: 32px;
        height: 32px;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
      }
      
      .brand-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .brand-name {
        font-size: 18px;
        font-weight: 800;
        color: white;
        line-height: 1;
      }
      
      .brand-tagline {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1;
      }
      
      .icon-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      }
      
      .premium-glow:hover {
        box-shadow: 0 0 20px rgba(78, 205, 196, 0.4);
      }
      
      .quick-nav {
        display: flex;
        gap: 4px;
        padding: 4px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        backdrop-filter: blur(10px);
      }
      
      .nav-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        text-decoration: none;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .nav-link:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .nav-link.active {
        background: var(--gradient-premium);
        box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
      }
      
      .nav-icon {
        font-size: 16px;
      }
      
      .header-stats {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .premium-menu {
        position: fixed;
        top: 0;
        right: -400px;
        width: 320px;
        height: 100vh;
        background: var(--glass-bg);
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        border-left: 1px solid var(--glass-border);
        box-shadow: -10px 0 50px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        transition: right 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        overflow-y: auto;
      }
      
      .premium-menu.open {
        right: 0;
      }
      
      .menu-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        z-index: 999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      
      .menu-backdrop.open {
        opacity: 1;
        visibility: visible;
      }
      
      .menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .menu-title {
        font-size: 20px;
        font-weight: 700;
        color: white;
      }
      
      .close-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        font-size: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .menu-content {
        padding: 20px;
      }
      
      .menu-section {
        margin-bottom: 24px;
      }
      
      .menu-section:last-child {
        margin-bottom: 0;
      }
      
      .menu-section-title {
        font-size: 12px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }
      
      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        text-decoration: none;
        color: white;
        font-weight: 600;
        transition: all 0.3s ease;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        margin-bottom: 4px;
      }
      
      .menu-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(4px);
      }
      
      .menu-item.sign-out {
        color: #ff6b6b;
      }
      
      .menu-item.sign-out:hover {
        background: rgba(255, 107, 107, 0.1);
      }
      
      .menu-icon {
        font-size: 18px;
        width: 20px;
        text-align: center;
      }
      
      /* Mobile Responsiveness */
      @media (max-width: 768px) {
        .premium-header {
          margin: 8px;
          padding: 8px 12px;
        }
        
        .quick-nav {
          display: none;
        }
        
        .brand-text {
          display: none;
        }
        
        .header-stats {
          display: none;
        }
        
        .premium-menu {
          width: 100vw;
          right: -100vw;
        }
      }
      
      @media (max-width: 480px) {
        .premium-header {
          margin: 4px;
          padding: 6px 8px;
        }
        
        .brand-enhanced .logo {
          width: 28px;
          height: 28px;
        }
        
        .icon-btn {
          width: 36px;
          height: 36px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Enhanced event handlers
  const btnCal = document.getElementById("btnCal");
  const btnCalendarMenu = document.getElementById("btnCalendarMenu");
  const btnMore = document.getElementById("btnMore");
  const closeMenu = document.getElementById("closeMenu");
  const menuSheet = document.getElementById("menuSheet");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const btnSignOut = document.getElementById("btnSignOut");
  const btnShare = document.getElementById("btnShare");

  // Calendar functionality
  const openCalendar = () => {
    if (window.PremiumCalendar) {
      window.PremiumCalendar.open();
      if (window.PremiumUX) {
        window.PremiumUX.triggerHapticFeedback('light');
      }
    } else {
      window.dispatchEvent(new CustomEvent("open-calendar"));
    }
  };

  btnCal?.addEventListener("click", openCalendar);
  btnCalendarMenu?.addEventListener("click", () => {
    closeMenus();
    openCalendar();
  });

  // Menu functionality
  const openMenu = () => {
    menuSheet.classList.add("open");
    menuBackdrop.classList.add("open");
    document.body.style.overflow = 'hidden';
    
    if (window.PremiumUX) {
      window.PremiumUX.triggerHapticFeedback('light');
    }
  };

  const closeMenus = () => {
    menuSheet.classList.remove("open");
    menuBackdrop.classList.remove("open");
    document.body.style.overflow = '';
  };

  btnMore?.addEventListener("click", openMenu);
  closeMenu?.addEventListener("click", closeMenus);
  menuBackdrop?.addEventListener("click", closeMenus);

  // Share functionality
  btnShare?.addEventListener("click", () => {
    closeMenus();
    if (navigator.share) {
      navigator.share({
        title: 'Stay Hi - My Progress',
        text: 'Check out my Hi journey!',
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      if (window.PremiumUX) {
        window.PremiumUX.toast('Link copied to clipboard!');
      }
    }
  });

  // Sign out functionality
  btnSignOut?.addEventListener("click", async () => {
    closeMenus();
    
    if (window.PremiumUX) {
      window.PremiumUX.glow(btnSignOut, '#ff6b6b');
    }
    
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signout' })
      });
      
      if (window.PremiumUX) {
        window.PremiumUX.toast('Signed out successfully');
      }
      
      setTimeout(() => {
        window.location.href = 'signin.html';
      }, 1000);
    } catch (error) {
      console.error('Sign out error:', error);
      if (window.PremiumUX) {
        window.PremiumUX.toast('Sign out failed', 'error');
      }
    }
  });

  // Load stats in header
  const loadHeaderStats = () => {
    if (window.GlobalStatsTracker) {
      const headerStats = document.getElementById('headerStats');
      if (headerStats) {
        headerStats.innerHTML = window.GlobalStatsTracker.getCompactStatsHTML();
      }
    }
  };

  // Load stats when GlobalStatsTracker is available
  if (window.GlobalStatsTracker) {
    loadHeaderStats();
  } else {
    // Wait for GlobalStatsTracker to load
    const checkStats = () => {
      if (window.GlobalStatsTracker) {
        loadHeaderStats();
      } else {
        setTimeout(checkStats, 100);
      }
    };
    checkStats();
  }

  // Listen for stats updates
  window.addEventListener('stats-updated', loadHeaderStats);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuSheet.classList.contains('open')) {
      closeMenus();
    }
  });

  // Update stats periodically
  setInterval(loadHeaderStats, 5000);
})();