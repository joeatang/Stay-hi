// ui/HiHeader/HiHeader.js
// Tesla-Grade Hi Header Component - Shared navigation header
(function () {
  'use strict';

  // Tesla-Grade Navigation Helper
  function getCurrentPageName() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    
    // Normalize common variations
    if (fileName === '' || fileName === '/') return 'index.html';
    if (fileName === 'hi-island.html') return 'hi-island-NEW.html'; // Always use NEW version
    
    return fileName;
  }

  // Main HiHeader initialization
  function initHiHeader() {
    const mount = document.getElementById("app-header");
    if (!mount) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHiHeader);
        return;
      }
      console.warn('HiHeader mount point not found');
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
        <a class="brand" href="hi-dashboard.html" aria-label="Stay Hi dashboard">
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
            <a href="hi-dashboard.html" role="menuitem">🏠 Hi Today</a>
            <a href="hi-muscle.html" role="menuitem">💪 Hi Gym</a>
            <a href="hi-island-NEW.html" role="menuitem">🏝️ Hi Island</a>
            <a href="profile.html?from=${getCurrentPageName()}" role="menuitem">👤 Profile</a>
            <div id="adminMenuSection" style="display: none;">
              <div class="sep"></div>
              <a href="hi-mission-control.html" role="menuitem" style="color: #FFD166; font-weight: 600;">🏛️ Mission Control</a>
            </div>
            <div class="sep"></div>
            <button id="btnSignOut" class="menu-item-btn" role="menuitem">🚪 Sign Out</button>
          </div>
        </div>
      </div>
    `;

    // Tesla-Grade Header scroll behavior with performance optimization
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

    // Calendar button functionality
    const btnCal = document.getElementById("btnCal");
    if (btnCal) {
      btnCal.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Try multiple calendar interfaces (compatibility layer)
        const openCalendar = () => {
          // Try window.openHiCalendar (module components)
          if (window.openHiCalendar && typeof window.openHiCalendar === 'function') {
            window.openHiCalendar();
            return true;
          }
          
          // Try window.PremiumCalendar (legacy)
          if (window.PremiumCalendar && typeof window.PremiumCalendar.show === 'function') {
            window.PremiumCalendar.show();
            return true;
          }
          
          // Try event dispatch fallback
          window.dispatchEvent(new CustomEvent("open-calendar"));
          return false;
        };
        
        // Try immediately
        if (openCalendar()) {
          if (window.PremiumUX?.triggerHapticFeedback) {
            window.PremiumUX.triggerHapticFeedback('light');
          }
          return;
        }
        
        // If not available, wait for modules to load
        setTimeout(() => {
          if (openCalendar()) {
            if (window.PremiumUX?.triggerHapticFeedback) {
              window.PremiumUX.triggerHapticFeedback('light');
            }
          } else {
            console.warn('⚠️ Calendar component not available');
          }
        }, 100);
      });
    }

    // Menu functionality
    const sheet = document.getElementById("menuSheet");
    const btnMore = document.getElementById("btnMore");
    const btnSignOut = document.getElementById("btnSignOut");
    
    if (btnMore && sheet) {
      btnMore.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = sheet.classList.contains("open");
        
        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
      });
    } else {
      console.warn('⚠️ HiHeader menu elements not found:', { btnMore: !!btnMore, sheet: !!sheet });
    }

    function openMenu() {
      if (!sheet || !btnMore) return;
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
      btnMore.setAttribute("aria-expanded", "true");
      
      // Add premium animation effect
      if (window.PremiumUX?.triggerHapticFeedback) {
        window.PremiumUX.triggerHapticFeedback('light');
      }
    }

    function closeMenu() {
      if (!sheet || !btnMore) return;
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

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.classList.contains('open')) {
        closeMenu();
      }
    });

    // Tesla-Grade: Dynamic Admin Menu Detection
    async function checkAndShowAdminAccess() {
      try {
        // Wait for Supabase to be ready
        const getClient = async () => {
          if (window.sb) return window.sb;
          if (window.sbReady) return await window.sbReady;
          if (window.supabaseClient) return window.supabaseClient;
          return null;
        };
        
        const sb = await getClient();
        if (!sb) return; // No Supabase = no admin check
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await sb.auth.getUser();
        if (authError || !user) return; // Not logged in = no admin access
        
        // Check admin role in database
        const { data: adminCheck, error: adminError } = await sb
          .from('admin_roles')
          .select('role_type, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (!adminError && adminCheck && (adminCheck.role_type === 'super_admin' || adminCheck.role_type === 'admin')) {
          // Show admin menu section
          const adminSection = document.getElementById('adminMenuSection');
          if (adminSection) {
            adminSection.style.display = 'block';
            console.log('🏛️ Admin access granted - Mission Control available');
          }
        }
        
      } catch (error) {
        // Silently fail - admin access just won't appear
        console.debug('Admin check failed (expected for non-admins):', error.message);
      }
    }
    
    // Run admin check after a short delay to ensure Supabase is ready
    setTimeout(checkAndShowAdminAccess, 1500);

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
        window.location.href = (window.hiPaths?.page ? window.hiPaths.page('signin') : '/signin.html');
      } catch (error) {
        console.error('Sign out error:', error);
        // Fallback: just clear storage and redirect
        localStorage.clear();
        window.location.href = (window.hiPaths?.page ? window.hiPaths.page('signin') : '/signin.html');
      }
    });
  }

  // Global HiHeader interface
  window.HiHeader = {
    init: initHiHeader
  };

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHiHeader);
  } else {
    initHiHeader();
  }
})();