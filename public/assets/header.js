// public/assets/header.js
(function () {
  // Ensure immediate rendering by checking DOM state
  function initHeader() {
    const mount = document.getElementById("app-header");
    if (!mount) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeader);
        return;
      }
      console.warn('Header mount point not found');
      return;
    }
    
    // Clear any placeholder content
    mount.innerHTML = '';

  mount.innerHTML = `
    <div class="appbar">
      <button id="btnCal" class="icon-btn premium-hover focus-premium" aria-label="Open calendar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <circle cx="8" cy="16" r="1.5" fill="currentColor"></circle>
          <circle cx="16" cy="16" r="1.5" fill="currentColor"></circle>
        </svg>
      </button>
      <a class="brand" href="index.html" aria-label="Stay Hi home">
        <img class="logo" src="assets/brand/hi-logo-light.png" alt="" />
        <span class="brand-name">Stay Hi</span>
      </a>
      <div class="menu">
        <button id="btnMore" class="icon-btn premium-hover focus-premium" aria-label="Open menu" aria-haspopup="menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>
        <div id="menuSheet" class="menu-sheet" role="menu" aria-hidden="true" style="display: none;">
          <a href="index.html" role="menuitem">🏠 Hi Today</a>
          <a href="hi-muscle.html" role="menuitem">💪 Hi Gym</a>
          <a href="hi-island-NEW.html" role="menuitem">🏝️ Hi Island</a>
          <a href="profile.html" role="menuitem">👤 Profile</a>
          <div class="sep"></div>
          <button id="btnSignOut" class="menu-item-btn" role="menuitem">🚪 Sign Out</button>
        </div>
      </div>
    </div>
  `;

  // ======= RESTORED: Header scroll behavior with performance optimization =======
  let lastScrollY = window.scrollY;
  let ticking = false;
  
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    const header = mount.querySelector('.appbar');
    
    if (!header) return;
    
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      // Scrolling down & past threshold - hide header
      header.style.transform = 'translateY(-100%)';
    } else {
      // Scrolling up or at top - show header
      header.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
  };
  
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  };
  
  // Add scroll listener with passive flag for performance
  window.addEventListener('scroll', onScroll, { passive: true });

  document.getElementById("btnCal")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Function to open premium calendar
    const openPremiumCalendar = () => {
      if (window.PremiumCalendar && typeof window.PremiumCalendar.show === 'function') {
        window.PremiumCalendar.show();
        return true;
      }
      return false;
    };
    
    // Try to open premium calendar immediately
    if (openPremiumCalendar()) {
      // Success - add haptic feedback
      if (window.PremiumUX?.triggerHapticFeedback) {
        window.PremiumUX.triggerHapticFeedback('light');
      }
      return;
    }
    
    // If not immediately available, wait a bit and try again
    setTimeout(() => {
      if (!openPremiumCalendar()) {
        // Final fallback to event dispatch
        window.dispatchEvent(new CustomEvent("open-calendar"));
      } else {
        // Add haptic feedback for delayed success
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
      }
    }, 100);
  });

  const sheet = document.getElementById("menuSheet");
  const btnMore = document.getElementById("btnMore");
  const btnSignOut = document.getElementById("btnSignOut");
  // Calendar functionality is now handled by the top calendar icon only
  
  // Enhanced menu functionality
  btnMore?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = sheet.classList.contains("open");
    
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  function openMenu() {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    btnMore.setAttribute("aria-expanded", "true");
    
    // Add premium animation effect
    if (window.PremiumUX?.triggerHapticFeedback) {
      window.PremiumUX.triggerHapticFeedback('light');
    }
  }

  function closeMenu() {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    btnMore.setAttribute("aria-expanded", "false");
  }

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!sheet.contains(e.target) && e.target !== btnMore) {
      closeMenu();
    }
  });

  // Calendar functionality streamlined - only top icon button now

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) {
      closeMenu();
    }
  });

  // Sign out functionality
  btnSignOut?.addEventListener("click", async () => {
    try {
      // Wait for Supabase client
      const getClient = async () => {
        if (window.sb) return window.sb;
        if (window.sbReady) return await window.sbReady;
        if (window.supabaseClient) return window.supabaseClient;
        throw new Error('Supabase client not available');
      };
      
      const sb = await getClient();
      await sb.auth.signOut();
      
      // Clear any cached data
      localStorage.clear();
      
      // Redirect to signin
      window.location.href = '/signin.html';
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: just clear storage and redirect
      localStorage.clear();
      window.location.href = '/signin.html';
    }
  });
  }

  // Initialize immediately or wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();

